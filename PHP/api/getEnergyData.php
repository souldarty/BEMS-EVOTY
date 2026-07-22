<?php
require 'database.php'; // Menggunakan koneksi terpusat

date_default_timezone_set('Asia/Jakarta');

// =========================================================================
// 1. SISTEM KEAMANAN JWT (Membaca dari .env)
// =========================================================================
$env_path = __DIR__ . '/.env';
if (file_exists($env_path)) {
    $lines = file($env_path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $_ENV[trim($parts[0])] = trim($parts[1], " \t\n\r\0\x0B\"'");
        }
    }
}

$jwt_secret = $_ENV['JWT_SECRET'] ?? '';

if (empty($jwt_secret)) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server Error: JWT Secret tidak ditemukan di .env"]);
    exit;
}

function verify_jwt($jwt, $secret) {
    $tokenParts = explode('.', $jwt);
    if (count($tokenParts) !== 3) return false;

    $header = base64_decode(strtr($tokenParts[0], '-_', '+/'));
    $payload = base64_decode(strtr($tokenParts[1], '-_', '+/'));
    $signature_provided = $tokenParts[2];

    $payload_data = json_decode($payload, true);
    if (isset($payload_data['exp']) && $payload_data['exp'] < time()) return false;

    $base64_url_header = strtr(base64_encode($header), '+/', '-_');
    $base64_url_header = rtrim($base64_url_header, '=');
    $base64_url_payload = strtr(base64_encode($payload), '+/', '-_');
    $base64_url_payload = rtrim($base64_url_payload, '=');
    
    $signature_to_check = hash_hmac('sha256', $base64_url_header . "." . $base64_url_payload, $secret, true);
    $base64_url_signature = strtr(base64_encode($signature_to_check), '+/', '-_');
    $base64_url_signature = rtrim($base64_url_signature, '=');

    return hash_equals($base64_url_signature, $signature_provided);
}

$headers = null;
if (isset($_SERVER['Authorization'])) { $headers = trim($_SERVER["Authorization"]); }
else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { $headers = trim($_SERVER["HTTP_AUTHORIZATION"]); }
elseif (function_exists('apache_request_headers')) {
    $requestHeaders = apache_request_headers();
    $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
    if (isset($requestHeaders['Authorization'])) { $headers = trim($requestHeaders['Authorization']); }
}

$token = null;
if (!empty($headers) && preg_match('/Bearer\s(\S+)/', $headers, $matches)) { $token = $matches[1]; }

if (empty($token) || !verify_jwt($token, $jwt_secret)) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Akses Ditolak! Token JWT tidak valid."]);
    exit;
}

// =========================================================================
// 2. LOGIKA UTAMA PROGRAM
// =========================================================================

try {
    // 1. OPSI A: Menambahkan filter LIKE '%INCOMER%' dan memanggil subgroup_mv
    $sql = "SELECT group_mv, subgroup_mv, timestamp, stand_kwh, reactive_energy_kvarh
            FROM dbo.mv_lowvoltage
            WHERE group_mv IN ('MV-I', 'MV-A', 'MV-B', 'MV-C', 'MV-U')
              AND subgroup_mv LIKE '%INCOMER%'
            ORDER BY group_mv ASC, subgroup_mv ASC, timestamp ASC";

    $stmt = $pdo->query($sql);
    $raw_data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. Mengelompokkan data secara mendalam: Area -> Incomer Meter -> Data
    $grouped_data = [];
    foreach ($raw_data as $row) {
        $group = $row['group_mv'];
        $subgroup = $row['subgroup_mv'];
        
        if (!isset($grouped_data[$group])) {
            $grouped_data[$group] = [];
        }
        if (!isset($grouped_data[$group][$subgroup])) {
            $grouped_data[$group][$subgroup] = [];
        }
        
        $grouped_data[$group][$subgroup][] = [
            'unix_timestamp' => strtotime($row['timestamp']),
            'stand_kwh' => floatval($row['stand_kwh']),
            'reactive_energy_kvarh' => floatval($row['reactive_energy_kvarh'])
        ];
    }

    define('MAX_METER_VALUE', 100000000);

    // Menyiapkan struktur response final
    $response = [
        "areas" => [],
        "sankey" => ["MVI" => 0, "MVA" => 0, "MVB" => 0, "MVC" => 0, "MVU" => 0],
        
        // --- FITUR BARU: Menambahkan penampung global untuk Performance.jsx ---
        "daily" => [],
        "monthly" => [],
        "yearly" => []
    ];

    // --- PENGOLAHAN DATA PER AREA ---
    foreach ($grouped_data as $group => $subgroups) {
        
        // Master aggregator per jam untuk area ini
        $hourly_aggregator = [];

        // 3. Menghitung konsumsi MASING-MASING incomer untuk mencegah bug rollover
        foreach ($subgroups as $subgroup => $data) {
            if (count($data) < 2) continue; // Butuh minimal 2 baris untuk menghitung selisih

            for ($i = 0; $i < count($data) - 1; $i++) {
                $current_row = $data[$i];
                $next_row = $data[$i+1];
                $hour_str = date('Y-m-d H:00:00', $current_row['unix_timestamp']);
                
                if (!isset($hourly_aggregator[$hour_str])) {
                    $hourly_aggregator[$hour_str] = [
                        'total_kwh' => 0, 'total_kvarh' => 0,
                        's1_lwbp' => 0, 's1_wbp' => 0,
                        's2_lwbp' => 0, 's2_wbp' => 0,
                        's3_lwbp' => 0, 's3_wbp' => 0
                    ];
                }

                // Kalkulasi konsumsi kWh dengan penanganan rollover individual meter
                $consumption_kwh = $next_row['stand_kwh'] - $current_row['stand_kwh'];
                if ($consumption_kwh < 0) {
                    $consumption_kwh = (MAX_METER_VALUE - $current_row['stand_kwh']) + $next_row['stand_kwh'];
                }

                // Kalkulasi konsumsi kVARh dengan penanganan rollover individual meter
                $consumption_kvarh = $next_row['reactive_energy_kvarh'] - $current_row['reactive_energy_kvarh'];
                if ($consumption_kvarh < 0) {
                    $consumption_kvarh = (MAX_METER_VALUE - $current_row['reactive_energy_kvarh']) + $next_row['reactive_energy_kvarh'];
                }

                $hour_of_day = (int)date('G', $current_row['unix_timestamp']);
                $is_wbp = ($hour_of_day >= 17 && $hour_of_day < 22);

                if ($consumption_kwh > 0) {
                    $hourly_aggregator[$hour_str]['total_kwh'] += $consumption_kwh;
                    
                    if ($hour_of_day >= 0 && $hour_of_day < 8) { // Shift 1
                        $hourly_aggregator[$hour_str]['s1_lwbp'] += $consumption_kwh;
                    } else if ($hour_of_day >= 8 && $hour_of_day < 16) { // Shift 2
                        $hourly_aggregator[$hour_str]['s2_lwbp'] += $consumption_kwh;
                    } else { // Shift 3
                        if ($is_wbp) {
                            $hourly_aggregator[$hour_str]['s3_wbp'] += $consumption_kwh;
                        } else {
                            $hourly_aggregator[$hour_str]['s3_lwbp'] += $consumption_kwh;
                        }
                    }
                }
                
                if ($consumption_kvarh > 0) {
                    $hourly_aggregator[$hour_str]['total_kvarh'] += $consumption_kvarh;
                }
            }
        }

        // 4. Membangun data Daily, Monthly, dan Yearly berdasarkan Hourly Aggregator yang sudah matang
        ksort($hourly_aggregator); // Pastikan urut secara kronologis

        $hourlyData = [];
        $daily_aggregator = [];
        $monthly_aggregator = [];
        $yearly_aggregator = [];

        foreach($hourly_aggregator as $hour_str => $h_data) {
            $dt = new DateTime($hour_str);
            $hour = (int)$dt->format('G');
            $day_str = $dt->format('Y-m-d');
            $month_str = $dt->format('Y-m');
            $year_str = $dt->format('Y');

            // Hitung total LWBP dan WBP jam ini
            $h_total_lwbp = $h_data['s1_lwbp'] + $h_data['s2_lwbp'] + $h_data['s3_lwbp'];
            $h_total_wbp = $h_data['s1_wbp'] + $h_data['s2_wbp'] + $h_data['s3_wbp'];

            // Push to Hourly Data
            $hourlyData[] = [
                "timestamp" => $dt->getTimestamp(),
                "year" => (int)$dt->format('Y'), "month" => (int)$dt->format('n'), "day" => (int)$dt->format('j'), "hour" => $hour,
                "total_kwh" => round($h_data['total_kwh'], 2),
                "total_kvarh" => round($h_data['total_kvarh'], 2),
                "is_wbp" => ($hour >= 17 && $hour < 22),
                "shifts" => [
                    "shift1" => ["lwbp_kwh" => round($h_data['s1_lwbp'], 2), "wbp_kwh" => round($h_data['s1_wbp'], 2)],
                    "shift2" => ["lwbp_kwh" => round($h_data['s2_lwbp'], 2), "wbp_kwh" => round($h_data['s2_wbp'], 2)],
                    "shift3" => ["lwbp_kwh" => round($h_data['s3_lwbp'], 2), "wbp_kwh" => round($h_data['s3_wbp'], 2)]
                ]
            ];

            // Build Daily Aggregator
            if (!isset($daily_aggregator[$day_str])) {
                $daily_aggregator[$day_str] = [
                    'totalLWBP' => 0, 'totalWBP' => 0, 'total_kvarh' => 0,
                    's1_lwbp' => 0, 's1_wbp' => 0, 's2_lwbp' => 0, 's2_wbp' => 0, 's3_lwbp' => 0, 's3_wbp' => 0,
                    'dt' => clone $dt
                ];
            }
            $daily_aggregator[$day_str]['totalLWBP'] += $h_total_lwbp;
            $daily_aggregator[$day_str]['totalWBP'] += $h_total_wbp;
            $daily_aggregator[$day_str]['total_kvarh'] += $h_data['total_kvarh'];
            $daily_aggregator[$day_str]['s1_lwbp'] += $h_data['s1_lwbp']; $daily_aggregator[$day_str]['s1_wbp'] += $h_data['s1_wbp'];
            $daily_aggregator[$day_str]['s2_lwbp'] += $h_data['s2_lwbp']; $daily_aggregator[$day_str]['s2_wbp'] += $h_data['s2_wbp'];
            $daily_aggregator[$day_str]['s3_lwbp'] += $h_data['s3_lwbp']; $daily_aggregator[$day_str]['s3_wbp'] += $h_data['s3_wbp'];

            // Build Monthly Aggregator
            if (!isset($monthly_aggregator[$month_str])) {
                $monthly_aggregator[$month_str] = [
                    'totalLWBP' => 0, 'totalWBP' => 0, 'total_kvarh' => 0,
                    's1_lwbp' => 0, 's1_wbp' => 0, 's2_lwbp' => 0, 's2_wbp' => 0, 's3_lwbp' => 0, 's3_wbp' => 0,
                    'dt' => clone $dt
                ];
            }
            $monthly_aggregator[$month_str]['totalLWBP'] += $h_total_lwbp;
            $monthly_aggregator[$month_str]['totalWBP'] += $h_total_wbp;
            $monthly_aggregator[$month_str]['total_kvarh'] += $h_data['total_kvarh'];
            $monthly_aggregator[$month_str]['s1_lwbp'] += $h_data['s1_lwbp']; $monthly_aggregator[$month_str]['s1_wbp'] += $h_data['s1_wbp'];
            $monthly_aggregator[$month_str]['s2_lwbp'] += $h_data['s2_lwbp']; $monthly_aggregator[$month_str]['s2_wbp'] += $h_data['s2_wbp'];
            $monthly_aggregator[$month_str]['s3_lwbp'] += $h_data['s3_lwbp']; $monthly_aggregator[$month_str]['s3_wbp'] += $h_data['s3_wbp'];

            // Build Yearly Aggregator
            if (!isset($yearly_aggregator[$year_str])) {
                $yearly_aggregator[$year_str] = [
                    'totalLWBP' => 0, 'totalWBP' => 0, 'total_kvarh' => 0,
                    's1_lwbp' => 0, 's1_wbp' => 0, 's2_lwbp' => 0, 's2_wbp' => 0, 's3_lwbp' => 0, 's3_wbp' => 0,
                    'year' => (int)$year_str
                ];
            }
            $yearly_aggregator[$year_str]['totalLWBP'] += $h_total_lwbp;
            $yearly_aggregator[$year_str]['totalWBP'] += $h_total_wbp;
            $yearly_aggregator[$year_str]['total_kvarh'] += $h_data['total_kvarh'];
            $yearly_aggregator[$year_str]['s1_lwbp'] += $h_data['s1_lwbp']; $yearly_aggregator[$year_str]['s1_wbp'] += $h_data['s1_wbp'];
            $yearly_aggregator[$year_str]['s2_lwbp'] += $h_data['s2_lwbp']; $yearly_aggregator[$year_str]['s2_wbp'] += $h_data['s2_wbp'];
            $yearly_aggregator[$year_str]['s3_lwbp'] += $h_data['s3_lwbp']; $yearly_aggregator[$year_str]['s3_wbp'] += $h_data['s3_wbp'];
        }

        // Konversi Aggregator ke Array Final
        $dailyData = [];
        foreach ($daily_aggregator as $d_data) {
            $dailyData[] = [
                "year" => (int)$d_data['dt']->format('Y'), "month" => (int)$d_data['dt']->format('n'), "day" => (int)$d_data['dt']->format('j'),
                "totalLWBP" => round($d_data['totalLWBP'], 2), "totalWBP" => round($d_data['totalWBP'], 2), "total_kvarh" => round($d_data['total_kvarh'], 2),
                "totalGJ" => round(($d_data['totalLWBP'] + $d_data['totalWBP']) / 277.78, 2),
                "shifts" => [
                    "shift1" => ["lwbp_kwh" => round($d_data['s1_lwbp'], 2), "wbp_kwh" => round($d_data['s1_wbp'], 2)],
                    "shift2" => ["lwbp_kwh" => round($d_data['s2_lwbp'], 2), "wbp_kwh" => round($d_data['s2_wbp'], 2)],
                    "shift3" => ["lwbp_kwh" => round($d_data['s3_lwbp'], 2), "wbp_kwh" => round($d_data['s3_wbp'], 2)]
                ]
            ];
        }

        $monthlyData = [];
        foreach ($monthly_aggregator as $m_data) {
            $monthlyData[] = [
                "year" => (int)$m_data['dt']->format('Y'), "month" => (int)$m_data['dt']->format('n'),
                "totalLWBP" => round($m_data['totalLWBP'], 2), "totalWBP" => round($m_data['totalWBP'], 2), "total_kvarh" => round($m_data['total_kvarh'], 2),
                "totalGJ" => round(($m_data['totalLWBP'] + $m_data['totalWBP']) / 277.78, 2),
                "shifts" => [
                    "shift1" => ["lwbp_kwh" => round($m_data['s1_lwbp'], 2), "wbp_kwh" => round($m_data['s1_wbp'], 2)],
                    "shift2" => ["lwbp_kwh" => round($m_data['s2_lwbp'], 2), "wbp_kwh" => round($m_data['s2_wbp'], 2)],
                    "shift3" => ["lwbp_kwh" => round($m_data['s3_lwbp'], 2), "wbp_kwh" => round($m_data['s3_wbp'], 2)]
                ]
            ];
        }

        $yearlyData = [];
        foreach ($yearly_aggregator as $y_data) {
            $yearlyData[] = [
                "year" => $y_data['year'],
                "totalLWBP" => round($y_data['totalLWBP'], 2), "totalWBP" => round($y_data['totalWBP'], 2), "total_kvarh" => round($y_data['total_kvarh'], 2),
                "totalGJ" => round(($y_data['totalLWBP'] + $y_data['totalWBP']) / 277.78, 2),
                "shifts" => [
                    "shift1" => ["lwbp_kwh" => round($y_data['s1_lwbp'], 2), "wbp_kwh" => round($y_data['s1_wbp'], 2)],
                    "shift2" => ["lwbp_kwh" => round($y_data['s2_lwbp'], 2), "wbp_kwh" => round($y_data['s2_wbp'], 2)],
                    "shift3" => ["lwbp_kwh" => round($y_data['s3_lwbp'], 2), "wbp_kwh" => round($y_data['s3_wbp'], 2)]
                ]
            ];
        }

        // --- MENYIAPKAN DATA BULAN TERAKHIR UNTUK SANKEY DIAGRAM ---
        $target_gj = 0;

        if (!empty($monthlyData)) {
            // Jika ada request filter bulan & tahun dari Frontend
            if (isset($_GET['month']) && isset($_GET['year'])) {
                $req_month = (int)$_GET['month'];
                $req_year = (int)$_GET['year'];
                
                // Cari data yang sesuai dengan bulan & tahun yang dipilih
                foreach ($monthlyData as $m_data) {
                    if ($m_data['year'] === $req_year && $m_data['month'] === $req_month) {
                        $target_gj = $m_data['totalGJ'];
                        break;
                    }
                }
            } else {
                // Jika tidak ada filter (fallback), ambil bulan terbaru
                $latest_month = end($monthlyData);
                $target_gj = $latest_month['totalGJ'];
            }
        }

        $sankeyKey = str_replace('-', '', $group);
        $response["sankey"][$sankeyKey] = round($target_gj, 2);

        // Simpan ke output array (Persis seperti aslinya)
        $response["areas"][$group] = [
            "hourly" => $hourlyData, 
            "daily" => $dailyData, 
            "monthly" => $monthlyData, 
            "yearly" => $yearlyData
        ];

        // --- FITUR BARU: Menjumlahkan data area ke penampung Global Aggregator ---
        // Penjumlahan ini tidak akan mengganggu output "areas" sama sekali
        foreach ($dailyData as $d) {
            $key = $d['year'] . '-' . $d['month'] . '-' . $d['day'];
            if (!isset($response['daily'][$key])) {
                $response['daily'][$key] = $d; 
            } else {
                $response['daily'][$key]['totalLWBP'] += $d['totalLWBP'];
                $response['daily'][$key]['totalWBP'] += $d['totalWBP'];
                $response['daily'][$key]['total_kvarh'] += $d['total_kvarh'];
                $response['daily'][$key]['totalGJ'] += $d['totalGJ'];
            }
        }

        foreach ($monthlyData as $m) {
            $key = $m['year'] . '-' . $m['month'];
            if (!isset($response['monthly'][$key])) {
                $response['monthly'][$key] = $m; 
            } else {
                $response['monthly'][$key]['totalLWBP'] += $m['totalLWBP'];
                $response['monthly'][$key]['totalWBP'] += $m['totalWBP'];
                $response['monthly'][$key]['total_kvarh'] += $m['total_kvarh'];
                $response['monthly'][$key]['totalGJ'] += $m['totalGJ'];
            }
        }

        foreach ($yearlyData as $y) {
            $key = $y['year'];
            if (!isset($response['yearly'][$key])) {
                $response['yearly'][$key] = $y; 
            } else {
                $response['yearly'][$key]['totalLWBP'] += $y['totalLWBP'];
                $response['yearly'][$key]['totalWBP'] += $y['totalWBP'];
                $response['yearly'][$key]['total_kvarh'] += $y['total_kvarh'];
                $response['yearly'][$key]['totalGJ'] += $y['totalGJ'];
            }
        }
    }

    // Merapikan format array global agar mudah dibaca oleh React (menghilangkan format key asosiatif)
    $response['daily'] = array_values($response['daily']);
    $response['monthly'] = array_values($response['monthly']);
    $response['yearly'] = array_values($response['yearly']);

    echo json_encode($response, JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Proses database gagal", "details" => $e->getMessage()]);
}
?>