# =============================================================
# FILE    : ws_mva_server.py
# PROJECT : BEMS — MV-A Real-Time WebSocket Server
# PURPOSE : Reads latest sensor data from dbo.mv_lowvoltage and
#           broadcasts to connected React clients every N seconds.
#
# DEPENDENCIES:
#   pip install "websockets>=10.0" pyodbc python-dotenv PyJWT
#
# USAGE:
#   py Python/ws_mva_server.py
#
# RUNS ALONGSIDE All_MV_Logger.py — no shared state, no conflict.
# Both processes read/write dbo.mv_lowvoltage independently.
# =============================================================

import asyncio
import json
import os
import logging
import pyodbc
import jwt                      # PyJWT
import urllib.parse
from datetime import datetime
from typing import Dict, Set
from concurrent.futures import ThreadPoolExecutor

import websockets
from websockets.exceptions import ConnectionClosed
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# CONFIGURATION  — mirrors All_MV_Logger.py .env keys exactly
# ============================================================

DB_HOST     = os.getenv("DB_HOST")
DB_NAME     = os.getenv("DB_NAME")
DB_USER     = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_DRIVER   = os.getenv("DB_DRIVER")
JWT_SECRET  = os.getenv("JWT_SECRET")      # same secret as getMVA.php / login.php

DB_CONN_STR = (
    f"DRIVER={{{DB_DRIVER}}};"
    f"SERVER={DB_HOST};"
    f"DATABASE={DB_NAME};"
    f"UID={DB_USER};"
    f"PWD={DB_PASSWORD};"
)

WS_HOST            = "0.0.0.0"
WS_PORT            = 8765
BROADCAST_INTERVAL = 1     # seconds — push to all connected clients every 30s

# Anomaly thresholds
ANOMALY_MIN_ACTIVE_KW = 0.5   # kW — device considered "active" above this
ANOMALY_SPIKE_PCT     = 30    # % increase from previous reading → POWER_SPIKE
ANOMALY_DROP_PCT      = 30    # % decrease (not to zero) → POWER_DROP

# MV-A incomer names — must match dbo.mv_lowvoltage exactly
INCOMER_NAMES: Set[str] = {"Incomer Trafo #1", "Incomer Trafo #2"}

# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [WS-MVA] %(levelname)s — %(message)s",
)

# ============================================================
# GLOBAL STATE
# ============================================================

connected_clients: Set = set()

# Tracks last-known power per device for anomaly detection
previous_power: Dict[str, float] = {}

# Thread-pool for blocking pyodbc calls
_db_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="ws_db")

# ============================================================
# HELPER: extract request path
# FIX: websockets 10/11 → websocket.path
#      websockets 12+   → websocket.request.path
# ============================================================

def _get_ws_path(websocket) -> str:
    """
    Returns the raw request path (including query string) in a way
    that works across all websockets library versions (10, 11, 12+).
    """
    # websockets >= 12 stores the HTTP request object on .request
    if hasattr(websocket, "request") and websocket.request is not None:
        return getattr(websocket.request, "path", "/")

    # websockets 10 / 11 expose .path directly on the protocol object
    return getattr(websocket, "path", "/")

# ============================================================
# DATABASE — latest row per subgroup_mv
# ============================================================

def _sync_query_latest() -> list:
    """
    Synchronous.  Fetches the single most-recent row per subgroup_mv
    for group_mv = 'MV-A'.  Runs in a thread-pool to avoid blocking
    the asyncio event loop.
    """
    conn = pyodbc.connect(DB_CONN_STR, timeout=10)
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                subgroup_mv,
                slave_id,
                voltage,
                active_power_kw,
                stand_kwh,
                thd_i_l1,
                thd_i_l2,
                thd_i_l3,
                timestamp
            FROM (
                SELECT *,
                    ROW_NUMBER() OVER (
                        PARTITION BY subgroup_mv
                        ORDER BY timestamp DESC
                    ) AS rn
                FROM dbo.mv_lowvoltage
                WHERE group_mv = 'MV-A'
            ) ranked
            WHERE rn = 1
        """)
        return cursor.fetchall()
    finally:
        conn.close()


async def query_latest() -> list:
    """Async wrapper — delegates DB call to thread-pool."""
    loop = asyncio.get_event_loop()
    try:
        return await loop.run_in_executor(_db_pool, _sync_query_latest)
    except Exception as exc:
        logging.error(f"[DB] Query failed: {exc}")
        return []

# ============================================================
# ANOMALY DETECTION
# ============================================================

def detect_anomaly(subgroup: str, current_kw: float):
    """
    Compares current_kw against the previous reading stored in
    previous_power dict.  Updates previous_power after comparison.

    Returns:
        anomaly      (bool)
        anomaly_type (str | None) — "POWER_LOSS" | "POWER_SPIKE" | "POWER_DROP"
    """
    anomaly      = False
    anomaly_type = None

    if subgroup in previous_power:
        prev = previous_power[subgroup]

        if prev >= ANOMALY_MIN_ACTIVE_KW and current_kw == 0:
            anomaly      = True
            anomaly_type = "POWER_LOSS"
        elif prev > 0 and current_kw > prev * (1 + ANOMALY_SPIKE_PCT / 100):
            anomaly      = True
            anomaly_type = "POWER_SPIKE"
        elif (prev >= ANOMALY_MIN_ACTIVE_KW
              and 0 < current_kw < prev * (1 - ANOMALY_DROP_PCT / 100)):
            anomaly      = True
            anomaly_type = "POWER_DROP"

    previous_power[subgroup] = current_kw
    return anomaly, anomaly_type

# ============================================================
# PAYLOAD BUILDER
# Replicates the incomer → subgroup → OTHERS logic from getMVA.php
# ============================================================

def build_payload(rows: list) -> dict:
    """
    Payload shape:
    {
      "type": "realtime_update",
      "server_time": "ISO-string",
      "devices": {
        "Incomer Trafo #1": {
          "power_kw": float, "energy_kwh": float, "voltage": float,
          "thd_avg": float, "timestamp": "ISO-string",
          "anomaly": bool, "anomaly_type": str | null
        },
        ... (all 18 devices + OTHERS)
      }
    }
    """

    # ── Step 1: parse raw rows into flat dict ────────────────
    raw: Dict[str, dict] = {}
    for row in rows:
        subgroup = row[0]
        raw[subgroup] = {
            "power_kw":   float(row[3]) if row[3] is not None else 0.0,
            "energy_kwh": float(row[4]) if row[4] is not None else 0.0,
            "voltage":    float(row[2]) if row[2] is not None else 0.0,
            "thd_l1":     float(row[5]) if row[5] is not None else 0.0,
            "thd_l2":     float(row[6]) if row[6] is not None else 0.0,
            "thd_l3":     float(row[7]) if row[7] is not None else 0.0,
            "timestamp":  row[8].isoformat() if row[8] else None,
        }

    # ── Step 2: Incomer totals ────────────────────────────────
    total_supply_kw      = 0.0
    total_inc_energy     = 0.0
    active_incomer_count = 0

    for name in INCOMER_NAMES:
        if name not in raw:
            continue
        kw = raw[name]["power_kw"]
        if kw >= ANOMALY_MIN_ACTIVE_KW:
            total_supply_kw      += kw
            total_inc_energy     += raw[name]["energy_kwh"]
            active_incomer_count += 1

    incomer_active = active_incomer_count > 0

    # ── Step 3: Per-device output + subgroup totals ───────────
    total_sub_kw     = 0.0
    total_sub_energy = 0.0
    devices_out: Dict[str, dict] = {}

    for subgroup, data in raw.items():
        is_incomer = subgroup in INCOMER_NAMES
        raw_kw     = data["power_kw"]

        if is_incomer:
            display_kw = raw_kw if incomer_active else 0.0
        else:
            display_kw = raw_kw if (raw_kw >= ANOMALY_MIN_ACTIVE_KW and incomer_active) else 0.0
            total_sub_kw     += display_kw
            total_sub_energy += data["energy_kwh"] if display_kw > 0 else 0.0

        thd_avg = round((data["thd_l1"] + data["thd_l2"] + data["thd_l3"]) / 3, 2)
        anomaly, anomaly_type = detect_anomaly(subgroup, display_kw)

        devices_out[subgroup] = {
            "power_kw":     round(display_kw, 2),
            "energy_kwh":   round(data["energy_kwh"], 2),
            "voltage":      round(data["voltage"], 2),
            "thd_avg":      thd_avg,
            "timestamp":    data["timestamp"],
            "anomaly":      anomaly,
            "anomaly_type": anomaly_type,
        }

    # ── Step 4: OTHERS (Total Incomer − Total Subgroup) ───────
    others_kw     = max(0.0, total_supply_kw  - total_sub_kw)
    others_energy = max(0.0, total_inc_energy - total_sub_energy)
    others_anomaly, others_type = detect_anomaly("OTHERS", others_kw)

    devices_out["OTHERS"] = {
        "power_kw":     round(others_kw, 2),
        "energy_kwh":   round(others_energy, 2),
        "voltage":      0.0,
        "thd_avg":      0.0,
        "timestamp":    datetime.now().isoformat(),
        "anomaly":      others_anomaly,
        "anomaly_type": others_type,
    }

    return {
        "type":        "realtime_update",
        "server_time": datetime.now().isoformat(),
        "devices":     devices_out,
    }

# ============================================================
# JWT VERIFICATION
# ============================================================

def verify_token(token: str) -> bool:
    """
    Validates the JWT using the same JWT_SECRET + HS256 as getMVA.php.
    If JWT_SECRET is not in .env, auth is skipped (useful for local dev).
    """
    if not JWT_SECRET:
        logging.warning("[AUTH] JWT_SECRET not set in .env — auth check SKIPPED.")
        return True
    if not token:
        logging.warning("[AUTH] Empty token received.")
        return False
    try:
        jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return True
    except jwt.ExpiredSignatureError:
        logging.warning("[AUTH] Token expired.")
        return False
    except jwt.InvalidTokenError as exc:
        logging.warning(f"[AUTH] Invalid token: {exc}")
        return False

# ============================================================
# WEBSOCKET HANDLER
# ============================================================

async def handler(websocket):
    """
    Single client lifecycle:
    1. Extract JWT from ?token= query param (version-safe path extraction)
    2. Verify JWT — reject with code 4401 if invalid
    3. Send immediate data snapshot on connect
    4. Hold connection open; broadcast loop pushes updates every 30s
    """

    # ── FIX: version-safe path extraction ────────────────────
    raw_path = _get_ws_path(websocket)
    logging.info(f"[WS] Incoming connection | path: {raw_path}")

    query  = urllib.parse.urlparse(raw_path).query
    params = urllib.parse.parse_qs(query)
    token  = params.get("token", [""])[0]

    logging.info(f"[WS] Token received: {'<present>' if token else '<empty>'}")

    # ── Auth check ────────────────────────────────────────────
    if not verify_token(token):
        await websocket.close(code=4401, reason="Unauthorized")
        logging.warning("[WS] Connection rejected: invalid/missing token.")
        return

    # ── Register client ───────────────────────────────────────
    connected_clients.add(websocket)
    client_ip = (websocket.remote_address or ["unknown"])[0]
    logging.info(f"[WS] Client connected: {client_ip}  |  Total: {len(connected_clients)}")

    # ── Immediate snapshot (don't wait 30s for first data) ────
    try:
        rows = await query_latest()
        if rows:
            await websocket.send(json.dumps(build_payload(rows)))
            logging.info(f"[WS] Snapshot sent to {client_ip}.")
        else:
            logging.warning(f"[WS] No DB rows — snapshot skipped for {client_ip}.")
    except Exception as exc:
        logging.error(f"[WS] Error sending snapshot to {client_ip}: {exc}")

    # ── Keep connection alive ─────────────────────────────────
    try:
        async for _ in websocket:
            pass        # client messages intentionally ignored
    except ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)
        logging.info(f"[WS] Client disconnected: {client_ip}  |  Total: {len(connected_clients)}")

# ============================================================
# BROADCAST LOOP
# ============================================================

async def broadcast_loop():
    """
    Pushes live data to all clients every BROADCAST_INTERVAL seconds.
    Skips DB query when no clients are connected (saves resources).
    Uses .difference_update() to mutate the global set in-place —
    avoids Python's UnboundLocalError on -= operator.
    """
    logging.info(f"[WS] Broadcast loop active — interval: {BROADCAST_INTERVAL}s")

    while True:
        await asyncio.sleep(BROADCAST_INTERVAL)

        if not connected_clients:
            continue

        logging.info(f"[WS] Broadcasting to {len(connected_clients)} client(s)...")

        rows = await query_latest()
        if not rows:
            logging.warning("[WS] DB returned no rows — broadcast skipped.")
            continue

        payload_str = json.dumps(build_payload(rows))
        dead: Set   = set()

        for ws in connected_clients:
            try:
                await ws.send(payload_str)
            except Exception:
                dead.add(ws)

        if dead:
            connected_clients.difference_update(dead)   # mutates in-place — no rebind
            logging.info(f"[WS] Pruned {len(dead)} dead connection(s).")

# ============================================================
# ENTRY POINT
# ============================================================

async def main():
    logging.info("=" * 60)
    logging.info(f"  MV-A WebSocket Server  |  ws://{WS_HOST}:{WS_PORT}")
    logging.info(f"  Broadcast interval     |  {BROADCAST_INTERVAL}s")
    logging.info(f"  JWT auth               |  {'ENABLED' if JWT_SECRET else 'DISABLED (no JWT_SECRET)'}")
    logging.info(f"  DB host                |  {DB_HOST}")
    logging.info(f"  DB name                |  {DB_NAME}")
    logging.info("=" * 60)

    async with websockets.serve(
        handler,
        WS_HOST,
        WS_PORT,
        ping_interval=20,
        ping_timeout=10,
    ):
        await broadcast_loop()


if __name__ == "__main__":
    asyncio.run(main())