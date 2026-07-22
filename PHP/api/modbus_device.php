<?php
/**
 * modbus_device.php
 * Backend untuk CRUD Modbus Device Management
 * REVISI: Logika status koneksi diubah dari TCP Socket Ping menjadi validasi waktu last_seen (Batas 5 Jam).
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require 'database.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

// ============================================================
// SATPAM — JWT VERIFICATION
// ============================================================
$headers       = apache_request_headers();
$kunci_rahasia = getenv('JWT_SECRET');

if (!isset($headers['Authorization'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Akses Ditolak. Token JWT tidak ditemukan."]);
    exit();
}
$token_jwt = str_replace('Bearer ', '', $headers['Authorization']);
try {
    $decoded = JWT::decode($token_jwt, new Key($kunci_rahasia, 'HS256'));
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Akses Ditolak. (" . $e->getMessage() . ")"]);
    exit();
}

// MENGAMBIL ROLE DARI JWT UNTUK VALIDASI BACKEND
$userRole = isset($decoded->data->role) ? $decoded->data->role : (isset($decoded->role) ? $decoded->role : '');
$canModify = ($userRole === 'Administrator' || $userRole === 'Coordinator');

$action = isset($_GET['action']) ? $_GET['action'] : '';

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'get') {
        // 1. Ambil list device dari database
        $stmt = $pdo->prepare("SELECT * FROM dbo.modbus_devices ORDER BY group_mv, name");
        $stmt->execute();
        $devices = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 2. Ambil data last_seen aktual dari tabel mv_lowvoltage
        $stmtLastSeen = $pdo->prepare("SELECT subgroup_mv, MAX(timestamp) as last_seen FROM dbo.mv_lowvoltage GROUP BY subgroup_mv");
        $stmtLastSeen->execute();
        $lastSeenData = $stmtLastSeen->fetchAll(PDO::FETCH_KEY_PAIR); // Menghasilkan array [subgroup_mv => last_seen]

        // REVISI LOGIKA: Status Koneksi didasarkan pada selisih batas waktu 5 jam (5 jam * 3600 detik)
        $currentTime = time();
        $fiveHoursInSeconds = 5 * 3600;

        foreach ($devices as &$dev) {
            $subgroup = $dev['subgroup_mv'];
            $last_seen_str = isset($lastSeenData[$subgroup]) ? $lastSeenData[$subgroup] : null;
            
            $dev['last_seen'] = $last_seen_str;
            $dev['is_connected'] = false; // Default Offline
            
            if ($last_seen_str) {
                $last_seen_timestamp = strtotime($last_seen_str);
                // Jika data terakhir kurang dari atau sama dengan 5 jam yang lalu, tetapkan menjadi Online
                if (($currentTime - $last_seen_timestamp) <= $fiveHoursInSeconds) {
                    $dev['is_connected'] = true;
                }
            }
        }

        echo json_encode(["success" => true, "data" => $devices]);
    } 
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // VALIDASI HAK AKSES BACKEND
        if (!$canModify) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Akses ditolak. Anda tidak memiliki izin untuk menyimpan device."]);
            exit();
        }

        $data = json_decode(file_get_contents("php://input"));
        
        if (isset($data->id) && $data->id !== "") {
            $sql = "UPDATE dbo.modbus_devices SET name=?, ip_address=?, port=?, unit_id=?, group_mv=?, subgroup_mv=?, device_type=? WHERE id=?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$data->name, $data->ip_address, $data->port, $data->unit_id, $data->group_mv, $data->subgroup_mv, $data->device_type, $data->id]);
        } else {
            $sql = "INSERT INTO dbo.modbus_devices (name, ip_address, port, unit_id, group_mv, subgroup_mv, device_type) VALUES (?, ?, ?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$data->name, $data->ip_address, $data->port, $data->unit_id, $data->group_mv, $data->subgroup_mv, $data->device_type]);
        }
        echo json_encode(["success" => true, "message" => "Data saved successfully"]);
    } 
    elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action === 'delete') {
        // VALIDASI HAK AKSES BACKEND
        if (!$canModify) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Akses ditolak. Anda tidak memiliki izin untuk menghapus device."]);
            exit();
        }

        $id = $_GET['id'];
        $stmt = $pdo->prepare("DELETE FROM dbo.modbus_devices WHERE id=?");
        $stmt->execute([$id]);
        echo json_encode(["success" => true, "message" => "Data deleted successfully"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "DB Error: " . $e->getMessage()]);
}
?>