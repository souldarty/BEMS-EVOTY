<?php
require 'config.php';

// =========================================================================
// 1. LOGIKA SSO DITEMPATKAN PALING ATAS
// Dieksekusi sebelum memanggil database agar tidak terblokir jika DB mati
// =========================================================================
if (isset($_GET['SSO'])) {
    // Buat random string untuk parameter 'state' (Anti-CSRF)
    $state = bin2hex(random_bytes(16));
    $_SESSION['oauth_state'] = $state;

    // Siapkan query parameter untuk URL Otorisasi
    $query = http_build_query([
        'client_id' => SSO_CLIENT_ID,
        'redirect_uri' => SSO_REDIRECT_URI,
        'response_type' => 'code',
        'scope' => '', 
        'state' => $state,
    ]);

    // Redirect user ke SSO Server
    $authUrl = SSO_URL_AUTHORIZE . '?' . $query;
    header('Location: ' . $authUrl);
    exit; // Pastikan menggunakan exit agar script di bawahnya tidak dijalankan
}
// =========================================================================

// 2. PEMANGGILAN DATABASE UNTUK LOGIN LOKAL
// Hanya dieksekusi jika pengguna tidak sedang melakukan login SSO
require 'database.php';

// --- TAMBAHAN JWT: Memanggil mesin pembuat token ---
use Firebase\JWT\JWT;
// --------------------------------------------------

$input = json_decode(file_get_contents('php://input'), true);

if (json_last_error() !== JSON_ERROR_NONE && !empty(file_get_contents('php://input'))) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Permintaan tidak valid: JSON salah format."]);
    exit();
}

if (!isset($input['username']) || !isset($input['password'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Username dan password diperlukan."]);
    exit();
}

$username = $input['username'];
$password = $input['password'];
$response = [];

try {
    // Mengambil password, role, dan status is_active dari database
    $sql = "SELECT TOP 1 password, role, CAST(COALESCE(is_active, 1) AS INT) AS is_active FROM dbo.users WHERE username = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$username]);

    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        
        // PERBAIKAN: Memaksa konversi (int) agar string "0" dari PDO dibaca dengan akurat sebagai angka 0
        if ((int)$user['is_active'] === 0) {
            http_response_code(403);
            echo json_encode([
                "success" => false, 
                "message" => "Akses ditolak: Akun Anda telah dinonaktifkan, silahkan menghubungi admin."
            ]);
            exit(); // Hentikan proses secara paksa, JWT tidak akan dibuat!
        }

        // --- TAMBAHAN JWT: Proses mencetak kartu akses dimulai ---
        $kunci_rahasia = getenv('JWT_SECRET'); 
        $waktu_sekarang = time();
        $waktu_kedaluwarsa = $waktu_sekarang + 3600; 

        $payload = [
            "username" => $username,
            "role" => $user['role'],
            "iat" => $waktu_sekarang,
            "exp" => $waktu_kedaluwarsa
        ];

        $token_jwt = JWT::encode($payload, $kunci_rahasia, 'HS256');
        // --- TAMBAHAN JWT SELESAI ---

        http_response_code(200);
        $response = [
            "success" => true,
            "message" => "Login berhasil.",
            "token" => $token_jwt,
            "user" => [
                "username" => $username,
                "role" => $user['role'] 
            ]
        ];
    } else {
        http_response_code(401);
        $response = ["success" => false, "message" => "Username atau password salah."];
    }

} catch (PDOException $e) {
    http_response_code(500);
    $response = ["success" => false, "message" => "Terjadi kesalahan pada server: " . $e->getMessage()];
}

echo json_encode($response);
?>