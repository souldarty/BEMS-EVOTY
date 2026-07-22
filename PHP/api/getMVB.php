<?php
/**
 * getMVB.php
 * Backend untuk Dashboard MV-B (mvBMonitoring.jsx)
 *
 * REVISION: April 2026 (Rev 10) - DYNAMIC Device List & Full Parameters (MVA Parity)
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

$groupMv = 'MV-B';
$res     = isset($_GET['resolution']) ? $_GET['resolution'] : 'daily';
$scaffoldBuckets = [];

try {
    // ============================================================
    // STEP 0 — AMBIL DAFTAR DEVICE DINAMIS DARI DATABASE
    // ============================================================
    $stmtDevices = $pdo->prepare("SELECT unit_id, subgroup_mv FROM dbo.modbus_devices WHERE group_mv = ? ORDER BY subgroup_mv ASC");
    $stmtDevices->execute([$groupMv]);
    $deviceList = $stmtDevices->fetchAll(PDO::FETCH_ASSOC);

    $incomerSubgroups = [];
    $regularSubgroups = [];
    $slaveIdMap = [];

    foreach ($deviceList as $dev) {
        $sub = trim($dev['subgroup_mv']);
        $slaveIdMap[$sub] = (int)$dev['unit_id'];
        
        // Memisahkan Incomer dan Regular berdasarkan kata 'incomer'
        if (stripos($sub, 'incomer') !== false) {
            $incomerSubgroups[] = $sub;
        } else {
            $regularSubgroups[] = $sub;
        }
    }
    
    $allAllowedSubgroups = array_merge($incomerSubgroups, $regularSubgroups);

    if (count($allAllowedSubgroups) === 0) {
        $emptyDevices = [['subgroup_mv' => 'OTHERS', 'is_incomer' => false, 'slaveId' => 0, 'status' => null]];
        echo json_encode(["success" => true, "resolution" => $res, "devices" => $emptyDevices, "data" => ['OTHERS' => []]]);
        exit();
    }

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
    // STEP 2 — Fetch Data Full Parameter
    // ============================================================
    $placeholders = implode(',', array_fill(0, count($allAllowedSubgroups), '?'));
    
    $sql = "
        SELECT
            $bucketExpr AS bucket,
            subgroup_mv,
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
            AVG(CAST(power_factor         AS FLOAT))  AS power_factor,
            MAX(timestamp)                            AS last_seen
        FROM dbo.mv_lowvoltage
        WHERE group_mv = ?
          AND timestamp >= ?
          AND timestamp < ?
          AND subgroup_mv IN ($placeholders)
        GROUP BY
            $bucketExpr,
            subgroup_mv
        ORDER BY bucket ASC, subgroup_mv ASC
    ";
    
    $params = [$groupMv, $startDate, $endDate];
    $params = array_merge($params, $allAllowedSubgroups);
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rawData = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // ============================================================
    // STEP 3 — Status online/offline
    // ============================================================
    $now         = new DateTime('now', new DateTimeZone('Asia/Jakarta'));
    $lastSeenMap = [];
    foreach ($rawData as $row) {
        $sub = $row['subgroup_mv'];
        if (!isset($lastSeenMap[$sub]) || $row['last_seen'] > $lastSeenMap[$sub])
            $lastSeenMap[$sub] = $row['last_seen'];
    }
    
    $statusMap = [];
    foreach ($allAllowedSubgroups as $sub) {
        if (!isset($lastSeenMap[$sub])) {
            $statusMap[$sub] = false;
        } else {
            $dt      = new DateTime($lastSeenMap[$sub], new DateTimeZone('Asia/Jakarta'));
            $diffMin = ($now->getTimestamp() - $dt->getTimestamp()) / 60;
            $statusMap[$sub] = ($diffMin <= 10);
        }
    }

    // ============================================================
    // STEP 4 — Group DB data by bucket
    // ============================================================
    $groupedByBucket = [];
    foreach ($rawData as $row) {
        $groupedByBucket[$row['bucket']][$row['subgroup_mv']] = $row;
    }

    // ============================================================
    // STEP 5 — Init output arrays
    // ============================================================
    $allDeviceData = [];
    foreach ($allAllowedSubgroups as $dev) {
        $allDeviceData[$dev] = [];
    }
    $allDeviceData['OTHERS'] = [];

    function calculateUnbalance($l1, $l2, $l3) {
        $avg = ($l1 + $l2 + $l3) / 3;
        if ($avg <= 0) return 0;
        $max_dev = max(abs($l1 - $avg), abs($l2 - $avg), abs($l3 - $avg));
        return ($max_dev / $avg) * 100;
    }

    // ============================================================
    // STEP 6 — Iterate Scaffold Buckets
    // ============================================================
    foreach ($scaffoldBuckets as $bucket) {
        $devicesAtBucket = $groupedByBucket[$bucket] ?? [];

        // --------------------------------------------------------
        // LAYER 1: Incomer aggregation
        // --------------------------------------------------------
        $totalSupplyKw      = 0;
        $thdTrafoSum        = 0;   $kwhTrafoSum        = 0;
        $activeIncomerCount = 0;   $incomerRowBuffer   = [];

        foreach ($incomerSubgroups as $incName) {
            if (!isset($devicesAtBucket[$incName])) continue;
            $inc   = $devicesAtBucket[$incName];
            $incKw = ((float)$inc['active_power_kw'] >= 0.5) ? (float)$inc['active_power_kw'] : 0;
            $incomerRowBuffer[$incName] = ['row' => $inc, 'kw' => $incKw];
            if ($incKw > 0) {
                $totalSupplyKw     += $incKw;
                $thdTrafoSum       += ((float)$inc['thd_i_l1'] + (float)$inc['thd_i_l2'] + (float)$inc['thd_i_l3']);
                $kwhTrafoSum       += (float)($inc['stand_kwh'] ?? 0);
                $activeIncomerCount++;
            }
        }

        $incomerStatus = ($activeIncomerCount > 0) ? "ACTIVE" : "NO_POWER";

        foreach ($incomerRowBuffer as $incName => $buf) {
            $inc    = $buf['row'];
            $incKw  = $buf['kw'];
            $thdAvg = ((float)$inc['thd_i_l1'] + (float)$inc['thd_i_l2'] + (float)$inc['thd_i_l3']) / 3;
            $shareP = ($totalSupplyKw > 0) ? ($incKw / $totalSupplyKw) * 100 : 0;

            $cL1 = (float)($inc['current_l1'] ?? 0);
            $cL2 = (float)($inc['current_l2'] ?? 0);
            $cL3 = (float)($inc['current_l3'] ?? 0);
            $unbalance = calculateUnbalance($cL1, $cL2, $cL3);

            $vL1 = (float)($inc['voltage_l1'] ?? 0);
            $vL2 = (float)($inc['voltage_l2'] ?? 0);
            $vL3 = (float)($inc['voltage_l3'] ?? 0);
            $unbalanceVolt = calculateUnbalance($vL1, $vL2, $vL3);

            $allDeviceData[$incName][] = [
                "timestamp"              => $bucket,
                "voltage_l1"             => round($vL1, 2),
                "voltage_l2"             => round($vL2, 2),
                "voltage_l3"             => round($vL3, 2),
                "unbalance_voltage"      => round($unbalanceVolt, 2),
                "power_kw"               => round($incKw, 2),
                "consumption_kwh"        => round((float)$inc['stand_kwh'], 2),
                "thd_avg"                => round($thdAvg, 2),
                "thd_l1"                 => round((float)$inc['thd_i_l1'], 2),
                "thd_l2"                 => round((float)$inc['thd_i_l2'], 2),
                "thd_l3"                 => round((float)$inc['thd_i_l3'], 2),
                "share_pct"              => round($shareP, 2),
                "incomer_status"         => $incomerStatus,
                "total_supply_kw"        => round($totalSupplyKw, 2),
                "reactive_power_kvar"    => round((float)($inc['reactive_power_kvar']   ?? 0), 2),
                "reactive_energy_kvarh"  => round((float)($inc['reactive_energy_kvarh'] ?? 0), 2),
                "current_l1"             => round($cL1, 2),
                "current_l2"             => round($cL2, 2),
                "current_l3"             => round($cL3, 2),
                "unbalance_current"      => round($unbalance, 2),
                "frequency_hz"           => round((float)($inc['frequency_hz']          ?? 0), 2),
                "power_factor"           => round((float)($inc['power_factor']          ?? 0), 3),
            ];
        }

        foreach ($incomerSubgroups as $incName) {
            if (!isset($incomerRowBuffer[$incName])) {
                $allDeviceData[$incName][] = [
                    "timestamp" => $bucket, "voltage_l1" => 0, "voltage_l2" => 0, "voltage_l3" => 0, "unbalance_voltage" => 0,
                    "power_kw" => 0, "consumption_kwh" => 0, "thd_avg" => 0,
                    "thd_l1" => 0, "thd_l2" => 0, "thd_l3" => 0,
                    "share_pct" => 0, "incomer_status" => "NO_POWER", "total_supply_kw" => 0,
                    "reactive_power_kvar" => 0, "reactive_energy_kvarh" => 0,
                    "current_l1" => 0, "current_l2" => 0, "current_l3" => 0, "unbalance_current" => 0,
                    "frequency_hz" => 0, "power_factor" => 0,
                ];
            }
        }

        // --------------------------------------------------------
        // LAYER 2: Regular Subgroups
        // --------------------------------------------------------
        $sumSubgroupKw   = 0; $sumSubgroupKwh = 0; $sumSubgroupThd = 0;

        foreach ($regularSubgroups as $regName) {
            if (!isset($devicesAtBucket[$regName])) {
                $allDeviceData[$regName][] = [
                    "timestamp" => $bucket, "voltage_l1" => 0, "voltage_l2" => 0, "voltage_l3" => 0, "unbalance_voltage" => 0,
                    "power_kw" => 0, "consumption_kwh" => 0, "thd_avg" => 0,
                    "thd_l1" => 0, "thd_l2" => 0, "thd_l3" => 0,
                    "share_pct" => 0, "incomer_status" => $incomerStatus,
                    "total_supply_kw" => round($totalSupplyKw, 2),
                    "reactive_power_kvar" => 0, "reactive_energy_kvarh" => 0,
                    "current_l1" => 0, "current_l2" => 0, "current_l3" => 0, "unbalance_current" => 0,
                    "frequency_hz" => 0, "power_factor" => 0,
                ];
                continue;
            }

            $sub   = $devicesAtBucket[$regName];
            $subKw = (float)$sub['active_power_kw'];
            $devKw = ($subKw >= 0.5 && $incomerStatus !== "NO_POWER") ? $subKw : 0;

            if ($devKw > 0) {
                $sumSubgroupKw  += $devKw;
                $sumSubgroupKwh += (float)($sub['stand_kwh'] ?? 0);
                $sumSubgroupThd += ((float)$sub['thd_i_l1'] + (float)$sub['thd_i_l2'] + (float)$sub['thd_i_l3']);
            }

            $thdAvg = ((float)$sub['thd_i_l1'] + (float)$sub['thd_i_l2'] + (float)$sub['thd_i_l3']) / 3;
            $shareP = ($totalSupplyKw > 0) ? ($devKw / $totalSupplyKw) * 100 : 0;

            $cL1 = (float)($sub['current_l1'] ?? 0);
            $cL2 = (float)($sub['current_l2'] ?? 0);
            $cL3 = (float)($sub['current_l3'] ?? 0);
            $unbalance = calculateUnbalance($cL1, $cL2, $cL3);

            $vL1 = (float)($sub['voltage_l1'] ?? 0);
            $vL2 = (float)($sub['voltage_l2'] ?? 0);
            $vL3 = (float)($sub['voltage_l3'] ?? 0);
            $unbalanceVolt = calculateUnbalance($vL1, $vL2, $vL3);

            $allDeviceData[$regName][] = [
                "timestamp"              => $bucket,
                "voltage_l1"             => round($vL1, 2),
                "voltage_l2"             => round($vL2, 2),
                "voltage_l3"             => round($vL3, 2),
                "unbalance_voltage"      => round($unbalanceVolt, 2),
                "power_kw"               => round($devKw, 2),
                "consumption_kwh"        => round((float)$sub['stand_kwh'], 2),
                "thd_avg"                => round($thdAvg, 2),
                "thd_l1"                 => round((float)$sub['thd_i_l1'], 2),
                "thd_l2"                 => round((float)$sub['thd_i_l2'], 2),
                "thd_l3"                 => round((float)$sub['thd_i_l3'], 2),
                "share_pct"              => round($shareP, 2),
                "incomer_status"         => $incomerStatus,
                "total_supply_kw"        => round($totalSupplyKw, 2),
                "reactive_power_kvar"    => round((float)($sub['reactive_power_kvar']   ?? 0), 2),
                "reactive_energy_kvarh"  => round((float)($sub['reactive_energy_kvarh'] ?? 0), 2),
                "current_l1"             => round($cL1, 2),
                "current_l2"             => round($cL2, 2),
                "current_l3"             => round($cL3, 2),
                "unbalance_current"      => round($unbalance, 2),
                "frequency_hz"           => round((float)($sub['frequency_hz']          ?? 0), 2),
                "power_factor"           => round((float)($sub['power_factor']          ?? 0), 3),
            ];
        }

        // --------------------------------------------------------
        // OTHERS
        // --------------------------------------------------------
        $othersKw     = max(0, $totalSupplyKw - $sumSubgroupKw);
        $othersKwh    = max(0, $kwhTrafoSum   - $sumSubgroupKwh);
        $othersThd    = max(0, $thdTrafoSum   - $sumSubgroupThd);
        $othersThdAvg = ($othersThd > 0) ? ($othersThd / 3) : 0;
        $othersShareP = ($totalSupplyKw > 0) ? ($othersKw / $totalSupplyKw) * 100 : 0;

        $allDeviceData['OTHERS'][] = [
            "timestamp"              => $bucket,
            "voltage_l1"             => 0,
            "voltage_l2"             => 0,
            "voltage_l3"             => 0,
            "unbalance_voltage"      => 0,
            "power_kw"               => round($othersKw, 2),
            "consumption_kwh"        => round($othersKwh, 2),
            "thd_avg"                => round($othersThdAvg, 2),
            "thd_l1"                 => 0,
            "thd_l2"                 => 0,
            "thd_l3"                 => 0,
            "share_pct"              => round($othersShareP, 2),
            "incomer_status"         => $incomerStatus,
            "total_supply_kw"        => round($totalSupplyKw, 2),
            "reactive_power_kvar"    => 0,
            "reactive_energy_kvarh"  => 0,
            "current_l1"             => 0,
            "current_l2"             => 0,
            "current_l3"             => 0,
            "unbalance_current"      => 0,
            "frequency_hz"           => 0,
            "power_factor"           => 0,
        ];
    }

    // ============================================================
    // STEP 7 — Build final response
    // ============================================================
    $devices = [];
    foreach ($incomerSubgroups as $inc) {
        $devices[] = ['subgroup_mv' => $inc, 'is_incomer' => true, 'slaveId' => $slaveIdMap[$inc] ?? 0, 'status' => $statusMap[$inc]];
    }
    foreach ($regularSubgroups as $reg) {
        $devices[] = ['subgroup_mv' => $reg, 'is_incomer' => false, 'slaveId' => $slaveIdMap[$reg] ?? 0, 'status' => $statusMap[$reg]];
    }
    $devices[] = ['subgroup_mv' => 'OTHERS', 'is_incomer' => false, 'slaveId' => 0, 'status' => null];

    echo json_encode(["success" => true, "resolution" => $res, "devices" => $devices, "data" => $allDeviceData], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "DB Error: " . $e->getMessage()]);
}
?>