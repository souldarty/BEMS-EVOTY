<?php

require 'database.php';

date_default_timezone_set('Asia/Jakarta');

// =========================================================================
// 1. SISTEM KEAMANAN JWT (Membaca dari .env)
// =========================================================================

$env_path = __DIR__ . '/.env';
if (file_exists($env_path)) {
    $lines = file($env_path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $_ENV[trim($parts[0])] = trim($parts[1], " \t\n\r\0\x0B\"'");
        }
    }
}

$jwt_secret = $_ENV['JWT_SECRET'] ?? '';

if (empty($jwt_secret)) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server Error: JWT Secret tidak ditemukan di .env"]);
    exit;
}

// Fungsi untuk mendekode dan memverifikasi token JWT secara native di PHP
function verify_jwt($jwt, $secret) {
    // Pecah token menjadi 3 bagian: Header, Payload, Signature
    $tokenParts = explode('.', $jwt);
    if (count($tokenParts) !== 3) {
        return false;
    }

    $header = base64_decode(strtr($tokenParts[0], '-_', '+/'));
    $payload = base64_decode(strtr($tokenParts[1], '-_', '+/'));
    $signature_provided = $tokenParts[2];

    // Cek kadaluarsa (Expiration)
    $payload_data = json_decode($payload, true);
    if (isset($payload_data['exp']) && $payload_data['exp'] < time()) {
        return false; // Token sudah expired
    }

    // Buat ulang signature untuk dicocokkan
    $base64_url_header = strtr(base64_encode($header), '+/', '-_');
    $base64_url_header = rtrim($base64_url_header, '=');
    $base64_url_payload = strtr(base64_encode($payload), '+/', '-_');
    $base64_url_payload = rtrim($base64_url_payload, '=');
    
    $signature_to_check = hash_hmac('sha256', $base64_url_header . "." . $base64_url_payload, $secret, true);
    $base64_url_signature = strtr(base64_encode($signature_to_check), '+/', '-_');
    $base64_url_signature = rtrim($base64_url_signature, '=');

    // Jika signature cocok, maka token valid dan tidak dimanipulasi
    return hash_equals($base64_url_signature, $signature_provided);
}

// Mengambil Header Authorization dari HTTP Request
$headers = null;
if (isset($_SERVER['Authorization'])) {
    $headers = trim($_SERVER["Authorization"]);
} else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { // Nginx atau Apache
    $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
} elseif (function_exists('apache_request_headers')) {
    $requestHeaders = apache_request_headers();
    $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
    if (isset($requestHeaders['Authorization'])) {
        $headers = trim($requestHeaders['Authorization']);
    }
}

// Mengekstrak Token dari format "Bearer <token>"
$token = null;
if (!empty($headers)) {
    if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
        $token = $matches[1];
    }
}

// Verifikasi Token
if (empty($token) || !verify_jwt($token, $jwt_secret)) {
    // Jika tidak ada token atau token tidak valid, tolak akses!
    http_response_code(401); // 401 Unauthorized
    echo json_encode([
        "status" => "error",
        "message" => "Akses Ditolak! Anda tidak memiliki izin (Token JWT tidak valid atau kedaluwarsa)."
    ]);
    exit; // Hentikan eksekusi kode selanjutnya
}

// =========================================================================
// 2. PROSES UTAMA PROGRAM (Jika JWT Valid)
// =========================================================================

try {
    $year_to_process = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');

    // Ambil harga dan tarif terbaru dari tabel 'settings'
    $settings = [];
    $sql_settings = "
        WITH LatestSettings AS (
            SELECT
                title, value,
                ROW_NUMBER() OVER(PARTITION BY title ORDER BY published DESC) as rn
            FROM dbo.settings
            WHERE title IN ('LWBP Cost', 'WBP Cost', 'kVARh Cost', 'PPJ', 'Power Factor')
        )
        SELECT title, value FROM LatestSettings WHERE rn = 1";
    
    $stmt_settings = $pdo->query($sql_settings);
    $settings_data = $stmt_settings->fetchAll(PDO::FETCH_ASSOC);

    foreach ($settings_data as $row) {
        $settings[$row['title']] = $row['value'];
    }

    $hargaLWBP = (float)($settings['LWBP Cost'] ?? 0);
    $hargaWBP = (float)($settings['WBP Cost'] ?? 0);
    $hargaKVARH = (float)($settings['kVARh Cost'] ?? 0);
    $ppjPercent = (float)($settings['PPJ'] ?? 0);
    $pf_threshold = (float)($settings['Power Factor'] ?? 0.85);
    $ppjRate = $ppjPercent / 100;

    // Ambil data energi 
    $sql_data = "SELECT timestamp, stand_kwh, reactive_energy_kvarh, power_factor
            FROM dbo.mv_lowvoltage
            WHERE group_mv = 'MV-I' AND YEAR(timestamp) = ?
            ORDER BY timestamp ASC";
    $stmt_data = $pdo->prepare($sql_data);
    $stmt_data->execute([$year_to_process]);
    $raw_data = $stmt_data->fetchAll(PDO::FETCH_ASSOC);
    
    $data = [];
    foreach ($raw_data as $row) {
        $data[] = [
            'unix_timestamp' => strtotime($row['timestamp']),
            'stand_kwh' => floatval($row['stand_kwh']),
            'stand_kvarh' => floatval($row['reactive_energy_kvarh']),
            'power_factor' => floatval($row['power_factor'])
        ];
    }
    
    if (empty($data)) {
        echo json_encode(["message" => "Tidak ada data untuk tahun $year_to_process"]);
        exit;
    }

    // LOGIKA PERHITUNGAN 
    function findStartRowIndex(array $data, int $targetTimestamp): ?int {
        foreach ($data as $index => $row) {
            if ($row['unix_timestamp'] >= $targetTimestamp) return $index;
        }
        return null;
    }

    function findEndRowIndex(array $data, int $targetTimestamp): ?int {
        $last_found_index = null;
        foreach ($data as $index => $row) {
            if ($row['unix_timestamp'] < $targetTimestamp) $last_found_index = $index;
            else break;
        }
        return $last_found_index;
    }

    $unique_months = [];
    $first_ts = $data[0]['unix_timestamp'];
    $last_ts = end($data)['unix_timestamp'];
    $current_ts = strtotime(date('Y-m-01', $first_ts));
    $end_loop_ts = strtotime(date('Y-m-01', $last_ts));
    while($current_ts <= $end_loop_ts) {
        $unique_months[] = date('Y-m', $current_ts);
        $current_ts = strtotime('+1 month', $current_ts);
    }

    $finalResults = [];
    $bulanMap = ['jan' => 'jan', 'feb' => 'feb', 'mar' => 'mar', 'apr' => 'apr', 'may' => 'mei', 'jun' => 'jun', 'jul' => 'jul', 'aug' => 'aug', 'sep' => 'sep', 'oct' => 'oct', 'nov' => 'nop', 'dec' => 'des'];

    foreach ($unique_months as $month_string) {
        $dt = new DateTime($month_string . '-01');
        $month_start_ts = $dt->getTimestamp();
        $next_month_start_ts = (clone $dt)->modify('+1 month')->getTimestamp();
        
        $start_index = findStartRowIndex($data, $month_start_ts);
        $end_index = findEndRowIndex($data, $next_month_start_ts);

        $totalWBP = 0; $totalLWBP = 0; $totalKVARH = 0; $average_power_factor = 0;

        if ($start_index !== null && $end_index !== null && $end_index >= $start_index) {
            $sum_pf = 0; $count_pf = 0;
            for ($i = $start_index; $i < $end_index; $i++) {
                $current_row = $data[$i];
                $next_row = $data[$i+1];
                $consumption_kwh = $next_row['stand_kwh'] - $current_row['stand_kwh'];
                if ($consumption_kwh > 0) {
                    $hour = (int)date('G', $next_row['unix_timestamp']);
                    if ($hour >= 17 && $hour < 22) { $totalWBP += $consumption_kwh; } else { $totalLWBP += $consumption_kwh; }
                }
                $consumption_kvarh = $next_row['stand_kvarh'] - $current_row['stand_kvarh'];
                if ($consumption_kvarh > 0) $totalKVARH += $consumption_kvarh;
                if ($next_row['power_factor'] > 0) {
                    $sum_pf += $next_row['power_factor'];
                    $count_pf++;
                }
            }
            $average_power_factor = ($count_pf > 0) ? ($sum_pf / $count_pf) : 0;
            if ($average_power_factor == 0 || $average_power_factor >= $pf_threshold) $totalKVARH = 0;
        }

        $costLWBP = round($totalLWBP * $hargaLWBP);
        $costWBP = round($totalWBP * $hargaWBP);
        $totalEnergyCost = $costLWBP + $costWBP;
        $ppjCost = round($totalEnergyCost * $ppjRate);
        $totalWithPPJ = $totalEnergyCost + $ppjCost;
        $totalKVARHCost = $totalKVARH * $hargaKVARH;

        $year = (int)$dt->format('Y');
        $bulan_short = strtolower($dt->format('M'));
        $col = $bulanMap[$bulan_short] ?? null;

        if ($col) {
            // Simpan hasil ke DB menggunakan PDO
            $sql_merge = "
                MERGE dbo.cost AS target
                USING (SELECT ? AS year, ? AS unit, ? AS value) AS source
                ON (target.year = source.year AND target.unit = source.unit)
                WHEN MATCHED THEN UPDATE SET target.[$col] = source.value
                WHEN NOT MATCHED BY TARGET THEN INSERT (year, unit, [$col]) VALUES (source.year, source.unit, source.value);";
            
            // Simpan biaya kWh
            $stmt_kwh = $pdo->prepare($sql_merge);
            $stmt_kwh->execute([$year, 'kwh', $totalWithPPJ]);

            // Simpan biaya kVARh
            $stmt_kvarh = $pdo->prepare($sql_merge);
            $stmt_kvarh->execute([$year, 'kvarh', $totalKVARHCost]);
        }

        $finalResults[] = [
            'month_data' => [ 'year' => $year, 'month_name' => $dt->format('F'), 'db_column' => $col ],
            'power_factor_analysis' => [ 'average_power_factor_terukur' => round($average_power_factor, 4), 'ambang_batas_denda' => $pf_threshold, 'denda_kvarh_diterapkan' => ($totalKVARHCost > 0) ],
            'consumption' => [ 'totalLWBP' => round($totalLWBP, 2), 'totalWBP' => round($totalWBP, 2), 'totalKVARH' => round($totalKVARH, 2) ],
            'calculation' => [ 'costLWBP' => $costLWBP, 'costWBP' => $costWBP, 'totalEnergyCost' => $totalEnergyCost, 'ppjCost' => $ppjCost, 'totalCostWithPPJ' => $totalWithPPJ, 'totalKVARHCost' => round($totalKVARHCost, 2) ]
        ];
    }
    
    echo json_encode($finalResults, JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Proses gagal: " . $e->getMessage()]);
}
?>