<?php

require 'database.php'; 

header('Content-Type: application/json');
header('Cache-Control: no-cache, must-revalidate');
header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');

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

function send_error_response($message, $code = 500) {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}

// Menangkap parameter tahun dari React (Default: Tahun Ini)
$year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
$view = $_GET['view'] ?? '';

// Konfigurasi Area berdasarkan kolom subgroup_mv
$AREAS_CONFIG = [
    'Mixing' => [
        "101-11-02BY1.1 TSE+RD 116.01", "(Mixer Control) + D&W 115.01", "101-06-01(Oil Storage)", 
        "101-06-02 Manual Small Chemical Dosing", "101-11-15 Rubber Cutter", "101-11-01", 
        "101-11-06(Batch Off Control By 1.1 118.01)", "(Mixer Control) + D&W 215.01", 
        "Roll Mill Distribution 400V 216.10", "Roll Mill Distribution 400V 216.20", 
        "Roll Mill Distribution 400V 216.30", "101-21-18(Batch Off Control By 2.1 218.10)", "101-21-01"
    ],
    'Semifinishing' => [
        "(102-07-01 Inner Liner (Mini Roller Head + Extruder 90mm))","(102-07-02 Extruder 1 (150mm))",
        "(102-07-03 Extruder 2 (150mm))","(102-07-04 Calender)","(102-01-01 Calender (250mm))",
        "(102-01-03 Textile Calender Open Mill)","(102-01-04 Extruder#1 (250mm))","(102-01-05 Extruder#2 (250mm))",
        "(Out Going Trafo # 3)","(102-09-01 Bead Building M/C 1)","(102-10-01 Bead Building M/C 2)",
        "(102-04-01 Ply Cutting)","(102-05-01 Bias Cutter)","(102-13-01 Bead Filler)","(Mini Slitter)",
        "(B2 LV01 Lighting & Power Distribution)","(B2 LV02 Power Distribution)","(DB SF/ 1 AHU Semi Finishing)"
    ],
    'Curing' => [
        "(104-C2-LV01 Double Power Curing Line A, B & C)","(Curing Line D Busduct Line D Curing)",
        "(Curing Line E Busduct Line E Curing)","(Curing Line F Busduct Line F Curing)",
        "104-C1-LV04 Spray painting & condensate)","(DB.C.EXT.1)","(104.C1.LV01.2)","(104.C1.LV01.1)",
        "(902C LV01 1)","(DB MCC Curing AHU Curing)","(104-C1-LV01 PMCC/CB/2A AHU)"
    ],
    'Tyre Building' => [
        "(103- Busduct BTU 2 Tyre Building Machine BTU 2)","(103- Busduct BTU 3 Tyre Building Machine BTU 3)",
        "(103- Busduct STU 4 Tyre Building Machine STU 4)","(103- Busduct STU 5 Tyre Building Machine STU 5)",
        "(103- Busduct STU 6 Tyre Building Machine STU 6)","(103 C1 LV01 1)","(103 C1 LV01 2)","(MCC/ TR/ 1)"
    ],
    'Finishing' => [
        "(Dinamic Balance machine DBM & Wrapping)","(DB Mech # 3 Exhaust TB,FP,Musholla & Sand blast)",
        "(MCC/ TR/ 1)","(105.C1.LV01.1)"
    ],
    'Utilities' => [
        "(MCC Vaccum pump Vaccum & condensat pump)","(204.C1.LV01.1)","(Air Compressor No.3)",
        "(Air Compressor No.1)","(Air Compressor No.2)","(202-U1-LV01 Cooling Tower MCC)",
        "(Water Cooled Chiller No. 1)","(Water Cooled Chiller No. 2)","(Water Cooled Chiller No. 3)",
        "(202-U2-LV01 Industrial Water Chiller MCC)","(WWTP WWTP area)","((204-DG2-1 Boiler House) - (ATS MV C UPS 120 KVA))",
        "((ATS 2 MV U) - (GUEST HOUSE))","(ATS Panel Emergency MV A)","(ATS Panel Emergency MV B)",
        "(ATS Panel Emergency MV C)","(ATS Panel MV U)"
    ],
    'R&D LAB' => [
        "108-A1-LV01 R&D(DB LAB/2)","(101-A2-LV01-2 (DB Lab.lighting))","(DB- AHU Indoor Test AC & Heater Indoortest)",
        "(107-C1-LV01 DB Indoor Test)","(107 C1 LV01 1)"
    ],
    'Warehouse' => [
        "(106 C1 LV01 1)","(106 C1 LV01 2)","(902D.C1.LV01.1)","(Warehouse Pirelli (New SDP))"
    ],
    'General Affair' => [
        "(MCC 2 Main Office AC Main aoffice)","(DB MCC #3 AC Production Office)","(MCC # 6 AC Canteen)",
        "(907-C2-LV01 Entrance A)","(MCC # 5 AC Infirmary)","(Lighting External 2 Street Lighting Zone 1)",
        "(DB Mech # 3 non industri - Musholla)","(DB- 901-C2-LV01 Lighting & power distribution)",
        "(DB - GF 902-C2-LV01 Lighting & Receptacle Factory Office)","(903.C1.LV01.1)","(904 C1 LV01 1)",
        "(906-C1-LV01 Locker Room)","(GUEST HOUSE)","(DB Mech # 2 MCC 8,MCC7,MCC 4)"
    ]
];

// Menyiapkan 12 baris laporan (Jan - Dec)
$months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
$chartData = [];
foreach ($months as $index => $monthName) {
    $chartData[$index + 1] = ['month' => $monthName];
    foreach (array_keys($AREAS_CONFIG) as $areaName) {
        $chartData[$index + 1][$areaName] = 0;
    }
}

if ($view === 'total_per_area') {
    $unionQueries = [];
    $params = [];
    
    // Membangun Kueri Dinamis untuk setiap Area
    foreach ($AREAS_CONFIG as $areaName => $keys) {
        if (!empty($keys)) {
            $placeholders = implode(',', array_fill(0, count($keys), '?'));
            $unionQueries[] = "
                SELECT 
                    '{$areaName}' AS area,
                    MONTH(timestamp) AS month,
                    subgroup_mv,
                    CASE 
                        WHEN MAX(stand_kwh) - MIN(stand_kwh) < 0 THEN 0 
                        ELSE MAX(stand_kwh) - MIN(stand_kwh) 
                    END AS consumption
                FROM dbo.mv_lowvoltage
                WHERE YEAR(timestamp) = ? AND subgroup_mv IN ($placeholders)
                GROUP BY subgroup_mv, MONTH(timestamp)
            ";
            
            // Masukkan parameter tahun
            $params[] = $year;
            // Masukkan parameter setiap subgroup_mv untuk klausa IN
            foreach ($keys as $key) {
                $params[] = $key;
            }
        }
    }

    if (!empty($unionQueries)) {
        // Menggabungkan semua perhitungan dan menjumlahkannya (SUM) berdasarkan Area dan Bulan
        $sql = "
            SELECT area, month, SUM(consumption) as total_consumption
            FROM (" . implode(" UNION ALL ", $unionQueries) . ") as individual_meters
            GROUP BY area, month
        ";

        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Memasukkan hasil kueri ke dalam cetakan 12 Bulan yang sudah kita siapkan
            foreach ($results as $row) {
                $monthIndex = (int)$row['month'];
                $areaName = $row['area'];
                if (isset($chartData[$monthIndex][$areaName])) {
                    $chartData[$monthIndex][$areaName] = (float)$row['total_consumption'];
                }
            }
        } catch (PDOException $e) {
            send_error_response('Aggregate query failed: ' . $e->getMessage());
        }
    }

    // Mengembalikan data dalam format JSON
    echo json_encode(array_values($chartData));
} else {
    send_error_response("View tidak valid.", 400);
}
?>