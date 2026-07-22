import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Plot from "react-plotly.js";
import { getEnergyData } from "@/services/apiService";
import astra from "@/img/astra.svg";
import pirelli from "@/img/pirelli.svg";

const DateTimeDisplay = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timerId);
    }, []);

    const formattedDate = currentTime.toLocaleDateString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric'
    }).toUpperCase();

    const formattedTime = currentTime.toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', hour12: false
    }).replace('.', ':');

    return (
        <div className="flex items-center text-slate-300 font-medium tracking-wide text-xs md:text-sm">
            <span className="text-blue-400 font-bold mr-1">SUBANG,</span>
            <span>{formattedDate} - {formattedTime} WIB</span>
        </div>
    );
};

// Menerima props month dan year dari parent component
const TotalEnergyContent = ({ month, year }) => {
  const [chartConfig, setChartConfig] = useState({ data: null, layout: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const lastCheckValue = useRef(-1); 
  const isInitialized = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = () => {
      // Mengirimkan parameter filter ke backend
      getEnergyData({ month, year })
        .then(data => {
          const sankeyObj = data.sankey || { MVI: 0, MVA: 0, MVB: 0, MVC: 0, MVU: 0 };
          
          const mviVal = sankeyObj.MVI;
          const mvaVal = sankeyObj.MVA;
          const mvbVal = sankeyObj.MVB;
          const mvcVal = sankeyObj.MVC;
          const mvuVal = sankeyObj.MVU;

          let othersVal = mviVal - (mvaVal + mvbVal + mvcVal + mvuVal);
          if (othersVal < 0) othersVal = 0;

          // Agar diagram tetap bisa digambar walau data kosong/0
          const renderMvi = mviVal > 0 ? mviVal : 0.001;

          const checkSum = mviVal + mvaVal + mvbVal + mvcVal + mvuVal;
          if (checkSum === lastCheckValue.current && isInitialized.current) {
            return; // Hindari re-render jika data tidak berubah
          }
          
          lastCheckValue.current = checkSum;
          isInitialized.current = true;

          const nodes = [
            { name: `Electricity`, color: "#2563eb" },
            { name: `MV-I (Source)`, color: "#3b82f6" },
            { name: `MV-A`, color: "#10b981" },
            { name: `MV-B`, color: "#f59e0b" },
            { name: `MV-C`, color: "#8b5cf6" },
            { name: `MV-U`, color: "#ec4899" },
            { name: `Others / Losses`, color: "#64748b" }
          ];

          const links = [
            { source: 0, target: 1, value: renderMvi, color: "rgba(59,130,246,0.3)" },
            { source: 1, target: 2, value: mvaVal > 0 ? mvaVal : 0.001, color: "rgba(16,185,129,0.4)" },
            { source: 1, target: 3, value: mvbVal > 0 ? mvbVal : 0.001, color: "rgba(245,158,11,0.4)" },
            { source: 1, target: 4, value: mvcVal > 0 ? mvcVal : 0.001, color: "rgba(139,92,246,0.4)" },
            { source: 1, target: 5, value: mvuVal > 0 ? mvuVal : 0.001, color: "rgba(236,72,153,0.4)" },
            { source: 1, target: 6, value: othersVal > 0 ? othersVal : 0.001, color: "rgba(100,116,139,0.4)" }
          ];

          const sankeyData = [{
            type: "sankey", 
            orientation: "h",
            node: {
              pad: 15, 
              thickness: 45,
              line: { color: "#0f172a", width: 1.5 },
              label: [
                `${nodes[0].name} (${mviVal.toFixed(2)} GJ)`,
                `${nodes[1].name} (${mviVal.toFixed(2)} GJ)`,
                `${nodes[2].name} (${mvaVal.toFixed(2)} GJ)`,
                `${nodes[3].name} (${mvbVal.toFixed(2)} GJ)`,
                `${nodes[4].name} (${mvcVal.toFixed(2)} GJ)`,
                `${nodes[5].name} (${mvuVal.toFixed(2)} GJ)`,
                `${nodes[6].name} (${othersVal.toFixed(2)} GJ)`
              ],
              color: nodes.map(n => n.color),
              hovertemplate: "%{label}<extra></extra>"
            },
            link: {
              source: links.map(l => l.source),
              target: links.map(l => l.target),
              value: links.map(l => l.value),
              color: links.map(l => l.color),
              customdata: [
                `Utility → MV-I: ${mviVal.toFixed(2)} GJ`,
                `MV-I → MV-A: ${mvaVal.toFixed(2)} GJ`,
                `MV-I → MV-B: ${mvbVal.toFixed(2)} GJ`,
                `MV-I → MV-C: ${mvcVal.toFixed(2)} GJ`,
                `MV-I → MV-U: ${mvuVal.toFixed(2)} GJ`,
                `Distribution Losses: ${othersVal.toFixed(2)} GJ`
              ],
              hovertemplate: "%{customdata}<extra></extra>"
            }
          }];

          const chartLayout = {
            font: { 
              size: 13, 
              family: "'Inter', 'Segoe UI', sans-serif", 
              color: "#ffffff" 
            },
            margin: { l: 20, r: 20, t: 20, b: 20 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            uirevision: 'true' 
          };

          setChartConfig({ data: sankeyData, layout: chartLayout });
          setError(null);
        })
        .catch(err => {
          console.error("Polling error:", err);
          setError(err.message || "Gagal menyambung ke server. Mencoba lagi...");
        })
        .finally(() => {
          if (isLoading) setIsLoading(false);
        });
    };

    fetchData(); // Fetch saat load atau filter berubah
    const intervalId = setInterval(fetchData, 3000); // Polling setiap 3 detik
    return () => clearInterval(intervalId);
  }, [month, year, navigate]); // Tambahkan month dan year ke dependency array

  const handleChartClick = (event) => {
    if (event.points && event.points[0]) {
      const clickedPoint = event.points[0];
      const isNodeClick = clickedPoint.label?.includes("MV-I") || clickedPoint.label?.includes("Electricity");
      const isLinkClick = typeof clickedPoint.customdata === 'string' && (clickedPoint.customdata.includes("MV-I") || clickedPoint.customdata.includes("Utility"));
      if (isNodeClick || isLinkClick) {
        navigate("/consumption");
      }
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full text-lg text-blue-400 font-semibold animate-pulse tracking-wide">Memuat Data Distribusi Energi...</div>;
  }

  return (
    <div className="absolute inset-0 p-2 md:p-4">
      {error && <div className="absolute top-0 left-0 w-full text-center text-sm text-red-400 bg-red-900/30 py-1 mb-2 rounded border border-red-800/50 z-10">{error}</div>}
      {chartConfig.data && (
        <Plot
          data={chartConfig.data}
          layout={chartConfig.layout}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%", cursor: "pointer" }}
          config={{ displayModeBar: false, responsive: true }}
          onClick={handleChartClick}
        />
      )}
    </div>
  );
};

const TotalEnergyPage = () => {
    const today = new Date();
    // Default disetel ke bulan saat ini
    const [selectedMonth, setSelectedMonth] = useState(String(today.getMonth() + 1).padStart(2, '0'));
    const [selectedYear, setSelectedYear] = useState(String(today.getFullYear()));

    return (
        <div className="h-full w-full bg-[#0f172a] flex flex-col font-sans text-slate-100">
            {/* Header dengan Dropdown Filter */}
            <header className="bg-[#0b132b] flex-shrink-0 flex flex-col md:flex-row items-center justify-between px-4 md:px-6 py-3 z-20 border-b border-slate-700/80 shadow-[0_4px_20px_rgba(0,0,0,0.3)] relative min-h-[64px] gap-3 md:gap-0">
                <div className="hidden md:flex flex-1"></div>
                
                <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-slate-100 tracking-[0.15em] drop-shadow-sm whitespace-nowrap md:absolute md:left-1/2 md:-translate-x-1/2">
                    TOTAL ENERGY
                </h1>

                <div className="flex-1 flex justify-center md:justify-end items-center gap-3 w-full md:w-auto z-10">
                    <label className="text-slate-400 font-medium text-xs md:text-sm hidden sm:block">Filter:</label>
                    <select 
                        className="border border-slate-600 rounded bg-slate-900 text-slate-200 px-2 py-1.5 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                        value={selectedMonth} 
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                        {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                            <option key={m} value={String(m).padStart(2, '0')}>
                                {new Date(`2000-${String(m).padStart(2, '0')}-01`).toLocaleString('default', { month: 'long' })}
                            </option>
                        ))}
                    </select>
                    <select 
                        className="border border-slate-600 rounded bg-slate-900 text-slate-200 px-2 py-1.5 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </header>

            <main className="flex-grow overflow-hidden p-3 md:p-5">
                <div className="bg-slate-800/60 shadow-[0_0_20px_rgba(59,130,246,0.05)] rounded-2xl h-full w-full p-2 flex flex-col border border-slate-600/50">
                    <div className="flex-grow rounded-xl bg-slate-900/60 border border-slate-700/40 overflow-hidden relative">
                        {/* Melempar state filter ke Content Diagram */}
                        <TotalEnergyContent month={selectedMonth} year={selectedYear} />
                    </div>
                </div>
            </main>

            <footer className="bg-[#0b132b] flex-shrink-0 flex items-center justify-between px-6 py-2 z-20 border-t border-slate-700/80 shadow-[0_-4px_15px_rgba(0,0,0,0.2)]">
                <div className="flex items-center gap-4 h-full">
                    <img src={pirelli} alt="Pirelli Logo" className="h-8 md:h-7 object-contain bg-[#ffdd00] p-1 rounded-sm shadow-sm" />
                    <img src={astra} alt="ASTRA Otoparts Logo" className="h-7 md:h-7 object-contain bg-white p-0.5 rounded-sm shadow-sm" />
                </div>
                <DateTimeDisplay />
            </footer>
        </div>
    );
};

export default TotalEnergyPage;