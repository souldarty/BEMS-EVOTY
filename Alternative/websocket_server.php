<?php
// websocket_server.php

require 'vendor/autoload.php';

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use React\EventLoop\Factory as LoopFactory;

// Muat variabel environment seperti di database.php
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

class ModbusServer implements MessageComponentInterface {
    protected $clients;
    private $pdo;
    private $lastDevicesStateHash = '';

    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->connectDb();
        echo "Server WebSocket untuk Status Modbus sedang berjalan...\n";
    }

    private function connectDb() {
        $serverName = getenv('DB_HOST');
        $dbName = getenv('DB_NAME');
        $uid = getenv('DB_USER');
        $pwd = getenv('DB_PASSWORD');
        try {
            $this->pdo = new PDO("sqlsrv:server=$serverName;Database=$dbName", $uid, $pwd);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            echo "Koneksi database berhasil.\n";
        } catch(PDOException $e) {
            echo "Koneksi database gagal: " . $e->getMessage() . "\n";
            exit(); // Keluar jika DB gagal terkoneksi
        }
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->clients->attach($conn);
        echo "Koneksi baru diterima! ({$conn->resourceId})\n";
        
        // Kirim data saat ini ke klien yang baru terhubung
        $this->sendCurrentDeviceStatus($conn);
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        // Untuk kasus ini, kita tidak perlu menerima pesan dari klien.
        // Klien hanya menerima data.
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);
        echo "Koneksi ({$conn->resourceId}) ditutup.\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "Terjadi error: {$e->getMessage()}\n";
        $conn->close();
    }

    // Fungsi untuk mengambil data dari DB dan mengirim ke semua klien jika ada perubahan
    public function checkAndBroadcastDeviceStatus() {
        try {
            $stmt = $this->pdo->query("SELECT id, name, ip_address, port, unit_id, is_connected, last_seen, group_mv, subgroup_mv FROM BEMS.dbo.modbus_devices ORDER BY name ASC");
            $devices = $stmt->fetchAll();
            
            // Konversi boolean/int
            foreach ($devices as $key => $device) {
                $devices[$key]['is_connected'] = (int)$device['is_connected'];
            }

            $currentStateHash = md5(json_encode($devices));

            // Hanya kirim jika ada perubahan data
            if ($currentStateHash !== $this->lastDevicesStateHash) {
                echo "Terdeteksi perubahan status perangkat. Mengirim pembaruan...\n";
                $this->lastDevicesStateHash = $currentStateHash;
                $payload = json_encode(["success" => true, "devices" => $devices]);
                
                foreach ($this->clients as $client) {
                    $client->send($payload);
                }
            }
        } catch (\PDOException $e) {
            echo "Error saat query DB: " . $e->getMessage() . "\n";
            // Coba re-koneksi jika koneksi hilang
            $this->connectDb();
        }
    }
    
    // Fungsi untuk mengirim status saat ini hanya ke satu koneksi (saat onOpen)
    private function sendCurrentDeviceStatus(ConnectionInterface $conn) {
         try {
            $stmt = $this->pdo->query("SELECT id, name, ip_address, port, unit_id, is_connected, last_seen, group_mv, subgroup_mv FROM BEMS.dbo.modbus_devices ORDER BY name ASC");
            $devices = $stmt->fetchAll();
            foreach ($devices as $key => $device) {
                $devices[$key]['is_connected'] = (int)$device['is_connected'];
            }
            $payload = json_encode(["success" => true, "devices" => $devices]);
            $conn->send($payload);
         } catch (\PDOException $e) {
             echo "Error saat mengirim status awal: " . $e->getMessage() . "\n";
         }
    }
}

// Buat event loop
$loop = LoopFactory::create();
$modbusServer = new ModbusServer();

// Atur timer periodik untuk memeriksa status DB setiap 1 detik
$loop->addPeriodicTimer(2, function() use ($modbusServer) {
    $modbusServer->checkAndBroadcastDeviceStatus();
});

// Buat server WebSocket yang berjalan di port 8080
$socket = new SocketServer('0.0.0.0:8080', $loop);

// Gabungkan semuanya dengan IoServer
$server = new IoServer(
    new HttpServer(
        new WsServer(
            $modbusServer
        )
    ),
    $socket,
    $loop
);

echo "Server berjalan di http://0.0.0.0:8080\n";

$server->run();