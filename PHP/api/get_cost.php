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

function verify_jwt($jwt, $secret) {
    $tokenParts = explode('.', $jwt);
    if (count($tokenParts) !== 3) return false;

    $header = base64_decode(strtr($tokenParts[0], '-_', '+/'));
    $payload = base64_decode(strtr($tokenParts[1], '-_', '+/'));
    $signature_provided = $tokenParts[2];

    $payload_data = json_decode($payload, true);
    if (isset($payload_data['exp']) && $payload_data['exp'] < time()) return false;

    $base64_url_header = strtr(base64_encode($header), '+/', '-_');
    $base64_url_header = rtrim($base64_url_header, '=');
    $base64_url_payload = strtr(base64_encode($payload), '+/', '-_');
    $base64_url_payload = rtrim($base64_url_payload, '=');
    
    $signature_to_check = hash_hmac('sha256', $base64_url_header . "." . $base64_url_payload, $secret, true);
    $base64_url_signature = strtr(base64_encode($signature_to_check), '+/', '-_');
    $base64_url_signature = rtrim($base64_url_signature, '=');

    return hash_equals($base64_url_signature, $signature_provided);
}

$headers = null;
if (isset($_SERVER['Authorization'])) { $headers = trim($_SERVER["Authorization"]); }
else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { $headers = trim($_SERVER["HTTP_AUTHORIZATION"]); }
elseif (function_exists('apache_request_headers')) {
    $requestHeaders = apache_request_headers();
    $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
    if (isset($requestHeaders['Authorization'])) { $headers = trim($requestHeaders['Authorization']); }
}

$token = null;
if (!empty($headers) && preg_match('/Bearer\s(\S+)/', $headers, $matches)) { $token = $matches[1]; }

if (empty($token) || !verify_jwt($token, $jwt_secret)) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Akses Ditolak! Token JWT tidak valid."]);
    exit;
}

// =========================================================================
// 2. LOGIKA UTAMA PROGRAM
// =========================================================================

try {
    $year_req = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
    $timeframe = $_GET['timeframe'] ?? 'monthly';

    // 1. Ambil Harga dan Tarif Terbaru dari dbo.settings
    $settings = [];
    $sql_settings = "
        WITH LatestSettings AS (
            SELECT title, value, ROW_NUMBER() OVER(PARTITION BY title ORDER BY published DESC) as rn
            FROM dbo.settings WHERE title IN ('LWBP Cost', 'WBP Cost', 'kVARh Cost', 'PPJ', 'Power Factor')
        )
        SELECT title, value FROM LatestSettings WHERE rn = 1";
    
    $stmt_settings = $pdo->query($sql_settings);
    foreach ($stmt_settings->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $settings[$row['title']] = $row['value'];
    }

    $hargaLWBP = (float)($settings['LWBP Cost'] ?? 0);
    $hargaWBP = (float)($settings['WBP Cost'] ?? 0);
    $hargaKVARH = (float)($settings['kVARh Cost'] ?? 0);
    $ppjRate = ((float)($settings['PPJ'] ?? 0)) / 100;
    $pf_threshold = (float)($settings['Power Factor'] ?? 0.85);

    // --- FUNGSI HELPER PENCARI DATA ---
    function findStartRowIndex(array $data, int $targetTimestamp): ?int {
        foreach ($data as $index => $row) { if ($row['unix_timestamp'] >= $targetTimestamp) return $index; }
        return null;
    }
    function findEndRowIndex(array $data, int $targetTimestamp): ?int {
        $last_found = null;
        foreach ($data as $index => $row) {
            if ($row['unix_timestamp'] <= $targetTimestamp) $last_found = $index; else break;
        }
        return $last_found;
    }

    // FUNGSI KALKULASI BIAYA HARIAN
    function calculateDailyCost($grouped_data, $date_str, $hargaWBP, $hargaLWBP, $hargaKVARH, $ppjRate, $pf_threshold) {
        $start_day_ts = strtotime($date_str . " 00:00:00");
        $end_day_ts = strtotime($date_str . " 23:59:59");
        $start_wbp_ts = strtotime($date_str . " 17:00:00");
        $end_wbp_ts = strtotime($date_str . " 22:00:00");
        
        $daily_energy_cost = 0;
        $daily_kvarh_cost = 0;

        foreach ($grouped_data as $subgroup => $data) {
            $idx_start = findStartRowIndex($data, $start_day_ts);
            $idx_end = findEndRowIndex($data, $end_day_ts);
            
            if ($idx_start !== null && $idx_end !== null && $idx_end > $idx_start) {
                $total_kwh_harian = max(0, $data[$idx_end]['stand_kwh'] - $data[$idx_start]['stand_kwh']);
                $total_kvarh = max(0, $data[$idx_end]['stand_kvarh'] - $data[$idx_start]['stand_kvarh']);

                $wbp_kwh = 0;
                $idx_wbp_start = findStartRowIndex($data, $start_wbp_ts);
                $idx_wbp_end = findEndRowIndex($data, $end_wbp_ts);
                if ($idx_wbp_start !== null && $idx_wbp_end !== null && $idx_wbp_end > $idx_wbp_start) {
                    $wbp_kwh = max(0, $data[$idx_wbp_end]['stand_kwh'] - $data[$idx_wbp_start]['stand_kwh']);
                }

                $lwbp_kwh = max(0, $total_kwh_harian - $wbp_kwh);
                
                // Cek Power Factor rata-rata
                $sum_pf = 0; $count_pf = 0;
                for ($i = $idx_start; $i < $idx_end; $i++) {
                    if ($data[$i+1]['power_factor'] > 0) {
                        $sum_pf += $data[$i+1]['power_factor'];
                        $count_pf++;
                    }
                }
                $avg_pf = ($count_pf > 0) ? ($sum_pf / $count_pf) : 0;
                if ($avg_pf == 0 || $avg_pf >= $pf_threshold) $total_kvarh = 0;

                $daily_energy_cost += ($wbp_kwh * $hargaWBP) + ($lwbp_kwh * $hargaLWBP);
                $daily_kvarh_cost += ($total_kvarh * $hargaKVARH);
            }
        }
        $ppjCost = $daily_energy_cost * $ppjRate;
        return $daily_energy_cost + $ppjCost + $daily_kvarh_cost;
    }

    // 2. Ambil Data dan Proses berdasarkan Timeframe
    if ($timeframe === 'yearly') {
        // REVISI: Hanya mengambil area MV-I (sudah mewakili seluruh area untuk perhitungan biaya)
        $sql_energy = "SELECT timestamp, subgroup_mv, stand_kwh, reactive_energy_kvarh, power_factor 
                       FROM dbo.mv_lowvoltage 
                       WHERE group_mv = 'MV-I' 
                       ORDER BY timestamp ASC";
        $stmt_energy = $pdo->query($sql_energy);
        $raw_data = $stmt_energy->fetchAll(PDO::FETCH_ASSOC);

        $grouped_data = []; $unique_years = [];
        foreach ($raw_data as $row) {
            $ts = strtotime($row['timestamp']);
            $y = (int)date('Y', $ts);
            $unique_years[$y] = true;
            $grouped_data[$row['subgroup_mv']][] = [
                'unix_timestamp' => $ts, 'stand_kwh' => floatval($row['stand_kwh']),
                'stand_kvarh' => floatval($row['reactive_energy_kvarh']), 'power_factor' => floatval($row['power_factor'])
            ];
        }
        $unique_years = array_keys($unique_years); sort($unique_years);

        $final_data = [];
        foreach ($unique_years as $y) {
            $yearly_total = 0;
            for ($month = 1; $month <= 12; $month++) {
                $days_in_month = cal_days_in_month(CAL_GREGORIAN, $month, $y);
                for ($day = 1; $day <= $days_in_month; $day++) {
                    $date_str = sprintf("%04d-%02d-%02d", $y, $month, $day);
                    $yearly_total += calculateDailyCost($grouped_data, $date_str, $hargaWBP, $hargaLWBP, $hargaKVARH, $ppjRate, $pf_threshold);
                }
            }
            $final_data[] = ["year" => (string)$y, "cost" => round($yearly_total)];
        }
    } else {
        // Mode Monthly/Quarterly (Filter per tahun, hanya area MV-I)
        $sql_energy = "SELECT timestamp, subgroup_mv, stand_kwh, reactive_energy_kvarh, power_factor 
                       FROM dbo.mv_lowvoltage 
                       WHERE group_mv = 'MV-I' AND YEAR(timestamp) = ? 
                       ORDER BY timestamp ASC";
        $stmt_energy = $pdo->prepare($sql_energy);
        $stmt_energy->execute([$year_req]);
        $raw_data = $stmt_energy->fetchAll(PDO::FETCH_ASSOC);

        $grouped_data = [];
        foreach ($raw_data as $row) {
            $grouped_data[$row['subgroup_mv']][] = [
                'unix_timestamp' => strtotime($row['timestamp']), 'stand_kwh' => floatval($row['stand_kwh']),
                'stand_kvarh' => floatval($row['reactive_energy_kvarh']), 'power_factor' => floatval($row['power_factor'])
            ];
        }

        $monthly_costs = array_fill(1, 12, 0);
        for ($month = 1; $month <= 12; $month++) {
            $days_in_month = cal_days_in_month(CAL_GREGORIAN, $month, $year_req);
            for ($day = 1; $day <= $days_in_month; $day++) {
                $date_str = sprintf("%04d-%02d-%02d", $year_req, $month, $day);
                $monthly_costs[$month] += calculateDailyCost($grouped_data, $date_str, $hargaWBP, $hargaLWBP, $hargaKVARH, $ppjRate, $pf_threshold);
            }
        }

        if ($timeframe === 'quarterly') {
            $final_data = [
                ["quarter" => "Q1", "cost" => round($monthly_costs[1] + $monthly_costs[2] + $monthly_costs[3])],
                ["quarter" => "Q2", "cost" => round($monthly_costs[4] + $monthly_costs[5] + $monthly_costs[6])],
                ["quarter" => "Q3", "cost" => round($monthly_costs[7] + $monthly_costs[8] + $monthly_costs[9])],
                ["quarter" => "Q4", "cost" => round($monthly_costs[10] + $monthly_costs[11] + $monthly_costs[12])],
            ];
        } else {
            $months_names = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            $final_data = [];
            for ($i = 1; $i <= 12; $i++) {
                $final_data[] = ["month" => $months_names[$i], "cost" => round($monthly_costs[$i])];
            }
        }
    }

    echo json_encode($final_data);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
}
?>