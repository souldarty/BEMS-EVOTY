import React, { useState, useEffect, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import MonthlyCostkWh from "./Cost/MonthlyCostkWh";

import astra from "@/img/astra.svg";
import pirelli from "@/img/pirelli.svg";

const formatDateTime = (date) => {
  const months = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `SUBANG, ${day} ${month} ${year} - ${hours}:${minutes} WIB`;
};

const CostAnalysis = ({ onToggleSidebar }) => {
  const [timeframe, setTimeframe] = useState("monthly");
  // State baru untuk filter tahun (Default: Tahun ini)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  const [totalCost, setTotalCost] = useState(0);
  const [averageCost, setAverageCost] = useState(0);
  const [averageCostLabel, setAverageCostLabel] = useState("Average Monthly Cost");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatRupiah = (value) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);

  const handleDataLoaded = useCallback((data) => {
    if (data && data.length > 0) {
      const sum = data.reduce((acc, current) => acc + current.cost, 0);
      setTotalCost(sum);
      
      if (timeframe === "monthly") {
        const monthsWithData = data.filter(item => item.cost > 0).length;
        setAverageCost(monthsWithData > 0 ? sum / monthsWithData : 0);
        setAverageCostLabel("Average Monthly Cost");
      } else if (timeframe === "quarterly") {
        const quartersWithData = data.filter(item => item.cost > 0).length;
        setAverageCost(quartersWithData > 0 ? sum / quartersWithData : 0);
        setAverageCostLabel("Average Quarterly Cost");
      } else { 
        setAverageCost(sum > 0 ? sum / data.length : 0); 
        setAverageCostLabel("Average Yearly Cost");
      }
    } else {
        setTotalCost(0);
        setAverageCost(0);
    }
  }, [timeframe]); 

  // Kumpulan opsi tahun (bisa Anda sesuaikan sesuai kebutuhan database Anda)
  const availableYears = ["2023", "2024", "2025", "2026", "2027"];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      
      <div className="relative flex-none flex items-center justify-between w-full h-12 mb-4">
        <button
          onClick={onToggleSidebar}
          className="z-10 flex items-center gap-2 px-4 py-2 bg-[#1e293b] hover:bg-[#334155] text-blue-400 border border-slate-600/50 rounded-md transition-colors text-sm font-bold tracking-widest shadow-sm"
        >
          <Menu className="w-4 h-4 text-white" />
          <span className="text-white">MENU</span>
        </button>

        <h1 className="absolute left-1/2 transform -translate-x-1/2 text-xl md:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-slate-100 tracking-[0.15em] drop-shadow-sm whitespace-nowrap pointer-events-none uppercase">
          COST ANALYSIS
        </h1>

        <div className="z-10 flex items-center gap-2 bg-white p-1 rounded-md shadow-sm border">
          {/* Filter Tahun: Disabled ketika mode Yearly */}
          <Select 
            value={selectedYear} 
            onValueChange={setSelectedYear} 
            disabled={timeframe === 'yearly'}
          >
            <SelectTrigger className={`w-[90px] h-8 border-none shadow-none focus:ring-0 font-medium text-sm ${timeframe === 'yearly' ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                 <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Garis pemisah kecil */}
          <div className="w-px h-5 bg-gray-300"></div>

          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[125px] h-8 border-none shadow-none focus:ring-0 font-medium text-sm">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Data Bulanan</SelectItem>
              <SelectItem value="quarterly">Data Quartal</SelectItem>
              <SelectItem value="yearly">Data Tahunan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <motion.div
        className="flex-1 flex flex-col min-h-0 p-4 md:p-6 bg-white rounded-2xl shadow-sm border border-gray-100 mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex-1 min-h-0 w-full relative">
          {/* Meneruskan variabel selectedYear ke grafik */}
          <MonthlyCostkWh onDataLoaded={handleDataLoaded} timeframe={timeframe} selectedYear={selectedYear} />
        </div>
      </motion.div>

      <div className="flex-none grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <motion.div
          className="relative overflow-hidden p-4 md:p-5 bg-white rounded-2xl shadow-sm border border-gray-100 border-t-4 border-t-[#10B981] hover:shadow-md transition-shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h3 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Total Cost {timeframe !== 'yearly' ? `(${selectedYear})` : '(All Time)'}
          </h3>
          <p className="mt-2 text-2xl md:text-3xl font-extrabold text-gray-800 tracking-tight">
            {formatRupiah(totalCost)}
          </p>
        </motion.div>

        <motion.div
          className="relative overflow-hidden p-4 md:p-5 bg-white rounded-2xl shadow-sm border border-gray-100 border-t-4 border-t-[#3B82F6] hover:shadow-md transition-shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider">{averageCostLabel}</h3>
          <p className="mt-2 text-2xl md:text-3xl font-extrabold text-gray-800 tracking-tight">
            {formatRupiah(averageCost)}
          </p>
        </motion.div>
      </div>

      <div className="flex-none flex flex-col sm:flex-row items-center justify-between bg-[#0B132B] text-white px-5 py-2.5 rounded-t-xl shadow-inner w-full border-t border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="bg-[#FFE600] px-2.5 py-1 rounded flex items-center justify-center">
            <img src={pirelli} alt="Pirelli" className="h-6 object-contain" />
          </div>
          <div className="bg-white px-2.5 py-1 rounded flex items-center justify-center">
            <img src={astra} alt="Astra Otoparts" className="h-6 object-contain" />
          </div>
        </div>
        <div className="text-xs sm:text-sm font-bold tracking-widest text-[#6DB0FF]">
          {formatDateTime(currentTime)}
        </div>
      </div>

    </div>
  );
};

export default CostAnalysis;