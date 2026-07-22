<?php
require 'database.php';

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

$method = $_SERVER['REQUEST_METHOD'];
$table = filter_input(INPUT_GET, 'table', FILTER_UNSAFE_RAW);
if (!$table || !in_array($table, ['energy_performance', 'production_entries'])) {
    http_response_code(400);
    echo json_encode(["message" => "Parameter 'table' diperlukan. Gunakan 'energy_performance' atau 'production_entries'."]);
    exit();
}

$input = file_get_contents("php://input");
$data = json_decode($input, true); 

$isEnergyPerformance = ($table === 'energy_performance');

switch ($method) {
    case 'GET':
        try {
            $columns = "id, year, month, ACT, MP" . ($isEnergyPerformance ? ", FC" : "");
            $stmt = $pdo->prepare("SELECT {$columns} FROM dbo.{$table} ORDER BY year DESC, month DESC");
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["message" => "Gagal mengambil data: " . $e->getMessage()]);
        }
        break;

    case 'POST':
        try {
            $checkStmt = $pdo->prepare("SELECT id FROM dbo.{$table} WHERE year = :year AND month = :month");
            $checkStmt->execute([':year' => $data['year'], ':month' => $data['month']]);

            if ($checkStmt->rowCount() > 0) {
                http_response_code(409);
                echo json_encode(["message" => "Data untuk tahun dan bulan ini sudah ada."]);
                break;
            }

            if ($isEnergyPerformance) {
                $sql = "INSERT INTO dbo.{$table} (year, month, ACT, MP, FC) VALUES (:year, :month, :ACT, :MP, :FC)";
                $params = [
                    ':year' => $data['year'], ':month' => $data['month'],
                    ':ACT' => isset($data['ACT']) && $data['ACT'] !== '' ? $data['ACT'] : '0',
                    ':MP' => isset($data['MP']) && $data['MP'] !== '' ? $data['MP'] : '0',
                    ':FC' => isset($data['FC']) && $data['FC'] !== '' ? $data['FC'] : '0'
                ];
            } else {
                $sql = "INSERT INTO dbo.{$table} (year, month, ACT, MP) VALUES (:year, :month, :ACT, :MP)";
                $params = [
                    ':year' => $data['year'], ':month' => $data['month'],
                    ':ACT' => isset($data['ACT']) && $data['ACT'] !== '' ? $data['ACT'] : '0',
                    ':MP' => isset($data['MP']) && $data['MP'] !== '' ? $data['MP'] : '0'
                ];
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(["message" => "Data berhasil ditambahkan.", "id" => $pdo->lastInsertId()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["message" => "Gagal membuat data: " . $e->getMessage()]);
        }
        break;

    case 'PUT':
        try {
            $set_parts = ["year = :year", "month = :month"];
            $params = [':id' => $data['id'], ':year' => $data['year'], ':month' => $data['month']];

            if (isset($data['ACT'])) { $set_parts[] = "ACT = :ACT"; $params[':ACT'] = $data['ACT'] !== '' ? $data['ACT'] : '0'; }
            if (isset($data['MP'])) { $set_parts[] = "MP = :MP"; $params[':MP'] = $data['MP'] !== '' ? $data['MP'] : '0'; }
            
            if ($isEnergyPerformance && isset($data['FC'])) {
                $set_parts[] = "FC = :FC"; $params[':FC'] = $data['FC'] !== '' ? $data['FC'] : '0';
            }

            $sql = "UPDATE dbo.{$table} SET " . implode(', ', $set_parts) . " WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            echo json_encode(["message" => "Data berhasil diperbarui."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["message" => "Gagal memperbarui data: " . $e->getMessage()]);
        }
        break;

    case 'DELETE':
        try {
            $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
            $sql = "DELETE FROM dbo.{$table} WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id' => $id]);
            echo json_encode(["message" => "Data berhasil dihapus."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["message" => "Gagal menghapus data: " . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["message" => "Metode tidak diizinkan."]);
        break;
}
?>