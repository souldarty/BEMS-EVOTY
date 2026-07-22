import pyodbc
import struct
from datetime import datetime, timedelta
import time
from typing import Any, Optional, Dict, List
from pymodbus.client import ModbusTcpClient

# --- DATABASE CONFIGURATION (SQL SERVER) ---
DB_SERVER = "localhost\\SQLEXPRESS"
DB_NAME = "BEMS"
DB_CONN_STR = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={DB_SERVER};DATABASE={DB_NAME};Trusted_Connection=yes;"

# --- SCHEDULING CONFIGURATION ---
SCHEDULE_INTERVAL_MINUTES = 5 

# --- SCALING FACTORS ---
PT_RATIO = 20000.0 / 100.0
CT_RATIO = 1200.0 / 5.0

# --- MODBUS REGISTER DEFINITIONS ---
REGISTER_MAP = {
    'frequency':      (16384, 'float'),
    'voltage':        (16400, 'float'),
    'current':        (16408, 'float'),
    'active_power':   (16418, 'float'),
    'reactive_power': (16426, 'float'),
    'apparent_power': (16434, 'float'),
    'power_factor':   (16442, 'float'),
    'kwh':            (16456, 'dword'),
    'kvarh':          (16460, 'dword'),
    'thd_v_l1':       (16474, 'word'),
    'thd_v_l2':       (16475, 'word'),
    'thd_v_l3':       (16476, 'word'),
    'thd_i_l1':       (16478, 'word'),
    'thd_i_l2':       (16479, 'word'),
    'thd_i_l3':       (16480, 'word'),
}

# --- BARU: MASTER DEVICE LIST ---
MASTER_DEVICE_LIST = [
    {
        "ip_address": "10.130.222.253", "port": 502, "unit_id": 1,
        "group_mv": "MV-I", "subgroup_mv": ""
    },
]

# --- DATA PARSING HELPER FUNCTIONS ---
def _parse_float(registers: List[int], start_index: int) -> float:
    """Mengonversi dua register 16-bit menjadi float 32-bit."""
    raw = struct.pack('>2H', registers[start_index], registers[start_index + 1])
    return struct.unpack('>f', raw)[0]

def _parse_dword(registers: List[int], start_index: int) -> int:
    """Mengonversi dua register 16-bit menjadi integer 32-bit tanpa tanda (dword)."""
    raw = struct.pack('>2H', registers[start_index], registers[start_index + 1])
    return struct.unpack('>I', raw)[0]

def _parse_word(registers: List[int], start_index: int) -> int:
    """Mengembalikan nilai register 16-bit tunggal (word)."""
    return registers[start_index]

# --- Fungsi untuk sinkronisasi perangkat ---
def sync_devices_with_database():
    """Membandingkan MASTER_DEVICE_LIST dengan DB dan menambahkan perangkat yang hilang."""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] INFO: Memulai sinkronisasi daftar perangkat...")
    try:
        with pyodbc.connect(DB_CONN_STR) as connection:
            cursor = connection.cursor()
            
            # 1. Dapatkan perangkat yang ada dari DB untuk perbandingan
            cursor.execute("SELECT ip_address, port, unit_id FROM dbo.modbus_devices")
            existing_devices = set((row.ip_address, row.port, row.unit_id) for row in cursor.fetchall())
            
            # 2. Iterasi master list dan cari perangkat yang hilang
            devices_to_add = []
            for device in MASTER_DEVICE_LIST:
                identifier = (device["ip_address"], device["port"], device["unit_id"])
                if identifier not in existing_devices:
                    devices_to_add.append(device)
            
            # 3. Tambahkan perangkat yang hilang ke DB
            if not devices_to_add:
                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] INFO: Daftar perangkat di database sudah sinkron.")
                return

            for device in devices_to_add:
                name = device['subgroup_mv'] or device['group_mv']
                sql = """
                    INSERT INTO dbo.modbus_devices 
                    (name, ip_address, port, unit_id, group_mv, subgroup_mv, is_connected) 
                    VALUES (?, ?, ?, ?, ?, ?, 0)
                """
                params = (name, device['ip_address'], device['port'], device['unit_id'], device['group_mv'], device['subgroup_mv'])
                cursor.execute(sql, params)
                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] SUKSES: Perangkat baru '{name}' di {device['ip_address']} telah ditambahkan ke database.")
            
            connection.commit()

    except pyodbc.Error as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ERROR: Gagal saat sinkronisasi perangkat: {e}")


def get_modbus_devices() -> List[Dict[str, Any]]:
    """Mengambil semua konfigurasi perangkat Modbus dari database."""
    devices = []
    try:
        with pyodbc.connect(DB_CONN_STR) as connection:
            cursor = connection.cursor()
            cursor.execute("SELECT id, name, ip_address, port, unit_id, group_mv, subgroup_mv FROM dbo.modbus_devices")
            columns = [column[0] for column in cursor.description]
            for row in cursor.fetchall():
                devices.append(dict(zip(columns, row)))
    except pyodbc.Error as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ERROR: Gagal mengambil konfigurasi perangkat: {e}")
    return devices

def update_device_status(device_id: int, is_connected: bool) -> None:
    """Memperbarui status koneksi (1 untuk terhubung, 0 untuk gagal) dan timestamp."""
    try:
        with pyodbc.connect(DB_CONN_STR) as connection:
            cursor = connection.cursor()
            query = "UPDATE dbo.modbus_devices SET is_connected = ?, last_seen = ? WHERE id = ?"
            cursor.execute(query, is_connected, datetime.now(), device_id)
            connection.commit()
    except pyodbc.Error as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ERROR: Gagal memperbarui status untuk device ID {device_id}: {e}")

def insert_data(data: Dict[str, Any]) -> None:
    """Memasukkan data power meter baru ke dalam tabel medium_voltage."""
    try:
        with pyodbc.connect(DB_CONN_STR) as connection:
            cursor = connection.cursor()
            query = """INSERT INTO medium_voltage (
                group_mv, subgroup_mv, voltage, [current], frequency, stand_kwh, stand_kvarh, 
                active_power_kw, reactive_power_kvar, apparent_power_kva, power_factor, 
                thd_v_l1, thd_v_l2, thd_v_l3, thd_i_l1, thd_i_l2, thd_i_l3
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"""
            cursor.execute(query, tuple(data.values()))
            connection.commit()
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] SUKSES: Data untuk '{data['subgroup_mv'] or data['group_mv']}' berhasil dimasukkan.")
    except pyodbc.Error as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ERROR: Gagal memasukkan data ke SQL Server: {e}")

# --- MODBUS COMMUNICATION FUNCTION ---
def read_all_robust(client: ModbusTcpClient, unit_id: int) -> Optional[Dict[str, Any]]:
    """Membaca semua register dari REGISTER_MAP dan menerapkan penskalaan."""
    data = {}
    try:
        power_scale = (PT_RATIO * CT_RATIO) / 1000.0

        for name, (address, data_type) in REGISTER_MAP.items():
            count = 2 if data_type in ['float', 'dword'] else 1
            result = client.read_holding_registers(address=address, count=count, slave=unit_id)

            if not hasattr(result, 'registers') or len(result.registers) < count:
                raise IOError(f"Gagal membaca data untuk '{name}' di alamat {address}")

            registers = result.registers

            if data_type == 'float': value = _parse_float(registers, 0)
            elif data_type == 'dword': value = _parse_dword(registers, 0) / 10.0
            else: value = _parse_word(registers, 0) / 100.0

            if name == 'voltage': value *= PT_RATIO
            elif name == 'current': value *= CT_RATIO
            elif name in ['active_power', 'reactive_power', 'apparent_power']: value *= power_scale

            data[name] = value

        # Format kamus akhir dengan nilai yang dibulatkan
        return {
            'voltage': round(data.get('voltage', 0), 1),
            'current': round(data.get('current', 0), 2),
            'frequency': round(data.get('frequency', 0), 2),
            'stand_kwh': round(data.get('kwh', 0), 2),
            'stand_kvarh': round(data.get('kvarh', 0), 2),
            'active_power_kw': round(data.get('active_power', 0), 2),
            'reactive_power_kvar': round(data.get('reactive_power', 0), 2),
            'apparent_power_kva': round(data.get('apparent_power', 0), 2),
            'power_factor': round(data.get('power_factor', 0), 2),
            'thd_v_l1': round(data.get('thd_v_l1', 0), 2),
            'thd_v_l2': round(data.get('thd_v_l2', 0), 2),
            'thd_v_l3': round(data.get('thd_v_l3', 0), 2),
            'thd_i_l1': round(data.get('thd_i_l1', 0), 2),
            'thd_i_l2': round(data.get('thd_i_l2', 0), 2),
            'thd_i_l3': round(data.get('thd_i_l3', 0), 2)
        }
    except (IOError, ValueError, struct.error) as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ERROR: Gagal membaca atau mem-parsing data Modbus: {e}")
        return None

# --- MAIN LOGIC ---
def perform_logging_cycle():
    """Siklus utama: sinkronisasi, ambil daftar, hubungkan, baca data, dan catat."""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Memulai siklus pengambilan data...")
    
    # --- LANGKAH 1: Sinkronkan master list dengan database ---
    sync_devices_with_database()
    
    # --- LANGKAH 2: Lanjutkan dengan mengambil data seperti biasa ---
    devices = get_modbus_devices()
    if not devices:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] PERINGATAN: Tidak ada perangkat Modbus yang dikonfigurasi. Periksa MASTER_DEVICE_LIST.")
        return

    for device in devices:
        print(f"--- Memproses perangkat: {device['name']} ({device['ip_address']}:{device['port']}) ---")
        client = ModbusTcpClient(device['ip_address'], port=device['port'], timeout=3)
        
        # --- LOGIKA BARU: Terus mencoba terhubung sampai berhasil ---
        while not client.connect():
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] PERINGATAN: Gagal terhubung ke {device['name']}. Mencoba lagi dalam 3 detik...")
            update_device_status(device['id'], False) # Perbarui status menjadi 'tidak terhubung' selama percobaan
            time.sleep(0.5)
        
        # Jika loop selesai, berarti koneksi berhasil.
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] INFO: Koneksi TCP berhasil. Membaca data Modbus...")
        modbus_data = read_all_robust(client, device['unit_id'])
        
        if modbus_data:
            update_device_status(device['id'], True)
            full_data = {
                'group_mv': device['group_mv'],
                'subgroup_mv': device['subgroup_mv'] or '',
                **modbus_data
            }
            insert_data(full_data)
        else:
            update_device_status(device['id'], False)
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] PERINGATAN: Gagal membaca data Modbus dari {device['name']}. Status di database diperbarui menjadi 0.")
        
        client.close()

def main():
    """Fungsi eksekusi utama dengan loop penjadwalan."""
    print("Memulai skrip data logger Modbus...")
    
    try:
        while True:
            perform_logging_cycle()
            
            now = datetime.now()
            next_minute_scheduled = ((now.minute // SCHEDULE_INTERVAL_MINUTES) + 1) * SCHEDULE_INTERVAL_MINUTES
            
            if next_minute_scheduled >= 60:
                next_run_time = (now + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
            else:
                next_run_time = now.replace(minute=next_minute_scheduled, second=0, microsecond=0)

            wait_seconds = (next_run_time - now).total_seconds()
            
            if wait_seconds < 0: 
                wait_seconds = 0
            
            print(f"[{now.strftime('%Y-%m-%d %H:%M:%S')}] Menunggu jadwal berikutnya pada: {next_run_time.strftime('%Y-%m-%d %H:%M:%S')}")
            time.sleep(wait_seconds + 2)
            
    except KeyboardInterrupt:
        print("\nSkrip dihentikan oleh pengguna.")
    finally:
        print("Logger telah dimatikan.")

if __name__ == "__main__":
    main()