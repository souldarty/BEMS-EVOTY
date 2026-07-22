<?php

require 'database.php';
date_default_timezone_set('Asia/Jakarta');

header('Content-Type: application/json');

// Semua slave_id yang dipantau (sesuai METER_DATA di frontend)
// slave_id 0 (OTHERS) tidak dicek karena itu kalkulasi, bukan mesin fisik
$allSlaveIds = [1, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

// Batas waktu: data dianggap fresh jika ada dalam 10 menit terakhir
$freshMinutes = 10;

try {
    // Satu query untuk semua slave sekaligus — efisien, tidak N+1
    $placeholders = implode(',', array_fill(0, count($allSlaveIds), '?'));

    $sql = "SELECT slave_id, MAX(timestamp) AS last_seen
            FROM dbo.mva_lvmdb
            WHERE slave_id IN ($placeholders)
            GROUP BY slave_id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($allSlaveIds);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Buat map: slave_id => last_seen timestamp
    $lastSeenMap = [];
    foreach ($rows as $row) {
        $lastSeenMap[(int)$row['slave_id']] = $row['last_seen'];
    }

    // Tentukan status tiap slave
    $statuses = [];
    $now = new DateTime('now', new DateTimeZone('Asia/Jakarta'));

    foreach ($allSlaveIds as $sid) {
        if (!isset($lastSeenMap[$sid])) {
            // Tidak ada data sama sekali di DB → offline
            $statuses[(string)$sid] = false;
            continue;
        }

        $lastSeen = new DateTime($lastSeenMap[$sid], new DateTimeZone('Asia/Jakarta'));
        $diffMinutes = ($now->getTimestamp() - $lastSeen->getTimestamp()) / 60;

        // Online jika data terakhir dalam batas $freshMinutes menit
        $statuses[(string)$sid] = ($diffMinutes <= $freshMinutes);
    }

    echo json_encode([
        "success"  => true,
        "statuses" => $statuses,
        "checked_at" => $now->format('Y-m-d H:i:s'),
        "fresh_threshold_minutes" => $freshMinutes
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "DB Error: " . $e->getMessage()]);
}
?>