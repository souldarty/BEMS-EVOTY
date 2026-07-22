<?php
// 1. Konfigurasi Koneksi MSSQL
$serverName = "localhost"; // atau nama instance SQL Server kamu
$connectionInfo = array(
    "Database" => "BEMS",
    "UID" => "dev1",       // Ganti dengan username SQL Server kamu
    "PWD" => "dev123"  // Ganti dengan password SQL Server kamu
);

$conn = sqlsrv_connect($serverName, $connectionInfo);

if (!$conn) {
    die("Koneksi Gagal: " . print_r(sqlsrv_errors(), true));
}

// 2. Data yang akan diupdate
$target_username = 'admin';       // Username yang ingin diganti
$password_baru = 'admin'; // Password baru yang kamu inginkan

// 3. Proses Hashing (Keamanan Utama)
// Hasilnya akan berupa string panjang yang aman disimpan di database
$password_hashed = password_hash($password_baru, PASSWORD_BCRYPT);

// 4. Query Update dengan Prepared Statement
$sql = "UPDATE [dbo].[users] SET [password] = ? WHERE [username] = ?";
$params = array($password_hashed, $target_username);

$stmt = sqlsrv_query($conn, $sql, $params);

if ($stmt === false) {
    die("Gagal update: " . print_r(sqlsrv_errors(), true));
} else {
    echo "## Berhasil!\n";
    echo "Password untuk user **$target_username** telah di-hash dan diperbarui di tabel [BEMS].[dbo].[users].";
}

// Tutup koneksi
sqlsrv_free_stmt($stmt);
sqlsrv_close($conn);
?>