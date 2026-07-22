<?php
require 'database.php';
ini_set('display_errors', 1);
error_reporting(E_ALL);

try {
    // 1. Dapatkan semua pengidentifikasi unik dari tabel medium_voltage
    $target_sql = "
        SELECT DISTINCT 
            ISNULL(NULLIF(LTRIM(RTRIM(subgroup_mv)), ''), group_mv) AS identifier,
            group_mv
        FROM medium_voltage
    ";
    $targets = $pdo->query($target_sql)->fetchAll();

    if (empty($targets)) {
        echo json_encode(['warning' => 'Tidak ada data trafo yang ditemukan di database.']);
        exit;
    }

    $finalData = [];
    $current_year = date('Y');
    $current_month = date('m');
    $status_threshold = 15; // Menit

    // 2. Ulangi setiap pengidentifikasi
    foreach ($targets as $target) {
        $identifier = $target['identifier'];
        $group_mv = $target['group_mv'];

        // A. Dapatkan titik data terbaru & status koneksi
        $device_sql = "
            SELECT TOP 1
                mv.*, md.is_connected, md.last_seen,
                DATEDIFF(minute, md.last_seen, GETDATE()) as minutes_since_seen
            FROM medium_voltage mv
            LEFT JOIN dbo.modbus_devices md ON mv.group_mv = md.group_mv AND ISNULL(mv.subgroup_mv, '') = ISNULL(md.subgroup_mv, '')
            WHERE (mv.subgroup_mv = ? OR (mv.group_mv = ? AND (mv.subgroup_mv IS NULL OR LTRIM(RTRIM(mv.subgroup_mv)) = '')))
            ORDER BY mv.timestamp DESC
        ";
        $stmt = $pdo->prepare($device_sql);
        $stmt->execute([$identifier, $identifier]);
        $latest_data = $stmt->fetch();

        // B. Dapatkan data energi bulanan
        $where_clause = "(subgroup_mv = ? OR (group_mv = ? AND (subgroup_mv IS NULL OR LTRIM(RTRIM(subgroup_mv)) = '')))";
        $energy_sql = "
            SELECT timestamp, stand_kwh, stand_kvarh FROM medium_voltage
            WHERE $where_clause AND YEAR(timestamp) = ? AND MONTH(timestamp) = ? ORDER BY timestamp ASC";
        $stmt = $pdo->prepare($energy_sql);
        $stmt->execute([$identifier, $identifier, $current_year, $current_month]);
        $energy_rows = $stmt->fetchAll();
        
        $monthly_active_energy = 0; $monthly_reactive_energy = 0;
        if (count($energy_rows) > 1) {
            for ($i = 0; $i < count($energy_rows) - 1; $i++) {
                $consumption_kwh = ($energy_rows[$i+1]['stand_kwh'] ?? 0) - ($energy_rows[$i]['stand_kwh'] ?? 0);
                if ($consumption_kwh > 0) $monthly_active_energy += $consumption_kwh;
                $consumption_kvarh = ($energy_rows[$i+1]['stand_kvarh'] ?? 0) - ($energy_rows[$i]['stand_kvarh'] ?? 0);
                if ($consumption_kvarh > 0) $monthly_reactive_energy += $consumption_kvarh;
            }
        }
        
        // C. Dapatkan data Suhu
        $temp_data = null;
        try {
            $temp_sql = "SELECT TOP 1 temperature FROM dbo.Temperature WHERE trafo_name = ? AND timestamp >= DATEADD(minute, -30, GETDATE()) ORDER BY timestamp DESC";
            $stmt = $pdo->prepare($temp_sql);
            $stmt->execute([$identifier]);
            $temp_data = $stmt->fetch();
        } catch (PDOException $e) { /* Abaikan jika tabel suhu tidak ada */ }
        
        // D. LOGIKA STATUS
        $status = 'Off'; // Default
        if ($latest_data) {
            $is_connected = ($latest_data['is_connected'] == 1 && $latest_data['minutes_since_seen'] < $status_threshold);
            if ($is_connected) {
                if (($latest_data['voltage'] ?? 0) > 0 && ($latest_data['frequency'] ?? 0) > 0) $status = 'On';
                elseif (($latest_data['voltage'] ?? 0) == 0 && ($latest_data['frequency'] ?? 0) > 0) $status = 'Trip';
            }
        }

        // E. Gabungkan semua hasil
        $finalData[$identifier] = [
            'title' => $identifier,
            'status' => $status,
            'activeEnergyKwh' => round($monthly_active_energy, 2),
            'reactiveEnergyKvarh' => round($monthly_reactive_energy, 2),
            'temperature' => $temp_data['temperature'] ?? 0,
            'voltage' => (float)($latest_data['voltage'] ?? 0),
            'current' => (float)($latest_data['current'] ?? 0),
            'frequency' => (float)($latest_data['frequency'] ?? 0),
            'thd_v_l1' => (float)($latest_data['thd_v_l1'] ?? 0),
            'thd_v_l2' => (float)($latest_data['thd_v_l2'] ?? 0),
            'thd_v_l3' => (float)($latest_data['thd_v_l3'] ?? 0),
            'thd_i_l1' => (float)($latest_data['thd_i_l1'] ?? 0),
            'thd_i_l2' => (float)($latest_data['thd_i_l2'] ?? 0),
            'thd_i_l3' => (float)($latest_data['thd_i_l3'] ?? 0),
            'activePower' => (float)($latest_data['active_power_kw'] ?? 0),
            'reactivePower' => (float)($latest_data['reactive_power_kvar'] ?? 0),
            'apparentPower' => (float)($latest_data['apparent_power_kva'] ?? 0),
            'powerFactor' => (float)($latest_data['power_factor'] ?? 0),
            'group_mv' => $group_mv,
        ];
    }

    echo json_encode($finalData, JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Kesalahan Database', 'message' => $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Kesalahan Umum PHP', 'message' => $e->getMessage(), 'line' => $e->getLine()]);
}
?>