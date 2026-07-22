/**
 * mvAMonitoring.jsx
 * Dashboard monitoring Power Meter untuk ruangan MV-A.
 * (Renamed & refactored dari powerMeterMonitoring.jsx)
 *
 * Perubahan utama:
 * - Device list HARDCODED via METER_DATA (update manual jika ada perangkat baru)
 * - Bar chart menggantikan line chart
 * - Satu date picker (per hari, tanpa End Date)
 * - Time resolution dihapus — default 20 menit (ditangani backend)
 * - Auto-refresh setiap 20 menit (hanya jika menampilkan data hari ini)
 * - Status online/offline diambil dari response getMVA.php, di-overlay ke METER_DATA
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "react-apexcharts";
import { getMVAData } from "@/services/apiService";
import EvotyLogo from "@/img/evoty.svg";
import { Menu } from "lucide-react";

// ============================================================
// MASTER DEVICE LIST — MV-A
// Update manual jika ada perangkat baru.
// subgroup_mv HARUS sama persis dengan nilai di kolom subgroup_mv database.
// is_incomer: true  → device ini adalah Incomer (Layer 1 / supply)
// is_incomer: false → device biasa (Layer 2 / subgroup)
// slaveId 0 → OTHERS (kalkulasi, bukan perangkat fisik)
// ============================================================
const METER_DATA = [
  { subgroup_mv: 'Incomer Trafo #1',                   slaveId: 1,  is_incomer: true  },
  { subgroup_mv: 'Incomer Trafo #2',                   slaveId: 2,  is_incomer: true  },
  { subgroup_mv: '101-11-02BY1.1 TSE+RD 116.01',       slaveId: 5,  is_incomer: false },
  { subgroup_mv: '101-06-02 Manual Small Chemical Dosing',        slaveId: 6,  is_incomer: false },
  { subgroup_mv: '101-11-15 Rubber Cutter',             slaveId: 7,  is_incomer: false },
  { subgroup_mv: '101-11-01',                           slaveId: 8,  is_incomer: false },
  { subgroup_mv: '101-A1-LV01(MCC/MR/01-AHU)',          slaveId: 9,  is_incomer: false },
  { subgroup_mv: '(Mixer Control) + D&W 115.01',          slaveId: 10, is_incomer: false },
  { subgroup_mv: '101-06-01(Oil Storage)',              slaveId: 11, is_incomer: false },
  { subgroup_mv: '101-11-06(Batch Off Control By 1.1 118.01)', slaveId: 12, is_incomer: false },
  { subgroup_mv: '108-A1-LV01 R&D(DB LAB/2)',                            slaveId: 13, is_incomer: false },
  { subgroup_mv: '101-06-04 Pneumatic Transport Service 10,02',   slaveId: 14, is_incomer: false },
  { subgroup_mv: '(Mixer Control) + D&W 215.01',          slaveId: 15, is_incomer: false },
  { subgroup_mv: 'Roll Mill Distribution 400V 216.30',       slaveId: 16, is_incomer: false },
  { subgroup_mv: 'Roll Mill Distribution 400V 216.20',       slaveId: 17, is_incomer: false },
  { subgroup_mv: 'Roll Mill Distribution 400V 216.10',       slaveId: 18, is_incomer: false },
  { subgroup_mv: '101-21-18(Batch Off Control By 2.1 218.10)',     slaveId: 19, is_incomer: false },
  { subgroup_mv: '101-21-01',                           slaveId: 20, is_incomer: false },
  { subgroup_mv: 'OTHERS',                              slaveId: 0,  is_incomer: false },
];

// ============================================================
// Helper: Format tanggal hari ini → "YYYY-MM-DD"
// ============================================================
const getTodayStr = () => new Date().toISOString().split("T")[0];

// ============================================================
// KOMPONEN UTAMA
// ============================================================
const MvAMonitoring = () => {
  const navigate   = useNavigate();
  const scrollRef  = useRef(null);
  const intervalRef = useRef(null);

  // --- STATES ---
  const [selectedDate, setSelectedDate]     = useState(getTodayStr());
  const [meterStatus, setMeterStatus]       = useState({});          // { subgroup_mv: true|false }
  const [allData, setAllData]               = useState({});           // { subgroup_mv: [logs] }
  const [selectedDevice, setSelectedDevice] = useState(METER_DATA[0]); // default: device pertama
  const [isLoading, setIsLoading]           = useState(false);
  const [isMenuOpen, setIsMenuOpen]         = useState(true);
  const [lastRefresh, setLastRefresh]       = useState(null);

  const [chartData, setChartData] = useState({
    voltage:      [],
    activePower:  [],
    activeEnergy: [],
    thdi:         [],
  });

  // ============================================================
  // FETCH DATA dari getMVA.php
  // Device list tidak berubah (METER_DATA hardcoded).
  // Yang di-update: data chart (allData) dan status online/offline (meterStatus).
  // ============================================================
  const fetchData = useCallback(async (dateParam) => {
    setIsLoading(true);
    try {
      const result = await getMVAData(dateParam);

      if (result.success) {
        // Ekstrak status dari result.devices → map ke { subgroup_mv: bool }
        const statusMap = {};
        (result.devices || []).forEach((d) => {
          // status null (OTHERS) dibiarkan tidak masuk map
          if (d.status !== null) {
            statusMap[d.subgroup_mv] = d.status;
          }
        });

        setMeterStatus(statusMap);
        setAllData(result.data || {});
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error("[mvAMonitoring] Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================================
  // EFFECT: Fetch saat tanggal berubah + setup auto-refresh
  // Auto-refresh hanya aktif jika menampilkan data hari ini
  // ============================================================
  useEffect(() => {
    fetchData(selectedDate);

    // Bersihkan interval lama sebelum buat yang baru
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const today = getTodayStr();
      // Hanya refresh otomatis jika sedang melihat data hari ini
      if (selectedDate === today) {
        fetchData(today);
      }
    }, 5 * 60 * 1000); // 20 menit

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [selectedDate, fetchData]);

  // ============================================================
  // EFFECT: Update chart saat device dipilih atau data berubah
  // ============================================================
  useEffect(() => {
    if (!selectedDevice || !allData) {
      setChartData({ voltage: [], activePower: [], activeEnergy: [], thdi: [] });
      return;
    }

    const logs = allData[selectedDevice.subgroup_mv] || [];

    setChartData({
      voltage:      logs.map((log) => [new Date(log.timestamp).getTime(), log.voltage]),
      activePower:  logs.map((log) => [new Date(log.timestamp).getTime(), log.power_kw]),
      activeEnergy: logs.map((log) => [new Date(log.timestamp).getTime(), log.consumption_kwh]),
      thdi:         logs.map((log) => [new Date(log.timestamp).getTime(), log.thd_avg]),
    });
  }, [selectedDevice, allData]);

  // ============================================================
  // CHART CONFIGURATION — Bar chart, tanpa label sumbu X
  // ============================================================
  const getChartOptions = (title, unit, color) => ({
    chart: {
      id: `chart-mva-${title}`,
      background: "transparent",
      foreColor: "#64748b",
      toolbar: { show: false },
      zoom:    { enabled: false },
      animations: { enabled: true, speed: 400, animateGradually: { enabled: false } },
    },
    theme: { mode: "dark" },
    noData: {
      text: "No data available for this period",
      align: "center",
      verticalAlign: "middle",
      style: { color: "#64748b", fontSize: "14px", fontFamily: "monospace" },
    },
    title: { text: undefined },
    xaxis: {
      type: "datetime",
      labels: {
        show: false, // Sumbu X tidak ditampilkan — info muncul via tooltip
      },
      axisBorder: { show: false },
      axisTicks:  { show: false },
      tooltip:    { enabled: false },
    },
    yaxis: {
      title: {
        text: unit,
        style: { fontFamily: "monospace", fontSize: "11px" },
      },
      labels: {
        style: { fontFamily: "monospace", fontSize: "11px" },
        formatter: (val) => (val != null ? val.toFixed(1) : ""),
      },
    },
    plotOptions: {
      bar: {
        columnWidth: "60%",
        borderRadius: 2,
        dataLabels: { position: "top" },
      },
    },
    dataLabels: { enabled: false },
    colors: [color],
    tooltip: {
      theme: "dark",
      x: {
        // Tooltip menampilkan waktu dan nilai saat hover
        formatter: (val) => {
          const d = new Date(val);
          return d.toLocaleString("id-ID", {
            weekday: "short",
            day:     "2-digit",
            month:   "short",
            year:    "numeric",
            hour:    "2-digit",
            minute:  "2-digit",
          });
        },
      },
      y: {
        formatter: (val) => (val != null ? `${val.toFixed(2)} ${unit}` : "--"),
      },
    },
    grid: { borderColor: "#1e293b" },
  });

  // ============================================================
  // HELPERS
  // ============================================================
  const scrollCards = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  const getChartStats = (dataArray) => {
    if (!dataArray || dataArray.length === 0) return { current: null, avg: null };
    const values  = dataArray.map((d) => d[1]);
    const current = values[values.length - 1];
    const avg     = values.reduce((acc, v) => acc + v, 0) / values.length;
    return { current, avg };
  };

  // ============================================================
  // RENDER CHART PANEL (bar chart)
  // ============================================================
  const renderChartPanel = (title, unit, color, data) => {
    const stats = getChartStats(data);
    return (
      <div className="bg-[#161b22] border border-slate-700 rounded-xl p-4 flex flex-col overflow-hidden">
        <div className="mb-2">
          <h3 className="font-mono text-sm font-bold text-slate-300 uppercase tracking-wider">
            {title}
          </h3>
          <div className="font-mono text-base font-bold mt-1 flex gap-4" style={{ color }}>
            {stats.current !== null ? (
              <>
                <span>Latest: {stats.current.toFixed(2)} {unit}</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">Avg: {stats.avg.toFixed(2)} {unit}</span>
              </>
            ) : (
              <span>-- --</span>
            )}
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <Chart
            options={getChartOptions(title, unit, color)}
            series={[
              {
                name: selectedDevice?.subgroup_mv || "",
                data,
              },
            ]}
            type="bar"
            height="100%"
          />
        </div>
      </div>
    );
  };

  // ============================================================
  // JSX RENDER
  // ============================================================
  return (
    <div className="flex flex-col h-screen w-full bg-[#0d1117] text-slate-200 overflow-hidden">

      {/* TOP HEADER */}
      <header className="bg-[#0d1117] border-b border-slate-700 px-5 py-4 flex justify-between items-center z-10">
        <button
          onClick={() => navigate("/home")}
          className="font-mono text-sm text-slate-300 border border-slate-600 px-3 py-1.5 rounded hover:border-blue-400 hover:text-blue-400 transition"
        >
          &lt; BACK TO HOME
        </button>

        <h1 className="font-mono text-2xl font-bold tracking-widest text-blue-400 italic">
          DASHBOARD MV-A
        </h1>

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-2 font-mono text-sm text-slate-300 border border-slate-600 px-3 py-1.5 rounded hover:border-blue-400 hover:text-blue-400 transition"
        >
          <Menu size={16} /> MENU
        </button>
      </header>

      {/* CONTENT + SIDEBAR WRAPPER */}
      <div className="flex flex-1 overflow-hidden">

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">

          {/* DEVICE CARD STRIP */}
          <div className="flex items-center bg-[#0d1117] py-3 px-4 w-full">
            <button
              onClick={() => scrollCards("left")}
              className="text-slate-400 hover:text-blue-400 pr-3 font-bold text-xl transition-colors"
            >
              &lt;
            </button>

            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto flex-1 scroll-smooth"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {METER_DATA.map((device) => {
                const isSelected = selectedDevice?.subgroup_mv === device.subgroup_mv;

                // Status diambil dari meterStatus (hasil API).
                // OTHERS (slaveId 0) tidak punya status fisik → null
                const status = device.slaveId === 0
                  ? null
                  : (meterStatus[device.subgroup_mv] ?? null); // null = belum ada data (abu-abu)

                // Styling berdasarkan status
                let bg     = "bg-[#1e293b]";
                let border = "border-slate-600";
                let shadow = "";
                let dot    = "bg-slate-500";
                let text   = "text-slate-400";

                if (status === true) {
                  bg     = "bg-[#0a1f14]";
                  border = "border-[#22c55e]";
                  shadow = "shadow-[0_0_8px_rgba(34,197,94,0.4)]";
                  dot    = "bg-[#22c55e]";
                  text   = "text-[#86efac]";
                } else if (status === false) {
                  bg     = "bg-[#1f0a0a]";
                  border = "border-[#ef4444]";
                  shadow = "shadow-[0_0_8px_rgba(239,68,68,0.4)]";
                  dot    = "bg-[#ef4444]";
                  text   = "text-[#fca5a5]";
                }
                // status === null → OTHERS atau belum terdeteksi → default abu-abu

                // Override border jika sedang dipilih
                if (isSelected) {
                  border = "border-blue-400";
                  shadow = "shadow-[0_0_12px_rgba(96,165,250,0.5)]";
                }

                // Tampilkan voltage terkini hanya pada card yang dipilih
                let latestVoltage = "-- V";
                if (isSelected && chartData.voltage && chartData.voltage.length > 0) {
                  const val = chartData.voltage[chartData.voltage.length - 1][1];
                  latestVoltage = `${val.toFixed(2)} V`;
                }

                return (
                  <div
                    key={device.subgroup_mv}
                    onClick={() => setSelectedDevice(device)}
                    className={`min-w-[200px] p-3 border rounded-lg cursor-pointer transition-all font-mono flex flex-col justify-between ${bg} ${border} ${shadow}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[11px] font-bold uppercase leading-tight w-4/5 ${text}`}>
                        {device.subgroup_mv}
                        {device.is_incomer && (
                          <span className="ml-1 text-blue-400 text-[9px] normal-case">
                            [Incomer]
                          </span>
                        )}
                      </span>
                      {/* Dot status — tidak ditampilkan untuk OTHERS (status = null) */}
                      {status !== null && (
                        <div className={`w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0 ${dot}`} />
                      )}
                    </div>
                    <div className="text-sm font-mono text-slate-400 mt-2">
                      {isSelected ? latestVoltage : "-- V"}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => scrollCards("right")}
              className="text-slate-400 hover:text-blue-400 pl-3 font-bold text-xl transition-colors"
            >
              &gt;
            </button>
          </div>

          {/* 2x2 CHART GRID */}
          <div className="grid grid-cols-2 grid-rows-2 gap-4 p-4 flex-1 overflow-hidden relative">
            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-[#0d1117]/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm rounded-xl m-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 font-mono font-bold text-blue-400 tracking-widest">
                  SYNCING DATA...
                </p>
              </div>
            )}

            {renderChartPanel("VOLTAGE (V)",         "V",   "#3b82f6", chartData.voltage)}
            {renderChartPanel("ACTIVE POWER (kW)",   "kW",  "#22c55e", chartData.activePower)}
            {renderChartPanel("ACTIVE ENERGY (kWh)", "kWh", "#eab308", chartData.activeEnergy)}
            {renderChartPanel("THDI (%)",            "%",   "#a855f7", chartData.thdi)}
          </div>
        </div>

        {/* COLLAPSIBLE SIDE MENU */}
        <aside
          className={`bg-[#161b22] border-l border-slate-700 transition-all duration-300 ease-in-out flex flex-col shrink-0 overflow-hidden ${
            isMenuOpen ? "w-72 p-5" : "w-0 p-0 opacity-0 border-transparent"
          }`}
        >
          <div className="w-full min-w-[240px] flex flex-col flex-1">

            <div>
              <h2 className="font-mono font-bold text-slate-100 tracking-widest text-base border-b border-slate-700 pb-3 mb-5">
                MENU
              </h2>

              {/* HISTORY — hanya satu date picker */}
              <section className="mb-8">
                <h3 className="text-blue-400 text-[10px] font-mono font-bold tracking-widest border-l-2 border-blue-400 pl-2 mb-4">
                  HISTORY
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">
                      Select Date
                    </label>
                    <input
                      type="date"
                      className="w-full bg-[#0d1117] border border-slate-600 text-slate-200 rounded p-2 text-sm font-mono focus:border-blue-400 outline-none transition-colors"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 italic leading-relaxed">
                    Menampilkan data selama 1 hari penuh (resolusi 20 menit, maks 72 titik).
                  </p>
                </div>
              </section>

              {/* AUTO REFRESH INFO */}
              <section className="mb-8">
                <h3 className="text-blue-400 text-[10px] font-mono font-bold tracking-widest border-l-2 border-blue-400 pl-2 mb-4">
                  AUTO REFRESH
                </h3>
                <p className="text-[10px] font-mono text-slate-400 leading-relaxed">
                  Data diperbarui otomatis setiap{" "}
                  <span className="text-blue-400 font-bold">20 menit</span>{" "}
                  (hanya aktif saat menampilkan data hari ini).
                </p>
                {lastRefresh && (
                  <p className="text-[10px] font-mono text-slate-600 mt-2">
                    Last sync:{" "}
                    {lastRefresh.toLocaleTimeString("id-ID", {
                      hour:   "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                )}
                <button
                  onClick={() => fetchData(selectedDate)}
                  className="mt-3 w-full text-[10px] font-mono font-bold py-1.5 rounded border border-slate-600 text-slate-400 hover:border-blue-400 hover:text-blue-400 transition"
                >
                  ↻ REFRESH NOW
                </button>
              </section>
            </div>

            {/* LOGO */}
            <div className="mt-auto pt-6 pb-2 flex justify-center items-center">
              <img
                src={EvotyLogo}
                alt="Evoty Logo"
                className="h-12 opacity-100 brightness-150"
              />
            </div>

          </div>
        </aside>

      </div>
    </div>
  );
};

export default MvAMonitoring;