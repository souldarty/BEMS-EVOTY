import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { motion } from "framer-motion";
import { getEnergyData } from '@/services/apiService'; 

const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLOR_LWBP = '#3b82f6'; 
const COLOR_WBP = '#a855f7';  

const formatYAxis = (tickItem) => {
    if (tickItem >= 1000000) return `${(tickItem / 1000000).toFixed(1)} GWh`;
    if (tickItem >= 1000) return `${(tickItem / 1000).toFixed(1)} MWh`;
    return `${tickItem.toFixed(0)} kWh`;
};

const CustomTooltipKwh = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0].payload;
    const lwbpValue = dataItem.totalLWBP;
    const wbpValue = dataItem.totalWBP;
    const options = { maximumFractionDigits: 2 };
    return (
      <div className="bg-slate-800 p-4 border border-slate-700 rounded-xl shadow-xl text-sm">
        <p className="text-sm font-bold text-slate-200 mb-3 border-b border-slate-700 pb-2">{label}</p>
        <p className="text-[13px] font-semibold flex items-center gap-2 mb-1" style={{ color: COLOR_LWBP }}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR_LWBP }}></span>LWBP: {lwbpValue.toLocaleString('id-ID', options)} kWh</p>
        <p className="text-[13px] font-semibold flex items-center gap-2 mb-3" style={{ color: COLOR_WBP }}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR_WBP }}></span>WBP: {wbpValue.toLocaleString('id-ID', options)} kWh</p>
        <p className="text-sm font-bold text-slate-100 pt-2 border-t border-slate-600">Total: {(lwbpValue + wbpValue).toLocaleString('id-ID', options)} kWh</p>
      </div>
    );
  }
  return null;
};

const TotalStackedKwhLabel = (props) => {
  const { x, y, width, height, value } = props;
  if (value === 0 || height < 0) return null;
  const formattedValue = value.toLocaleString('id-ID', { maximumFractionDigits: 0 });
  const BASE_FONT_SIZE = 12;
  const MIN_FONT_SIZE = 9;
  const estimatedTextWidth = formattedValue.length * (BASE_FONT_SIZE * 0.65);
  let dynamicFontSize = BASE_FONT_SIZE;
  if (estimatedTextWidth > width * 0.9) {
    const newSize = (width * 0.9 / estimatedTextWidth) * BASE_FONT_SIZE;
    dynamicFontSize = Math.max(newSize, MIN_FONT_SIZE);
  }
  return <text x={x + width / 2} y={y - 8} fill="#cbd5e1" textAnchor="middle" dominantBaseline="auto" fontSize={`${dynamicFontSize}px`} fontWeight="600">{formattedValue}</text>;
};

const CustomLegend = () => (
    <ul className="flex justify-center gap-6 pt-4 mt-2">
      <li className="flex items-center"><div className="w-3 h-3 rounded-full mr-2 shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ backgroundColor: COLOR_LWBP }}></div><span className="text-sm font-medium text-slate-300">LWBP</span></li>
      <li className="flex items-center"><div className="w-3 h-3 rounded-full mr-2 shadow-[0_0_8px_rgba(168,85,247,0.5)]" style={{ backgroundColor: COLOR_WBP }}></div><span className="text-sm font-medium text-slate-300">WBP</span></li>
    </ul>
);

const MonthlyTotalkWhChart = ({ timeframe, selectedDate, onDataFetched }) => {
    const [data, setData] = useState([]);
    const [xAxisDataKey, setXAxisDataKey] = useState('month');

  useEffect(() => {
    const fetchData = () => {
      getEnergyData()
        .then(apiData => {
            if (!apiData || !apiData.areas) return;

            let aggregatedMap = {};
            let dataKey = 'month';
            
            // Karena UI Input Kalender sudah menyesuaikan (Hari/Bulan/Tahun), kita aman mengekstraknya secara mutlak
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
                        aggregatedMap[key] = {
                            [dataKey]: key, totalLWBP: 0, totalWBP: 0, totalKVARH: 0,
                            _sortOrder: (timeframe === 'hourly') ? d.hour : (timeframe === 'daily') ? d.day : (timeframe === 'monthly') ? d.month : d.year
                        };
                    }

                    if (timeframe === 'hourly') {
                        if (d.is_wbp) aggregatedMap[key].totalWBP += d.total_kwh || 0;
                        else aggregatedMap[key].totalLWBP += d.total_kwh || 0;
                    } else {
                        aggregatedMap[key].totalLWBP += d.totalLWBP || 0;
                        aggregatedMap[key].totalWBP += d.totalWBP || 0;
                    }
                    aggregatedMap[key].totalKVARH += d.total_kvarh || 0;
                });
            });

            const finalData = Object.values(aggregatedMap).map(item => {
                const totalActive = item.totalLWBP + item.totalWBP;
                return {
                    ...item,
                    value: totalActive,           
                    reactiveValue: item.totalKVARH, 
                    smallerValue: Math.min(item.totalLWBP, item.totalWBP),
                    largerValue: Math.max(item.totalLWBP, item.totalWBP),
                    smallerValueType: item.totalLWBP <= item.totalWBP ? 'LWBP' : 'WBP',
                    largerValueType: item.totalLWBP > item.totalWBP ? 'LWBP' : 'WBP',
                };
            }).sort((a, b) => a._sortOrder - b._sortOrder);
            
            setData(finalData);
            setXAxisDataKey(dataKey);

            if (onDataFetched) {
                onDataFetched(finalData, false);
            }
        })
        .catch(err => console.error("Fetch error:", err));
    };

    fetchData();
    const intervalId = setInterval(fetchData, 10000); 
    return () => clearInterval(intervalId);
  }, [timeframe, selectedDate, onDataFetched]); 

  return (
    <motion.div className="w-full h-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="flex flex-col h-full">
        <h2 className="text-lg font-bold text-white mb-4">Total {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Electricity Consumption</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 25, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
            <XAxis dataKey={xAxisDataKey} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} />
            <YAxis tickFormatter={formatYAxis} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} />
            <Tooltip content={<CustomTooltipKwh />} cursor={{fill: '#1e293b', opacity: 0.4}} />
            <Legend content={<CustomLegend />} />
            <Bar dataKey="smallerValue" stackId="a" animationDuration={1500} shape={(props) => {
                const { x, y, width, height, payload } = props;
                return <rect x={x} y={y} width={width} height={height} fill={payload.smallerValueType === 'LWBP' ? COLOR_LWBP : COLOR_WBP} />;
              }} name="Smaller Value" />
            <Bar dataKey="largerValue" stackId="a" animationDuration={1500} shape={(props) => {
                const { x, y, width, height, payload } = props;
                return <rect x={x} y={y} width={width} height={height} fill={payload.largerValueType === 'LWBP' ? COLOR_LWBP : COLOR_WBP} />;
              }} name="Larger Value">
              <LabelList dataKey={(dataItem) => (dataItem.totalLWBP || 0) + (dataItem.totalWBP || 0)} content={<TotalStackedKwhLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default MonthlyTotalkWhChart;