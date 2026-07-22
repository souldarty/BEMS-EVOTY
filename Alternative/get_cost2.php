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

    if ($timeframe === 'yearly') {
        // MODE YEARLY: Ambil semua data tahun dan hitung total per tahun
        $stmt = $pdo->query("SELECT * FROM dbo.cost WHERE unit = 'kwh' ORDER BY year ASC");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $data = [];
        foreach ($rows as $row) {
            $totalCost = (float)($row["jan"] ?? 0) + (float)($row["feb"] ?? 0) + (float)($row["mar"] ?? 0) +
                         (float)($row["apr"] ?? 0) + (float)($row["mei"] ?? 0) + (float)($row["jun"] ?? 0) +
                         (float)($row["jul"] ?? 0) + (float)($row["aug"] ?? 0) + (float)($row["sep"] ?? 0) +
                         (float)($row["oct"] ?? 0) + (float)($row["nop"] ?? 0) + (float)($row["des"] ?? 0);
            
            $data[] = ["year" => (string)$row["year"], "cost" => round($totalCost)];
        }
        echo json_encode($data);

    } else {
        // MODE MONTHLY & QUARTERLY: Ambil data berdasarkan Tahun yang di-filter
        $stmt = $pdo->prepare("SELECT * FROM dbo.cost WHERE unit = 'kwh' AND year = ?");
        $stmt->execute([$year]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            if ($timeframe === 'quarterly') {
                $data = [
                    ["quarter" => "Q1", "cost" => round((float)($row["jan"] ?? 0) + (float)($row["feb"] ?? 0) + (float)($row["mar"] ?? 0))],
                    ["quarter" => "Q2", "cost" => round((float)($row["apr"] ?? 0) + (float)($row["mei"] ?? 0) + (float)($row["jun"] ?? 0))],
                    ["quarter" => "Q3", "cost" => round((float)($row["jul"] ?? 0) + (float)($row["aug"] ?? 0) + (float)($row["sep"] ?? 0))],
                    ["quarter" => "Q4", "cost" => round((float)($row["oct"] ?? 0) + (float)($row["nop"] ?? 0) + (float)($row["des"] ?? 0))],
                ];
            } else { // 'monthly'
                $data = [
                    ["month" => "Jan", "cost" => round((float)($row["jan"] ?? 0))],
                    ["month" => "Feb", "cost" => round((float)($row["feb"] ?? 0))],
                    ["month" => "Mar", "cost" => round((float)($row["mar"] ?? 0))],
                    ["month" => "Apr", "cost" => round((float)($row["apr"] ?? 0))],
                    ["month" => "Mei", "cost" => round((float)($row["mei"] ?? 0))],
                    ["month" => "Jun", "cost" => round((float)($row["jun"] ?? 0))],
                    ["month" => "Jul", "cost" => round((float)($row["jul"] ?? 0))],
                    ["month" => "Aug", "cost" => round((float)($row["aug"] ?? 0))],
                    ["month" => "Sep", "cost" => round((float)($row["sep"] ?? 0))],
                    ["month" => "Oct", "cost" => round((float)($row["oct"] ?? 0))],
                    ["month" => "Nov", "cost" => round((float)($row["nop"] ?? 0))], // DB column is 'nop'
                    ["month" => "Dec", "cost" => round((float)($row["des"] ?? 0))], // DB column is 'des'
                ];
            }
            echo json_encode($data);
        } else {
            // Jika tahun tersebut belum di-generate oleh get_to_convert.php
            echo json_encode([]);
        }
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
}
?>