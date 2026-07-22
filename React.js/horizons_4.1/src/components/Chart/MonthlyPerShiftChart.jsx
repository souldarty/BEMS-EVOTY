import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from "framer-motion";
import { getEnergyData } from '@/services/apiService';

const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLOR_SHIFT_1 = '#3b82f6'; 
const COLOR_SHIFT_2 = '#10b981'; 
const COLOR_SHIFT_3 = '#a855f7'; 

const CustomTooltipKwh = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const options = { maximumFractionDigits: 0, style: 'decimal', useGrouping: true };
    return (
      <div className="bg-slate-800 p-4 border border-slate-700 rounded-xl shadow-xl text-sm">
        <p className="text-sm font-bold text-slate-200 mb-3 border-b border-slate-700 pb-2">{label}</p>
        {payload.map((pld) => {
          const shiftName = pld.name; 
          const dataItem = payload[0].payload;
          const shiftNum = pld.dataKey.replace('_total', '');
          const totalValue = dataItem[`${shiftNum}_total`];
          const lwbpValue = dataItem[`${shiftNum}_lwbp`];
          const wbpValue = dataItem[`${shiftNum}_wbp`];
          if (pld.value === 0) return null;
          return (
            <div key={shiftName} className="mb-2 last:mb-0">
              {shiftName === 'Shift 3' ? (
                <>
                  <p className="font-semibold text-[13px] flex items-center gap-2" style={{ color: pld.color }}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: pld.color }}></span>{shiftName} - Total: {totalValue.toLocaleString('id-ID', options)} kWh</p>
                  <ul className="list-none pl-4 text-xs text-slate-400 mt-1 border-l border-slate-600 ml-1">
                    <li className="relative before:content-[''] before:absolute before:-left-[9px] before:top-1.5 before:w-1.5 before:h-px before:bg-slate-500">LWBP: {lwbpValue.toLocaleString('id-ID', options)} kWh</li>
                    <li className="relative before:content-[''] before:absolute before:-left-[9px] before:top-1.5 before:w-1.5 before:h-px before:bg-slate-500">WBP: {wbpValue.toLocaleString('id-ID', options)} kWh</li>
                  </ul>
                </>
              ) : (
                <p className="font-semibold text-[13px] flex items-center gap-2" style={{ color: pld.color }}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: pld.color }}></span>{shiftName}: {totalValue.toLocaleString('id-ID', options)} kWh</p>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

const CustomLegend = () => (
  <ul className="flex justify-center flex-wrap gap-4 pt-4 mt-2">
    <li className="flex items-center"><div className="w-3 h-3 rounded-full mr-2 shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ backgroundColor: COLOR_SHIFT_1 }}></div><span className="text-sm font-medium text-slate-300">Shift 1</span></li>
    <li className="flex items-center"><div className="w-3 h-3 rounded-full mr-2 shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ backgroundColor: COLOR_SHIFT_2 }}></div><span className="text-sm font-medium text-slate-300">Shift 2</span></li>
    <li className="flex items-center"><div className="w-3 h-3 rounded-full mr-2 shadow-[0_0_8px_rgba(168,85,247,0.5)]" style={{ backgroundColor: COLOR_SHIFT_3 }}></div><span className="text-sm font-medium text-slate-300">Shift 3</span></li>
  </ul>
);

const MonthlyPerShiftChart = ({ timeframe, selectedDate }) => {
  const [data, setData] = useState([]);
  const [xAxisDataKey, setXAxisDataKey] = useState('month');

  useEffect(() => {
    const fetchData = () => {
      getEnergyData()
        .then(apiData => {
          if (!apiData || !apiData.areas) return;

          let aggregatedMap = {};
          let dataKey = 'month';

          const activeDate = selectedDate ? new Date(selectedDate) : new Date();
          const targetYear = activeDate.getFullYear();
          const targetMonth = activeDate.getMonth() + 1;
          const targetDay = activeDate.getDate();
          
          if (timeframe === 'hourly') dataKey = 'hour';
          else if (timeframe === 'daily') dataKey = 'day';
          else if (timeframe === 'yearly') dataKey = 'year';
          else dataKey = 'month';

          Object.values(apiData.areas).forEach(area => {
            let sourceData = area[timeframe] || [];

            if (timeframe === 'hourly') {
                sourceData = sourceData.filter(d => d.year === targetYear && d.month === targetMonth && d.day === targetDay);
            } else if (timeframe === 'daily') {
                sourceData = sourceData.filter(d => d.year === targetYear && d.month === targetMonth);
            } else if (timeframe === 'monthly') {
                sourceData = sourceData.filter(d => d.year === targetYear);
            }

            sourceData.forEach(d => {
              let key = '';
              if (timeframe === 'hourly') key = `${d.hour}:00`;
              else if (timeframe === 'daily') key = `${d.day}/${d.month}`;
              else if (timeframe === 'yearly') key = d.year.toString();
              else key = monthNames[d.month];

              if (!aggregatedMap[key]) {
                aggregatedMap[key] = { [dataKey]: key, shift1_lwbp: 0, shift1_wbp: 0, shift2_lwbp: 0, shift2_wbp: 0, shift3_lwbp: 0, shift3_wbp: 0, _sortOrder: (timeframe === 'hourly') ? d.hour : (timeframe === 'daily') ? d.day : (timeframe === 'monthly') ? d.month : d.year };
              }

              if (d.shifts) {
                aggregatedMap[key].shift1_lwbp += (d.shifts.shift1?.lwbp_kwh || 0);
                aggregatedMap[key].shift1_wbp += (d.shifts.shift1?.wbp_kwh || 0);
                aggregatedMap[key].shift2_lwbp += (d.shifts.shift2?.lwbp_kwh || 0);
                aggregatedMap[key].shift2_wbp += (d.shifts.shift2?.wbp_kwh || 0);
                aggregatedMap[key].shift3_lwbp += (d.shifts.shift3?.lwbp_kwh || 0);
                aggregatedMap[key].shift3_wbp += (d.shifts.shift3?.wbp_kwh || 0);
              }
            });
          });

          let processedData = Object.values(aggregatedMap).map(item => ({
            ...item,
            shift1_total: item.shift1_lwbp + item.shift1_wbp,
            shift2_total: item.shift2_lwbp + item.shift2_wbp,
            shift3_total: item.shift3_lwbp + item.shift3_wbp,
          })).sort((a, b) => a._sortOrder - b._sortOrder);

          setData(processedData);
          setXAxisDataKey(dataKey);
        })
        .catch(err => console.error("Fetch error:", err));
    };

    fetchData();
    const intervalId = setInterval(fetchData, 10000); 
    return () => clearInterval(intervalId);
  }, [timeframe, selectedDate]); 

  const formatYAxis = (tickItem) => {
    if (tickItem >= 1000000) return `${(tickItem / 1000000).toFixed(1)} GWh`;
    if (tickItem >= 1000) return `${(tickItem / 1000).toFixed(1)} MWh`;
    return `${tickItem.toFixed(0)} kWh`;
  };

  return (
    <motion.div className="w-full h-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="flex flex-col h-full">
        <h2 className="text-lg font-bold text-white mb-4">Total {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Electricity Consumption per Shift</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 20, right: 10, left: -5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
            <XAxis dataKey={xAxisDataKey} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }}/>
            <YAxis tickFormatter={formatYAxis} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }}/>
            <Tooltip content={<CustomTooltipKwh />} cursor={{fill: '#1e293b', opacity: 0.4}}/>
            <Legend content={<CustomLegend />} />
            <Bar dataKey="shift1_total" fill={COLOR_SHIFT_1} name="Shift 1" radius={[2, 2, 0, 0]} animationDuration={1500} />
            <Bar dataKey="shift2_total" fill={COLOR_SHIFT_2} name="Shift 2" radius={[2, 2, 0, 0]} animationDuration={1500} />
            <Bar dataKey="shift3_total" fill={COLOR_SHIFT_3} name="Shift 3" radius={[2, 2, 0, 0]} animationDuration={1500} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default MonthlyPerShiftChart;