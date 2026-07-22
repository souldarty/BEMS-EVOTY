import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";
import { getChartData } from "@/services/apiService";

const SEMIFINISHING_KEYS = ["(102-07-01 Inner Liner (Mini Roller Head + Extruder 90mm))","(102-07-02 Extruder 1 (150mm))","(102-07-03 Extruder 2 (150mm))","(102-07-04 Calender)","(102-01-01 Calender (250mm))","(102-01-03 Textile Calender Open Mill)","(102-01-04 Extruder#1 (250mm))","(102-01-05 Extruder#2 (250mm))","(Out Going Trafo # 3)","(102-09-01 Bead Building M/C 1)","(102-10-01 Bead Building M/C 2)","(102-04-01 Ply Cutting)","(102-05-01 Bias Cutter)","(102-13-01 Bead Filler)","(Mini Slitter)","(B2 LV01 Lighting & Power Distribution)","(B2 LV02 Power Distribution)","(DB SF/ 1 AHU Semi Finishing)"];
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

const SemifinishingDetailChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use the new service function to fetch data
    getChartData({ area: 'semifinishing' })
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
      <h2 className="text-lg font-bold mb-2">Monthly Consumption Details: Semifinishing Area</h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 20, left: 30, bottom: 5 }} barSize={8} barGap={0}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={formatYAxis} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(230, 230, 230, 0.5)" }} />
          <Legend content={<CustomLegend />} verticalAlign="bottom" wrapperStyle={{paddingTop: '20px'}} />
          {SEMIFINISHING_KEYS.map((key, index) => (
            <Bar key={key} dataKey={key} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default SemifinishingDetailChart;
