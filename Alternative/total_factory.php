<?php
require 'database.php';

$type = $_GET['type'] ?? 'daily';
$currentDate = new DateTime();
switch ($type) {
    case 'monthly':
        $startDate = (new DateTime('first day of this month'))->format('Y-m-d H:i:s');
        $endDate = (new DateTime('last day of this month'))->format('Y-m-d 23:59:59');
        break;
    case 'yearly':
        $startDate = (new DateTime('first day of january this year'))->format('Y-m-d H:i:s');
        $endDate = (new DateTime('last day of december this year'))->format('Y-m-d 23:59:59');
        break;
    default: // daily
        $startDate = $currentDate->format('Y-m-d 00:00:00');
        $endDate = $currentDate->format('Y-m-d 23:59:59');
        break;
}

try {
    $query = "
        WITH StartReadings AS (
            SELECT m.subgroup_mv, m.stand_kwh as start_kwh, m.stand_kvarh as start_kvarh
            FROM dbo.medium_voltage m
            INNER JOIN (
                SELECT subgroup_mv, MAX(timestamp) as max_ts
                FROM dbo.medium_voltage
                WHERE timestamp < :startDate
                GROUP BY subgroup_mv
            ) AS latest ON m.subgroup_mv = latest.subgroup_mv AND m.timestamp = latest.max_ts
        ),
        EndReadings AS (
            SELECT m.subgroup_mv, m.stand_kwh as end_kwh, m.stand_kvarh as end_kvarh
            FROM dbo.medium_voltage m
            INNER JOIN (
                SELECT subgroup_mv, MAX(timestamp) as max_ts
                FROM dbo.medium_voltage
                WHERE timestamp BETWEEN :startDate2 AND :endDate
                GROUP BY subgroup_mv
            ) AS latest ON m.subgroup_mv = latest.subgroup_mv AND m.timestamp = latest.max_ts
        )
        SELECT
            sg.group_mv,
            sg.subgroup_mv,
            CASE 
                WHEN ISNULL(er.end_kwh, 0) - COALESCE(sr.start_kwh, er.end_kwh, 0) < 0 THEN 0 
                ELSE ISNULL(er.end_kwh, 0) - COALESCE(sr.start_kwh, er.end_kwh, 0) 
            END as consumption_kwh,
            CASE 
                WHEN ISNULL(er.end_kvarh, 0) - COALESCE(sr.start_kvarh, er.end_kvarh, 0) < 0 THEN 0 
                ELSE ISNULL(er.end_kvarh, 0) - COALESCE(sr.start_kvarh, er.end_kvarh, 0) 
            END as consumption_kvarh
        FROM
            (SELECT DISTINCT group_mv, subgroup_mv FROM dbo.medium_voltage WHERE group_mv IN ('MV-A', 'MV-B', 'MV-C', 'MV-U') AND subgroup_mv IS NOT NULL AND subgroup_mv != '') AS sg
        LEFT JOIN StartReadings AS sr ON sg.subgroup_mv = sr.subgroup_mv
        LEFT JOIN EndReadings AS er ON sg.subgroup_mv = er.subgroup_mv
        WHERE er.end_kwh IS NOT NULL OR er.end_kvarh IS NOT NULL
        ORDER BY sg.group_mv, sg.subgroup_mv;
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute(['startDate' => $startDate, 'startDate2' => $startDate, 'endDate' => $endDate]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $output = ['MV-A' => [], 'MV-B' => [], 'MV-C' => [], 'MV-U' => []];
    foreach ($results as $row) {
        $group = $row['group_mv'];
        if (isset($output[$group])) {
            $trafoName = preg_replace('/^MV-[A-Z]\s*/', '', $row['subgroup_mv']);
            $output[$group][] = [
                'trafo' => $trafoName,
                'stand_kwh' => (float)$row['consumption_kwh'],
                'stand_kvarh' => (float)$row['consumption_kvarh']
            ];
        }
    }

    echo json_encode($output);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Query gagal: ' . $e->getMessage()]);
    exit;
}
?>