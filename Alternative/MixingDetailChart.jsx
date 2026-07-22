import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";
import { getChartData } from "@/services/apiService";

const MIXING_KEYS = ["(101-11-02 BY1.1 TSE+RD 116.01)","(101-11-11 BY1.1 Aux. MB (Mixer Control) + D&W 115.01)","(101-06-02 Manual Small Chemical Dosing)","(101-11-15 ( Rubber Cutter ))","(101-11-01)","(101-11-06 ( Batch off control By 1.1 118. 01 ))","(101-21-23 BY2.1  Aux. FC (Mixer Control) + D&W 215.01)","(101-21-02 BY2.1 1˚ Roll Mill Distribution 400V 216.10)","(101-21-03 BY2.1 2˚ Roll Mill Distribution 400V 216.20)","(101-21-04 BY2.1 3˚ Roll Mill Distribution 400V 216.30)","(101-21-18 (Bacth off control By 2.1 218. 10))","(101-21-01)","(Incoming Trafo # 3 (RBF1 Master))","(Incoming Trafo # 4 (RBF2 Final))","(101-06-01 (Oil Storage))","(DB A2-LV01-1 (Power & Lighting))","(DB A2-LV01-2 (Power & Lighting))","(DB A1-LV01 (Power & Lighting))","(101-A1-LV01 (MCC/MR/01-AHU))","(MCC MV - A ( AHU MV -A ))"];
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

const MixingDetailChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use the new service function to fetch data
    getChartData({ area: 'mixing' })
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
      <h2 className="text-lg font-bold mb-2">Monthly Consumption Details: Mixing Area</h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 20, left: 30, bottom: 5 }} barSize={8} barGap={0}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={formatYAxis} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(230, 230, 230, 0.5)" }} />
          <Legend content={<CustomLegend />} verticalAlign="bottom" wrapperStyle={{paddingTop: '20px'}} />
          {MIXING_KEYS.map((key, index) => (
            <Bar key={key} dataKey={key} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default MixingDetailChart;
