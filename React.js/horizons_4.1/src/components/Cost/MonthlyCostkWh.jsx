import { useEffect, useState } from 'react';
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Legend
} from 'recharts';
import { getCostData } from '@/services/apiService';

const CustomBarLabel = (props) => {
  const { x, y, width, height, value } = props;
  if (value === 0 || height < 0) return null;
  
  const formatRupiah = (val) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
    
  const formattedValue = formatRupiah(value);
  const BASE_FONT_SIZE = 12;
  const MIN_FONT_SIZE = 9;
  const estimatedTextWidth = formattedValue.length * (BASE_FONT_SIZE * 0.55); 
  let dynamicFontSize = BASE_FONT_SIZE;
  
  if (estimatedTextWidth > width * 0.9) {
      const newSize = (width * 0.9 / estimatedTextWidth) * BASE_FONT_SIZE;
      dynamicFontSize = Math.max(newSize, MIN_FONT_SIZE);
  }
  
  return (
    <text x={x + width / 2} y={y - 8} fill="#374151" textAnchor="middle" fontSize={`${dynamicFontSize}px`} fontWeight="bold">
      {formattedValue}
    </text>
  );
};

const MonthlyCostkWh = ({ onDataLoaded, timeframe, selectedYear }) => { 
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDataForChart = () => {
      setIsLoading(true);
      getCostData(timeframe, selectedYear)
        .then(json => {
          if (Array.isArray(json)) {
            setData(json);
            if (onDataLoaded) onDataLoaded(json);
          }
        })
        .catch(err => {
          console.error('Failed to fetch data for chart:', err.message);
          setData([]);
          if (onDataLoaded) onDataLoaded([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    };

    fetchDataForChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, selectedYear]);

  const formatRupiah = (value) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1e293b] text-white p-4 rounded-xl shadow-2xl border border-slate-700 text-sm">
          <p className="font-semibold text-slate-300 border-b border-slate-600 pb-2 mb-3">{label}</p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[#FBBF24] to-[#D97706] shadow-sm"></div>
            <span className="text-slate-300">Total Cost:</span>
            <span className="text-[#FBBF24] font-bold text-base ml-1">
              {formatRupiah(payload[0].value)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = () => (
    <ul className="flex justify-center pt-2">
      <li className="flex items-center mx-2 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-200">
        <div className="w-3 h-3 rounded-full mr-2 shadow-sm bg-gradient-to-b from-[#FBBF24] to-[#D97706]"></div>
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Electric Cost (IDR)</span>
      </li>
    </ul>
  );

  const xAxisDataKey = timeframe === 'quarterly' ? 'quarter' : timeframe === 'yearly' ? 'year' : 'month';
  const chartTitle = timeframe.charAt(0).toUpperCase() + timeframe.slice(1);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-none mb-4 border-b pb-2">
        <h2 className="text-lg md:text-xl font-bold text-gray-800">{chartTitle} Electric Cost Estimate</h2>
        <p className="text-xs text-gray-400 mt-0.5">Estimasi pengeluaran biaya listrik berdasarkan {timeframe === 'monthly' ? 'bulan' : 'tahun'}</p>
      </div>
      
      <div className="flex-1 min-h-0 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {isLoading ? (
            <div className="flex justify-center items-center h-full text-gray-400 font-medium animate-pulse">
                Memuat estimasi biaya...
            </div>
          ) : (
            <ComposedChart data={data} margin={{ top: 25, right: 20, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FBBF24" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#D97706" stopOpacity={0.85}/>
                </linearGradient>
                <linearGradient id="areaCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FBBF24" stopOpacity={0.15}/>
                  <stop offset="100%" stopColor="#FBBF24" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey={xAxisDataKey} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 13, fontWeight: 600 }} dy={10} />
              <YAxis tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(0)}M`} width={80} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              <Legend content={<CustomLegend />} verticalAlign="bottom" height={36} />
              <Area type="monotone" dataKey="cost" fill="url(#areaCost)" stroke="none" />
              {/* REVISI: maxBarSize dinaikkan ke 120 agar grafik Yearly terlihat lebar dan proporsional */}
              <Bar dataKey="cost" fill="url(#colorCost)" radius={[6, 6, 0, 0]} maxBarSize={120} background={{ fill: '#F8FAFC', radius: [6, 6, 0, 0] }}>
                <LabelList dataKey="cost" content={<CustomBarLabel />} />
              </Bar>
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonthlyCostkWh;