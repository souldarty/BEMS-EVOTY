<?php
require 'config.php';

if (isset($_SESSION['user'])) {
    header('Location: ' . BASE_URL . '/dashboard.php');
    exit;
}

if (isset($_GET['SSO'])) {

    // 1. Buat random string untuk parameter 'state' (Anti-CSRF)
    $state = bin2hex(random_bytes(16));
    $_SESSION['oauth_state'] = $state;

    // 2. Siapkan query parameter untuk URL Otorisasi
    $query = http_build_query([
        'client_id' => SSO_CLIENT_ID,
        'redirect_uri' => SSO_REDIRECT_URI,
        'response_type' => 'code',
        'scope' => '', // Isi jika ada scope spesifik, misal: 'view-profile'
        'state' => $state,
    ]);

    // 3. Redirect user ke SSO Server
    $authUrl = SSO_URL_AUTHORIZE . '?' . $query;
    header('Location: ' . $authUrl);
    exit;
}


?>

<!DOCTYPE html>
<html>

<head>
    <title>Login SSO Client</title>
</head>

<body>
    <h1>Login SSO Client</h1>
    <p>Silahkan klik tombol di bawah ini untuk login ke SSO Server</p>
    <a href="?SSO=login">Login</a>
</body>

</html>