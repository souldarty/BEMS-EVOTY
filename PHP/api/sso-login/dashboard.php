<?php
require 'config.php';

// Cek apakah user sudah login
if (!isset($_SESSION['user'])) {
    header('Location: ' . BASE_URL . '/login.php');
    exit;
}


// Logout
if (isset($_GET['logout'])) {
    unset($_SESSION['user']);
    session_destroy();
    header('Location: ' . BASE_URL . '/login.php');
    exit;
}

$user = $_SESSION['user'];
?>

<!DOCTYPE html>
<html>

<head>
    <title>Dashboard SSO Client</title>
</head>

<body>
    <h1>Selamat Datang, <?= htmlspecialchars($user['name']); ?>!</h1>
    <p>Email: <?= htmlspecialchars($user['email']); ?></p>
    <p>SSO ID: <?= htmlspecialchars($user['id']); ?></p>

    <a href="?logout">Logout</a>
</body>

</html>