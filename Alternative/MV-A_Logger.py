import pyodbc
import struct
import time
import logging
from datetime import datetime, timedelta
from typing import Any, Optional, Dict, List
from pymodbus.client import ModbusTcpClient
from pymodbus.payload import BinaryPayloadDecoder
from pymodbus.constants import Endian

# ==========================================
# --- CONFIGURATION (SESUAIKAN DI SINI) ---
# ==========================================

DB_CONN_STR = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=localhost\\SQLEXPRESS;"
    "DATABASE=BEMS;"
    "Trusted_Connection=yes;"
)

GATEWAY_IP = "10.130.222.36" 
GATEWAY_PORT = 502
SCHEDULE_INTERVAL_MINUTES = 1 

# Master Device List
MASTER_DEVICE_LIST = [
    {"slave_id": 1, "type": "M2M", "group": "LVMDP", "subgroup": "Incomer Trafo #1"},
    {"slave_id": 2, "type": "M2M", "group": "LVMDP", "subgroup": "Incomer Trafo #2"},
    {"slave_id": 5, "type": "M2M", "group": "LVMDP", "subgroup": "101-11-02BY1.1 TSE+RD 116.01"},
    {"slave_id": 6, "type": "M2M", "group": "LVMDP", "subgroup": "101-06-02 Manual Small Chemical Dosing"},
    {"slave_id": 7, "type": "M2M", "group": "LVMDP", "subgroup": "101-11-15 Rubber Cutter"},
    {"slave_id": 8, "type": "M2M", "group": "LVMDP", "subgroup": "101-11-01"},
    {"slave_id": 9, "type": "M2M", "group": "LVMDP", "subgroup": "101-A1-LV01(MCC/MR/01-AHU)"},
    {"slave_id": 10, "type": "M2M", "group": "LVMDP", "subgroup": "101-11-11 BY1.1 Aux.MB (Mixer Control) + D&W 115.01"},
    {"slave_id": 11, "type": "M2M", "group": "LVMDP", "subgroup": "101-06-01(Oil Storage)"},
    {"slave_id": 12, "type": "M2M", "group": "LVMDP", "subgroup": "101-11-06(Batch Off Control By 1.1 118.01)"},
    {"slave_id": 13, "type": "M2M", "group": "LVMDP", "subgroup": "108-A1-LV01 R&D(DB LAB/2)"},
    {"slave_id": 14, "type": "M2M", "group": "LVMDP", "subgroup": "101-06-04 Pneumatic Transport Service 10,02"},
    {"slave_id": 15, "type": "M2M", "group": "LVMDP", "subgroup": "101-21-23 BY2.1 Aux. FC(Mixer Control) + D&W 215.01"},
    {"slave_id": 16, "type": "M2M", "group": "LVMDP", "subgroup": "101-21-04 BY2.1.3 Roll Mill Distribution 400V 216.30"},
    {"slave_id": 17, "type": "M2M", "group": "LVMDP", "subgroup": "101-21-04 BY2.1.2 Roll Mill Distribution 400V 216.20"},
    {"slave_id": 18, "type": "M2M", "group": "LVMDP", "subgroup": "101-21-04 BY2.1.1 Roll Mill Distribution 400V 216.10"},
    {"slave_id": 19, "type": "M2M", "group": "LVMDP", "subgroup": "101-21-18(Batch Off Control By 2.1 218.10)"},
    {"slave_id": 20, "type": "M2M", "group": "LVMDP", "subgroup": "101-21-01"},
]

# Register Maps (Nama Key disamakan dengan nama kolom Database)
M2M_REG_MAP = {
    'voltage': (4096, 'unsigned', 1),
    'stand_kwh': (4158, 'unsigned', 10000),      # Dari active_energies
    'active_power_kw': (4142, 'signed', 1000),  # Dari active_power
    'thd_i_l1': (4232, 'unsigned', 10),
    'thd_i_l2': (4234, 'unsigned', 10),
    'thd_i_l3': (4236, 'unsigned', 10),
}

FRER_REG_MAP = {
    'voltage': (40263, 'signed_long', 1000),
    'stand_kwh': (40283, 'signed_long', 1000),   # Dari active_energies
    'active_power_kw': (40277, 'signed_long', 1000),
    'thd_i_l1': (40313, 'signed_long', 10),
    'thd_i_l2': (40315, 'signed_long', 10),
    'thd_i_l3': (40317, 'signed_long', 10),
}

# ==========================================
# --- LOGIKA PROGRAM ---
# ==========================================

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def insert_to_db(data: Dict[str, Any]):
    """Menyimpan data hasil polling ke SQL Server."""
    try:
        with pyodbc.connect(DB_CONN_STR) as conn:
            cursor = conn.cursor()
            # Query diperbarui untuk menggunakan slave_id sebagai ganti device_type
            query = """INSERT INTO mva_lvmdb (
                slave_id, group_mv, subgroup_mv, 
                voltage, stand_kwh, active_power_kw, 
                thd_i_l1, thd_i_l2, thd_i_l3
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"""
            
            # Memastikan slave_id dimasukkan sebagai integer
            params = (
                int(data['slave_id']), data['group_mv'], data['subgroup_mv'], 
                data.get('voltage', 0), 
                data.get('stand_kwh', 0), 
                data.get('active_power_kw', 0), 
                data.get('thd_i_l1', 0), 
                data.get('thd_i_l2', 0), 
                data.get('thd_i_l3', 0)
            )
            cursor.execute(query, params)
            conn.commit()
            # Info log diperbarui untuk menampilkan slave_id
            logging.info(f"SUKSES: Data {data['subgroup_mv']} (Slave ID: {data['slave_id']}) tersimpan.")
    except Exception as e:
        logging.error(f"DATABASE ERROR: {e}")

def read_modbus_data(client: ModbusTcpClient, device: Dict) -> Optional[Dict]:
    slave_id = device['slave_id']
    dev_type = device['type'].upper()
    # Logika pemilihan reg_map tetap utuh
    reg_map = M2M_REG_MAP if dev_type == "M2M" else FRER_REG_MAP
    
    # device_type dihapus dari dict ini, diganti dengan slave_id
    results = {
        'slave_id': int(slave_id),
        'group_mv': device['group'],
        'subgroup_mv': device['subgroup']
    }

    try:
        # Ambil Multiplier khusus FRER
        multiplier = 1
        if dev_type == "FRER":
            res_m = client.read_holding_registers(40287 - 40001, 2, slave=slave_id)
            if not res_m.isError():
                dec_m = BinaryPayloadDecoder.fromRegisters(res_m.registers, byteorder=Endian.Big, wordorder=Endian.Big)
                multiplier = dec_m.decode_32bit_int()

        # Polling data berdasarkan Map
        for col, (raw_reg, data_type, divider) in reg_map.items():
            addr = (raw_reg - 40001) if raw_reg >= 40001 else raw_reg
            res = client.read_holding_registers(addr, 2, slave=slave_id)
            
            if res.isError():
                results[col] = 0.0
                continue

            decoder = BinaryPayloadDecoder.fromRegisters(res.registers, byteorder=Endian.Big, wordorder=Endian.Big)
            val = decoder.decode_32bit_int()

            # Kalkulasi nilai akhir
            if dev_type == "FRER" and col == "stand_kwh":
                final_val = round((val * multiplier) / 1000.0, 2)
            else:
                final_val = round(val / divider, 2)
            
            results[col] = final_val

        return results
    except Exception as e:
        logging.error(f"MODBUS ERROR (Slave {slave_id}): {e}")
        return None

def main_cycle():
    client = ModbusTcpClient(host=GATEWAY_IP, port=GATEWAY_PORT, timeout=5)
    if not client.connect():
        logging.error(f"Koneksi Gagal ke {GATEWAY_IP}")
        return

    for device in MASTER_DEVICE_LIST:
        data = read_modbus_data(client, device)
        if data:
            insert_to_db(data)
        time.sleep(0.1)
    
    client.close()

def start_logger():
    logging.info(f"BEMS Logger v3 Aktif. IP Gateway: {GATEWAY_IP}")
    try:
        while True:
            main_cycle()
            # Penjadwalan 5 menit (Catatan: Sesuai komen asli, walau SCHEDULE_INTERVAL_MINUTES=1)
            now = datetime.now()
            next_min = ((now.minute // SCHEDULE_INTERVAL_MINUTES) + 1) * SCHEDULE_INTERVAL_MINUTES
            next_run = (now + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0) if next_min >= 60 else now.replace(minute=next_min, second=0, microsecond=0)
            wait_sec = (next_run - now).total_seconds()
            logging.info(f"Selesai. Tunggu jadwal berikutnya: {next_run.strftime('%H:%M:%S')}")
            time.sleep(max(wait_sec, 1))
    except KeyboardInterrupt:
        logging.info("Sistem dimatikan oleh user.")

if __name__ == "__main__":
    start_logger()