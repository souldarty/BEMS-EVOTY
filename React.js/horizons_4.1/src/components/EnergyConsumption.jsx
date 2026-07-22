import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Zap, Activity, Flame, Calendar as CalendarIcon } from "lucide-react";

import MonthlyTotalkWhChart from "@/components/Chart/MonthlyTotalkWhChart";
import MonthlyEnergyConsumptionChart from "@/components/Chart/MonthlyEnergyConsumptionChart";
import KWHPerCubicleChart from "@/components/Chart/KWHPerCubicleChart";
import KWHPerTrafoChart from "@/components/Chart/KWHPerTrafoChart";
import MonthlyPerShiftChart from "@/components/Chart/MonthlyPerShiftChart";
import KWHPerAreaChart from "./Chart/KWHPerAreaChart";

const EnergyConsumption = () => {
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState("monthly");
  
  // State tunggal untuk menyimpan objek tanggal (Date)
  const [targetDate, setTargetDate] = useState(new Date());

  const [totalActivePower, setTotalActivePower] = useState(0);
  const [totalReactivePower, setTotalReactivePower] = useState(0);
  const [totalEnergyGJ, setTotalEnergyGJ] = useState(0);

  const KWH_TO_GJ_FACTOR = 0.0036;

  const handleDataFetched = useCallback((fetchedData, isDetailView) => {
    let activeSum = 0;
    let reactiveSum = 0;
    fetchedData.forEach(item => {
      activeSum += item.value;
      reactiveSum += item.reactiveValue;
    });
    setTotalActivePower(activeSum);
    setTotalReactivePower(reactiveSum);
    setTotalEnergyGJ(activeSum * KWH_TO_GJ_FACTOR);
  }, []);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
  };

  const ChartCard = ({ children }) => (
    <div className="bg-[#0b132b] rounded-2xl p-4 md:p-5 border border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all hover:border-blue-500/30">
      {children}
    </div>
  );

  // --- LOGIKA DATE PICKER DINAMIS ---
  // Ekstrak nilai dari targetDate untuk mengontrol value dari input HTML
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');

  const dateString = `${year}-${month}-${day}`; // Untuk input type="date"
  const monthString = `${year}-${month}`;       // Untuk input type="month"
  const yearString = `${year}`;                 // Untuk input type="number" (Tahun)

  // Handler spesifik untuk mencegah bug zona waktu (Local Time)
  const handleDateChange = (e) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-');
    setTargetDate(new Date(y, m - 1, d));
  };
  const handleMonthChange = (e) => {
    if (!e.target.value) return;
    const [y, m] = e.target.value.split('-');
    setTargetDate(new Date(y, m - 1, 1));
  };
  const handleYearChange = (e) => {
    if (!e.target.value) return;
    setTargetDate(new Date(e.target.value, 0, 1));
  };

  return (
    <div className="min-h-screen w-full bg-[#0f172a] text-slate-100 font-sans p-4 md:p-6 lg:p-8 overflow-x-hidden">
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 border-b border-slate-700/80 pb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/totalenergy')}
            className="p-2 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-all duration-200 group cursor-pointer"
            title="Kembali ke Total Energy"
          >
            <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-slate-100 tracking-wide drop-shadow-sm">
              ENERGY CONSUMPTION
            </h1>
            <p className="text-slate-400 text-sm mt-1">Detail konsumsi dan performa daya elektrikal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          
          {/* FITUR KALENDER DINAMIS OPSI A */}
          {timeframe !== 'yearly' && (
            <div className="flex items-center bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors focus-within:border-blue-500">
              <CalendarIcon className="h-4 w-4 text-slate-400 mr-2" />
              
              {timeframe === 'hourly' && (
                <input type="date" value={dateString} onChange={handleDateChange} title="Pilih Tanggal"
                  className="bg-transparent text-slate-200 border-none outline-none focus:ring-0 text-sm font-semibold cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert opacity-90 hover:opacity-100"
                />
              )}
              {timeframe === 'daily' && (
                <input type="month" value={monthString} onChange={handleMonthChange} title="Pilih Bulan"
                  className="bg-transparent text-slate-200 border-none outline-none focus:ring-0 text-sm font-semibold cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert opacity-90 hover:opacity-100"
                />
              )}
              {timeframe === 'monthly' && (
                <input type="number" min="2000" max="2100" value={yearString} onChange={handleYearChange} title="Pilih Tahun" placeholder="YYYY"
                  className="bg-transparent text-slate-200 border-none outline-none focus:ring-0 text-sm font-semibold cursor-pointer w-[60px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              )}
            </div>
          )}

          <div className="flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[140px] bg-transparent hover:bg-slate-700/60 border-none text-white focus:ring-0 shadow-none font-semibold transition-colors cursor-pointer">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                <SelectItem value="hourly" className="focus:bg-slate-700 focus:text-white cursor-pointer">Hourly</SelectItem>
                <SelectItem value="daily" className="focus:bg-slate-700 focus:text-white cursor-pointer">Daily</SelectItem>
                <SelectItem value="monthly" className="focus:bg-slate-700 focus:text-white cursor-pointer">Monthly</SelectItem>
                <SelectItem value="yearly" className="focus:bg-slate-700 focus:text-white cursor-pointer">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-900/40 to-[#0b132b] p-5 rounded-2xl border border-blue-800/30 flex items-center gap-4 shadow-lg">
          <div className="bg-blue-500/20 p-3 rounded-full text-blue-400"><Zap className="h-8 w-8" /></div>
          <div>
            <p className="text-slate-400 text-sm font-medium">Total Active Power</p>
            <h3 className="text-2xl font-bold text-white">{formatNumber(totalActivePower)} <span className="text-sm font-normal text-slate-400">kWh</span></h3>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-900/40 to-[#0b132b] p-5 rounded-2xl border border-purple-800/30 flex items-center gap-4 shadow-lg">
          <div className="bg-purple-500/20 p-3 rounded-full text-purple-400"><Activity className="h-8 w-8" /></div>
          <div>
            <p className="text-slate-400 text-sm font-medium">Total Reactive Power</p>
            <h3 className="text-2xl font-bold text-white">{formatNumber(totalReactivePower)} <span className="text-sm font-normal text-slate-400">kVARh</span></h3>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/40 to-[#0b132b] p-5 rounded-2xl border border-emerald-800/30 flex items-center gap-4 shadow-lg">
          <div className="bg-emerald-500/20 p-3 rounded-full text-emerald-400"><Flame className="h-8 w-8" /></div>
          <div>
            <p className="text-slate-400 text-sm font-medium">Total Energy Equivalent</p>
            <h3 className="text-2xl font-bold text-white">{formatNumber(totalEnergyGJ)} <span className="text-sm font-normal text-slate-400">GJ</span></h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-12">
        <ChartCard><MonthlyTotalkWhChart timeframe={timeframe} selectedDate={targetDate} onDataFetched={handleDataFetched} /></ChartCard>
        <ChartCard><MonthlyEnergyConsumptionChart timeframe={timeframe} selectedDate={targetDate} /></ChartCard>
        <ChartCard><MonthlyPerShiftChart timeframe={timeframe} selectedDate={targetDate} /></ChartCard>
        <ChartCard><KWHPerCubicleChart selectedDate={targetDate} /></ChartCard>
        <ChartCard><KWHPerTrafoChart selectedDate={targetDate} /></ChartCard>
        <ChartCard><KWHPerAreaChart selectedDate={targetDate} /></ChartCard>
      </div>

    </div>
  );
};

export default EnergyConsumption;