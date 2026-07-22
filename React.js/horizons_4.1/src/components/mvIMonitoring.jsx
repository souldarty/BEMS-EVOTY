/**
 * mvIMonitoring.jsx
 * Dashboard monitoring Power Meter untuk ruangan MV-I (Dynamic DB Render for 1 Device).
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "react-apexcharts";
import * as XLSX from "xlsx";
import { getMVIData } from "@/services/apiService"; 
import EvotyLogo from "@/img/evoty.svg";
import { Menu, Download } from "lucide-react";

const getTodayStr = () => new Date().toISOString().split("T")[0];
const getThisMonthStr = () => new Date().toISOString().slice(0, 7); 
const getThisYearStr = () => new Date().getFullYear().toString();   

// ============================================================
// WEBSOCKET CONFIGURATION
// ============================================================
const WS_PORT     = 8765;
const WS_PROTOCOL = window.location.protocol === "https:" ? "wss:" : "ws:";
const getWsToken  = () => localStorage.getItem("tokenBEMS") || "";

// ============================================================
// KOMPONEN UTAMA
// ============================================================
const MvIMonitoring = () => {
  const navigate    = useNavigate();
  const intervalRef = useRef(null);

  const wsRef          = useRef(null);
  const reconnectDelay = useRef(1000);
  const reconnectTimer = useRef(null);

  const [resolution, setResolution]         = useState('daily');
  const [selectedDate, setSelectedDate]     = useState(getTodayStr());
  const [selectedMonth, setSelectedMonth]   = useState(getThisMonthStr());
  const [selectedYear, setSelectedYear]     = useState(getThisYearStr());

  const [deviceInfo, setDeviceInfo]         = useState(null); // Menyimpan state dinamis MV-I
  const [allData, setAllData]               = useState({});
  const [isLoading, setIsLoading]           = useState(false);
  const [isMenuOpen, setIsMenuOpen]         = useState(false);
  const [lastRefresh, setLastRefresh]       = useState(null);

  const [chartData, setChartData] = useState({
    voltageL1:        [],
    voltageL2:        [],
    voltageL3:        [],
    activePower:      [],
    activeEnergy:     [],
    thdiAvg:          [],
    reactivePower:    [],
    reactiveEnergy:   [],
    unbalanceCurrent: [],
    unbalanceVoltage: [], 
    currentL1:        [],
    currentL2:        [],
    currentL3:        [],
    frequency:        [],
    powerFactor:      [],
    thdiL1:           [],
    thdiL2:           [],
    thdiL3:           [],
  });

  const [wsConnected, setWsConnected] = useState(false);

  // ============================================================
  // FETCH REST API
  // ============================================================
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { resolution };
      if (resolution === 'daily') params.date = selectedDate;
      if (resolution === 'monthly') params.month = selectedMonth;
      if (resolution === 'yearly') params.year = selectedYear;

      const result = await getMVIData(params);
      if (result.success) {
        setDeviceInfo(result.device || null);
        setAllData(result.data || {});
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error("[mvIMonitoring] Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [resolution, selectedDate, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (resolution === 'daily' && selectedDate === getTodayStr()) {
        fetchData();
      }
    }, 30 * 60 * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [resolution, selectedDate, fetchData]);

  // ============================================================
  // UPDATE CHART DATA
  // ============================================================
  useEffect(() => {
    const dName = deviceInfo?.subgroup_mv;

    if (!allData || !dName || !allData[dName]) {
      setChartData({
        voltageL1: [], voltageL2: [], voltageL3: [],
        activePower: [], activeEnergy: [], thdiAvg: [],
        reactivePower: [], reactiveEnergy: [], unbalanceCurrent: [], unbalanceVoltage: [],
        currentL1: [], currentL2: [], currentL3: [],
        frequency: [], powerFactor: [], thdiL1: [], thdiL2: [], thdiL3: [],
      });
      return;
    }
    
    const logs = allData[dName] || [];
    const ts   = (log) => new Date(log.timestamp).getTime();

    setChartData({
      voltageL1:        logs.map((log) => [ts(log), log.voltage_l1            ?? 0]),
      voltageL2:        logs.map((log) => [ts(log), log.voltage_l2            ?? 0]),
      voltageL3:        logs.map((log) => [ts(log), log.voltage_l3            ?? 0]),
      activePower:      logs.map((log) => [ts(log), log.power_kw              ?? 0]),
      activeEnergy:     logs.map((log) => [ts(log), log.consumption_kwh       ?? 0]),
      thdiAvg:          logs.map((log) => [ts(log), log.thd_avg               ?? 0]),
      reactivePower:    logs.map((log) => [ts(log), log.reactive_power_kvar   ?? 0]),
      reactiveEnergy:   logs.map((log) => [ts(log), log.reactive_energy_kvarh ?? 0]),
      unbalanceCurrent: logs.map((log) => [ts(log), log.unbalance_current     ?? 0]),
      unbalanceVoltage: logs.map((log) => [ts(log), log.unbalance_voltage     ?? 0]), 
      currentL1:        logs.map((log) => [ts(log), log.current_l1            ?? 0]),
      currentL2:        logs.map((log) => [ts(log), log.current_l2            ?? 0]),
      currentL3:        logs.map((log) => [ts(log), log.current_l3            ?? 0]),
      frequency:        logs.map((log) => [ts(log), log.frequency_hz          ?? 0]),
      powerFactor:      logs.map((log) => [ts(log), log.power_factor          ?? 0]),
      thdiL1:           logs.map((log) => [ts(log), log.thd_l1                ?? 0]),
      thdiL2:           logs.map((log) => [ts(log), log.thd_l2                ?? 0]),
      thdiL3:           logs.map((log) => [ts(log), log.thd_l3                ?? 0]),
    });
  }, [allData, deviceInfo]);

  // ============================================================
  // WEBSOCKET LIFECYCLE
  // ============================================================
  useEffect(() => {
    const connectWs = () => {
      const token = getWsToken();
      const url   = `${WS_PROTOCOL}//${window.location.hostname}:${WS_PORT}${
        token ? `?token=${encodeURIComponent(token)}` : ""
      }`;
      
      let ws;
      try { ws = new WebSocket(url); }
      catch (err) { console.error("[WS-MVI] WebSocket constructor error:", err); return; }

      wsRef.current = ws;
      ws.onopen    = () => { setWsConnected(true); reconnectDelay.current = 1000; };
      ws.onmessage = (event) => {
        // Hanya memantau koneksi aktif, data chart ditarik dari REST API
      };
      ws.onclose = (event) => {
        setWsConnected(false);
        if (event.code === 4401) return;
        const delay = reconnectDelay.current;
        reconnectDelay.current = Math.min(delay * 2, 30_000);
        reconnectTimer.current = setTimeout(connectWs, delay);
      };
      ws.onerror = () => ws.close();
    };

    connectWs();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, []);

  const downloadExcel = useCallback(() => {
    const dName = deviceInfo?.subgroup_mv;
    if (!allData || !dName || !allData[dName] || allData[dName].length === 0) {
      alert("Tidak ada data untuk diunduh.");
      return;
    }
    const headers = [
      "Device", "Timestamp", "Voltage L1-L2 (V)", "Voltage L2-L3 (V)", "Voltage L3-L1 (V)",
      "Frequency (Hz)", "Power Factor",
      "Active Power (kW)", "Reactive Power (kVar)", "Active Energy (kWh)", "Reactive Energy (kVarh)",
      "Unbalance Current (%)", "Unbalance Voltage (%)", "Current L1 (A)", "Current L2 (A)", "Current L3 (A)", 
      "THD I L1 (%)", "THD I L2 (%)", "THD I L3 (%)",
    ];
    const rows = [headers];

    allData[dName].forEach((log) => {
      const hasValue = (log.voltage_l1 ?? 0) > 0 || (log.power_kw ?? 0) > 0
        || (log.consumption_kwh ?? 0) > 0 || (log.current_l1 ?? 0) > 0 || (log.current_l2 ?? 0) > 0;
      if (!hasValue) return;
      rows.push([
        dName, log.timestamp,
        log.voltage_l1 ?? 0, log.voltage_l2 ?? 0, log.voltage_l3 ?? 0,
        log.frequency_hz ?? 0, log.power_factor ?? 0,
        log.power_kw ?? 0, log.reactive_power_kvar ?? 0,
        log.consumption_kwh ?? 0, log.reactive_energy_kvarh ?? 0,
        log.unbalance_current ?? 0, log.unbalance_voltage ?? 0, log.current_l1 ?? 0, log.current_l2 ?? 0, log.current_l3 ?? 0,
        log.thd_l1 ?? 0, log.thd_l2 ?? 0, log.thd_l3 ?? 0,
      ]);
    });

    if (rows.length <= 1) { alert("Tidak ada data non-zero untuk periode ini."); return; }
    
    let periodStr = selectedDate;
    if (resolution === 'monthly') periodStr = selectedMonth;
    if (resolution === 'yearly') periodStr = selectedYear;

    const ws    = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = headers.map((h, i) => ({ wch: Math.max(h.length, ...rows.slice(1).map((r) => String(r[i] ?? "").length)) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MV-I Data");
    XLSX.writeFile(wb, `MVI_${resolution}_${periodStr}.xlsx`);
  }, [allData, resolution, selectedDate, selectedMonth, selectedYear, deviceInfo]);

  // ============================================================
  // CHART CONFIGURATIONS
  // ============================================================
  const getChartStats = (dataArray) => {
    if (!dataArray || dataArray.length === 0) return { current: null, avg: null };
    const now            = Date.now();
    const pastData       = dataArray.filter((d) => d[0] <= now);
    if (pastData.length === 0) return { current: null, avg: null };
    const positiveEntries = pastData.filter((d) => d[1] > 0);
    if (positiveEntries.length === 0) return { current: 0, avg: 0 };
    const current = positiveEntries[positiveEntries.length - 1][1];
    const avg     = positiveEntries.reduce((acc, d) => acc + d[1], 0) / positiveEntries.length;
    return { current, avg };
  };

  const getAxisBounds = (lastDataTs) => {
    let dayStart, dayEnd;
    if (resolution === 'daily') {
      dayStart = new Date(selectedDate + "T00:00:00").getTime();
      dayEnd   = dayStart + (24 * 60 * 60 * 1000);
    } else if (resolution === 'monthly') {
      dayStart = new Date(selectedMonth + "-01T00:00:00").getTime();
      const d = new Date(dayStart); d.setMonth(d.getMonth() + 1);
      dayEnd = d.getTime();
    } else {
      dayStart = new Date(selectedYear + "-01-01T00:00:00").getTime();
      dayEnd = new Date((parseInt(selectedYear) + 1) + "-01-01T00:00:00").getTime();
    }
    
    const axisMax = lastDataTs ? lastDataTs : dayEnd;
    return { dayStart, axisMax };
  };

  const tooltipFormatter = (val) => {
    const d = new Date(val);
    if (resolution === 'daily') return d.toLocaleString("id-ID");
    if (resolution === 'monthly') return d.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
    return d.toLocaleDateString("id-ID", { month: 'long', year: 'numeric' });
  };

  const getBarChartOptions = (title, unit, color, lastDataTs = null) => {
    const { dayStart, axisMax } = getAxisBounds(lastDataTs);
    return {
      chart: { id: `chart-mvi-${title}`, background: "transparent", foreColor: "#64748b",
               toolbar: { show: false }, zoom: { enabled: false }, width: "100%", parentHeightOffset: 0,
               animations: { enabled: true, speed: 400, animateGradually: { enabled: false } } },
      theme: { mode: "dark" },
      noData: { text: "No data available", align: "center", verticalAlign: "middle", style: { color: "#64748b" } },
      title: { text: undefined },
      xaxis: { type: "datetime", min: dayStart, max: axisMax, labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false }, tooltip: { enabled: false } },
      yaxis: { title: { text: unit, style: { fontFamily: "monospace", fontSize: "11px" } }, labels: { style: { fontFamily: "monospace", fontSize: "11px" }, formatter: (val) => (val != null ? val.toFixed(2) : "") } },
      plotOptions: { bar: { columnWidth: "60%", borderRadius: 2 } },
      dataLabels: { enabled: false }, colors: [color],
      tooltip: { theme: "dark", x: { formatter: tooltipFormatter }, y: { formatter: (val) => (val != null ? `${val.toFixed(2)} ${unit}` : "--") } },
      grid: { borderColor: "#1e293b", padding: { top: 0, right: 0, bottom: 0, left: 10 } },
    };
  };

  const getLineChartOptions = (title, unit, color, lastDataTs = null, discreteMarkers = []) => {
    const { dayStart, axisMax } = getAxisBounds(lastDataTs);
    return {
      chart: { id: `chart-mvi-${title}`, background: "transparent", foreColor: "#64748b", toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: true, speed: 400 }, width: "100%", parentHeightOffset: 0 },
      theme: { mode: "dark" }, noData: { text: "No data available", align: "center", verticalAlign: "middle", style: { color: "#64748b" } }, title: { text: undefined },
      xaxis: { type: "datetime", min: dayStart, max: axisMax, labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false }, tooltip: { enabled: false } },
      yaxis: { title: { text: unit, style: { fontFamily: "monospace", fontSize: "11px" } }, labels: { style: { fontFamily: "monospace", fontSize: "11px" }, formatter: (val) => (val != null ? val.toFixed(2) : "") } },
      stroke: { curve: "smooth", width: 3, colors: [color] },
      markers: { size: 0, strokeWidth: 0, hover: { size: 6 }, discrete: discreteMarkers },
      dataLabels: { enabled: false }, colors: [color],
      tooltip: { theme: "dark", x: { formatter: tooltipFormatter }, y: { formatter: (val) => (val != null ? `${val.toFixed(2)} ${unit}` : "--") } },
      grid: { borderColor: "#1e293b", padding: { top: 0, right: 0, bottom: 0, left: 10 } },
    };
  };

  const trimData = (data) => {
    const lastNonZeroIdx = data.reduce((last, [, val], i) => (val > 0 ? i : last), -1);
    return lastNonZeroIdx !== -1 ? data.slice(0, lastNonZeroIdx + 1) : data;
  };

  const renderChartPanel = (title, unit, color, data, chartType = "bar") => {
    const stats = getChartStats(data);
    const trimmedData = trimData(data);
    const lastDataTs = trimmedData.length > 0 ? trimmedData[trimmedData.length - 1][0] : null;
    const seriesData = trimmedData;
    let options; 

    if (chartType === "line") {
      const discreteMarkers = seriesData.length > 0 ? [{ seriesIndex: 0, dataPointIndex: seriesData.length - 1, size: 5, fillColor: color, strokeColor: "#ffffff", strokeWidth: 2 }] : [];
      options = getLineChartOptions(title, unit, color, lastDataTs, discreteMarkers);
    } else {
      options = getBarChartOptions(title, unit, color, lastDataTs);
    }

    let prefixText = "Latest:";
    if (chartType === "bar" && (unit === "kWh" || unit === "kVarh")) prefixText = "Total:";

    return (
      <div className="bg-[#0d1117] border border-slate-700/60 rounded-xl p-4 flex flex-col w-full">
        <div className="mb-3 shrink-0">
          <h3 className="font-mono text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
          <div className="font-mono text-sm font-bold mt-1 flex gap-4" style={{ color }}>
            {stats.current !== null ? (
              <><span>{prefixText} {stats.current.toFixed(stats.current < 10 ? 3 : 2)} {unit}</span><span className="text-slate-600">|</span><span className="text-slate-400 font-normal">Avg: {stats.avg.toFixed(stats.avg < 10 ? 3 : 2)} {unit}</span></>
            ) : (<span className="text-slate-600">-- --</span>)}
          </div>
        </div>
        <div style={{ height: "200px", width: "100%" }}>
          <Chart options={options} series={[{ name: deviceInfo?.subgroup_mv || "UNKNOWN", data: seriesData }]} type={chartType} height="100%" width="100%" />
        </div>
      </div>
    );
  };

  const renderCombinedVoltageChart = () => {
    const dataL1 = chartData.voltageL1; const dataL2 = chartData.voltageL2; const dataL3 = chartData.voltageL3;
    const statsL1 = getChartStats(dataL1); const statsL2 = getChartStats(dataL2); const statsL3 = getChartStats(dataL3);
    const overallAvg = ((statsL1.avg || 0) + (statsL2.avg || 0) + (statsL3.avg || 0)) / 3;

    const trimmedL1 = trimData(dataL1);
    const trimmedL2 = trimData(dataL2);
    const trimmedL3 = trimData(dataL3);

    const lastDataTs = Math.max(
      trimmedL1.length > 0 ? trimmedL1[trimmedL1.length - 1][0] : 0,
      trimmedL2.length > 0 ? trimmedL2[trimmedL2.length - 1][0] : 0,
      trimmedL3.length > 0 ? trimmedL3[trimmedL3.length - 1][0] : 0
    ) || null;

    const { dayStart, axisMax } = getAxisBounds(lastDataTs);
    const colors = ["#3b82f6", "#60a5fa", "#93c5fd"]; 
    const options = {
      chart: { id: `chart-mvi-voltage-combined`, background: "transparent", foreColor: "#64748b", toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: true, speed: 400 }, width: "100%", parentHeightOffset: 0 },
      theme: { mode: "dark" }, title: { text: undefined },
      xaxis: { type: "datetime", min: dayStart, max: axisMax, labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false }, tooltip: { enabled: false } },
      yaxis: { title: { text: "V", style: { fontFamily: "monospace", fontSize: "11px" } }, labels: { style: { fontFamily: "monospace", fontSize: "11px" }, formatter: (val) => (val != null ? val.toFixed(2) : "") } },
      stroke: { curve: "smooth", width: 3, colors: colors }, colors: colors, legend: { show: false },
      tooltip: { theme: "dark", x: { formatter: tooltipFormatter }, y: { formatter: (val) => (val != null ? `${val.toFixed(2)} V` : "--") } },
      grid: { borderColor: "#1e293b", padding: { top: 0, right: 0, bottom: 0, left: 10 } }, dataLabels: { enabled: false },
    };

    return (
      <div className="bg-[#0d1117] border border-slate-700/60 rounded-xl p-4 flex flex-col col-span-2 w-full">
        <div className="mb-3 shrink-0 flex justify-between items-start">
          <div>
            <h3 className="font-mono text-xs font-bold text-slate-400 uppercase tracking-widest">VOLTAGE (L1-L2, L2-L3, L3-L1) COMBINED</h3>
            <div className="font-mono text-sm font-bold mt-1 text-slate-300">
              {overallAvg > 0 ? <span>Avg Total: {overallAvg.toFixed(2)} V</span> : <span className="text-slate-600">-- --</span>}
            </div>
          </div>
          <div className="flex gap-5 font-mono text-[11px] font-bold text-right bg-[#161b22] px-4 py-2 rounded-lg border border-slate-700/50">
            <div style={{ color: colors[0] }}><span className="text-slate-500 mr-1">L1-L2:</span> {statsL1.current !== null ? statsL1.current.toFixed(2) : "--"} V</div>
            <div style={{ color: colors[1] }}><span className="text-slate-500 mr-1">L2-L3:</span> {statsL2.current !== null ? statsL2.current.toFixed(2) : "--"} V</div>
            <div style={{ color: colors[2] }}><span className="text-slate-500 mr-1">L3-L1:</span> {statsL3.current !== null ? statsL3.current.toFixed(2) : "--"} V</div>
          </div>
        </div>
        <div style={{ height: "200px", width: "100%" }}>
          <Chart options={options} series={[{ name: "Voltage L1-L2", data: trimmedL1 }, { name: "Voltage L2-L3", data: trimmedL2 }, { name: "Voltage L3-L1", data: trimmedL3 }]} type="line" height="100%" width="100%" />
        </div>
      </div>
    );
  };

  const renderCombinedThdChart = () => {
    const dataL1 = chartData.thdiL1; const dataL2 = chartData.thdiL2; const dataL3 = chartData.thdiL3;
    const statsL1 = getChartStats(dataL1); const statsL2 = getChartStats(dataL2); const statsL3 = getChartStats(dataL3);
    const overallAvg = ((statsL1.avg || 0) + (statsL2.avg || 0) + (statsL3.avg || 0)) / 3;

    const trimmedL1 = trimData(dataL1);
    const trimmedL2 = trimData(dataL2);
    const trimmedL3 = trimData(dataL3);

    const lastDataTs = Math.max(
      trimmedL1.length > 0 ? trimmedL1[trimmedL1.length - 1][0] : 0,
      trimmedL2.length > 0 ? trimmedL2[trimmedL2.length - 1][0] : 0,
      trimmedL3.length > 0 ? trimmedL3[trimmedL3.length - 1][0] : 0
    ) || null;

    const { dayStart, axisMax } = getAxisBounds(lastDataTs);
    const colors = ["#a855f7", "#38bdf8", "#f472b6"]; 
    const options = {
      chart: { id: `chart-mvi-thd-combined`, background: "transparent", foreColor: "#64748b", toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: true, speed: 400 }, width: "100%", parentHeightOffset: 0 },
      theme: { mode: "dark" }, title: { text: undefined },
      xaxis: { type: "datetime", min: dayStart, max: axisMax, labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false }, tooltip: { enabled: false } },
      yaxis: { title: { text: "%", style: { fontFamily: "monospace", fontSize: "11px" } }, labels: { style: { fontFamily: "monospace", fontSize: "11px" }, formatter: (val) => (val != null ? val.toFixed(2) : "") } },
      stroke: { curve: "smooth", width: 3, colors: colors }, colors: colors, legend: { show: false },
      tooltip: { theme: "dark", x: { formatter: tooltipFormatter }, y: { formatter: (val) => (val != null ? `${val.toFixed(2)} %` : "--") } },
      grid: { borderColor: "#1e293b", padding: { top: 0, right: 0, bottom: 0, left: 10 } }, dataLabels: { enabled: false },
    };

    return (
      <div className="bg-[#0d1117] border border-slate-700/60 rounded-xl p-4 flex flex-col col-span-2 w-full">
        <div className="mb-3 shrink-0 flex justify-between items-start">
          <div>
            <h3 className="font-mono text-xs font-bold text-slate-400 uppercase tracking-widest">THD I (L1, L2, L3) COMBINED</h3>
            <div className="font-mono text-sm font-bold mt-1 text-slate-300">
              {overallAvg > 0 ? <span>Avg Total: {overallAvg.toFixed(2)} %</span> : <span className="text-slate-600">-- --</span>}
            </div>
          </div>
          <div className="flex gap-5 font-mono text-[11px] font-bold text-right bg-[#161b22] px-4 py-2 rounded-lg border border-slate-700/50">
            <div style={{ color: colors[0] }}><span className="text-slate-500 mr-1">L1:</span> {statsL1.current !== null ? statsL1.current.toFixed(2) : "--"} %</div>
            <div style={{ color: colors[1] }}><span className="text-slate-500 mr-1">L2:</span> {statsL2.current !== null ? statsL2.current.toFixed(2) : "--"} %</div>
            <div style={{ color: colors[2] }}><span className="text-slate-500 mr-1">L3:</span> {statsL3.current !== null ? statsL3.current.toFixed(2) : "--"} %</div>
          </div>
        </div>
        <div style={{ height: "200px", width: "100%" }}>
          <Chart options={options} series={[{ name: "THD L1", data: trimmedL1 }, { name: "THD L2", data: trimmedL2 }, { name: "THD L3", data: trimmedL3 }]} type="line" height="100%" width="100%" />
        </div>
      </div>
    );
  };

  const renderCombinedCurrentChart = () => {
    const dataL1 = chartData.currentL1; const dataL2 = chartData.currentL2; const dataL3 = chartData.currentL3;
    const statsL1 = getChartStats(dataL1); const statsL2 = getChartStats(dataL2); const statsL3 = getChartStats(dataL3);
    const overallAvg = ((statsL1.avg || 0) + (statsL2.avg || 0) + (statsL3.avg || 0)) / 3;

    const trimmedL1 = trimData(dataL1);
    const trimmedL2 = trimData(dataL2);
    const trimmedL3 = trimData(dataL3);

    const lastDataTs = Math.max(
      trimmedL1.length > 0 ? trimmedL1[trimmedL1.length - 1][0] : 0,
      trimmedL2.length > 0 ? trimmedL2[trimmedL2.length - 1][0] : 0,
      trimmedL3.length > 0 ? trimmedL3[trimmedL3.length - 1][0] : 0
    ) || null;

    const { dayStart, axisMax } = getAxisBounds(lastDataTs);
    const colors = ["#fb923c", "#fcd34d", "#fdba74"]; 
    const options = {
      chart: { id: `chart-mvi-current-combined`, background: "transparent", foreColor: "#64748b", toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: true, speed: 400 }, width: "100%", parentHeightOffset: 0 },
      theme: { mode: "dark" }, title: { text: undefined },
      xaxis: { type: "datetime", min: dayStart, max: axisMax, labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false }, tooltip: { enabled: false } },
      yaxis: { title: { text: "A", style: { fontFamily: "monospace", fontSize: "11px" } }, labels: { style: { fontFamily: "monospace", fontSize: "11px" }, formatter: (val) => (val != null ? val.toFixed(2) : "") } },
      stroke: { curve: "smooth", width: 3, colors: colors }, colors: colors, legend: { show: false },
      tooltip: { theme: "dark", x: { formatter: tooltipFormatter }, y: { formatter: (val) => (val != null ? `${val.toFixed(2)} A` : "--") } },
      grid: { borderColor: "#1e293b", padding: { top: 0, right: 0, bottom: 0, left: 10 } }, dataLabels: { enabled: false },
    };

    return (
      <div className="bg-[#0d1117] border border-slate-700/60 rounded-xl p-4 flex flex-col col-span-2 w-full">
        <div className="mb-3 shrink-0 flex justify-between items-start">
          <div>
            <h3 className="font-mono text-xs font-bold text-slate-400 uppercase tracking-widest">CURRENT (L1, L2, L3) COMBINED</h3>
            <div className="font-mono text-sm font-bold mt-1 text-slate-300">
              {overallAvg > 0 ? <span>Avg Total: {overallAvg.toFixed(2)} A</span> : <span className="text-slate-600">-- --</span>}
            </div>
          </div>
          <div className="flex gap-5 font-mono text-[11px] font-bold text-right bg-[#161b22] px-4 py-2 rounded-lg border border-slate-700/50">
            <div style={{ color: colors[0] }}><span className="text-slate-500 mr-1">L1:</span> {statsL1.current !== null ? statsL1.current.toFixed(2) : "--"} A</div>
            <div style={{ color: colors[1] }}><span className="text-slate-500 mr-1">L2:</span> {statsL2.current !== null ? statsL2.current.toFixed(2) : "--"} A</div>
            <div style={{ color: colors[2] }}><span className="text-slate-500 mr-1">L3:</span> {statsL3.current !== null ? statsL3.current.toFixed(2) : "--"} A</div>
          </div>
        </div>
        <div style={{ height: "200px", width: "100%" }}>
          <Chart options={options} series={[{ name: "Current L1", data: trimmedL1 }, { name: "Current L2", data: trimmedL2 }, { name: "Current L3", data: trimmedL3 }]} type="line" height="100%" width="100%" />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0d1117] text-slate-200 overflow-hidden">
      <header className="bg-[#0d1117] border-b border-slate-700 px-5 py-4 flex justify-between items-center z-10 shrink-0">
        <button onClick={() => navigate("/home")} className="font-mono text-sm text-slate-300 border border-slate-600 px-3 py-1.5 rounded hover:border-blue-400 hover:text-blue-400 transition">&lt; BACK TO HOME</button>
        <h1 className="font-mono text-2xl font-bold tracking-widest text-blue-400 italic">DASHBOARD MV-I</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-700 bg-[#161b22]">
            <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-green-400 animate-pulse" : "bg-slate-600"}`} />
            <span className={wsConnected ? "text-green-400" : "text-slate-600"}>{wsConnected ? "LIVE" : "WS OFF"}</span>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 font-mono text-sm text-slate-300 border border-slate-600 px-3 py-1.5 rounded hover:border-blue-400 hover:text-blue-400 transition"><Menu size={16} /> MENU</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out overflow-y-auto bg-[#0d1b2e] w-full">
          
          <div className="flex items-center gap-3 px-6 py-4 border-b border-blue-400/20 bg-[#161b22]">
            <span className="text-[12px] font-mono font-bold text-blue-400 tracking-widest uppercase border-l-4 border-blue-400 pl-3">NODE DETAIL</span>
            <span className="font-mono text-lg text-slate-100 font-bold uppercase truncate">
              {deviceInfo?.subgroup_mv || "MEMUAT DEVICE..."}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 p-6 flex-1 w-full">
            {renderCombinedVoltageChart()}
            {renderCombinedCurrentChart()}
            {renderCombinedThdChart()}
            
            {renderChartPanel("ACTIVE POWER (kW)",    "kW",    "#22c55e", chartData.activePower,    "bar")}
            {renderChartPanel("ACTIVE ENERGY (kWh)",  "kWh",   "#eab308", chartData.activeEnergy,   resolution === 'daily' ? "line" : "bar")}
            
            {renderChartPanel("REACTIVE POWER (kVar)","kVar",  "#06b6d4", chartData.reactivePower,  "bar")}
            {renderChartPanel("REACTIVE ENERGY (kVarh)","kVarh","#0891b2", chartData.reactiveEnergy, resolution === 'daily' ? "line" : "bar")}
            
            {renderChartPanel("UNBALANCE CURRENT (%)","%",     "#ef4444", chartData.unbalanceCurrent,"bar")}
            {renderChartPanel("UNBALANCE VOLTAGE (%)","%",     "#f43f5e", chartData.unbalanceVoltage,"bar")}
            
            {renderChartPanel("FREQUENCY (Hz)",       "Hz",    "#84cc16", chartData.frequency,      "bar")}
            {renderChartPanel("POWER FACTOR (cos φ)", "PF",    "#d946ef", chartData.powerFactor,    "bar")}
          </div>
        </div>

        <aside className={`bg-[#161b22] border-l border-slate-700 transition-all duration-300 ease-in-out flex flex-col shrink-0 overflow-hidden ${isMenuOpen ? "w-72 p-5" : "w-0 p-0 opacity-0 border-transparent"}`}>
          <div className="w-full min-w-[240px] flex flex-col flex-1">
            <div>
              <h2 className="font-mono font-bold text-slate-100 tracking-widest text-base border-b border-slate-700 pb-3 mb-5">MENU</h2>
              <section className="mb-8">
                <h3 className="text-blue-400 text-[10px] font-mono font-bold tracking-widest border-l-2 border-blue-400 pl-2 mb-4">HISTORY OPTIONS</h3>
                <div className="space-y-4">
                  
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">Resolution</label>
                    <select 
                      className="w-full bg-[#0d1117] border border-slate-600 text-slate-200 rounded p-2 text-sm font-mono focus:border-blue-400 outline-none transition-colors"
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                    >
                      <option value="daily">Daily (Harian)</option>
                      <option value="monthly">Monthly (Bulanan)</option>
                      <option value="yearly">Yearly (Tahunan)</option>
                    </select>
                  </div>

                  {resolution === 'daily' && (
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1">Select Date</label>
                      <input type="date" className="w-full bg-[#0d1117] border border-slate-600 text-slate-200 rounded p-2 text-sm font-mono focus:border-blue-400 outline-none transition-colors" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                    </div>
                  )}

                  {resolution === 'monthly' && (
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1">Select Month</label>
                      <input type="month" className="w-full bg-[#0d1117] border border-slate-600 text-slate-200 rounded p-2 text-sm font-mono focus:border-blue-400 outline-none transition-colors" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                    </div>
                  )}

                  {resolution === 'yearly' && (
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1">Select Year</label>
                      <input type="number" min="2000" max="2100" step="1" className="w-full bg-[#0d1117] border border-slate-600 text-slate-200 rounded p-2 text-sm font-mono focus:border-blue-400 outline-none transition-colors" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} />
                    </div>
                  )}

                  <p className="text-[10px] font-mono text-slate-500 italic leading-relaxed">
                    {resolution === 'daily' && "Menampilkan data 1 hari penuh (resolusi 30 menit)."}
                    {resolution === 'monthly' && "Menampilkan rata-rata data per hari (Energi = Total)."}
                    {resolution === 'yearly' && "Menampilkan rata-rata data per bulan (Energi = Total)."}
                  </p>
                  
                  <button onClick={() => fetchData()} className="w-full text-[10px] font-mono font-bold py-2 rounded border border-blue-600 text-blue-400 hover:bg-blue-600/20 transition">LOAD DATA</button>
                </div>
              </section>

              <section className="mb-8">
                <h3 className="text-blue-400 text-[10px] font-mono font-bold tracking-widest border-l-2 border-blue-400 pl-2 mb-4">AUTO REFRESH</h3>
                <p className="text-[10px] font-mono text-slate-400 leading-relaxed">Data diperbarui otomatis setiap <span className="text-blue-400 font-bold">30 menit</span> (hanya aktif di Harian - Hari ini).</p>
                {lastRefresh && <p className="text-[10px] font-mono text-slate-600 mt-2">Last sync: {lastRefresh.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>}
              </section>

              <section className="mb-8">
                <h3 className="text-blue-400 text-[10px] font-mono font-bold tracking-widest border-l-2 border-blue-400 pl-2 mb-4">EXPORT</h3>
                <p className="text-[10px] font-mono text-slate-400 leading-relaxed mb-3">Unduh semua data pada periode ini sebagai file Excel (.xlsx).</p>
                <button 
                  onClick={downloadExcel} 
                  disabled={isLoading || !allData || !deviceInfo?.subgroup_mv || !allData[deviceInfo?.subgroup_mv] || allData[deviceInfo?.subgroup_mv].length === 0} 
                  className="w-full flex items-center justify-center gap-2 text-[10px] font-mono font-bold py-2 rounded border border-green-700 text-green-400 hover:border-green-400 hover:bg-green-400/10 transition disabled:opacity-40 disabled:cursor-not-allowed">
                  <Download size={12} />DOWNLOAD EXCEL
                </button>
              </section>
            </div>
            <div className="mt-auto pt-6 pb-2 flex justify-center items-center"><img src={EvotyLogo} alt="Evoty Logo" className="h-12 opacity-100 brightness-150" /></div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default MvIMonitoring;