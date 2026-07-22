<?php
// Pastikan session selalu berjalan di setiap file yang membutuhkan login
session_start();

// Load .env variables
$env_path = __DIR__ . '/.env';
if (file_exists($env_path)) {
    $lines = file($env_path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim(trim($value), '"\'');

            if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
                putenv(sprintf('%s=%s', $name, $value));
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
    }
}
define('BASE_URL', $_ENV['BASE_URL'] ?? getenv('BASE_URL') ?: '');

// Kredensial dari SSO Server Anda
define('SSO_CLIENT_ID', $_ENV['SSO_CLIENT_ID'] ?? getenv('SSO_CLIENT_ID') ?: '');
define('SSO_CLIENT_SECRET', $_ENV['SSO_CLIENT_SECRET'] ?? getenv('SSO_CLIENT_SECRET') ?: '');
define('SSO_REDIRECT_URI', BASE_URL . '/callback.php');

$sso_server = $_ENV['SSO_SERVER_URL'] ?? getenv('SSO_SERVER_URL') ?: '';

// Endpoint SSO Server Laravel (Sesuaikan dengan URL Server Anda)
define('SSO_URL_AUTHORIZE', $sso_server . '/oauth/authorize');
define('SSO_URL_TOKEN', $sso_server . '/oauth/token');
define('SSO_URL_USER', $sso_server . '/api/user');
define('FRONTEND_URL', $_ENV['FRONTEND_URL'] ?? getenv('FRONTEND_URL') ?: 'http://localhost:5173/');
define('APP_ENV', $_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: 'local');
