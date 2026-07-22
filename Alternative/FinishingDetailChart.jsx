import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";
import { getChartData } from "@/services/apiService"

const FINISHING_KEYS = ["(Dinamic Balance machine DBM & Wrapping)","(DB Mech # 3 Exhaust TB,FP,Musholla & Sand blast)","(MCC/ TR/ 1)","(105.C1.LV01.1)"];
const COLOR_PALETTE = ['#1f77b4', '#d62728', '#2ca02c', '#ff7f0e', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#1A5276', '#922B21', '#117A65', '#B7950B', '#633974', '#9C640C', '#5B2C6F', '#78281F', '#0E6251', '#7D6608', '#512E5F', '#4A235A'];

const formatYAxis = (tickItem) => {
  if (tickItem >= 1000000) return `${(tickItem / 1000000).toFixed(1)} GWh`;
  if (tickItem >= 1000) return `${(tickItem / 1000).toFixed(1)} MWh`;
  return `${tickItem.toFixed(0)} kWh`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg text-xs max-w-sm">
        <p className="text-sm font-bold mb-2">{label}</p>
        {payload.map((pld, index) => (
          <p key={index} style={{ color: pld.fill }}>
            {`${pld.dataKey}: ${pld.value.toLocaleString("id-ID")} kWh`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }) => (
  <div className="flex justify-center flex-wrap gap-x-4 p-2 text-xs">
    {payload.map((entry, index) => (
      <div key={`item-${index}`} className="flex items-center cursor-pointer mb-1">
        <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: entry.color }} />
        <span className="text-black">{entry.value}</span>
      </div>
    ))}
  </div>
);

const FinishingDetailChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use the new service function to fetch data
    getChartData({ area: 'finishing' })
      .then(data => {
        setData(data);
      })
      .catch(error => {
        console.error("Failed to fetch data:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading data...</p>;

  return (
    <motion.div className="chart-container p-4 bg-white rounded-lg shadow-xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <h2 className="text-lg font-bold mb-2">Monthly Consumption Details: Finishing Area</h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 20, left: 30, bottom: 5 }} barSize={8} barGap={0}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={formatYAxis} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(230, 230, 230, 0.5)" }} />
          <Legend content={<CustomLegend />} verticalAlign="bottom" wrapperStyle={{paddingTop: '20px'}} />
          {FINISHING_KEYS.map((key, index) => (
            <Bar key={key} dataKey={key} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default FinishingDetailChart;
