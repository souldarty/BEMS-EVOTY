<?php
// 1. Memanggil autoloader dari folder api agar library JWT (Firebase\JWT\JWT) dapat ditemukan
require 'vendor/autoload.php';

// 2. Memanggil config.php yang bertugas memuat seluruh variabel dari api/.env
require 'config.php';

// 3. Memanggil database.php untuk melakukan pengecekan ke tabel users
require 'database.php';

use Firebase\JWT\JWT;

// 1. Validasi State untuk mencegah CSRF
if (empty($_GET['state']) || (isset($_SESSION['oauth_state']) && $_GET['state'] !== $_SESSION['oauth_state'])) {
    unset($_SESSION['oauth_state']);
    die('Invalid state. Keamanan CSRF gagal.');
}

// 2. Pastikan kita mendapatkan 'code' dari SSO Server
if (!isset($_GET['code'])) {
    die('Authorization code tidak ditemukan.');
}

// 3. Tukar 'code' dengan 'Access Token' (via cURL POST)
$ch = curl_init(SSO_URL_TOKEN);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'grant_type' => 'authorization_code',
    'client_id' => SSO_CLIENT_ID,
    'client_secret' => SSO_CLIENT_SECRET,
    'redirect_uri' => SSO_REDIRECT_URI,
    'code' => $_GET['code']
]));

if (APP_ENV == 'local') {
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
}

$tokenResponse = curl_exec($ch);
curl_close($ch);
$tokenData = json_decode($tokenResponse, true);

if (!isset($tokenData['access_token'])) {
    die('Gagal mendapatkan access token: ' . print_r($tokenData, true));
}

$accessToken = $tokenData['access_token'];

// 4. Gunakan Access Token untuk mengambil data user (via cURL GET)
$chUser = curl_init(SSO_URL_USER);
curl_setopt($chUser, CURLOPT_RETURNTRANSFER, true);
curl_setopt($chUser, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Authorization: Bearer ' . $accessToken
]);

if (APP_ENV == 'local') {
    curl_setopt($chUser, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($chUser, CURLOPT_SSL_VERIFYHOST, false);
}

$userResponse = curl_exec($chUser);
curl_close($chUser);
$userData = json_decode($userResponse, true);

// =========================================================================
// 5. MODIFIKASI JEMBATAN SSO: Ekstraksi Username yang Akurat
// =========================================================================

// PERBAIKAN: Prioritaskan field khusus username dari SSO jika ada
$username = $userData['username'] ?? $userData['uid'] ?? $userData['preferred_username'] ?? null;

// Jika tidak ada, ambil dari 'name' dan lakukan ekstraksi string (ambil kata pertama)
if (!$username) {
    $rawName = $userData['name'] ?? $userData['email'] ?? 'SSO_User';
    // Memotong string berdasarkan spasi untuk mengisolasi ID di depan (contoh: "SA.INTERN09ID Service, ID" -> "SA.INTERN09ID")
    $usernameParts = explode(' ', $rawName);
    $username = $usernameParts[0];
    
    // Membersihkan karakter aneh seperti koma di akhir kata jika kebetulan menempel
    $username = trim($username, " ,");
}

try {
    // LAKUKAN PENGECEKAN KE DATABASE (dbo.users)
    $sql = "SELECT TOP 1 role, CAST(COALESCE(is_active, 1) AS INT) AS is_active FROM dbo.users WHERE username = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$username]);
    $userDb = $stmt->fetch(PDO::FETCH_ASSOC);

    // KONDISI 1: Username dari SSO tidak terdaftar sama sekali di dbo.users
    if (!$userDb) {
        $errorMsg = "Akses ditolak: Akun SSO Anda (" . $username . ") tidak terdaftar di sistem. Hubungi Administrator.";
        header('Location: http://localhost:5173/?error=' . urlencode($errorMsg));
        exit;
    }

    // KONDISI 2: Username terdaftar, tapi statusnya dinonaktifkan (is_active = 0)
    if ((int)$userDb['is_active'] === 0) {
        $errorMsg = "Akses ditolak: Akun Anda (" . $username . ") telah dinonaktifkan oleh Administrator.";
        header('Location: http://localhost:5173/?error=' . urlencode($errorMsg));
        exit;
    }

    // Jika lolos, gunakan role sesuai yang ada di database
    $role = $userDb['role'];

} catch (PDOException $e) {
    die("Terjadi kesalahan sistem saat memvalidasi akun SSO: " . $e->getMessage());
}

// MURNI MEMBACA DARI .ENV DI FOLDER /api
$kunci_rahasia = $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET');

if (!$kunci_rahasia) {
    die('Fatal Error: Kunci rahasia (JWT_SECRET) tidak ditemukan pada konfigurasi .env di dalam folder /api.');
}

$waktu_sekarang = time();
$waktu_kedaluwarsa = $waktu_sekarang + 3600;

$payload = [
    "username" => $username,
    "role" => $role,
    "iat" => $waktu_sekarang,
    "exp" => $waktu_kedaluwarsa
];

// Cetak Kartu Akses (Token JWT)
$token_jwt = JWT::encode($payload, $kunci_rahasia, 'HS256');

$_SESSION['user'] = [
    'id' => $userData['id'] ?? 1,
    'name' => $username, // Menyimpan username yang sudah diekstrak dan bersih
    'email' => $userData['email'] ?? '',
    'sso_token' => $accessToken
];

// 6. REDIRECT KE REACT (PORT 5173) BILA SUKSES
$reactFrontendUrl = FRONTEND_URL."?sso_token=" . urlencode($token_jwt) . "&username=" . urlencode($username) . "&role=" . urlencode($role);
header('Location: ' . $reactFrontendUrl);
exit;
?>