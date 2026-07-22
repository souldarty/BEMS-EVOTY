<?php
/**
 * getMVI.php
 * Backend untuk Dashboard MV-I (mvIMonitoring.jsx)
 *
 * REVISION: April 2026 (Rev 10) - Dynamic Single Device from dbo.modbus_devices
 */

require 'database.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

date_default_timezone_set('Asia/Jakarta');
header('Content-Type: application/json');

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

$groupMv = 'MV-I';
$res     = isset($_GET['resolution']) ? $_GET['resolution'] : 'daily';
$scaffoldBuckets = [];

try {
    // ============================================================
    // STEP 0 — AMBIL 1 DEVICE MV-I DARI DATABASE
    // ============================================================
    $stmtDevice = $pdo->prepare("SELECT TOP 1 unit_id, subgroup_mv FROM dbo.modbus_devices WHERE group_mv = ? ORDER BY id ASC");
    $stmtDevice->execute([$groupMv]);
    $deviceInfo = $stmtDevice->fetch(PDO::FETCH_ASSOC);

    if (!$deviceInfo) {
        echo json_encode(["success" => true, "resolution" => $res, "device" => null, "data" => []]);
        exit();
    }

    $subgroupMv = trim($deviceInfo['subgroup_mv']);
    $slaveId    = (int)$deviceInfo['unit_id'];

    // ============================================================
    // STEP 1 — LOGIKA WAKTU & SCAFFOLDING BERDASARKAN RESOLUSI
    // ============================================================
    if ($res === 'yearly') {
        $year = isset($_GET['year']) ? trim($_GET['year']) : date('Y');
        $startDate = $year . '-01-01 00:00:00';
        $endDate   = ($year + 1) . '-01-01 00:00:00';
        
        for ($i = 1; $i <= 12; $i++) {
            $scaffoldBuckets[] = sprintf('%04d-%02d-01 00:00:00', $year, $i);
        }
        $bucketExpr   = "CONVERT(VARCHAR(7), timestamp, 120) + '-01 00:00:00'";
        $energyExpr   = "COALESCE(MAX(stand_kwh) - MIN(stand_kwh), 0)";
        $reactiveExpr = "COALESCE(MAX(reactive_energy_kvarh) - MIN(reactive_energy_kvarh), 0)";

    } else if ($res === 'monthly') {
        $month = isset($_GET['month']) ? trim($_GET['month']) : date('Y-m');
        $startDate = $month . '-01 00:00:00';
        $endDate   = date('Y-m-d 00:00:00', strtotime($startDate . ' +1 month'));
        
        $daysInMonth = date('t', strtotime($startDate));
        for ($i = 1; $i <= $daysInMonth; $i++) {
            $scaffoldBuckets[] = sprintf('%s-%02d 00:00:00', $month, $i);
        }
        $bucketExpr   = "CONVERT(VARCHAR(10), timestamp, 120) + ' 00:00:00'";
        $energyExpr   = "COALESCE(MAX(stand_kwh) - MIN(stand_kwh), 0)";
        $reactiveExpr = "COALESCE(MAX(reactive_energy_kvarh) - MIN(reactive_energy_kvarh), 0)";

    } else {
        $date = isset($_GET['date']) ? trim($_GET['date']) : date('Y-m-d');
        $startDate = $date . ' 00:00:00';
        $endDate   = date('Y-m-d 00:00:00', strtotime($date . ' +1 day'));
        
        $baseTimestamp = strtotime($startDate);
        for ($i = 0; $i <= 48; $i++) {
            $scaffoldBuckets[] = date('Y-m-d H:i:s', $baseTimestamp + ($i * 1800));
        }
        $bucketExpr   = "CONVERT(VARCHAR(19), DATEADD(MINUTE, (DATEDIFF(MINUTE, 0, timestamp) / 30) * 30, 0), 120)";
        $energyExpr   = "MAX(stand_kwh)";
        $reactiveExpr = "MAX(reactive_energy_kvarh)";
    }

    // ============================================================
    // STEP 2 — Fetch Data Langsung untuk Dinamis Subgroup MVI
    // ============================================================
    $sql = "
        SELECT
            $bucketExpr AS bucket,
            AVG(CAST(voltage_l1           AS FLOAT))  AS voltage_l1,
            AVG(CAST(voltage_l2           AS FLOAT))  AS voltage_l2,
            AVG(CAST(voltage_l3           AS FLOAT))  AS voltage_l3,
            $energyExpr                               AS stand_kwh,
            AVG(CAST(active_power_kw      AS FLOAT))  AS active_power_kw,
            AVG(CAST(thd_i_l1             AS FLOAT))  AS thd_i_l1,
            AVG(CAST(thd_i_l2             AS FLOAT))  AS thd_i_l2,
            AVG(CAST(thd_i_l3             AS FLOAT))  AS thd_i_l3,
            AVG(CAST(reactive_power_kvar  AS FLOAT))  AS reactive_power_kvar,
            $reactiveExpr                             AS reactive_energy_kvarh,
            AVG(CAST(current_l1           AS FLOAT))  AS current_l1,
            AVG(CAST(current_l2           AS FLOAT))  AS current_l2,
            AVG(CAST(current_l3           AS FLOAT))  AS current_l3,
            AVG(CAST(frequency_hz         AS FLOAT))  AS frequency_hz,
            AVG(CAST(power_factor         AS FLOAT))  AS power_factor
        FROM dbo.mv_lowvoltage
        WHERE group_mv = :group_mv 
          AND subgroup_mv = :subgroup_mv
          AND timestamp >= :start
          AND timestamp < :end
        GROUP BY
            $bucketExpr
        ORDER BY bucket ASC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'group_mv'    => $groupMv, 
        'subgroup_mv' => $subgroupMv,
        'start'       => $startDate, 
        'end'         => $endDate
    ]);
    $rawData = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $groupedByBucket = [];
    foreach ($rawData as $row) {
        $groupedByBucket[$row['bucket']] = $row;
    }

    function calculateUnbalance($l1, $l2, $l3) {
        $avg = ($l1 + $l2 + $l3) / 3;
        if ($avg <= 0) return 0;
        $max_dev = max(abs($l1 - $avg), abs($l2 - $avg), abs($l3 - $avg));
        return ($max_dev / $avg) * 100;
    }

    // ============================================================
    // STEP 3 — Mapping Data dengan Scaffold Buckets
    // ============================================================
    $allDeviceData = [$subgroupMv => []];

    foreach ($scaffoldBuckets as $bucket) {
        if (isset($groupedByBucket[$bucket])) {
            $row = $groupedByBucket[$bucket];
            
            $thdAvg = ((float)$row['thd_i_l1'] + (float)$row['thd_i_l2'] + (float)$row['thd_i_l3']) / 3;

            $cL1 = (float)($row['current_l1'] ?? 0);
            $cL2 = (float)($row['current_l2'] ?? 0);
            $cL3 = (float)($row['current_l3'] ?? 0);
            $unbalance = calculateUnbalance($cL1, $cL2, $cL3);

            $vL1 = (float)($row['voltage_l1'] ?? 0);
            $vL2 = (float)($row['voltage_l2'] ?? 0);
            $vL3 = (float)($row['voltage_l3'] ?? 0);
            $unbalanceVolt = calculateUnbalance($vL1, $vL2, $vL3);

            $allDeviceData[$subgroupMv][] = [
                "timestamp"              => $bucket,
                "voltage_l1"             => round($vL1, 2),
                "voltage_l2"             => round($vL2, 2),
                "voltage_l3"             => round($vL3, 2),
                "unbalance_voltage"      => round($unbalanceVolt, 2),
                "power_kw"               => round((float)$row['active_power_kw'], 2),
                "consumption_kwh"        => round((float)$row['stand_kwh'], 2),
                "thd_avg"                => round($thdAvg, 2),
                "thd_l1"                 => round((float)$row['thd_i_l1'], 2),
                "thd_l2"                 => round((float)$row['thd_i_l2'], 2),
                "thd_l3"                 => round((float)$row['thd_i_l3'], 2),
                "reactive_power_kvar"    => round((float)($row['reactive_power_kvar'] ?? 0), 2),
                "reactive_energy_kvarh"  => round((float)($row['reactive_energy_kvarh'] ?? 0), 2),
                "current_l1"             => round($cL1, 2),
                "current_l2"             => round($cL2, 2),
                "current_l3"             => round($cL3, 2),
                "unbalance_current"      => round($unbalance, 2),
                "frequency_hz"           => round((float)($row['frequency_hz'] ?? 0), 2),
                "power_factor"           => round((float)($row['power_factor'] ?? 0), 3),
            ];
        } else {
            $allDeviceData[$subgroupMv][] = [
                "timestamp" => $bucket, "voltage_l1" => 0, "voltage_l2" => 0, "voltage_l3" => 0, "unbalance_voltage" => 0,
                "power_kw" => 0, "consumption_kwh" => 0, "thd_avg" => 0,
                "thd_l1" => 0, "thd_l2" => 0, "thd_l3" => 0,
                "reactive_power_kvar" => 0, "reactive_energy_kvarh" => 0,
                "current_l1" => 0, "current_l2" => 0, "current_l3" => 0, "unbalance_current" => 0,
                "frequency_hz" => 0, "power_factor" => 0,
            ];
        }
    }

    echo json_encode([
        "success" => true, 
        "resolution" => $res, 
        "device" => ["subgroup_mv" => $subgroupMv, "slaveId" => $slaveId], 
        "data" => $allDeviceData
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "DB Error: " . $e->getMessage()]);
}
?>