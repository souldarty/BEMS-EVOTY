import React, { useEffect, useState } from "react";
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { getSettings, getCarbonFootprintData } from "@/services/apiService";

import astra from "@/img/astra.svg";
import pirelli from "@/img/pirelli.svg";

const monthNames = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const COLOR_EMISSION = "#10B981";

const renderCustomizedLabel = (props) => {
  const { x, y, width, value } = props;
  const fontSize = Math.max(10, Math.min(width / 3.5, 13)); 
  if (value > 0) {
    return (
      <text x={x + width / 2} y={y} dy={-10} fill="#374151" fontWeight="bold" fontSize={fontSize} textAnchor="middle">
        {new Intl.NumberFormat('id-ID').format(value)}
      </text>
    );
  }
  return null;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const options = { maximumFractionDigits: 0, style: 'decimal', useGrouping: true };
    return (
      <div className="bg-[#1e293b] text-white p-4 rounded-xl shadow-2xl border border-slate-700 text-sm">
        <p className="font-semibold text-slate-300 border-b border-slate-600 pb-2 mb-3">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[#10B981] to-[#047857] shadow-sm"></div>
          <span className="text-slate-300">Emission:</span>
          <span className="text-[#10B981] font-bold text-base ml-1">
            {data.emission.toLocaleString('id-ID', options)}
          </span> 
          <span className="text-slate-400 text-xs">kg CO₂</span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomLegend = () => (
  <ul className="flex justify-center pt-2">
    <li className="flex items-center mx-2 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-200">
      <div className="w-3 h-3 rounded-full mr-2 shadow-sm bg-gradient-to-b from-[#10B981] to-[#047857]"></div>
      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Carbon Emission</span>
    </li>
  </ul>
);

const formatYAxis = (tickItem) => {
  if (tickItem >= 1000) {
    return `${(tickItem / 1000).toFixed(1)} t CO₂`;
  }
  return `${tickItem.toFixed(0)} kg CO₂`;
};

const formatDateTime = (date) => {
  const months = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `SUBANG, ${day} ${month} ${year} - ${hours}:${minutes} WIB`;
};

const CarbonFootprint = ({ onToggleSidebar }) => {
  const [chartData, setChartData] = useState([]);
  const [totalEmissions, setTotalEmissions] = useState(0);
  const [averageEmissions, setAverageEmissions] = useState(0);
  const [carbonIntensity, setCarbonIntensity] = useState(0);
  const [timeframe, setTimeframe] = useState("monthly");
  
  // State Filter Tahun Baru
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = () => {
      setIsLoading(true);

      const settingsPromise = getSettings('getParameters');
      // REVISI: Meneruskan timeframe dan selectedYear ke API
      const carbonDataPromise = getCarbonFootprintData(timeframe, selectedYear);

      Promise.all([settingsPromise, carbonDataPromise])
        .then(([settingsResult, carbonDataResult]) => {
          const emissionFactorSetting = settingsResult.success 
            ? settingsResult.settings.find(s => s.title === 'CO2 Emission Factor (Electric Power)') 
            : null;
          
          const emission_factor = emissionFactorSetting ? parseFloat(emissionFactorSetting.value) : 0;
          
          const { data, timeframe: apiTimeframe } = carbonDataResult;
          
          let processedData;
          if (apiTimeframe === 'monthly') {
            processedData = monthNames.slice(1).map((name, index) => {
              const monthNumber = index + 1;
              const dataForMonth = data.find(d => d.label === monthNumber);
              const kwh = dataForMonth ? dataForMonth.total_kwh : 0;
              return {
                name: name,
                emission: Math.round(kwh * emission_factor)
              };
            });
          } else if (apiTimeframe === 'yearly') {
            processedData = data.map(item => ({
              name: item.label,
              emission: Math.round(item.total_kwh * emission_factor)
            }));
          }

          const total = processedData.reduce((sum, item) => sum + item.emission, 0);
          const average = processedData.length > 0 ? total / processedData.length : 0;

          setChartData(processedData);
          setTotalEmissions(total);
          setAverageEmissions(average);
          setCarbonIntensity(emission_factor);
        })
        .catch(err => {
          console.error("Fetch error:", err.message);
          setChartData([]);
          setTotalEmissions(0);
          setAverageEmissions(0);
          setCarbonIntensity(0);
        })
        .finally(() => {
            setIsLoading(false);
        });
    };

    fetchData();
    // REVISI: Memicu perulangan fetch data jika timeframe atau tahun diubah
  }, [timeframe, selectedYear]);

  const chartTitle = timeframe.charAt(0).toUpperCase() + timeframe.slice(1);
  const availableYears = ["2023", "2024", "2025", "2026", "2027"];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full overflow-hidden">
        
      {/* 1. Header Section */}
      <div className="relative flex-none flex items-center justify-between w-full h-12 mb-4">
        <button
          onClick={onToggleSidebar}
          className="z-10 flex items-center gap-2 px-4 py-2 bg-[#1e293b] hover:bg-[#334155] text-blue-400 border border-slate-600/50 rounded-md transition-colors text-sm font-bold tracking-widest shadow-sm"
        >
          <Menu className="w-4 h-4 text-white" />
          <span className="text-white">MENU</span>
        </button>

        <h1 className="absolute left-1/2 transform -translate-x-1/2 text-xl md:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-slate-100 tracking-[0.15em] drop-shadow-sm whitespace-nowrap pointer-events-none uppercase">
          CARBON FOOTPRINT
        </h1>

        <div className="z-10 flex items-center gap-2 bg-white p-1 rounded-md shadow-sm border">
          {/* REVISI: Dropdown Filter Tahun (disabled saat yearly) */}
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
            <SelectTrigger className="w-[130px] h-8 border-none shadow-none focus:ring-0 font-medium text-sm">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Data Bulanan</SelectItem>
              <SelectItem value="yearly">Data Tahunan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* 2. Chart Section */}
      <motion.div
        className="flex-1 flex flex-col min-h-0 p-4 md:p-6 bg-white rounded-2xl shadow-sm border border-gray-100 mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex-none mb-2 border-b pb-2">
          <h2 className="text-lg md:text-xl font-bold text-gray-800">{chartTitle} Carbon Emissions</h2>
          <p className="text-xs text-gray-400 mt-0.5">Distribusi emisi karbon berdasarkan {timeframe === 'monthly' ? 'bulan' : 'tahun'}</p>
        </div>
        
        <div className="flex-1 min-h-0 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {isLoading ? (
              <div className="flex justify-center items-center h-full text-gray-400 font-medium animate-pulse">
                  Memuat data grafik...
              </div>
            ) : (
              <ComposedChart data={chartData} margin={{ top: 25, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEmission" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#047857" stopOpacity={0.85}/>
                  </linearGradient>
                  <linearGradient id="areaEmission" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.15}/>
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 13, fontWeight: 600 }} dy={10} />
                <YAxis tickFormatter={formatYAxis} width={80} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                <Legend content={<CustomLegend />} verticalAlign="bottom" height={36} />
                
                <Area type="monotone" dataKey="emission" fill="url(#areaEmission)" stroke="none" />
                
                {/* REVISI: maxBarSize dinaikkan ke 120 agar grafik Yearly terlihat lebar */}
                <Bar 
                  dataKey="emission" 
                  fill="url(#colorEmission)" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={120}
                  background={{ fill: '#F8FAFC', radius: [6, 6, 0, 0] }}
                >
                  <LabelList dataKey="emission" content={renderCustomizedLabel} />
                </Bar>
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* 3. Metric Cards Section */}
      <div className="flex-none grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <motion.div
          className="relative overflow-hidden p-4 md:p-5 bg-white rounded-2xl shadow-sm border border-gray-100 border-t-4 border-t-[#10B981] hover:shadow-md transition-shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h3 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Total Emissions {timeframe !== 'yearly' ? `(${selectedYear})` : '(All Time)'}
          </h3>
          <p className="mt-2 text-2xl md:text-3xl font-extrabold text-gray-800 tracking-tight">
            {totalEmissions.toLocaleString('id-ID')}
          </p>
          <p className="mt-1.5 text-xs font-medium text-gray-400 bg-gray-50 inline-block px-2 py-1 rounded-md">
            kg CO₂ equivalent
          </p>
        </motion.div>

        <motion.div
          className="relative overflow-hidden p-4 md:p-5 bg-white rounded-2xl shadow-sm border border-gray-100 border-t-4 border-t-[#3B82F6] hover:shadow-md transition-shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Average {timeframe === 'monthly' ? 'Monthly' : 'Yearly'} Emissions
          </h3>
          <p className="mt-2 text-2xl md:text-3xl font-extrabold text-gray-800 tracking-tight">
            {averageEmissions.toLocaleString('id-ID', {maximumFractionDigits: 0})}
          </p>
          <p className="mt-1.5 text-xs font-medium text-gray-400 bg-gray-50 inline-block px-2 py-1 rounded-md">
            kg CO₂ equivalent
          </p>
        </motion.div>

        <motion.div
          className="relative overflow-hidden p-4 md:p-5 bg-white rounded-2xl shadow-sm border border-gray-100 border-t-4 border-t-[#F59E0B] hover:shadow-md transition-shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wider">Carbon Intensity</h3>
          <p className="mt-2 text-2xl md:text-3xl font-extrabold text-gray-800 tracking-tight">
            {carbonIntensity}
          </p>
          <p className="mt-1.5 text-xs font-medium text-gray-400 bg-gray-50 inline-block px-2 py-1 rounded-md">
            kg CO₂/kWh
          </p>
        </motion.div>
      </div>

      {/* 4. Footer Section */}
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

export default CarbonFootprint;