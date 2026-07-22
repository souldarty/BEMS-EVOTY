import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { motion } from "framer-motion";
import { getConsumptionData } from "@/services/apiService";

// Palet warna disesuaikan untuk Dark Mode (Lebih terang dan kontras)
const TRAFO_GROUPS = {
  A: { name: "MV-A", members: { "MV-A Trafo 1": "#3b82f6", "MV-A Trafo 2": "#60a5fa", "MV-A Trafo 3": "#93c5fd", "MV-A Trafo 4": "#bfdbfe" } }, // Blues
  B: { name: "MV-B", members: { "MV-B Trafo 1": "#e11d48", "MV-B Trafo 2": "#f43f5e", "MV-B Trafo 3": "#fb7185", "MV-B Trafo 4": "#fda4af" } }, // Roses
  C: { name: "MV-C", members: { "MV-C Trafo 1": "#059669", "MV-C Trafo 2": "#34d399" } }, // Emeralds
  U: { name: "MV-U", members: { "MV-U Trafo 1": "#d97706", "MV-U Trafo 2": "#fbbf24" } }, // Ambers
};

const getAllTrafoKeys = () =>
  Object.values(TRAFO_GROUPS).flatMap(group => Object.keys(group.members));

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Membuat cetakan kerangka 12 bulan bernilai 0
const getInitialData = () => {
  return monthNames.map(month => {
    const result = { month };
    getAllTrafoKeys().forEach(trafo => {
      result[trafo] = 0;
    });
    return result;
  });
};

const formatYAxis = (tick) => {
  if (tick >= 1000000) return `${(tick / 1000000).toFixed(1)} GWh`;
  if (tick >= 1000) return `${(tick / 1000).toFixed(1)} MWh`;
  return `${tick.toFixed(0)} kWh`;
};

// Custom Tooltip bergaya Dark Mode
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  
  // Mengurutkan nilai dari yang tertinggi ke terendah agar lebih mudah dibaca
  const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

  return (
    <div className="bg-slate-800 p-4 border border-slate-700 rounded-xl shadow-xl text-sm min-w-[220px]">
      <div className="text-sm font-bold text-slate-200 mb-3 border-b border-slate-700 pb-2">{label}</div>
      <div className="flex flex-col gap-1.5 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
        {sortedPayload.map((entry, idx) => {
          // Hanya tampilkan jika nilainya lebih dari 0 untuk menghindari tooltip terlalu panjang
          if (entry.value === 0) return null;
          return (
            <div key={idx} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span className="text-slate-300 font-medium text-[12px]">{entry.name}</span>
              </div>
              <span className="text-slate-100 font-semibold text-[12px]">
                {entry.value.toLocaleString("id-ID")} <span className="text-slate-400 font-normal text-[10px]">kWh</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Custom Legend bergaya Dark Mode
const CustomLegend = () => (
  <div className="flex flex-wrap justify-center items-center gap-4 pt-4 mt-2">
    {Object.values(TRAFO_GROUPS).flatMap(group =>
      Object.entries(group.members).map(([name, color]) => (
        <div key={name} className="flex items-center text-sm cursor-pointer group">
          <div 
            className="w-3 h-3 rounded-full mr-2 transition-transform group-hover:scale-125" 
            style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }}
          ></div>
          <span className="text-xs font-medium text-slate-300">{name}</span>
        </div>
      ))
    )}
  </div>
);

// Menerima selectedDate sebagai props untuk fitur filter kalender
const KWHPerTrafoChart = ({ selectedDate }) => {
  const [data, setData] = useState(getInitialData());
  const [isLoading, setIsLoading] = useState(true);
  const [yAxisMax, setYAxisMax] = useState('auto');

  useEffect(() => {
    const fetchData = () => {
      // Mengekstrak tahun dari selectedDate (persiapan untuk backend)
      const activeDate = selectedDate ? new Date(selectedDate) : new Date();
      const targetYear = activeDate.getFullYear();

      // Memanggil API dengan menambahkan parameter tahun
      getConsumptionData({ endpoint: 'mv-trafo-monthly', year: targetYear })
        .then((jsonData) => {
          if (jsonData && !jsonData.error && Array.isArray(jsonData) && jsonData.length > 0) {
            
            // Menggabungkan data dari API dengan cetakan 12 Bulan kita
            const mergedData = getInitialData().map(initialMonth => {
              const apiMonthData = jsonData.find(d => d.month === initialMonth.month);
              if (apiMonthData) {
                return { ...initialMonth, ...apiMonthData };
              }
              return initialMonth;
            });
            
            setData(mergedData);

            // Mencari nilai tertinggi untuk mengatur batas atas Y-Axis secara dinamis
            let currentMaxValue = 0;
            const trafoKeys = getAllTrafoKeys();
            
            mergedData.forEach(monthData => {
              trafoKeys.forEach(key => {
                if (monthData[key] > currentMaxValue) {
                  currentMaxValue = monthData[key];
                }
              });
            });

            if (currentMaxValue === 0) {
              setYAxisMax('auto');
            } else {
              const newMax = Math.ceil((currentMaxValue * 1.05) / 10000) * 10000;
              setYAxisMax(newMax);
            }
          } else {
            // Jika gagal/belum ada data, kembalikan ke kerangka awal (0)
            setData(getInitialData());
            setYAxisMax('auto');
          }
        })
        .catch((err) => {
          console.error(`Gagal memuat data trafo: ${err.message}`);
          setData(getInitialData());
        })
        .finally(() => setIsLoading(false));
    };

    fetchData();
    const intervalId = setInterval(fetchData, 10000); // 10 Detik
    return () => clearInterval(intervalId);
  }, [selectedDate]); // Jalankan ulang jika tanggal berubah

  const trafoKeys = getAllTrafoKeys();

  return (
    <motion.div className="w-full h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col h-full">
        <h2 className="text-lg font-bold text-white mb-4">Total Monthly Electricity Consumption per Transformer</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
            barGap={0}
            barCategoryGap={0}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
            <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} />
            <YAxis tickFormatter={formatYAxis} domain={[0, yAxisMax]} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
            <Legend content={<CustomLegend />} verticalAlign="bottom" />
            
            {trafoKeys.map((trafoName) => {
              const color = Object.values(TRAFO_GROUPS).find(g => g.members[trafoName])?.members[trafoName];
              return (
                <Bar
                  key={trafoName}
                  dataKey={trafoName}
                  name={trafoName}
                  fill={color}
                  barSize={8} // Mengatur ukuran batang
                  radius={[2, 2, 0, 0]} // Melengkungkan atas batang
                  isAnimationActive={true}
                  animationDuration={1500}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default KWHPerTrafoChart;