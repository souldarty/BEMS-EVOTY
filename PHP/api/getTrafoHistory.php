<?php

require 'database.php';

// Mencegah caching pada sisi client
header('Cache-Control: no-cache, must-revalidate');
header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
header('Content-Type: application/json');


function send_error_response($message, $code = 500) {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}

$endpoint = $_GET['endpoint'] ?? '';
$group = $_GET['group'] ?? '';
$subgroup = $_GET['subgroup'] ?? '';

// =========================================================================
// ENDPOINT UNTUK MENGAMBIL SEMUA DATA
// =========================================================================
if ($endpoint === 'all-data' && (!empty($group) || !empty($subgroup))) {
    try {
        $filter_clause = !empty($subgroup) ? "subgroup_mv = ?" : "group_mv = ?";
        $filter_param = !empty($subgroup) ? $subgroup : $group;

        $query = "SELECT * FROM medium_voltage WHERE $filter_clause ORDER BY timestamp ASC";
        $stmt = $pdo->prepare($query);
        $stmt->execute([$filter_param]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($results, JSON_PRETTY_PRINT);

    } catch (Exception $e) {
        send_error_response('Query gagal untuk all-data. Pesan: ' . $e->getMessage());
    }
    exit;
}

// =========================================================================
// ENDPOINT UNTUK DATA GRAFIK UTAMA
// =========================================================================
if ($endpoint === 'incomer-data' && (!empty($group) || !empty($subgroup))) {
    try {
        $timeframe = $_GET['timeframe'] ?? 'custom-range'; // Default ke custom-range
        $results = [];
        $filter_clause = !empty($subgroup) ? "subgroup_mv = ?" : "group_mv = ?";
        $filter_param = !empty($subgroup) ? $subgroup : $group;

        if ($timeframe === 'custom-range') {
            $start_date_str_param = $_GET['startDate'] ?? date('Y-m-d');
            $end_date_str_param = $_GET['endDate'] ?? date('Y-m-d');
            
            $start_date_obj = new DateTime($start_date_str_param . " 00:00:00");
            $end_date_obj = new DateTime($end_date_str_param . " 23:59:59");

            $start_date_str = $start_date_obj->format('Y-m-d H:i:s');
            $end_date_str = $end_date_obj->format('Y-m-d H:i:s');
            
            // 1. Ambil 1 data sebelum rentang waktu untuk kontinuitas grafik
            $query_initial_data = "SELECT TOP 1 * FROM medium_voltage WHERE $filter_clause AND timestamp < ? ORDER BY timestamp DESC";
            $stmt_initial = $pdo->prepare($query_initial_data);
            $stmt_initial->execute([$filter_param, $start_date_str]);
            $initial_row = $stmt_initial->fetch(PDO::FETCH_ASSOC);

            // 2. Ambil semua data dalam rentang waktu
            $query_main_data = "SELECT * FROM medium_voltage WHERE $filter_clause AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC";
            $stmt_main = $pdo->prepare($query_main_data);
            $stmt_main->execute([$filter_param, $start_date_str, $end_date_str]);
            $all_data = $stmt_main->fetchAll(PDO::FETCH_ASSOC);
            
            // Gabungkan data awal dengan data utama
            if ($initial_row) {
                array_unshift($all_data, $initial_row);
            }

            if (empty($all_data)) {
                 echo json_encode([]);
                 exit;
            }

            // 3. Hitung konsumsi energi (delta) antar titik data
            $consumption_data = [];
            if (count($all_data) > 1) {
                for ($i = 0; $i < count($all_data) - 1; $i++) {
                    $current_row = $all_data[$i];
                    $next_row = $all_data[$i + 1];
                    
                    $kwh_consumption = (float)$next_row['stand_kwh'] - (float)$current_row['stand_kwh'];
                    $kvarh_consumption = (float)$next_row['stand_kvarh'] - (float)$current_row['stand_kvarh'];
                    
                    $output_row = $next_row; // Gunakan data dari titik berikutnya sebagai basis
                    $output_row['stand_kwh'] = ($kwh_consumption >= 0) ? $kwh_consumption : 0;
                    $output_row['stand_kvarh'] = ($kvarh_consumption >= 0) ? $kvarh_consumption : 0;
                    $output_row['time'] = $output_row['timestamp']; // Ganti nama field 'timestamp' menjadi 'time'
                    unset($output_row['timestamp']);
                    
                    $consumption_data[] = $output_row;
                }
            }
            $results = $consumption_data;

        } else {
            // Logika lama (jika masih diperlukan) bisa diletakkan di sini.
            // Untuk saat ini, kita anggap semua request adalah 'custom-range'.
            send_error_response('Timeframe tidak didukung. Gunakan custom-range.', 400);
        }
        
        echo json_encode($results, JSON_PRETTY_PRINT);

    } catch (Exception $e) {
        send_error_response('Query gagal untuk incomer-data. Pesan: ' . $e->getMessage());
    }
    exit;
}

// =========================================================================
// ENDPOINTS 2-5: Trend Charts
// =========================================================================
function handle_trend_endpoints($pdo, $endpoint, $group, $subgroup) {
    try {
        $filter_col = !empty($subgroup) ? "subgroup_mv" : "group_mv";
        $filter_val = !empty($subgroup) ? $subgroup : $group;

        if (empty($filter_val)) send_error_response('Parameter group atau subgroup diperlukan', 400);

        if ($endpoint === 'group-daily') {
            $date = $_GET['date'] ?? date('Y-m-d');
            $dt = new DateTime($date);
            $start_of_week_dt = (clone $dt)->modify('monday this week');
            $query_start_date = $start_of_week_dt->format('Y-m-d');
            $query_end_date = (clone $start_of_week_dt)->modify('+7 days')->format('Y-m-d');
            
            $query = "
                SELECT timestamp, stand_kwh FROM medium_voltage 
                WHERE $filter_col = ? 
                AND timestamp >= (SELECT MAX(timestamp) FROM medium_voltage WHERE $filter_col = ? AND timestamp < ?) 
                AND timestamp < ? ORDER BY timestamp ASC";
            $stmt = $pdo->prepare($query);
            $stmt->execute([$filter_val, $filter_val, $query_start_date, $query_end_date]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $week_days_indo = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
            $results = array_fill_keys($week_days_indo, 0);

            if (count($data) > 1) {
                for ($i = 0; $i < count($data) - 1; $i++) {
                    $consumption = (float)$data[$i+1]['stand_kwh'] - (float)$data[$i]['stand_kwh'];
                    $dayIndex = (int)(new DateTime($data[$i+1]['timestamp']))->format('N') - 1;
                    $dayName = $week_days_indo[$dayIndex];
                    if ($consumption > 0) $results[$dayName] += $consumption;
                }
            }
            $final_output = array_map(function($day, $consumption) {
                return ["time" => $day, "consumption" => round($consumption)];
            }, array_keys($results), array_values($results));
            
            echo json_encode($final_output);
        }
    } catch (Exception $e) {
        send_error_response("Query gagal untuk $endpoint: " . $e->getMessage());
    }
    exit;
}

if (in_array($endpoint, ['group-daily', 'group-monthly', 'group-yearly', 'group-5-yearly'])) {
    handle_trend_endpoints($pdo, $endpoint, $group, $subgroup);
}

send_error_response('Endpoint tidak ditemukan.', 404);
?>