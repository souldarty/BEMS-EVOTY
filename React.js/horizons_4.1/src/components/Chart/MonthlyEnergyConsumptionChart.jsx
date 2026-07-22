import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { motion } from "framer-motion";
import { getEnergyData } from '@/services/apiService';

const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatYAxis = (tickItem) => `${tickItem.toLocaleString('id-ID')} GJ`;

const CustomTooltipGJ = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 p-3 border border-slate-700 rounded-lg shadow-xl">
        <p className="text-sm font-bold text-slate-200 mb-1">{label}</p>
        <p className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>Energy : {payload[0].value.toLocaleString('id-ID', { maximumFractionDigits: 2 })} GJ
        </p>
      </div>
    );
  }
  return null;
};

const DataLabel = (props) => {
  const { x, y, width, value } = props;
  if (!value || value === 0) return null;
  const formattedValue = value.toLocaleString('id-ID', { maximumFractionDigits: 1 });
  let dynamicFontSize = 12;
  if (formattedValue.length * 7.2 > width) dynamicFontSize = Math.max((width / (formattedValue.length * 7.2)) * 12, 9);
  return <text x={x + width / 2} y={y} dy={-8} fill="#cbd5e1" textAnchor="middle" fontSize={`${dynamicFontSize}px`} fontWeight="600">{formattedValue}</text>;
};

const MonthlyEnergyConsumptionChart = ({ timeframe, selectedDate }) => {
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
              let totalGJValue = 0;

              if (timeframe === 'hourly') {
                key = `${d.hour}:00`;
                totalGJValue = d.total_kwh * 0.0036;
              } else if (timeframe === 'daily') {
                key = `${d.day}/${d.month}`;
                totalGJValue = d.totalGJ;
              } else if (timeframe === 'yearly') {
                key = d.year.toString();
                totalGJValue = d.totalGJ;
              } else {
                key = monthNames[d.month];
                totalGJValue = d.totalGJ;
              }

              if (!aggregatedMap[key]) {
                aggregatedMap[key] = { [dataKey]: key, totalGJ: 0, _sortOrder: (timeframe === 'hourly') ? d.hour : (timeframe === 'daily') ? d.day : (timeframe === 'monthly') ? d.month : d.year };
              }
              aggregatedMap[key].totalGJ += (totalGJValue || 0);
            });
          });

          let processedData = Object.values(aggregatedMap).sort((a, b) => a._sortOrder - b._sortOrder);
          setData(processedData);
          setXAxisDataKey(dataKey);
        })
        .catch(err => console.error("Fetch error:", err));
    };

    fetchData();
    const intervalId = setInterval(fetchData, 10000); 
    return () => clearInterval(intervalId);
  }, [timeframe, selectedDate]); 

  const renderColorfulLegendText = (value) => <span style={{ color: '#cbd5e1', fontWeight: 500 }}>{value}</span>;

  return (
    <motion.div className="w-full h-full" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="flex flex-col h-full">
        <h2 className="text-lg font-bold text-white mb-4">Total {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Energy Consumption</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 25, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
            <XAxis dataKey={xAxisDataKey} interval={0} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }}/>
            <YAxis tickFormatter={formatYAxis} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }}/>
            <Tooltip content={<CustomTooltipGJ />} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
            <Legend iconType="circle" formatter={renderColorfulLegendText} wrapperStyle={{ paddingTop: '15px' }}/>
            <Bar dataKey="totalGJ" fill="#10b981" name="Energy Consumption (GJ)" radius={[4, 4, 0, 0]} animationDuration={1500}>
              <LabelList dataKey="totalGJ" content={<DataLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default MonthlyEnergyConsumptionChart;