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

// EKSTRAKSI ROLE PEMOHON UNTUK KEAMANAN BACKEND
$tokenParts = explode('.', $token);
$payload = json_decode(base64_decode(strtr($tokenParts[1], '-_', '+/')), true);
$currentUserRole = $payload['role'] ?? '';

// =========================================================================
// 2. LOGIKA UTAMA PROGRAM & AUTO-MIGRATION SCHEMA
// =========================================================================

try {
    try {
        $pdo->exec("
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND name = 'is_active'
            )
            BEGIN
                ALTER TABLE [dbo].[users] ADD [is_active] INT NOT NULL DEFAULT 1;
            END
        ");
    } catch (Exception $migrateErr) {
        // Abaikan jika tidak ada izin DDL
    }

    $method = $_SERVER['REQUEST_METHOD'];
    $action = '';

    if ($method === 'GET') {
        $action = $_GET['action'] ?? '';
    } else {
        $input = file_get_contents("php://input");
        $data = json_decode($input, true);

        if (json_last_error() !== JSON_ERROR_NONE && !empty($input)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Permintaan tidak valid: JSON salah format."]);
            exit();
        }
        $action = $data['action'] ?? '';
    }

    if ($method === 'GET') {
        switch ($action) {
            case 'getParameters':
                $sql = "
                    WITH LatestSettings AS (
                        SELECT s1.*, ROW_NUMBER() OVER(PARTITION BY title ORDER BY published DESC) as rn
                        FROM dbo.settings s1
                    )
                    SELECT id, title, value, unit, author, published, start_datetime, end_datetime
                    FROM LatestSettings WHERE rn = 1";
                $stmt = $pdo->query($sql);
                echo json_encode(["success" => true, "settings" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
                break;

            case 'getUsers':
                $stmt = $pdo->query("SELECT id, username, role, CAST(COALESCE(is_active, 1) AS INT) AS is_active, created_at FROM dbo.users ORDER BY created_at DESC");
                echo json_encode(["success" => true, "users" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
                break;
            
            default:
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Aksi GET yang ditentukan tidak valid."]);
                break;
        }
    } elseif ($method === 'POST') {
        switch ($action) {
            case 'saveParameter':
                $sql = "INSERT INTO dbo.settings (title, value, unit, author, published, start_datetime, end_datetime) VALUES (?, ?, ?, ?, GETDATE(), ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$data['title'], $data['value'], $data['unit'], $data['author'], $data['start_datetime'], $data['end_datetime']]);
                echo json_encode(["success" => true, "message" => "Parameter berhasil disimpan."]);
                break;
            
            case 'addUser':
                if (empty($data['username']) || empty($data['password']) || empty($data['role'])) {
                     http_response_code(400);
                     echo json_encode(["success" => false, "message" => "Username, password, dan role harus diisi."]);
                     exit;
                }

                $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM dbo.users WHERE username = ?");
                $stmt->execute([$data['username']]);
                if ($stmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
                    http_response_code(409);
                    echo json_encode(["success" => false, "message" => "Username sudah terdaftar."]);
                    exit;
                }

                $hashedPassword = password_hash($data['password'], PASSWORD_BCRYPT);
                $sql = "INSERT INTO dbo.users (username, password, role, is_active, created_at) VALUES (?, ?, ?, 1, GETDATE())";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$data['username'], $hashedPassword, $data['role']]);
                echo json_encode(["success" => true, "message" => "User berhasil ditambahkan."]);
                break;
            
            case 'verifyPassword':
                if (empty($data['username']) || !isset($data['password']) || $data['password'] === '') {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Username dan password diperlukan."]);
                    exit;
                }

                $stmt = $pdo->prepare("SELECT password, CAST(COALESCE(is_active, 1) AS INT) AS is_active FROM dbo.users WHERE username = ?");
                $stmt->execute([$data['username']]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($user && password_verify($data['password'], $user['password'])) {
                    if ($user['is_active'] == 0) {
                        http_response_code(403);
                        echo json_encode(["success" => false, "message" => "Akun Anda telah dinonaktifkan."]);
                        exit;
                    }
                    echo json_encode(["success" => true, "message" => "Password terverifikasi."]);
                } else {
                    http_response_code(401);
                    echo json_encode(["success" => false, "message" => "Password yang Anda masukkan salah."]);
                }
                break;

            case 'updateUserPassword':
                if (empty($data['id']) || empty($data['password'])) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "ID User dan sandi baru diperlukan."]);
                    exit;
                }

                $stmt = $pdo->prepare("SELECT username FROM dbo.users WHERE id = ?");
                $stmt->execute([$data['id']]);
                $userTarget = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($userTarget && strtolower($userTarget['username']) === 'admin') {
                    http_response_code(403);
                    echo json_encode(["success" => false, "message" => "Sandi untuk akun admin tidak dapat diubah."]);
                    exit;
                }

                $hashedPassword = password_hash($data['password'], PASSWORD_BCRYPT);
                $stmt = $pdo->prepare("UPDATE dbo.users SET password = ? WHERE id = ?");
                $stmt->execute([$hashedPassword, $data['id']]);
                
                echo json_encode(["success" => true, "message" => "Sandi berhasil diperbarui."]);
                break;

            case 'toggleUserStatus':
                if (empty($data['id']) || !isset($data['is_active'])) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "ID User dan status diperlukan."]);
                    exit;
                }

                $stmt = $pdo->prepare("SELECT username FROM dbo.users WHERE id = ?");
                $stmt->execute([$data['id']]);
                $userTarget = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($userTarget && strtolower($userTarget['username']) === 'admin') {
                    http_response_code(403);
                    echo json_encode(["success" => false, "message" => "Akun admin utama tidak dapat dinonaktifkan."]);
                    exit;
                }

                $new_status = (int)$data['is_active'];
                $stmt = $pdo->prepare("UPDATE dbo.users SET is_active = ? WHERE id = ?");
                $stmt->execute([$new_status, $data['id']]);
                
                echo json_encode(["success" => true, "message" => "Status akun berhasil diperbarui."]);
                break;
            
            // --- BLOK BARU: MENGUBAH ROLE PENGGUNA (updateUserRole) ---
            case 'updateUserRole':
                if (empty($data['id']) || empty($data['role'])) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "ID User dan role baru diperlukan."]);
                    exit;
                }

                // 1. Ambil data target user
                $stmt = $pdo->prepare("SELECT username, role FROM dbo.users WHERE id = ?");
                $stmt->execute([$data['id']]);
                $userTarget = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$userTarget) {
                    http_response_code(404);
                    echo json_encode(["success" => false, "message" => "User tidak ditemukan di database."]);
                    exit;
                }

                // 2. Proteksi bawaan: Akun 'admin' utama tidak bisa diubah rolenya
                if (strtolower($userTarget['username']) === 'admin') {
                    http_response_code(403);
                    echo json_encode(["success" => false, "message" => "Role pada akun admin bawaan sistem tidak dapat diubah."]);
                    exit;
                }

                // 3. Proteksi Hierarki (Server-Side)
                if ($currentUserRole === 'Coordinator') {
                    if ($userTarget['role'] === 'Administrator') {
                        http_response_code(403);
                        echo json_encode(["success" => false, "message" => "Coordinator dilarang mengubah role Administrator."]);
                        exit;
                    }
                    if ($data['role'] === 'Administrator') {
                        http_response_code(403);
                        echo json_encode(["success" => false, "message" => "Coordinator dilarang memberikan hak akses Administrator kepada siapapun."]);
                        exit;
                    }
                }

                // 4. Eksekusi Perubahan
                $stmt = $pdo->prepare("UPDATE dbo.users SET role = ? WHERE id = ?");
                $stmt->execute([$data['role'], $data['id']]);
                
                echo json_encode(["success" => true, "message" => "Role berhasil diperbarui menjadi " . $data['role']]);
                break;
            // -----------------------------------------------------------

            case 'deleteUser':
                 if (empty($data['id'])) {
                     http_response_code(400);
                     echo json_encode(["success" => false, "message" => "User ID diperlukan."]);
                     exit;
                 }
                 
                 $stmt = $pdo->prepare("SELECT username FROM dbo.users WHERE id = ?");
                 $stmt->execute([$data['id']]);
                 $userTarget = $stmt->fetch(PDO::FETCH_ASSOC);
                 
                 if ($userTarget && strtolower($userTarget['username']) === 'admin') {
                    http_response_code(403);
                    echo json_encode(["success" => false, "message" => "Akun admin tidak dapat dihapus."]);
                    exit;
                 }

                 $stmt = $pdo->prepare("DELETE FROM dbo.users WHERE id = ?");
                 $stmt->execute([$data['id']]);
                 echo json_encode(["success" => true, "message" => "User berhasil dihapus."]);
                break;

            default:
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Aksi POST yang ditentukan tidak valid."]);
                break;
        }
    } else {
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Metode tidak didukung."]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Terjadi kesalahan server internal: " . $e->getMessage()]);
}
?>