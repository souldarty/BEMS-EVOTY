# =============================================================
# FILE    : All_MV_Logger.py
# PROJECT : BEMS (Building Energy Management System)
# PURPOSE : UNIFIED — Modbus Data Logger + WebSocket Server
#
# REVISION: April 2026 (Rev 10) - Realtime Socket Status Handled by PHP
# =============================================================

import os
import asyncio
import json
import threading
import struct
import logging
import pyodbc
import jwt
import urllib.parse
from datetime import datetime
from typing import Any, Optional, Dict, List, Set
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv
from pymodbus.client import ModbusTcpClient
from pymodbus.payload import BinaryPayloadDecoder
from pymodbus.constants import Endian
import websockets
from websockets.exceptions import ConnectionClosed

load_dotenv()

# ==========================================
# --- KONFIGURASI UMUM ---
# ==========================================

DB_HOST     = os.getenv("DB_HOST")
DB_NAME     = os.getenv("DB_NAME")
DB_USER     = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DRIVER   = os.getenv("DB_DRIVER")

DB_CONN_STR = (
    f"DRIVER={{{DB_DRIVER}}};"
    f"SERVER={DB_HOST};"
    f"DATABASE={DB_NAME};"
    f"UID={DB_USER};"
    f"PWD={DB_PASSWORD};"
)

DB_SAVE_INTERVAL_SEC  = 30 * 60  
WS_BROADCAST_INTERVAL = 1        
CONNECTION_TIMEOUT_SEC = 3

WS_HOST    = "0.0.0.0"
WS_PORT    = 8765
JWT_SECRET = os.getenv("JWT_SECRET")

ANOMALY_MIN_ACTIVE_KW = 0.5
ANOMALY_SPIKE_PCT     = 30
ANOMALY_DROP_PCT      = 30
INCOMER_NAMES: Set[str] = {"Incomer Trafo #1", "Incomer Trafo #2", "INCOMER PLN"}

# ==========================================
# --- DYNAMIC DEVICE MANAGEMENT ---
# ==========================================
DEVICE_LIST_CACHE: List[Dict] = []
DEVICE_LOCK = threading.Lock()

# ==========================================
# --- REGISTER MAPS ---
# ==========================================
M2M_REG_MAP = {
    'voltage_l1':            (4104,  'unsigned', 1),
    'voltage_l2':            (4106,  'unsigned', 1),
    'voltage_l3':            (4108,  'unsigned', 1),
    'current_l1':            (4112,  'unsigned', 1),
    'current_l2':            (4114,  'unsigned', 1),
    'current_l3':            (4116,  'unsigned', 1),
    'power_factor':          (4126,  'signed',   1000),
    'reactive_power_kvar':   (4150,  'signed',   1),
    'stand_kwh':             (4158,  'unsigned', 10000),
    'reactive_energy_kvarh': (4160,  'unsigned', 100),
    'frequency_hz':          (4166,  'unsigned', 1),
    'active_power_kw':       (4198,  'signed',   1000), 
    'thd_i_l1':              (4232,  'unsigned', 10),
    'thd_i_l2':              (4234,  'unsigned', 10),
    'thd_i_l3':              (4236,  'unsigned', 10),
}

FRER_REG_MAP = {
    'voltage_l1':            (40263, 'signed_long', 1000),
    'voltage_l2':            (40265, 'signed_long', 1000),
    'voltage_l3':            (40267, 'signed_long', 1000),
    'current_l1':            (40269, 'signed_long', 1),
    'current_l2':            (40271, 'signed_long', 1),
    'current_l3':            (40273, 'signed_long', 1),
    'frequency_hz':          (40275, 'signed_long', 1000),
    'active_power_kw':       (40277, 'signed_long', 1000),
    'reactive_power_kvar':   (40279, 'signed_long', 1000),
    'power_factor':          (40281, 'signed_long', 1000),
    'stand_kwh':             (40283, 'signed_long', 1000), 
    'reactive_energy_kvarh': (40285, 'signed_long', 1000),
    'thd_i_l1':              (40313, 'signed_long', 1), 
    'thd_i_l2':              (40315, 'signed_long', 1), 
    'thd_i_l3':              (40317, 'signed_long', 1), 
}

PT_RATIO = 20000.0 / 100.0
CT_RATIO = 1200.0  / 5.0

MVI_REGISTER_MAP = {
    'frequency':      (16384, 'float'),
    'voltage_l1':     (16394, 'float'),
    'voltage_l2':     (16396, 'float'),
    'voltage_l3':     (16398, 'float'),
    'current_l1':     (16402, 'float'),
    'current_l2':     (16404, 'float'),
    'current_l3':     (16406, 'float'),
    'active_power':   (16418, 'float'),
    'reactive_power': (16426, 'float'),
    'power_factor':   (16442, 'float'),
    'kwh':            (16456, 'dword'),
    'kvarh':          (16460, 'dword'),
    'thd_i_l1':       (16478, 'word'),
    'thd_i_l2':       (16479, 'word'),
    'thd_i_l3':       (16480, 'word'),
}

# ==========================================
# --- SETUP LOGGING ---
# ==========================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# ==========================================
# --- IN-MEMORY CACHE ---
# ==========================================
LATEST_CACHE: Dict[str, Dict] = {}
CACHE_LOCK = threading.Lock()
connected_clients: Set = set()
previous_power: Dict[str, float] = {}

# ==========================================
# --- FUNGSI BACA MODBUS ---
# ==========================================
def read_rtu_device(client: ModbusTcpClient, device: Dict) -> Optional[Dict]:
    slave_id = device['unit_id']
    dev_type = (device['device_type'] or "FRER").upper()
    reg_map  = M2M_REG_MAP if dev_type == "M2M" else FRER_REG_MAP

    results = {
        'slave_id':    int(slave_id),
        'group_mv':    device['group_mv'],
        'subgroup_mv': device['subgroup_mv'],
    }

    try:
        multiplier = 1
        if dev_type == "FRER":
            res_m = client.read_holding_registers(40287 - 40001, 2, slave=slave_id)
            if not res_m.isError():
                dec_m = BinaryPayloadDecoder.fromRegisters(
                    res_m.registers, byteorder=Endian.Big, wordorder=Endian.Big
                )
                multiplier = dec_m.decode_32bit_int()

        for col, (raw_reg, data_type, divider) in reg_map.items():
            addr = (raw_reg - 40001) if raw_reg >= 40001 else raw_reg
            res  = client.read_holding_registers(addr, 2, slave=slave_id)

            if res.isError():
                results[col] = 0.0
                continue

            decoder = BinaryPayloadDecoder.fromRegisters(
                res.registers, byteorder=Endian.Big, wordorder=Endian.Big
            )
            val = decoder.decode_32bit_uint() if data_type == 'unsigned' else decoder.decode_32bit_int()

            if dev_type == "FRER" and col == "stand_kwh":
                results[col] = round((val * multiplier) / 1000.0, 2)
            else:
                results[col] = round(val / divider, 2)

        return results
    except Exception as e:
        return None

def _parse_float(registers: List[int], start_index: int) -> float:
    raw = struct.pack('>2H', registers[start_index], registers[start_index + 1])
    return struct.unpack('>f', raw)[0]

def _parse_dword(registers: List[int], start_index: int) -> int:
    raw = struct.pack('>2H', registers[start_index], registers[start_index + 1])
    return struct.unpack('>I', raw)[0]

def _parse_word(registers: List[int], start_index: int) -> int:
    return registers[start_index]

def read_mvi_device(client: ModbusTcpClient, device: Dict) -> Optional[Dict]:
    slave_id = device['unit_id']
    raw      = {}

    try:
        power_scale = (PT_RATIO * CT_RATIO) / 1000.0

        for name, (address, data_type) in MVI_REGISTER_MAP.items():
            count  = 2 if data_type in ['float', 'dword'] else 1
            result = client.read_holding_registers(address=address, count=count, slave=slave_id)

            if not hasattr(result, 'registers') or len(result.registers) < count:
                raise IOError(f"Gagal membaca '{name}' di alamat {address}")

            registers = result.registers
            if data_type == 'float':
                value = _parse_float(registers, 0)
            elif data_type == 'dword':
                value = _parse_dword(registers, 0) / 10.0
            else:
                value = _parse_word(registers, 0) / 100.0

            if name in ['voltage_l1', 'voltage_l2', 'voltage_l3']:
                value *= PT_RATIO
            elif name in ['current_l1', 'current_l2', 'current_l3']:
                value *= CT_RATIO
            elif name in ['active_power', 'reactive_power', 'apparent_power']:
                value *= power_scale

            raw[name] = value

        return {
            'slave_id':              slave_id,
            'group_mv':              device['group_mv'],
            'subgroup_mv':           device['subgroup_mv'],
            'voltage_l1':            round(raw.get('voltage_l1',     0), 1),
            'voltage_l2':            round(raw.get('voltage_l2',     0), 1),
            'voltage_l3':            round(raw.get('voltage_l3',     0), 1),
            'stand_kwh':             round(raw.get('kwh',            0), 2),
            'active_power_kw':       round(raw.get('active_power',   0), 2),
            'reactive_power_kvar':   round(raw.get('reactive_power', 0), 2),
            'reactive_energy_kvarh': round(raw.get('kvarh',          0), 2),
            'current_l1':            round(raw.get('current_l1',     0), 2),
            'current_l2':            round(raw.get('current_l2',     0), 2),
            'current_l3':            round(raw.get('current_l3',     0), 2),
            'frequency_hz':          round(raw.get('frequency',      0), 2),
            'power_factor':          round(raw.get('power_factor',   0), 3),
            'thd_i_l1':              round(raw.get('thd_i_l1',       0), 2),
            'thd_i_l2':              round(raw.get('thd_i_l2',       0), 2),
            'thd_i_l3':              round(raw.get('thd_i_l3',       0), 2),
        }
    except (IOError, ValueError, struct.error) as e:
        return None

# ==========================================
# --- DATABASE & DYNAMIC POLLING WORKERS ---
# ==========================================
def fetch_devices_from_db():
    try:
        with pyodbc.connect(DB_CONN_STR) as conn:
            cursor = conn.cursor()
            # REVISI: Kolom is_connected dan last_seen sudah dihapus dari query
            cursor.execute("SELECT id, name, ip_address, port, unit_id, group_mv, subgroup_mv, device_type FROM dbo.modbus_devices")
            columns = [column[0] for column in cursor.description]
            devices = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
            with DEVICE_LOCK:
                DEVICE_LIST_CACHE.clear()
                DEVICE_LIST_CACHE.extend(devices)
    except Exception as e:
        logging.error(f"[DB ERROR] Gagal mengambil daftar device: {e}")

def poll_gateway(ip: str, port: int, devices: List[Dict]) -> None:
    client = ModbusTcpClient(host=ip, port=port, timeout=CONNECTION_TIMEOUT_SEC)
    is_connected = client.connect()
    
    for device in devices:
        if not is_connected: continue

        if device['group_mv'] == "MV-I":
            data = read_mvi_device(client, device)
        else:
            data = read_rtu_device(client, device)

        if data:
            cache_key = f"{data['group_mv']}_{data['subgroup_mv']}"
            with CACHE_LOCK:
                LATEST_CACHE[cache_key] = data

    client.close()

def poll_all_gateways():
    with DEVICE_LOCK:
        devices = list(DEVICE_LIST_CACHE)
        
    if not devices: return

    gateways = {}
    for d in devices:
        key = (d['ip_address'], d['port'])
        if key not in gateways: gateways[key] = []
        gateways[key].append(d)

    with ThreadPoolExecutor(max_workers=len(gateways)) as executor:
        for (ip, port), devs in gateways.items():
            executor.submit(poll_gateway, ip, port, devs)

def save_cache_to_db() -> None:
    with CACHE_LOCK:
        snapshot = dict(LATEST_CACHE)
    
    if not snapshot: return
        
    try:
        with pyodbc.connect(DB_CONN_STR) as conn:
            cursor = conn.cursor()
            query = """
                INSERT INTO dbo.mv_lowvoltage (
                    timestamp, slave_id, group_mv, subgroup_mv,
                    voltage_l1, voltage_l2, voltage_l3, stand_kwh, active_power_kw,
                    thd_i_l1, thd_i_l2, thd_i_l3,
                    reactive_power_kvar, reactive_energy_kvarh,
                    current_l1, current_l2, current_l3, frequency_hz, power_factor
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            for key, data in snapshot.items():
                params = (
                    datetime.now(),
                    data.get('slave_id'), data['group_mv'], data['subgroup_mv'],
                    data.get('voltage_l1', 0), data.get('voltage_l2', 0), data.get('voltage_l3', 0),
                    data.get('stand_kwh', 0), data.get('active_power_kw', 0),
                    data.get('thd_i_l1', 0), data.get('thd_i_l2', 0), data.get('thd_i_l3', 0),
                    data.get('reactive_power_kvar', 0), data.get('reactive_energy_kvarh', 0),
                    data.get('current_l1', 0), data.get('current_l2', 0), data.get('current_l3', 0),
                    data.get('frequency_hz', 0), data.get('power_factor', 0),
                )
                cursor.execute(query, params)
            conn.commit()
    except Exception as e:
        logging.error(f"[DB] ERROR DATABASE: {e}")

# ==========================================
# --- WEBSOCKET HELPERS ---
# ==========================================
def _get_ws_path(websocket) -> str:
    if hasattr(websocket, "request") and websocket.request is not None:
        return getattr(websocket.request, "path", "/")
    return getattr(websocket, "path", "/")

def detect_anomaly(device_key: str, current_kw: float):
    anomaly, anomaly_type = False, None
    if device_key in previous_power:
        prev = previous_power[device_key]
        if prev >= ANOMALY_MIN_ACTIVE_KW and current_kw == 0:
            anomaly, anomaly_type = True, "POWER_LOSS"
        elif prev > 0 and current_kw > prev * (1 + ANOMALY_SPIKE_PCT / 100):
            anomaly, anomaly_type = True, "POWER_SPIKE"
        elif prev >= ANOMALY_MIN_ACTIVE_KW and 0 < current_kw < prev * (1 - ANOMALY_DROP_PCT / 100):
            anomaly, anomaly_type = True, "POWER_DROP"
    previous_power[device_key] = current_kw
    return anomaly, anomaly_type

def build_payload_from_cache() -> dict:
    with CACHE_LOCK:
        snapshot = dict(LATEST_CACHE)

    with DEVICE_LOCK:
        valid_keys = {f"{d['group_mv']}_{d['subgroup_mv']}" for d in DEVICE_LIST_CACHE}
    
    raw: Dict[str, dict] = {}
    for cache_key, data in snapshot.items():
        if cache_key not in valid_keys: continue
        raw[cache_key] = {
            "group_mv":              data["group_mv"],
            "subgroup_mv":           data["subgroup_mv"],
            "power_kw":              float(data.get('active_power_kw',       0.0)),
            "energy_kwh":            float(data.get('stand_kwh',             0.0)),
            "voltage_l1":            float(data.get('voltage_l1',            0.0)),
            "voltage_l2":            float(data.get('voltage_l2',            0.0)),
            "voltage_l3":            float(data.get('voltage_l3',            0.0)),
            "thd_l1":                float(data.get('thd_i_l1',              0.0)),
            "thd_l2":                float(data.get('thd_i_l2',              0.0)),
            "thd_l3":                float(data.get('thd_i_l3',              0.0)),
            "reactive_power_kvar":   float(data.get('reactive_power_kvar',   0.0)),
            "reactive_energy_kvarh": float(data.get('reactive_energy_kvarh', 0.0)),
            "current_l1":            float(data.get('current_l1',            0.0)),
            "current_l2":            float(data.get('current_l2',            0.0)),
            "current_l3":            float(data.get('current_l3',            0.0)),
            "frequency_hz":          float(data.get('frequency_hz',          0.0)),
            "power_factor":          float(data.get('power_factor',          0.0)),
            "timestamp":             datetime.now().isoformat(),
        }

    total_supply_kw, total_inc_energy, active_incomer_count = 0.0, 0.0, 0
    for cache_key, d in raw.items():
        if d["subgroup_mv"] in INCOMER_NAMES:
            kw = d["power_kw"]
            if kw >= ANOMALY_MIN_ACTIVE_KW:
                total_supply_kw  += kw
                total_inc_energy += d["energy_kwh"]
                active_incomer_count += 1

    incomer_active   = active_incomer_count > 0
    total_sub_kw     = 0.0
    total_sub_energy = 0.0
    devices_out: Dict[str, dict] = {}

    for cache_key, data in raw.items():
        subgroup = data["subgroup_mv"]
        is_incomer = subgroup in INCOMER_NAMES
        raw_kw     = data["power_kw"]
        
        if is_incomer:
            display_kw = raw_kw if incomer_active else 0.0
        else:
            display_kw = raw_kw if (raw_kw >= ANOMALY_MIN_ACTIVE_KW and incomer_active) else 0.0
            total_sub_kw     += display_kw
            total_sub_energy += data["energy_kwh"] if display_kw > 0 else 0.0

        thd_avg = round((data["thd_l1"] + data["thd_l2"] + data["thd_l3"]) / 3, 2)
        anomaly, anomaly_type = detect_anomaly(cache_key, display_kw)

        devices_out[cache_key] = {
            "group_mv":              data["group_mv"],
            "power_kw":              round(display_kw, 2),
            "energy_kwh":            round(data["energy_kwh"], 2),
            "voltage_l1":            round(data["voltage_l1"], 2),
            "voltage_l2":            round(data["voltage_l2"], 2),
            "voltage_l3":            round(data["voltage_l3"], 2),
            "thd_avg":               thd_avg,
            "thd_l1":                round(data["thd_l1"], 2),
            "thd_l2":                round(data["thd_l2"], 2),
            "thd_l3":                round(data["thd_l3"], 2),
            "reactive_power_kvar":   round(data["reactive_power_kvar"],   2),
            "reactive_energy_kvarh": round(data["reactive_energy_kvarh"], 2),
            "current_l1":            round(data["current_l1"],            2),
            "current_l2":            round(data["current_l2"],            2),
            "current_l3":            round(data["current_l3"],            2),
            "frequency_hz":          round(data["frequency_hz"],          2),
            "power_factor":          round(data["power_factor"],          3),
            "timestamp":             data["timestamp"],
            "anomaly":               anomaly,
            "anomaly_type":          anomaly_type,
        }

    others_kw     = max(0.0, total_supply_kw  - total_sub_kw)
    others_energy = max(0.0, total_inc_energy - total_sub_energy)
    others_anomaly, others_type = detect_anomaly("OTHERS", others_kw)
    devices_out["OTHERS"] = {
        "group_mv": "SYSTEM", "power_kw": round(others_kw, 2), "energy_kwh": round(others_energy, 2),
        "voltage_l1": 0.0, "voltage_l2": 0.0, "voltage_l3": 0.0, 
        "thd_avg": 0.0, "thd_l1": 0.0, "thd_l2": 0.0, "thd_l3": 0.0,
        "reactive_power_kvar": 0.0, "reactive_energy_kvarh": 0.0,
        "current_l1": 0.0, "current_l2": 0.0, "current_l3": 0.0, 
        "frequency_hz": 0.0, "power_factor": 0.0,
        "timestamp": datetime.now().isoformat(),
        "anomaly": others_anomaly, "anomaly_type": others_type,
    }

    return {"type": "realtime_update", "server_time": datetime.now().isoformat(), "devices": devices_out}

def verify_token(token: str) -> bool:
    if not JWT_SECRET: return True
    if not token: return False
    try:
        jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return True
    except: return False

# ==========================================
# --- ASYNCIO TASKS ---
# ==========================================
async def modbus_polling_task(executor: ThreadPoolExecutor) -> None:
    loop = asyncio.get_event_loop()
    while True:
        await loop.run_in_executor(executor, poll_all_gateways)
        await asyncio.sleep(2)

async def db_sync_task(executor: ThreadPoolExecutor) -> None:
    loop = asyncio.get_event_loop()
    while True:
        await loop.run_in_executor(executor, fetch_devices_from_db)
        await asyncio.sleep(30) # Refresh daftar device dari database setiap 30 detik

async def db_save_task(executor: ThreadPoolExecutor) -> None:
    loop = asyncio.get_event_loop()
    while True:
        await asyncio.sleep(DB_SAVE_INTERVAL_SEC)
        logging.info("[DB TASK] Interval triggered — saving cache ...")
        await loop.run_in_executor(executor, save_cache_to_db)

async def ws_broadcast_task() -> None:
    while True:
        await asyncio.sleep(WS_BROADCAST_INTERVAL)
        if not connected_clients: continue
        payload_str = json.dumps(build_payload_from_cache())
        dead: Set   = set()
        for ws in connected_clients:
            try:
                await ws.send(payload_str)
            except Exception:
                dead.add(ws)
        if dead:
            connected_clients.difference_update(dead)

async def ws_handler(websocket) -> None:
    raw_path = _get_ws_path(websocket)
    query    = urllib.parse.urlparse(raw_path).query
    params   = urllib.parse.parse_qs(query)
    token    = params.get("token", [""])[0]

    if not verify_token(token):
        await websocket.close(code=4401, reason="Unauthorized")
        return

    connected_clients.add(websocket)
    try:
        payload = build_payload_from_cache()
        if payload['devices']: await websocket.send(json.dumps(payload))
    except: pass

    try:
        async for _ in websocket: pass
    except ConnectionClosed: pass
    finally:
        connected_clients.discard(websocket)

# ==========================================
# --- ENTRY POINT ---
# ==========================================
async def main() -> None:
    logging.info("=" * 65)
    logging.info("  UNIFIED MV LOGGER + WEBSOCKET SERVER  (Rev 10 - DB Clean)")
    logging.info("=" * 65)

    fetch_devices_from_db()

    executor = ThreadPoolExecutor(max_workers=10, thread_name_prefix="modbus")
    try:
        async with websockets.serve(ws_handler, WS_HOST, WS_PORT, ping_interval=20, ping_timeout=10):
            await asyncio.gather(
                modbus_polling_task(executor),
                db_sync_task(executor),
                db_save_task(executor),
                ws_broadcast_task(),
            )
    except KeyboardInterrupt:
        logging.info("Sistem dimatikan.")
    finally:
        executor.shutdown(wait=False)

if __name__ == "__main__":
    asyncio.run(main())