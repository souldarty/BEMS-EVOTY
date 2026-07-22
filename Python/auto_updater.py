import time
import requests
import os
import jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

# DUA URL TARGET KITA
TARGET_URL_COST = "http://localhost:8000/get_to_convert.php"
TARGET_URL_CARBON = "http://localhost:8000/calculate_carbon.php"

JWT_SECRET = os.getenv("JWT_SECRET")

try:
    INTERVAL_MINUTES = int(os.getenv("SCHEDULE_INTERVAL_MINUTES", 60))
except ValueError:
    INTERVAL_MINUTES = 60

INTERVAL_SECONDS = INTERVAL_MINUTES * 60

def generate_jwt_token():
    if not JWT_SECRET: return None
    clean_secret = JWT_SECRET.strip("'").strip('"')
    payload = {
        "iss": "bems_auto_updater", 
        "iat": datetime.now(timezone.utc), 
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5), 
        "role": "system_admin" 
    }
    return jwt.encode(payload, clean_secret, algorithm="HS256")

def trigger_endpoints():
    print("=====================================================")
    print("      Program Auto-Updater BEMS Aktif (Secured)      ")
    print("=====================================================")
    print(f"Target 1   : {TARGET_URL_COST}")
    print(f"Target 2   : {TARGET_URL_CARBON}")
    print(f"Interval   : Setiap {INTERVAL_MINUTES} Menit")
    print("Status     : Berjalan aman di latar belakang...\n")

    while True:
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        token = generate_jwt_token()
        
        if not token:
            print(f"[{current_time}] GAGAL! Token JWT tidak valid.")
        else:
            headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
            
            # --- 1. UPDATE COST ---
            try:
                res_cost = requests.get(TARGET_URL_COST, headers=headers, timeout=30)
                if res_cost.status_code == 200:
                    print(f"[{current_time}] [COST] SUKSES disimpan.")
                else:
                    print(f"[{current_time}] [COST] ERROR {res_cost.status_code}")
            except Exception as e:
                print(f"[{current_time}] [COST] GAGAL terhubung: {e}")

            # --- 2. UPDATE CARBON ---
            try:
                res_carbon = requests.get(TARGET_URL_CARBON, headers=headers, timeout=30)
                if res_carbon.status_code == 200:
                    print(f"[{current_time}] [CARBON] SUKSES disimpan.")
                else:
                    print(f"[{current_time}] [CARBON] ERROR {res_carbon.status_code}")
            except Exception as e:
                print(f"[{current_time}] [CARBON] GAGAL terhubung: {e}")
        
        print("Menunggu siklus berikutnya...\n")
        time.sleep(INTERVAL_SECONDS)

if __name__ == "__main__":
    try:
        trigger_endpoints()
    except KeyboardInterrupt:
        print("\nProgram Auto-Update dihentikan oleh pengguna. Sampai jumpa!")