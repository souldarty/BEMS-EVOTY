import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";
import { getEnergyData } from "@/services/apiService"; 

const AREAS = {
  "MV-A": { description: "Mixing", color: "#3b82f6" },       
  "MV-B": { description: "Semifinishing", color: "#f43f5e" }, 
  "MV-C": { description: "Curing", color: "#10b981" },        
  "MV-U": { description: "Utility", color: "#f59e0b" },       
};
const AREA_KEYS = Object.keys(AREAS);
const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatYAxis = (tickItem) => {
  if (tickItem >= 1000000) return `${(tickItem / 1000000).toFixed(1)} GWh`;
  if (tickItem >= 1000) return `${(tickItem / 1000).toFixed(1)} MWh`;
  return `${tickItem.toFixed(0)} kWh`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 p-4 border border-slate-700 rounded-xl shadow-xl text-sm min-w-[200px]">
        <p className="text-sm font-bold text-slate-200 mb-3 border-b border-slate-700 pb-2">{label}</p>
        <div className="flex flex-col gap-1.5">
          {payload.map((pld) => (
            <div key={pld.dataKey} className="flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pld.color }}></span><span className="text-slate-300 font-medium text-[13px]">{pld.dataKey}</span></div>
              <span className="text-slate-100 font-semibold text-[13px]">{pld.value.toLocaleString('id-ID', { maximumFractionDigits: 0 })} <span className="text-slate-400 font-normal text-xs">kWh</span></span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const CustomAreaLegend = (props) => {
  const { payload } = props;
  return (
    <div className="flex justify-center flex-wrap gap-4 pt-4 mt-2">
      {payload.map((entry, index) => {
        const areaInfo = AREAS[entry.value];
        if (!areaInfo) return null; 
        return (
          <div key={`item-${index}`} className="flex items-center text-sm cursor-pointer group">
            <div className="w-3 h-3 rounded-full mr-2 transition-transform group-hover:scale-125" style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}80` }} />
            <span className="text-sm font-medium text-slate-300">{`${entry.value} (${areaInfo.description})`}</span>
          </div>
        );
      })}
    </div>
  );
};

const KWHPerCubicleChart = ({ selectedDate }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = () => {
      getEnergyData()
        .then((apiData) => {
          if (!apiData || !apiData.areas) return;

          // Mengambil informasi Tahun dari input pengguna
          const activeDate = selectedDate ? new Date(selectedDate) : new Date();
          const targetYear = activeDate.getFullYear();

          let monthlyAggregator = {};

          for (let i = 1; i <= 12; i++) {
            const monthLabel = monthNames[i];
            monthlyAggregator[monthLabel] = { month: monthLabel, _sortOrder: i };
            AREA_KEYS.forEach(key => { monthlyAggregator[monthLabel][key] = 0; });
          }

          AREA_KEYS.forEach(areaKey => {
            if (apiData.areas[areaKey] && apiData.areas[areaKey].monthly) {
              const monthlyDataArray = apiData.areas[areaKey].monthly.filter(d => d.year === targetYear);
              monthlyDataArray.forEach(d => {
                const monthLabel = monthNames[d.month];
                if (monthlyAggregator[monthLabel]) {
                  monthlyAggregator[monthLabel][areaKey] = (d.totalLWBP || 0) + (d.totalWBP || 0);
                }
              });
            }
          });

          const processedData = Object.values(monthlyAggregator).sort((a, b) => a._sortOrder - b._sortOrder);
          setData(processedData);
        })
        .catch((err) => console.error("Fetch error:", err));
    };

    fetchData();
    const intervalId = setInterval(fetchData, 10000); 
    return () => clearInterval(intervalId);
  }, [selectedDate]); 

  return (
    <motion.div className="w-full h-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="flex flex-col h-full">
        <h2 className="text-lg font-bold text-white mb-4">Total Monthly Electricity Consumption per Cubicle</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
            <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} />
            <YAxis tickFormatter={formatYAxis} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
            <Legend content={<CustomAreaLegend />} verticalAlign="bottom" />
            {AREA_KEYS.map((key) => <Bar key={key} dataKey={key} fill={AREAS[key].color} radius={[2, 2, 0, 0]} animationDuration={1500} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default KWHPerCubicleChart;