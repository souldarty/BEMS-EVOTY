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
// 2. PROSES KALKULASI & SIMPAN KE DBO.CARBON
// =========================================================================

try {
    $year_to_process = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');

    // Ambil Faktor Emisi CO2
    $co2_emission_factor = 0.85;
    $sql_factor = "SELECT TOP 1 value FROM dbo.settings WHERE title = 'CO2 Emission Factor (Electric Power)' ORDER BY published DESC";
    $stmt_factor = $pdo->query($sql_factor);
    $row_factor = $stmt_factor->fetch(PDO::FETCH_ASSOC);
    if ($row_factor) {
        $co2_emission_factor = floatval($row_factor['value']);
    }

    // Ambil Data Konsumsi Energi
    $sql_data = "SELECT timestamp, subgroup_mv, stand_kwh 
                 FROM dbo.mv_lowvoltage 
                 WHERE group_mv IN ('MV-I', 'MV-A', 'MV-B', 'MV-C', 'MV-U') 
                 AND YEAR(timestamp) = ? 
                 ORDER BY timestamp ASC";
    $stmt_data = $pdo->prepare($sql_data);
    $stmt_data->execute([$year_to_process]);
    $raw_data = $stmt_data->fetchAll(PDO::FETCH_ASSOC);

    $grouped_data = [];
    foreach ($raw_data as $row) {
        $subgroup = $row['subgroup_mv'];
        $grouped_data[$subgroup][] = [
            'unix_timestamp' => strtotime($row['timestamp']),
            'stand_kwh' => floatval($row['stand_kwh'])
        ];
    }

    function findStartRowIndex(array $data, int $targetTimestamp): ?int {
        foreach ($data as $index => $row) { if ($row['unix_timestamp'] >= $targetTimestamp) return $index; }
        return null;
    }
    function findEndRowIndex(array $data, int $targetTimestamp): ?int {
        $last_found_index = null;
        foreach ($data as $index => $row) {
            if ($row['unix_timestamp'] < $targetTimestamp) $last_found_index = $index; else break;
        }
        return $last_found_index;
    }

    $bulanMap = ['jan' => 'jan', 'feb' => 'feb', 'mar' => 'mar', 'apr' => 'apr', 'may' => 'mei', 'jun' => 'jun', 'jul' => 'jul', 'aug' => 'aug', 'sep' => 'sep', 'oct' => 'oct', 'nov' => 'nop', 'dec' => 'des'];

    for ($month = 1; $month <= 12; $month++) {
        $date_str = sprintf("%04d-%02d", $year_to_process, $month);
        $dt = new DateTime($date_str . '-01');
        $target_start_ts = $dt->getTimestamp();
        $target_end_ts = (clone $dt)->modify('+1 month')->getTimestamp();
        
        $total_kwh_month = 0;

        foreach ($grouped_data as $subgroup => $data) {
            $start_index = findStartRowIndex($data, $target_start_ts);
            $end_index = findEndRowIndex($data, $target_end_ts);
            
            if ($start_index !== null && $end_index !== null && $end_index > $start_index) {
                for ($i = $start_index; $i < $end_index; $i++) {
                    $consumption_kwh = $data[$i+1]['stand_kwh'] - $data[$i]['stand_kwh'];
                    if ($consumption_kwh > 0) $total_kwh_month += $consumption_kwh;
                }
            }
        }

        $bulan_short = strtolower($dt->format('M'));
        $col = $bulanMap[$bulan_short] ?? null;

        if ($col && $total_kwh_month > 0) {
            $total_co2 = $total_kwh_month * $co2_emission_factor;

            $sql_merge = "
                MERGE dbo.carbon AS target
                USING (SELECT ? AS year, ? AS unit, ? AS value) AS source
                ON (target.year = source.year AND target.unit = source.unit)
                WHEN MATCHED THEN UPDATE SET target.[$col] = source.value
                WHEN NOT MATCHED BY TARGET THEN INSERT (year, unit, [$col]) VALUES (source.year, source.unit, source.value);";
            
            // Simpan Total kWh
            $stmt_kwh = $pdo->prepare($sql_merge);
            $stmt_kwh->execute([$year_to_process, 'kwh', $total_kwh_month]);

            // Simpan Estimasi Karbon (kg CO2)
            $stmt_co2 = $pdo->prepare($sql_merge);
            $stmt_co2->execute([$year_to_process, 'kg_co2', $total_co2]);
        }
    }

    echo json_encode(["status" => "success", "message" => "Data Carbon berhasil disimpan untuk tahun $year_to_process"]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Proses database gagal', 'message' => $e->getMessage()]);
}
?>