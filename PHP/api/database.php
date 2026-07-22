<?php

require 'vendor/autoload.php';

$repository = Dotenv\Repository\RepositoryBuilder::createWithNoAdapters()
    ->addAdapter(Dotenv\Repository\Adapter\EnvConstAdapter::class)
    ->addWriter(Dotenv\Repository\Adapter\PutenvAdapter::class)
    ->immutable()
    ->make();

$dotenv = Dotenv\Dotenv::create($repository, __DIR__);
$dotenv->load();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Optimasi: Gunakan $_ENV sebagai prioritas utama, dengan getenv() sebagai cadangan
$serverName = $_ENV['DB_HOST'] ?? getenv('DB_HOST');
$dbName = $_ENV['DB_NAME'] ?? getenv('DB_NAME');
$uid = $_ENV['DB_USER'] ?? getenv('DB_USER');
$pwd = $_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD');

// =========================================================================
// AUTO-SANITIZER (PENYELARASAN BACKSLASH AUTOMATIS)
// Mengubah double backslash (\\) atau forward slash (/) menjadi single backslash (\).
// Ini menjamin SSMS selalu menerima format 1 backslash yang sempurna tanpa
// menyebabkan error parsing pada file .env!
// =========================================================================
if ($serverName) {
    $serverName = str_replace(['\\\\', '/'], '\\', $serverName);
}
// =========================================================================

$pdo = null;

try {
    // Parameter Encrypt=false dan TrustServerCertificate=true untuk melewati blokade SSL ODBC Driver
    $dsn = "sqlsrv:server=$serverName;Database=$dbName;Encrypt=false;TrustServerCertificate=true";
    
    $pdo = new PDO($dsn, $uid, $pwd);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Koneksi database gagal: " . $e->getMessage()]);
    exit();
}

?>