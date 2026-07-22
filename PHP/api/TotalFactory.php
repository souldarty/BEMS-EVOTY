<?php
// ─────────────────────────────────────────────────────────────────────────────
// TotalFactory.php
// Mengambil data TERBARU (real-time) dari dbo.mv_lowvoltage
// khusus subgroup_mv yang mengandung kata 'Incomer' per ruangan (group_mv).
//
// LOGIKA UTAMA:
// - Filter subgroup_mv LIKE '%Incomer%'
// - Ambil baris TERBARU per (group_mv, subgroup_mv) via ROW_NUMBER()
// - Incomer yang SEMUA nilai numeriknya = 0 dianggap MATI → dikecualikan
//   dari perhitungan sebelum AVG dijalankan
// - Jika 1 ruangan punya >1 Incomer yang aktif → hasilnya di-AVERAGE
// - Jika hanya 1 Incomer aktif → data langsung dikirim tanpa distorsi
// - Key yang dikembalikan sudah dalam format lowercase-hyphen (mv-a, mv-b, ...)
//   sehingga langsung cocok dengan id di frontend tanpa mapping tambahan
//
// CONSTRAINT:
// - Tidak mengubah file PHP lain yang sudah ada (termasuk database.php)
// - Menggunakan koneksi $pdo dari database.php
// - Menggunakan ROW_NUMBER() sesuai SQL Server syntax
// - Mengembalikan JSON terstruktur per group_mv (key: lowercase-hyphen)
// ─────────────────────────────────────────────────────────────────────────────

require 'database.php';

// --- TAMBAHAN JWT: Memanggil mesin pemeriksa token ---
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
// --------------------------------------------------

date_default_timezone_set('Asia/Jakarta');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// ============================================================
// --- TAMBAHAN JWT: SATPAM PENJAGA PINTU (VERIFIKASI TOKEN) ---
// ============================================================
$headers = apache_request_headers(); // Mengambil semua amplop dari request
$kunci_rahasia = getenv('JWT_SECRET'); // Wajib sama dengan di login.php

// 1. Cek apakah ada amplop "Authorization"
if (!isset($headers['Authorization'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Akses Ditolak. Token JWT tidak ditemukan."]);
    exit(); // Hentikan script, lindungi database!
}

// 2. Ambil token murninya (Buang kata "Bearer ")
$authHeader = $headers['Authorization'];
$token_jwt = str_replace('Bearer ', '', $authHeader); 

// 3. Verifikasi Keaslian Token
try {
    // Mengecek token menggunakan stempel rahasia pabrik
    $decoded = JWT::decode($token_jwt, new Key($kunci_rahasia, 'HS256'));
    // Jika lolos baris ini, token VALID.
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Akses Ditolak. Token JWT tidak valid atau sudah kedaluwarsa."]);
    exit(); // Hentikan script, lindungi database!
}
// ============================================================
// --- AKHIR SATPAM PENJAGA. JIKA LOLOS, SCRIPT LANJUT MENGAMBIL DATA ---
// ============================================================


// ─────────────────────────────────────────────────────────────────────────────
// Daftar ruangan target.
// Nilai HARUS SAMA PERSIS dengan isi kolom group_mv di database.
// ─────────────────────────────────────────────────────────────────────────────
$targetRooms = ['MV-A', 'MV-B', 'MV-C', 'MV-I', 'MV-U'];

// ─────────────────────────────────────────────────────────────────────────────
// Mapping: nilai group_mv di DB → id yang dipakai frontend (lowercase-hyphen).
// ─────────────────────────────────────────────────────────────────────────────
$keyMap = [
    'MV-A' => 'mv-a',
    'MV-B' => 'mv-b',
    'MV-C' => 'mv-c',
    'MV-I' => 'mv-i',
    'MV-U' => 'mv-u',
];

try {
    $placeholders = implode(',', array_fill(0, count($targetRooms), '?'));

    // ─────────────────────────────────────────────────────────────────────────
    // Query tiga tahap (dua CTE):
    //
    // Tahap 1 — LatestPerIncomer:
    //   Ambil 1 baris TERBARU untuk setiap kombinasi (group_mv, subgroup_mv)
    //   yang subgroup_mv-nya mengandung kata 'Incomer'.
    //   ROW_NUMBER() di-PARTITION BY group_mv, subgroup_mv.
    //
    // Tahap 2 — ActiveIncomers:
    //   Dari hasil Tahap 1 (rn = 1), KECUALIKAN Incomer yang dianggap MATI.
    //   Incomer dianggap mati jika SEMUA kolom numerik bernilai 0:
    //   (termasuk voltage_l1, voltage_l2, voltage_l3, dsb)
    //
    // Tahap 3 — SELECT dengan GROUP BY group_mv:
    //   Rata-ratakan (AVG) semua kolom numerik dari Incomer yang aktif saja.
    //   Jika hanya 1 Incomer aktif → AVG dari 1 nilai = nilai itu sendiri
    //   (tidak ada distorsi, perilaku AVG SQL Server sudah benar).
    // ─────────────────────────────────────────────────────────────────────────
    $sql = "
        WITH LatestPerIncomer AS (
            SELECT
                group_mv,
                subgroup_mv,
                timestamp,
                voltage_l1,
                voltage_l2,
                voltage_l3,
                active_power_kw,
                stand_kwh,
                thd_i_l1,
                thd_i_l2,
                thd_i_l3,
                ROW_NUMBER() OVER (
                    PARTITION BY group_mv, subgroup_mv
                    ORDER BY timestamp DESC
                ) AS rn
            FROM dbo.mv_lowvoltage
            WHERE group_mv    IN ($placeholders)
              AND subgroup_mv LIKE '%Incomer%'
        ),
        ActiveIncomers AS (
            SELECT
                group_mv,
                subgroup_mv,
                timestamp,
                voltage_l1,
                voltage_l2,
                voltage_l3,
                active_power_kw,
                stand_kwh,
                thd_i_l1,
                thd_i_l2,
                thd_i_l3
            FROM LatestPerIncomer
            WHERE rn = 1
              -- FILTER: Incomer dianggap MATI jika semua nilai numerik = 0.
              AND NOT (
                    CAST(voltage_l1      AS FLOAT) = 0
                AND CAST(voltage_l2      AS FLOAT) = 0
                AND CAST(voltage_l3      AS FLOAT) = 0
                AND CAST(active_power_kw AS FLOAT) = 0
                AND CAST(stand_kwh       AS FLOAT) = 0
                AND CAST(thd_i_l1        AS FLOAT) = 0
                AND CAST(thd_i_l2        AS FLOAT) = 0
                AND CAST(thd_i_l3        AS FLOAT) = 0
              )
        )
        SELECT
            group_mv,
            MAX(timestamp)                      AS timestamp,
            AVG(CAST(voltage_l1      AS FLOAT)) AS voltage_l1,
            AVG(CAST(voltage_l2      AS FLOAT)) AS voltage_l2,
            AVG(CAST(voltage_l3      AS FLOAT)) AS voltage_l3,
            AVG(CAST(active_power_kw AS FLOAT)) AS active_power_kw,
            AVG(CAST(stand_kwh       AS FLOAT)) AS stand_kwh,
            AVG(CAST(thd_i_l1        AS FLOAT)) AS thd_i_l1,
            AVG(CAST(thd_i_l2        AS FLOAT)) AS thd_i_l2,
            AVG(CAST(thd_i_l3        AS FLOAT)) AS thd_i_l3
        FROM ActiveIncomers
        GROUP BY group_mv
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($targetRooms);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $result = [];

    foreach ($rows as $row) {
        $dbKey       = $row['group_mv'];
        $frontendKey = $keyMap[$dbKey] ?? strtolower(str_replace([' ', '_'], '-', $dbKey));

        // Kalkulasi Voltage rata-rata tiga fasa (Modifikasi Baru)
        // Formula: (avg_voltage_l1 + avg_voltage_l2 + avg_voltage_l3) / 3
        $voltage_avg = (
            (float)$row['voltage_l1'] +
            (float)$row['voltage_l2'] +
            (float)$row['voltage_l3']
        ) / 3;

        // Kalkulasi THD-I rata-rata tiga fasa
        // Formula: (avg_thd_l1 + avg_thd_l2 + avg_thd_l3) / 3
        $thd_avg = (
            (float)$row['thd_i_l1'] +
            (float)$row['thd_i_l2'] +
            (float)$row['thd_i_l3']
        ) / 3;

        $result[$frontendKey] = [
            "timestamp" => $row['timestamp'],
            // Parameter voltage sekarang menyimpan data rata-rata hasil perhitungan
            "voltage"   => round($voltage_avg, 2),
            "power_kw"  => round((float)$row['active_power_kw'], 2),
            "stand_kwh" => round((float)$row['stand_kwh'], 2),
            "thd_avg"   => round($thd_avg, 2),
        ];
    }

    echo json_encode([
        "success" => true,
        "data"    => $result,
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "DB Error: " . $e->getMessage(),
    ]);
}
?>