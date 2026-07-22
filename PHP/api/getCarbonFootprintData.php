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
    $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
    $timeframe = $_GET['timeframe'] ?? 'monthly';

    // 1. Ambil Faktor Emisi CO2
    $co2_emission_factor = 0.85;
    $sql_factor = "SELECT TOP 1 value FROM dbo.settings WHERE title = 'CO2 Emission Factor (Electric Power)' ORDER BY published DESC";
    $stmt_factor = $pdo->query($sql_factor);
    $row_factor = $stmt_factor->fetch(PDO::FETCH_ASSOC);
    if ($row_factor) {
      $co2_emission_factor = floatval($row_factor['value']);
    }

    // --- FUNGSI HELPER ---
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

    $aggregatedData = [];

    // 2. Proses data berdasarkan timeframe
    if ($timeframe === 'yearly') {
        $sql_energy = "SELECT timestamp, subgroup_mv, stand_kwh FROM dbo.mv_lowvoltage WHERE group_mv IN ('MV-I', 'MV-A', 'MV-B', 'MV-C', 'MV-U') ORDER BY timestamp ASC";
        $stmt_energy = $pdo->query($sql_energy);
        $raw_data = $stmt_energy->fetchAll(PDO::FETCH_ASSOC);

        $grouped_data = []; $unique_years = [];
        foreach ($raw_data as $row) {
            $ts = strtotime($row['timestamp']);
            $y = (int)date('Y', $ts);
            $unique_years[$y] = true;
            $grouped_data[$row['subgroup_mv']][] = [ 'unix_timestamp' => $ts, 'stand_kwh' => floatval($row['stand_kwh']) ];
        }
        $unique_years = array_keys($unique_years); sort($unique_years);

        foreach ($unique_years as $y) {
            $target_start_ts = strtotime($y . '-01-01');
            $target_end_ts = strtotime(($y + 1) . '-01-01');
            $total_kwh_year = 0;

            foreach ($grouped_data as $subgroup => $data) {
                $start_index = findStartRowIndex($data, $target_start_ts);
                $end_index = findEndRowIndex($data, $target_end_ts);
                if ($start_index !== null && $end_index !== null && $end_index > $start_index) {
                    $consumption = $data[$end_index]['stand_kwh'] - $data[$start_index]['stand_kwh'];
                    if ($consumption > 0) $total_kwh_year += $consumption;
                }
            }
            $aggregatedData[] = ["label" => (string)$y, "total_kwh" => round($total_kwh_year)];
        }

    } else {
        $sql_energy = "SELECT timestamp, subgroup_mv, stand_kwh FROM dbo.mv_lowvoltage WHERE group_mv IN ('MV-I', 'MV-A', 'MV-B', 'MV-C', 'MV-U') AND YEAR(timestamp) = ? ORDER BY timestamp ASC";
        $stmt_energy = $pdo->prepare($sql_energy);
        $stmt_energy->execute([$year]);
        $raw_data = $stmt_energy->fetchAll(PDO::FETCH_ASSOC);

        $grouped_data = [];
        foreach ($raw_data as $row) {
            $grouped_data[$row['subgroup_mv']][] = [ 'unix_timestamp' => strtotime($row['timestamp']), 'stand_kwh' => floatval($row['stand_kwh']) ];
        }

        for ($month = 1; $month <= 12; $month++) {
            $date_str = sprintf("%04d-%02d", $year, $month);
            $dt = new DateTime($date_str . '-01');
            $target_start_ts = $dt->getTimestamp();
            $target_end_ts = (clone $dt)->modify('+1 month')->getTimestamp();
            
            $total_kwh_month = 0;

            foreach ($grouped_data as $subgroup => $data) {
                $start_index = findStartRowIndex($data, $target_start_ts);
                $end_index = findEndRowIndex($data, $target_end_ts);
                if ($start_index !== null && $end_index !== null && $end_index > $start_index) {
                    $consumption = $data[$end_index]['stand_kwh'] - $data[$start_index]['stand_kwh'];
                    if ($consumption > 0) $total_kwh_month += $consumption;
                }
            }
            $aggregatedData[] = ["label" => $month, "total_kwh" => round($total_kwh_month)];
        }
    }

    $finalData = [
        "emission_factor" => $co2_emission_factor,
        "timeframe" => $timeframe,
        "data" => $aggregatedData
    ];

    echo json_encode($finalData, JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Proses database gagal', 'message' => $e->getMessage()]);
}
?>