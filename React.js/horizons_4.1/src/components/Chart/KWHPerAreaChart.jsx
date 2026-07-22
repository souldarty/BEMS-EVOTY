import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";
import { getChartData } from "@/services/apiService";

// Palet warna baru yang lebih modern & cerah (Dark Mode Friendly)
const AREAS = {
  "Mixing": { color: "#3b82f6" },       
  "Semifinishing": { color: "#f43f5e" }, 
  "Curing": { color: "#10b981" },        
  "Tyre Building": { color: "#f59e0b" }, 
  "Finishing": { color: "#a855f7" },
  "Utilities": { color: "#06b6d4" },
  "R&D LAB": { color: "#ec4899" },
  "Warehouse": { color: "#8b5cf6" },
  "General Affair": { color: "#eab308" },
};
const AREA_KEYS = Object.keys(AREAS);

// Struktur data 12 Bulan
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const initialChartData = monthNames.map(month => ({
  month,
  ...Object.fromEntries(AREA_KEYS.map(k => [k, 0]))
}));

const formatYAxis = (tickItem) => {
  if (tickItem >= 1000000) return `${(tickItem / 1000000).toFixed(1)} GWh`;
  if (tickItem >= 1000) return `${(tickItem / 1000).toFixed(1)} MWh`;
  return `${tickItem.toFixed(0)} kWh`;
};

// Custom Tooltip bergaya Dark Mode dengan sorting (nilai tertinggi di atas)
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const sortedPayload = [...payload].sort((a, b) => b.value - a.value);
    return (
      <div className="bg-slate-800 p-4 border border-slate-700 rounded-xl shadow-xl text-sm min-w-[200px]">
        <p className="text-sm font-bold text-slate-200 mb-3 border-b border-slate-700 pb-2">{label}</p>
        <div className="flex flex-col gap-1.5">
          {sortedPayload.map((pld) => (
            <div key={pld.dataKey} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pld.color }}></span>
                <span className="text-slate-300 font-medium text-[13px]">{pld.dataKey}</span>
              </div>
              <span className="text-slate-100 font-semibold text-[13px]">
                {pld.value.toLocaleString("id-ID", { maximumFractionDigits: 0 })} <span className="text-slate-400 font-normal text-xs">kWh</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Custom Legend bergaya Dark Mode
const CustomAreaLegend = ({ payload }) => (
  <div className="flex justify-center flex-wrap gap-4 pt-4 mt-2">
    {payload.map((entry, index) => (
      <div key={`item-${index}`} className="flex items-center text-sm cursor-pointer group">
        <div
          className="w-3 h-3 rounded-full mr-2 transition-transform group-hover:scale-125"
          style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}80` }}
        />
        <span className="text-sm font-medium text-slate-300">{entry.value}</span>
      </div>
    ))}
  </div>
);

// Menerima selectedDate sebagai patokan Tahun
const KWHPerAreaChart = ({ selectedDate }) => {
  const [data, setData] = useState(initialChartData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        // Mengekstrak Tahun dari fitur Kalender Halaman Utama
        const activeDate = selectedDate ? new Date(selectedDate) : new Date();
        const targetYear = activeDate.getFullYear();

        // Mengirimkan parameter year ke service API
        const result = await getChartData({ view: 'total_per_area', year: targetYear });
        
        if (Array.isArray(result) && result.length > 0) {
          setData(result);
        } else {
          setData(initialChartData);
        }
      } catch (e) {
        console.error("Failed to fetch chart data:", e);
        setData(initialChartData);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
    const intervalId = setInterval(fetchChartData, 10000); // Sinkronisasi setiap 10 detik
    return () => clearInterval(intervalId);
  }, [selectedDate]); // Jalankan ulang setiap tanggal kalender berubah

  return (
    <motion.div
      className="w-full h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col h-full">
        <h2 className="text-lg font-bold text-white mb-4">
          Total Monthly Electricity Consumption per Area
        </h2>
        
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
            barSize={12} // Mempertebal batang agar lebih jelas
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
            <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} />
            <YAxis tickFormatter={formatYAxis} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: '#1e293b', opacity: 0.4 }}
            />
            <Legend content={<CustomAreaLegend />} verticalAlign="bottom" />

            {AREA_KEYS.map((key) => (
              <Bar key={key} dataKey={key} fill={AREAS[key].color} radius={[2, 2, 0, 0]} animationDuration={1500} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default KWHPerAreaChart;