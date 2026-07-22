<?php

require 'database.php'; 

header('Cache-Control: no-cache, must-revalidate');
header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');

/**
 * Mengirim respons galat dalam format JSON dengan header CORS yang benar.
 * @param string $message Pesan galat yang akan dikirim.
 * @param int $code Kode status HTTP (default: 500).
 */
function send_error_response($message, $code = 500) {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}

$endpoint = $_GET['endpoint'] ?? '';
$group = $_GET['group'] ?? '';

$groupDescriptions = [
    'MV-A' => 'Mixing',
    'MV-B' => 'Semifinishing',
    'MV-C' => 'Curing',
    'MV-U' => 'Utility',
];

// =========================================================================
// ENDPOINT 1: mv-summary EnergyConsumptionChart.jsx
// =========================================================================
if ($endpoint === 'mv-summary') {
    try {
        $query = "
            SELECT
                m.group_mv AS name,
                SUM(m.stand_kwh) AS value,
                SUM(m.stand_kvarh) AS reactiveValue
            FROM medium_voltage m
            INNER JOIN (
                SELECT
                    subgroup_mv,
                    MAX(timestamp) AS max_timestamp
                FROM medium_voltage
                GROUP BY subgroup_mv
            ) AS latest_data
            ON m.subgroup_mv = latest_data.subgroup_mv AND m.timestamp = latest_data.max_timestamp
            WHERE m.group_mv IN ('MV-A', 'MV-B', 'MV-C', 'MV-U')
            GROUP BY m.group_mv
        ";
        $stmt = $pdo->query($query);
        $fetchedData = $stmt->fetchAll();
        $allGroups = ['MV-A', 'MV-B', 'MV-C', 'MV-U'];
        $results = [];
        foreach ($allGroups as $g) {
            $found = false;
            foreach ($fetchedData as $dataRow) {
                if ($dataRow['name'] === $g) {
                    $dataRow['description'] = $groupDescriptions[$g] ?? '';
                    $results[] = $dataRow;
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $results[] = ['name' => $g, 'value' => 0, 'reactiveValue' => 0, 'description' => $groupDescriptions[$g] ?? ''];
            }
        }
        echo json_encode($results);
    } catch (Exception $e) {
        send_error_response('Query gagal untuk mv-summary: ' . $e->getMessage());
    }
    exit;
}

// =================================================================================
// ENDPOINT 2: mv-summary-monthly //KWHPerAreaChart.jsx
// =================================================================================
if ($endpoint === 'mv-summary-monthly') {
    try {
        $resultsTemplate = [];
        $monthNames = [1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr', 5 => 'May', 6 => 'Jun', 7 => 'Jul', 8 => 'Aug', 9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Dec'];
        foreach ($monthNames as $name) {
            $monthEntry = ['month' => $name];
            foreach (array_keys($groupDescriptions) as $groupKey) {
                $monthEntry[$groupKey] = 0;
            }
            $resultsTemplate[$name] = $monthEntry;
        }

        $targetYear = $_GET['year'] ?? date('Y');
        $query = "
            WITH MonthlyBounds AS (
                SELECT
                    YEAR(timestamp) AS yr,
                    MONTH(timestamp) AS mn,
                    subgroup_mv,
                    group_mv,
                    MIN(timestamp) AS min_ts,
                    MAX(timestamp) AS max_ts
                FROM medium_voltage
                WHERE YEAR(timestamp) = ?
                GROUP BY YEAR(timestamp), MONTH(timestamp), subgroup_mv, group_mv
            ),
            Readings AS (
                SELECT
                    mb.mn,
                    mb.group_mv,
                    (end_mv.stand_kwh - start_mv.stand_kwh) AS consumption
                FROM MonthlyBounds mb
                JOIN medium_voltage start_mv ON mb.subgroup_mv = start_mv.subgroup_mv AND mb.min_ts = start_mv.timestamp
                JOIN medium_voltage end_mv ON mb.subgroup_mv = end_mv.subgroup_mv AND mb.max_ts = end_mv.timestamp
            )
            SELECT
                r.mn AS month_num,
                r.group_mv,
                SUM(r.consumption) AS total_consumption
            FROM Readings r
            WHERE r.consumption >= 0
            GROUP BY r.mn, r.group_mv
            ORDER BY r.mn;
        ";

        $stmt = $pdo->prepare($query);
        $stmt->execute([$targetYear]);
        $rawData = $stmt->fetchAll();

        foreach ($rawData as $row) {
            $monthNum = $row['month_num'];
            $monthName = $monthNames[$monthNum] ?? 'Unknown';
            $group_key = $row['group_mv'];
            $value = (float)$row['total_consumption'];

            if (isset($resultsTemplate[$monthName]) && isset($resultsTemplate[$monthName][$group_key])) {
                $resultsTemplate[$monthName][$group_key] += $value;
            }
        }
        
        $finalResults = array_values($resultsTemplate);
        echo json_encode($finalResults);
    } catch (Exception $e) {
        send_error_response('Query gagal untuk mv-summary-monthly: ' . $e->getMessage());
    }
    exit;
}

// =========================================================================
// ENDPOINT 3: mv-trafo-monthly //KWHPerTrafoChart
// =========================================================================
if ($endpoint === 'mv-trafo-monthly') {
    try {
        $subgroupStmt = $pdo->query("SELECT DISTINCT subgroup_mv FROM medium_voltage WHERE subgroup_mv IS NOT NULL AND subgroup_mv != ''");
        $areaKeys = $subgroupStmt->fetchAll(PDO::FETCH_COLUMN);
        
        $resultsTemplate = [];
        $monthNames = [1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr', 5 => 'May', 6 => 'Jun', 7 => 'Jul', 8 => 'Aug', 9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Dec'];
        foreach ($monthNames as $monthName) {
            $monthEntry = ['month' => $monthName];
            foreach ($areaKeys as $areaKey) {
                $monthEntry[$areaKey] = 0;
            }
            $resultsTemplate[$monthName] = $monthEntry;
        }

        $targetYear = $_GET['year'] ?? date('Y');
        $query = "
            WITH MonthlyBounds AS (
                SELECT
                    YEAR(timestamp) AS yr,
                    MONTH(timestamp) AS mn,
                    subgroup_mv,
                    MIN(timestamp) AS min_ts,
                    MAX(timestamp) AS max_ts
                FROM medium_voltage
                WHERE subgroup_mv IS NOT NULL AND subgroup_mv != '' AND YEAR(timestamp) = ?
                GROUP BY YEAR(timestamp), MONTH(timestamp), subgroup_mv
            ),
            Readings AS (
                SELECT
                    mb.mn,
                    mb.subgroup_mv,
                    (end_mv.stand_kwh - start_mv.stand_kwh) AS consumption
                FROM MonthlyBounds mb
                JOIN medium_voltage start_mv ON mb.subgroup_mv = start_mv.subgroup_mv AND mb.min_ts = start_mv.timestamp
                JOIN medium_voltage end_mv ON mb.subgroup_mv = end_mv.subgroup_mv AND mb.max_ts = end_mv.timestamp
            )
            SELECT
                r.mn AS month_num,
                r.subgroup_mv,
                SUM(r.consumption) AS total_consumption
            FROM Readings r
            WHERE r.consumption >= 0
            GROUP BY r.mn, r.subgroup_mv
            ORDER BY r.mn;
        ";

        $stmt = $pdo->prepare($query);
        $stmt->execute([$targetYear]);
        $rawData = $stmt->fetchAll();

        foreach ($rawData as $row) {
            $monthName = $monthNames[$row['month_num']] ?? null;
            $subgroup = $row['subgroup_mv'];
            $value = (float)$row['total_consumption'];

            if ($monthName && isset($resultsTemplate[$monthName]) && in_array($subgroup, $areaKeys)) {
                $resultsTemplate[$monthName][$subgroup] = $value;
            }
        }

        $finalResults = array_values($resultsTemplate);
        echo json_encode($finalResults);
    } catch (Exception $e) {
        send_error_response('Query gagal untuk mv-trafo-monthly: ' . $e->getMessage());
    }
    exit;
}

// =========================================================================
// ENDPOINT 4: mv-detail
// =========================================================================
if ($endpoint === 'mv-detail' && $group) {
    // FIX: Handle MV-I case explicitly to return an empty array.
    // This now correctly sends headers before exiting.
    if ($group === 'MV-I') {
        echo json_encode([]);
        exit;
    }

    $detailTableMap = [
        'MV-A' => 'mv_a_mixing',
        'MV-B' => 'mv_b_semifinishing',
        'MV-C' => 'mv_c_curing',
        'MV-U' => 'mv_u_utility',
    ];
    $expectedPowerMetersMap = [
        'MV-A' => ["Incomer Trafo # 1", "101-11-02", "101-11-11", "101-06-01", "108-A1-LV01", "101-A2-LV01-2", "101-06-02", "101-11-15", "101-11-01", "101-11-06", "101-A1-LV01", "Incomer Trafo # 2", "101-21-23", "101-21-02", "101-21-03", "101-21-04", "101-06-04", "A-DG1-1-1", "DB A2-LV01-1", "101.A2-LV01-1 - Non Industrial", "NEW RAW MATERIAL WAREHOUSE EXPAND", "DB A2-LV01-2", "101.A2-LV01-4  ELV 7", "101-21-18", "101-21-01", "A1-LV01"],
        'MV-B' => ["Incomer # 1", "102-07-01", "102-07-02", "102-07-03", "102-07-04", "102-09-01", "102-10-01", "102-13-01", "DB- SF/1", "B-DG1-1-1", "MCC # 6 non industri", "MCC # 5 non industri", "B2 LV01", "B2 LV02", "Incomer # 2", "102-04-01", "102-05-01", "SPARE", "102-01-01", "102-01-03", "102-01-04", "102-01-05", "DB MCC #3", "Incomer # 3", "102-02-01"],
        'MV-C' => ["Incomer Trafo # 1", "C1 LV01", "104-C1-LV04", "MCC Vaccum pump", "DB Mech # 3 non industri", "DB Mech # 3 non industri - Musholla", "Curing Line D", "Curing Line E", "Curing Line F", "906-C1-LV01 Non industri", "107-C1-LV01", "DB MCC Curing", "104-C1-LV01", "Lighting External 2", "Incomer Trafo # 2", "104-C2-LV01", "204-DG2-1", "907-C2-LV01", "NEW SDP Pirelli Warehouse", "Dinamic Balance machine", "103- Busduct BTU 1", "103- Busduct BTU 2", "103- Busduct BTU 3", "103- Busduct STU 4", "103- Busduct STU 5", "103- Busduct STU 6", "DB Mech # 2 Non industri", "MCC 2 Main Office", "DB- 901-C2-LV01", "DB - GF 902-C2-LV02", "DB- AHU Indoor Test", "ATS MV C", "Bandina M/C"],
        'MV-U' => ["Incomer Trafo # 1", "202-U1-LV01", "U.DG1.1", "Water Cooled Chiller No. 1", "Water Cooled Chiller No. 2", "Air Compressor No.3", "Incomer Trafo # 2", "Air", "Compressor No.1", "Air Compressor No.2", "Water Cooled Chiller No. 3", "202-U2-LV01", "U2-LV01", "WWTP", "GUEST HOUSE Non industri", "WTP PUMP", "ATS 2 MV U"]
    ];
    $tableName = $detailTableMap[$group] ?? '';
    if (empty($tableName)) {
        send_error_response("Grup tidak valid: '{$group}'", 400);
    }
    try {
        $query = "SELECT t.power_meter AS time, t.stand_kwh AS value, t.stand_kvarh AS reactiveValue FROM [{$tableName}] t INNER JOIN (SELECT power_meter, MAX(timestamp) AS max_timestamp FROM [{$tableName}] GROUP BY power_meter) AS latest_data ON t.power_meter = latest_data.power_meter AND t.timestamp = latest_data.max_timestamp ORDER BY t.power_meter ASC";
        $stmt = $pdo->query($query);
        $fetchedData = $stmt->fetchAll();
        $results = [];
        $expectedMeters = $expectedPowerMetersMap[$group] ?? [];
        foreach ($expectedMeters as $meterName) {
            $found = false;
            foreach ($fetchedData as $dataRow) {
                if ($dataRow['time'] === $meterName) {
                    $results[] = $dataRow;
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $results[] = ['time' => $meterName, 'value' => 0, 'reactiveValue' => 0];
            }
        }
        echo json_encode($results);
    } catch (Exception $e) {
        send_error_response('Query gagal untuk mv-detail: ' . $e->getMessage());
    }
    exit;
}


// =========================================================================
// ENDPOINT 5: incomer-data 
// =========================================================================
if ($endpoint === 'incomer-data' && !empty($group)) {
    try {
        $results = [];
        if ($group === 'MV-I') {
            $timeframe = $_GET['timeframe'] ?? 'hourly';
            $selectionColumns = "AVG(voltage) as voltage, AVG([current]) as [current], AVG(frequency) as frequency, (MAX(stand_kwh) - MIN(stand_kwh)) as stand_kwh, (MAX(stand_kvarh) - MIN(stand_kvarh)) as stand_kvarh, AVG(thd_v_l1) as thd_v_l1, AVG(thd_v_l2) as thd_v_l2, AVG(thd_v_l3) as thd_v_l3, AVG(thd_i_l1) as thd_i_l1, AVG(thd_i_l2) as thd_i_l2, AVG(thd_i_l3) as thd_i_l3, AVG(active_power_kw) as active_power_kw, AVG(reactive_power_kvar) as reactive_power_kvar, AVG(apparent_power_kva) as apparent_power_kva, AVG(power_factor) as power_factor";
            $fromAndWhere = "FROM medium_voltage WHERE group_mv = ?";

            switch ($timeframe) {
                case 'hourly':
                    $dateParam = $_GET['date'] ?? date('Y-m-d');
                    $query = "
                        SELECT * FROM (
                            (SELECT TOP 1 * FROM medium_voltage WHERE group_mv = ? AND timestamp < ? ORDER BY timestamp DESC)
                            UNION ALL
                            (SELECT * FROM medium_voltage WHERE group_mv = ? AND CAST(timestamp AS DATE) = ?)
                        ) AS MergedData
                        ORDER BY MergedData.timestamp ASC
                    ";
                    $stmt = $pdo->prepare($query);
                    $stmt->execute([$group, $dateParam, $group, $dateParam]);
                    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

                    $hourly_consumption_data = [];
                    if (count($data) > 1) {
                        for ($i = 0; $i < count($data) - 1; $i++) {
                            $current_row = $data[$i];
                            $next_row = $data[$i+1];
                            $kwh_consumption = (float)$next_row['stand_kwh'] - (float)$current_row['stand_kwh'];
                            $kvarh_consumption = (float)$next_row['stand_kvarh'] - (float)$current_row['stand_kvarh'];
                            $output_row = $next_row;
                            $output_row['stand_kwh'] = ($kwh_consumption > 0) ? $kwh_consumption : 0;
                            $output_row['stand_kvarh'] = ($kvarh_consumption > 0) ? $kvarh_consumption : 0;
                            $output_row['time'] = $output_row['timestamp'];
                            unset($output_row['timestamp']);
                            $hourly_consumption_data[] = $output_row;
                        }
                    }
                    $results = $hourly_consumption_data;
                    break;
                case 'daily':
                    $year = $_GET['year'] ?? date('Y');
                    $month = $_GET['month'] ?? date('m');
                    $week = $_GET['week'] ?? 1;
                    
                    $firstDayOfMonth = new DateTime("$year-$month-01");
                    $dayOfWeekOffset = (int)$firstDayOfMonth->format('N') - 1;
                    $startDayOffset = (($week - 1) * 7) - $dayOfWeekOffset;
                    
                    $startDate = (clone $firstDayOfMonth)->modify("$startDayOffset days");
                    $endDate = (clone $startDate)->modify('+6 days');
                    
                    $query = "SELECT CAST(timestamp AS DATE) as time, $selectionColumns $fromAndWhere AND CAST(timestamp AS DATE) BETWEEN ? AND ? GROUP BY CAST(timestamp AS DATE) ORDER BY time ASC";
                    $stmt = $pdo->prepare($query);
                    $stmt->execute([$group, $startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);
                    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    break;
                case 'monthly':
                    $year = $_GET['year'] ?? date('Y');
                    $query = "SELECT FORMAT(timestamp, 'yyyy-MM-01') as time, $selectionColumns $fromAndWhere AND YEAR(timestamp) = ? GROUP BY FORMAT(timestamp, 'yyyy-MM-01') ORDER BY time ASC";
                    $stmt = $pdo->prepare($query);
                    $stmt->execute([$group, $year]);
                    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    break;
                case 'yearly':
                    $end_year = (int)($_GET['year'] ?? date('Y'));
                    $start_year = $end_year - 4;
                    // Ubah GROUP BY di baris ini
                    $query = "SELECT FORMAT(timestamp, 'yyyy-01-01') as time, $selectionColumns $fromAndWhere AND YEAR(timestamp) BETWEEN ? AND ? GROUP BY FORMAT(timestamp, 'yyyy-01-01') ORDER BY time ASC";
                    $stmt = $pdo->prepare($query);
                    $stmt->execute([$group, $start_year, $end_year]);
                    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    break;
            }
        } else {
            // Logic for other groups (MV-A, B, C, U)
            $detailTableMap = ['MV-A' => 'mv_a_mixing', 'MV-B' => 'mv_b_semifinishing', 'MV-C' => 'mv_c_curing', 'MV-U' => 'mv_u_utility'];
            $tableName = $detailTableMap[$group] ?? '';
            if (empty($tableName)) {
                send_error_response("Grup tidak valid: '{$group}'", 400);
            }

            $timeframe = $_GET['timeframe'] ?? 'hourly';
            $selectionColumns = "power_meter, AVG(voltage) as voltage, AVG([current]) as [current], AVG(frequency) as frequency, (MAX(stand_kwh) - MIN(stand_kwh)) as stand_kwh, (MAX(stand_kvarh) - MIN(stand_kvarh)) as stand_kvarh, AVG(thd_v_l1) as thd_v_l1, AVG(thd_v_l2) as thd_v_l2, AVG(thd_v_l3) as thd_v_l3, AVG(thd_i_l1) as thd_i_l1, AVG(thd_i_l2) as thd_i_l2, AVG(thd_i_l3) as thd_i_l3";
            $fromAndWhere = "FROM [{$tableName}] WHERE power_meter IN ('Incomer Trafo # 1', 'Incomer Trafo # 2')";
            
            switch ($timeframe) {
                case 'hourly':
                    $dateParam = $_GET['date'] ?? date('Y-m-d');
                    $dt = new DateTime($dateParam);
                    $query = "SELECT FORMAT(timestamp, 'yyyy-MM-dd HH:00:00') as time, $selectionColumns $fromAndWhere AND CAST(timestamp AS DATE) = ? GROUP BY FORMAT(timestamp, 'yyyy-MM-dd HH:00:00'), power_meter ORDER BY time ASC";
                    $stmt = $pdo->prepare($query);
                    $stmt->execute([$dt->format('Y-m-d')]);
                    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    break;
                 case 'daily':
                    $year = $_GET['year'] ?? date('Y');
                    $month = $_GET['month'] ?? date('m');
                    $week = $_GET['week'] ?? 1;
                    $firstDayOfMonth = new DateTime("$year-$month-01");
                    $dayOfWeekOffset = (int)$firstDayOfMonth->format('N') - 1;
                    $startDayOffset = (($week - 1) * 7) - $dayOfWeekOffset;
                    $startDate = (clone $firstDayOfMonth)->modify("$startDayOffset days");
                    $endDate = (clone $startDate)->modify('+6 days');
                    $query = "SELECT CAST(timestamp AS DATE) as time, $selectionColumns $fromAndWhere AND CAST(timestamp AS DATE) BETWEEN ? AND ? GROUP BY CAST(timestamp AS DATE), power_meter ORDER BY time ASC";
                    $stmt = $pdo->prepare($query);
                    $stmt->execute([$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);
                    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    break;
                case 'monthly':
                    $year = $_GET['year'] ?? date('Y');
                    $query = "SELECT FORMAT(timestamp, 'yyyy-MM-01') as time, $selectionColumns $fromAndWhere AND YEAR(timestamp) = ? GROUP BY FORMAT(timestamp, 'yyyy-MM-01'), power_meter ORDER BY time ASC";
                    $stmt = $pdo->prepare($query);
                    $stmt->execute([$year]);
                    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    break;
                case 'yearly':
                    $end_year = (int)($_GET['year'] ?? date('Y'));
                    $start_year = $end_year - 4;
                    $query = "SELECT FORMAT(timestamp, 'yyyy-01-01') as time, $selectionColumns $fromAndWhere AND YEAR(timestamp) BETWEEN ? AND ? GROUP BY YEAR(timestamp), power_meter ORDER BY time ASC";
                    $stmt = $pdo->prepare($query);
                    $stmt->execute([$start_year, $end_year]);
                    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    break;
            }
        }
        echo json_encode($results);
    } catch (Exception $e) {
        send_error_response('Query gagal untuk incomer-data. Pesan: ' . $e->getMessage());
    }
    exit;
}

// =========================================================================
// ENDPOINT 6: group-daily
// =========================================================================
if ($endpoint === 'group-daily' && $group) {
    try {
        $date = $_GET['date'] ?? date('Y-m-d');
        $dt = new DateTime($date);
        $start_of_week_dt = (clone $dt)->modify('monday this week');
        $end_of_week_dt = (clone $dt)->modify('sunday this week');
        
        $query_start_date = $start_of_week_dt->format('Y-m-d');
        $query_end_date = (clone $end_of_week_dt)->modify('+1 day')->format('Y-m-d');

        $query = "
            SELECT timestamp, stand_kwh FROM medium_voltage 
            WHERE group_mv = ? AND timestamp >= (SELECT MAX(timestamp) FROM medium_voltage WHERE group_mv = ? AND timestamp < ?)
            AND timestamp < ? ORDER BY timestamp ASC
        ";
        $stmt = $pdo->prepare($query);
        $stmt->execute([$group, $group, $query_start_date, $query_end_date]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $week_days_indo = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
        $results = array_fill_keys($week_days_indo, 0);

        if (count($data) > 1) {
            for ($i = 0; $i < count($data) - 1; $i++) {
                $consumption_kwh = (float)$data[$i+1]['stand_kwh'] - (float)$data[$i]['stand_kwh'];
                $ts = new DateTime($data[$i+1]['timestamp']);
                $dayOfWeek = (int)$ts->format('N');
                $dayName = $week_days_indo[$dayOfWeek - 1];
                if ($consumption_kwh > 0) {
                    $results[$dayName] += $consumption_kwh;
                }
            }
        }
        
        $final_output = [];
        foreach($results as $day => $consumption) {
            $final_output[] = ["time" => $day, "consumption" => round($consumption)];
        }
        
        echo json_encode($final_output);
    } catch (Exception $e) {
        send_error_response("Query gagal untuk group-daily (mingguan): " . $e->getMessage());
    }
    exit;
}

// =========================================================================
// ENDPOINT 7: group-monthly
// =========================================================================
if ($endpoint === 'group-monthly' && $group) {
    try {
        $date = $_GET['date'] ?? date('Y-m-d');
        $dt = new DateTime($date);
        $year = $dt->format('Y');
        $month = $dt->format('m');
        
        $start_of_month_dt = new DateTime("$year-$month-01");
        $end_of_month_dt = (clone $start_of_month_dt)->modify('last day of this month');

        $query_start_date = $start_of_month_dt->format('Y-m-d');
        $query_end_date = (clone $end_of_month_dt)->modify('+1 day')->format('Y-m-d');
        
        $query = "
            SELECT timestamp, stand_kwh FROM medium_voltage 
            WHERE group_mv = ? AND timestamp >= (SELECT MAX(timestamp) FROM medium_voltage WHERE group_mv = ? AND timestamp < ?)
            AND timestamp < ? ORDER BY timestamp ASC
        ";
        $stmt = $pdo->prepare($query);
        $stmt->execute([$group, $group, $query_start_date, $query_end_date]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $results = ["Minggu 1" => 0, "Minggu 2" => 0, "Minggu 3" => 0, "Minggu 4" => 0, "Minggu 5" => 0];
        if (count($data) > 1) {
            for ($i = 0; $i < count($data) - 1; $i++) {
                $consumption_kwh = (float)$data[$i+1]['stand_kwh'] - (float)$data[$i]['stand_kwh'];
                $ts = new DateTime($data[$i+1]['timestamp']);
                $dayOfMonth = (int)$ts->format('j');
                $weekOfMonth = 'Minggu ' . (floor(($dayOfMonth - 1) / 7) + 1);
                if ($consumption_kwh > 0 && isset($results[$weekOfMonth])) {
                    $results[$weekOfMonth] += $consumption_kwh;
                }
            }
        }

        $final_output = [];
        $last_day_of_month = (int)$end_of_month_dt->format('d');
        $num_weeks = ceil($last_day_of_month / 7);

        for ($w = 1; $w <= $num_weeks; $w++) {
             $weekKey = "Minggu " . $w;
             $final_output[] = ["time" => $weekKey, "consumption" => round($results[$weekKey])];
        }
       
        echo json_encode($final_output);
    } catch (Exception $e) {
        send_error_response('Query gagal untuk group-monthly (per minggu): ' . $e->getMessage());
    }
    exit;
}

// =========================================================================
// ENDPOINT 8: group-yearly
// =========================================================================
if ($endpoint === 'group-yearly' && $group) {
    try {
        $year = $_GET['year'] ?? date('Y');
        if (!$year) {
            send_error_response('Parameter tahun diperlukan', 400);
        }

        $start_of_year_dt = new DateTime("$year-01-01");
        $end_of_year_dt = new DateTime("$year-12-31");

        $query_start_date = $start_of_year_dt->format('Y-m-d');
        $query_end_date = (clone $end_of_year_dt)->modify('+1 day')->format('Y-m-d');
        
        $query = "
            SELECT timestamp, stand_kwh FROM medium_voltage 
            WHERE group_mv = ? AND timestamp >= (SELECT MAX(timestamp) FROM medium_voltage WHERE group_mv = ? AND timestamp < ?)
            AND timestamp < ? ORDER BY timestamp ASC
        ";
        $stmt = $pdo->prepare($query);
        $stmt->execute([$group, $group, $query_start_date, $query_end_date]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        $results = array_fill_keys($monthNames, 0);
        if (count($data) > 1) {
            for ($i = 0; $i < count($data) - 1; $i++) {
                $consumption_kwh = (float)$data[$i+1]['stand_kwh'] - (float)$data[$i]['stand_kwh'];
                $ts = new DateTime($data[$i+1]['timestamp']);
                $monthIndex = (int)$ts->format('n') - 1;
                $monthName = $monthNames[$monthIndex];
                if ($consumption_kwh > 0) {
                    $results[$monthName] += $consumption_kwh;
                }
            }
        }
        
        $final_output = [];
        foreach($results as $month => $consumption) {
            $final_output[] = ["time" => $month, "consumption" => round($consumption)];
        }
        
        echo json_encode($final_output);
    } catch (Exception $e) {
        send_error_response('Query gagal untuk group-yearly: ' . $e->getMessage());
    }
    exit;
}

// =========================================================================
// ENDPOINT 9: group-5-yearly
// =========================================================================
if ($endpoint === 'group-5-yearly' && $group) {
    try {
        $year = $_GET['year'] ?? date('Y');
        $query = "
            WITH YearlyReadings AS (
                SELECT YEAR(timestamp) as reading_year, SUM(stand_kwh) as max_kwh
                FROM medium_voltage
                WHERE group_mv = ? AND YEAR(timestamp) BETWEEN ? AND ?
                GROUP BY YEAR(timestamp)
            )
            SELECT
                y1.reading_year AS [time],
                CASE 
                    WHEN y1.max_kwh - ISNULL((SELECT max_kwh FROM YearlyReadings WHERE reading_year = y1.reading_year - 1), y1.max_kwh) < 0 THEN 0 
                    ELSE y1.max_kwh - ISNULL((SELECT max_kwh FROM YearlyReadings WHERE reading_year = y1.reading_year - 1), y1.max_kwh) 
                END as consumption
            FROM YearlyReadings y1
            ORDER BY y1.reading_year ASC;
        ";
        $start_year = $year - 5;
        $stmt = $pdo->prepare($query);
        $stmt->execute([$group, $start_year, $year]);
        
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (Exception $e) {
        send_error_response('Query gagal untuk group-5-yearly: ' . $e->getMessage());
    }
    exit;
}

// Jika tidak ada endpoint yang cocok, kirim respons 404
send_error_response('Endpoint tidak ditemukan.', 404);
?>