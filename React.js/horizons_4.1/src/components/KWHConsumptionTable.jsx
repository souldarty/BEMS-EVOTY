import React, { useState, useEffect } from "react";
import { getKWHConsumptionTableData } from "@/services/apiService";
import { Loader2 } from "lucide-react";
import astra from "@/img/astra.svg";
import pirelli from "@/img/pirelli.svg";

// Komponen Jam Real-time
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

const KWHConsumptionTablePage = () => {
    // --- STATE MANAGEMENT ---
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const today = new Date();
    // Default disetel ke Mei jika itu bulan terakhir ada data, atau biarkan default bulan ini
    const [selectedMonth, setSelectedMonth] = useState(String(today.getMonth() + 1).padStart(2, '0'));
    const [selectedYear, setSelectedYear] = useState(String(today.getFullYear()));

    // --- HELPER UNTUK TANGGAL ---
    const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();
    const daysCount = getDaysInMonth(parseInt(selectedMonth), parseInt(selectedYear));
    const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

    const getMonthName = (monthStr) => {
        const date = new Date(`${selectedYear}-${monthStr}-01`);
        return date.toLocaleString('default', { month: 'short' });
    };
    const monthLabel = getMonthName(selectedMonth);

    // --- FETCH LOGIC ---
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getKWHConsumptionTableData({ month: selectedMonth, year: selectedYear });
            if (response.success) {
                // Jangan panggil dummy data jika sukses tapi array kosong. Itu berarti DB terhubung namun bulan tersebut tidak ada record.
                setData(response.data);
            } else {
                setError("Gagal mengambil data dari server.");
            }
        } catch (err) {
            console.warn("API Gagal. Server tidak merespon.", err);
            setError("Koneksi ke server terputus.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedMonth, selectedYear]);

    return (
        <div className="h-full w-full bg-[#0f172a] flex flex-col font-sans text-slate-100">
            
            {/* HEADER dengan Judul dan Filter terintegrasi */}
            <header className="bg-[#0b132b] flex-shrink-0 flex flex-col md:flex-row items-center justify-between px-4 md:px-6 py-3 z-20 border-b border-slate-700/80 shadow-[0_4px_20px_rgba(0,0,0,0.3)] relative min-h-[64px] gap-3 md:gap-0">
                <div className="hidden md:flex flex-1"></div>
                
                <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-300 tracking-[0.15em] drop-shadow-sm whitespace-nowrap uppercase md:absolute md:left-1/2 md:-translate-x-1/2">
                    KWH CONSUMPTION
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
                    <button 
                        onClick={fetchData} 
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 md:px-4 py-1.5 rounded shadow flex items-center gap-2 transition-colors text-sm font-medium"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="flex-grow overflow-hidden p-3 md:p-5">
                <div className="bg-slate-800/60 shadow-[0_0_20px_rgba(16,185,129,0.05)] rounded-2xl h-full w-full p-2 flex flex-col border border-slate-600/50">
                    <div className="flex-grow rounded-xl bg-[#0b132b] border border-slate-700/40 overflow-hidden relative">
                        
                        <div className="absolute inset-0 overflow-auto custom-scrollbar">
                            <table className="w-max min-w-full border-collapse text-slate-300 text-sm">
                                
                                {/* THEAD */}
                                <thead className="sticky top-0 z-20">
                                    <tr>
                                        <th className="sticky left-0 z-30 bg-[#0f172a] text-blue-400 w-64 border border-slate-700 p-2 text-center font-bold tracking-wider">
                                            <div className="border-b border-slate-600 pb-1 mb-1">DATE</div>
                                            <div className="text-xs text-slate-400">DESCRIPTION</div>
                                        </th>
                                        {daysArray.map(day => (
                                            <th key={day} className="bg-[#0f172a] text-slate-200 w-20 border border-slate-700 p-2 text-center font-medium whitespace-nowrap text-xs">
                                                {day}-{monthLabel}<br/><span className="text-slate-500">{selectedYear}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                {/* TBODY */}
                                <tbody>
                                    {/* STATE SAAT LOADING */}
                                    {loading && (
                                        <tr>
                                            <td colSpan={daysArray.length + 1} className="p-10 text-center border border-slate-700 bg-slate-800/30">
                                                <div className="flex justify-center items-center gap-3 text-blue-400 font-semibold">
                                                    <Loader2 className="w-6 h-6 animate-spin" />
                                                    Menghitung Data KWH...
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    {/* STATE SAAT DATA KOSONG */}
                                    {!loading && (!data || data.length === 0) && (
                                        <tr>
                                            <td colSpan={daysArray.length + 1} className="p-10 text-center border border-slate-700 text-slate-400 italic bg-slate-800/30">
                                                Tidak ada rekaman data KWH pada database untuk bulan <strong className="text-slate-200">{monthLabel} {selectedYear}</strong>. Silakan pilih bulan lain.
                                            </td>
                                        </tr>
                                    )}

                                    {/* STATE SAAT DATA TERSEDIA */}
                                    {!loading && data && data.length > 0 && data.map((areaData, areaIndex) => (
                                        <React.Fragment key={areaIndex}>
                                            <tr>
                                                <td className="sticky left-0 z-10 bg-slate-800 text-blue-300 font-bold border border-slate-700 p-2 uppercase tracking-wide">
                                                    {areaData.areaName}
                                                </td>
                                                {daysArray.map(day => (
                                                    <td key={`area-${areaIndex}-${day}`} className="border border-slate-700 bg-slate-800/50"></td>
                                                ))}
                                            </tr>

                                            {areaData.meters.map((meter, meterIndex) => (
                                                <tr key={meterIndex} className="hover:bg-slate-800/70 transition-colors">
                                                    <td className="sticky left-0 z-10 bg-[#1e293b] text-slate-200 font-semibold border border-slate-700 p-2 text-left align-top">
                                                        <div className="font-bold text-[14px] text-emerald-400">{meter.meterName}</div>
                                                        <div className="text-[11px] font-normal text-slate-400 italic mt-1">{meter.description}</div>
                                                    </td>
                                                    {daysArray.map(day => (
                                                        <td 
                                                            key={`${meter.meterName}-${day}`} 
                                                            className="border border-slate-700 p-2 text-center text-slate-300 font-medium text-xs"
                                                        >
                                                            {meter.dailyData[day] !== undefined && meter.dailyData[day] !== null 
                                                                ? Number(meter.dailyData[day]).toLocaleString('id-ID')
                                                                : "-"
                                                            }
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                    </div>
                </div>
            </main>

            {/* FOOTER */}
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

export default KWHConsumptionTablePage;