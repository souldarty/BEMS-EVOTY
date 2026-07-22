<?php
// Menggunakan koneksi terpusat (Pastikan database.php menggunakan PDO untuk SQL Server)
require 'database.php'; 

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

date_default_timezone_set('Asia/Jakarta');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// =========================================================================
// 1. SISTEM KEAMANAN JWT
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
    echo json_encode(["success" => false, "message" => "Server Error: JWT Secret tidak ditemukan di .env"]);
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
    echo json_encode(["success" => false, "message" => "Akses Ditolak! Token JWT tidak valid."]);
    exit;
}

// =========================================================================
// 2. LOGIKA UTAMA: PERHITUNGAN KWH KONSUMSI HARIAN (REVISI)
// =========================================================================

$month = isset($_GET['month']) ? str_pad($_GET['month'], 2, '0', STR_PAD_LEFT) : date('m');
$year = isset($_GET['year']) ? (int)$_GET['year'] : date('Y');

// Hitung jumlah hari dalam bulan yang dipilih
$days_in_month = cal_days_in_month(CAL_GREGORIAN, (int)$month, $year);

// REVISI RENTANG WAKTU QUERY:
// Untuk menghitung konsumsi tanggal 1, kita butuh data akhir dari 1 hari sebelum bulan dimulai (hari terakhir bulan lalu).
$start_date = date('Y-m-d 00:00:00', strtotime("$year-$month-01 -1 day")); 
// End date cukup sampai akhir bulan yang dipilih
$end_date = date('Y-m-t 23:59:59', strtotime("$year-$month-01")); 

try {
    // Query SQL Server menggunakan CTE untuk mengambil tepat 1 baris terakhir di tiap akhir hari
    $sql = "
        WITH RankedData AS (
            SELECT 
                group_mv, 
                subgroup_mv, 
                CAST(timestamp AS DATE) as date_val, 
                stand_kwh,
                ROW_NUMBER() OVER(PARTITION BY group_mv, subgroup_mv, CAST(timestamp AS DATE) ORDER BY timestamp DESC) as rn
            FROM dbo.mv_lowvoltage
            WHERE timestamp >= :start_date AND timestamp <= :end_date
        )
        SELECT group_mv, subgroup_mv, date_val, stand_kwh
        FROM RankedData
        WHERE rn = 1
        ORDER BY group_mv ASC, subgroup_mv ASC, date_val ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['start_date' => $start_date, 'end_date' => $end_date]);
    $raw_data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 1. Grouping data mentah berdasarkan: Area -> Meter -> Tanggal
    $meter_data = [];
    foreach ($raw_data as $row) {
        $group = $row['group_mv'];
        $subgroup = $row['subgroup_mv'];
        $date_val = $row['date_val']; 
        $stand = floatval($row['stand_kwh']);

        if (!isset($meter_data[$group])) $meter_data[$group] = [];
        if (!isset($meter_data[$group][$subgroup])) $meter_data[$group][$subgroup] = [];
        
        $meter_data[$group][$subgroup][$date_val] = $stand;
    }

    define('MAX_METER_VALUE', 100000000); // Batas nilai rollover power meter
    $responseData = [];

    // 2. REVISI: Proses perhitungan logika harian yang baru
    foreach ($meter_data as $group => $subgroups) {
        
        $areaObj = [
            "areaName" => $group,
            "meters" => []
        ];

        foreach ($subgroups as $subgroup => $daily_stands) {
            $daily_kwh = [];

            // Loop setiap hari dalam bulan tersebut
            for ($d = 1; $d <= $days_in_month; $d++) {
                
                // Format string tanggal hari ini (Day A) dan HARI SEBELUMNYA (Day B)
                $current_date = sprintf('%04d-%02d-%02d', $year, $month, $d);
                $prev_date = date('Y-m-d', strtotime("$current_date -1 day"));

                // Cek apakah data KWH untuk HARI INI dan HARI SEBELUMNYA tersedia
                if (isset($daily_stands[$current_date]) && isset($daily_stands[$prev_date])) {
                    
                    $current_stand = $daily_stands[$current_date]; // Data akhir HARI INI
                    $prev_stand = $daily_stands[$prev_date];       // Data akhir HARI SEBELUMNYA

                    // Konsumsi = Data hari ini dikurangi Data hari sebelumnya
                    $consumption = $current_stand - $prev_stand;
                    
                    // Antisipasi jika meteran reset/rollover ke 0
                    if ($consumption < 0) {
                        $consumption = (MAX_METER_VALUE - $prev_stand) + $current_stand;
                    }
                    
                    $daily_kwh[$d] = round($consumption, 2);
                } else {
                    $daily_kwh[$d] = null;
                }
            }

            // Memisahkan ID meter dan Deskripsi dari string
            $meterName = $subgroup;
            $description = "";
            $split_pos = strcspn($subgroup, " ("); 
            
            if ($split_pos > 0 && $split_pos < strlen($subgroup)) {
                $meterName = trim(substr($subgroup, 0, $split_pos));
                $description = trim(substr($subgroup, $split_pos), " ()");
            }

            $areaObj["meters"][] = [
                "meterName" => $meterName,
                "description" => $description, 
                "dailyData" => $daily_kwh
            ];
        }

        $responseData[] = $areaObj;
    }

    echo json_encode([
        "success" => true,
        "data" => $responseData
    ], JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Proses database gagal", "details" => $e->getMessage()]);
}
?>