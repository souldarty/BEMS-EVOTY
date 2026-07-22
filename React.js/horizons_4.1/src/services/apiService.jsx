// src/services/apiService.jsx
//
// REVISION: April 2026
// NO FUNCTIONAL CHANGES in this file.
//   - Graph auto-refresh (5 min) is controlled in mvAMonitoring.jsx
//   - WS server is now embedded in All_MV_Logger.py — no JS change needed
//   - All API call functions below are UNCHANGED except for the added year parameter
//
// CONSTRAINT — DO NOT CHANGE:
//   - apiCall() helper (auth header injection, 401 handling)
//   - Any export function signature or endpoint string
//   - localStorage key "tokenBEMS" — must match auth system exactly

const API_BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Generic helper untuk fetch + error handling.
 * Menempelkan JWT token pada setiap request dan menangani token kadaluarsa.
 */
const apiCall = async (endpoint, options = {}) => {
  try {
    const token = localStorage.getItem('tokenBEMS');

    const headers = {
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers: headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (response.status === 401) {
      localStorage.removeItem('tokenBEMS');
      window.location.href = '/';
      throw new Error("Sesi Anda telah habis. Silakan login kembali.");
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Service Error (${endpoint}):`, error.message);
    throw error;
  }
};

// ============================================================
// FUNGSI UNTUK TOTAL FACTORY (UNCHANGED)
// ============================================================
export const getTotalFactory = () => {
  return apiCall('/TotalFactory.php');
};

// ============================================================
// FUNGSI UNTUK MV-A MONITORING (MODIFIED TO FIX AXIOS ERROR)
// ============================================================
export const getMVAData = (params) => {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/getMVA.php?${query}`);
};

// ============================================================
// FUNGSI UNTUK MV-B MONITORING (UNCHANGED)
// ============================================================
export const getMVBData = (params) => {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/getMVB.php?${query}`);
};

// ============================================================
// FUNGSI UNTUK MV-C MONITORING 
// ============================================================
export const getMVCData = (params) => {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/getMVC.php?${query}`);
};

// ============================================================
// FUNGSI UNTUK MV-U MONITORING (UNCHANGED)
// ============================================================
export const getMVUData = (params) => {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/getMVU.php?${query}`);
};

// ============================================================
// FUNGSI UNTUK MV-I MONITORING (UNCHANGED)
// ============================================================
export const getMVIData = (params) => {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/getMVI.php?${query}`);
};

// ============================================================
// FUNGSI UNTUK MEDIUM VOLTAGE (UNCHANGED)
// ============================================================
export const getLvmdbRealtime = async () => {
  const today = new Date().toISOString().split('T')[0];
  const baseParams = {
    startDate:      `${today} 00:00:00`,
    endDate:        `${today} 23:59:59`,
    timeResolution: 'minute',
  };

  const [result1, result2] = await Promise.allSettled([
    apiCall(`/getLvmdbData.php?${new URLSearchParams({ ...baseParams, slave_id: 1 }).toString()}`),
    apiCall(`/getLvmdbData.php?${new URLSearchParams({ ...baseParams, slave_id: 2 }).toString()}`),
  ]);

  const logs1 = (result1.status === 'fulfilled' && result1.value?.data?.logs?.length > 0)
    ? result1.value.data.logs : null;
  const logs2 = (result2.status === 'fulfilled' && result2.value?.data?.logs?.length > 0)
    ? result2.value.data.logs : null;

  const latest1 = logs1 ? logs1[logs1.length - 1] : null;
  const latest2 = logs2 ? logs2[logs2.length - 1] : null;

  if (!latest1 && !latest2) return { success: false, data: { logs: [] } };

  let mergedLog;
  if (latest1 && latest2) {
    mergedLog = {
      timestamp:       latest1.timestamp,
      voltage:         parseFloat(((parseFloat(latest1.voltage) + parseFloat(latest2.voltage)) / 2).toFixed(2)),
      power_kw:        parseFloat((parseFloat(latest1.power_kw) + parseFloat(latest2.power_kw)).toFixed(2)),
      consumption_kwh: parseFloat((parseFloat(latest1.consumption_kwh) + parseFloat(latest2.consumption_kwh)).toFixed(2)),
      thd_avg:         parseFloat(((parseFloat(latest1.thd_avg) + parseFloat(latest2.thd_avg)) / 2).toFixed(2)),
    };
  } else {
    const active = latest1 ?? latest2;
    mergedLog = {
      timestamp:       active.timestamp,
      voltage:         parseFloat(parseFloat(active.voltage).toFixed(2)),
      power_kw:        parseFloat(parseFloat(active.power_kw).toFixed(2)),
      consumption_kwh: parseFloat(parseFloat(active.consumption_kwh).toFixed(2)),
      thd_avg:         parseFloat(parseFloat(active.thd_avg).toFixed(2)),
    };
  }

  return { success: true, data: { logs: [mergedLog] } };
};

export const getMeterStatuses = () => {
  return apiCall('/getMeterStatus.php');
};

export const getMvData = () => {
  return apiCall('/getMVI.php');
};

// ============================================================
// FUNGSI ASLI (UNCHANGED)
// ============================================================

export const loginUser = (credentials) => {
  return apiCall('/login.php', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
};

export const getEnergyData = (params) => {
  const query = new URLSearchParams(params || {}).toString();
  return apiCall(`/getEnergyData.php?${query}`);
};

export const getTrafoData = () => {
  return apiCall('/getTrafoData.php');
};

export const getPerformanceEntries = (tableType) => {
  return apiCall(`/performance.php?table=${tableType}`);
};

export const managePerformanceEntry = (method, tableType, payload, id = null) => {
  const endpoint = `/performance.php?table=${tableType}${id ? `&id=${id}` : ''}`;
  return apiCall(endpoint, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

export const deletePerformanceEntry = (tableType, id) => {
  return apiCall(`/performance.php?table=${tableType}&id=${id}`, { method: 'DELETE' });
};

export const getCarbonFootprintData = (timeframe, year) => {
  const params = new URLSearchParams({ timeframe });
  if (year) params.append('year', year);
  return apiCall(`/getCarbonFootprintData.php?${params.toString()}`);
};

export const getSettings = (action) => {
  return apiCall(`/setting.php?action=${action}`);
};

export const manageSettings = (payload) => {
  return apiCall('/setting.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

export const getChartData = (params) => {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/get_chart_data.php?${query}`);
};

export const getConsumptionData = (params) => {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/data_chart_consumption.php?${query}`);
};

export const getCostData = (timeframe, year) => {
  const params = new URLSearchParams({ timeframe });
  if (year) params.append('year', year);
  return apiCall(`/get_cost.php?${params.toString()}`);
};

export const getTrafoHistory = (params) => apiCall(`/getTrafoHistory.php?${params.toString()}`);

// ============================================================
// FUNGSI UNTUK KWH CONSUMPTION TABLE
// ============================================================
export const getKWHConsumptionTableData = (params) => {
  const query = new URLSearchParams(params).toString();
  return apiCall(`/KWHConsumptionTable.php?${query}`);
};

// ============================================================
// FUNGSI UNTUK MODBUS DEVICES SETTINGS
// ============================================================
export const getModbusDevices = () => {
  return apiCall('/modbus_device.php?action=get');
};

export const saveModbusDevice = (payload) => {
  return apiCall('/modbus_device.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

export const deleteModbusDevice = (id) => {
  return apiCall(`/modbus_device.php?action=delete&id=${id}`, { method: 'DELETE' });
};