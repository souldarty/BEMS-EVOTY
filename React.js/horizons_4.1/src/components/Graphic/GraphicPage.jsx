import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Button } from "@/components/ui/button";
import { BarChart } from 'lucide-react';
import isEqual from 'lodash.isequal';
import { getTrafoHistory } from '@/services/apiService';

const REFRESH_INTERVAL = 5000;

const formatDateForAPI = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
};

const formatYAxis = (tickItem) => {
    if (tickItem >= 1000000) return `${(tickItem / 1000000).toFixed(1)} G`;
    if (tickItem >= 1000) return `${(tickItem / 1000).toFixed(1)} M`;
    return `${tickItem.toFixed(0)} k`;
};
const formatPowerAxis = (tickItem) => {
    if (tickItem >= 1000000) return `${(tickItem / 1000000).toFixed(1)} G`;
    if (tickItem >= 1000) return `${(tickItem / 1000).toFixed(1)} M`;
    return `${tickItem.toFixed(0)} k`;
};
const formatVoltAxis = (tickItem) => {
    if (tickItem >= 1000000) return `${(tickItem / 1000000).toFixed(1)} MV`;
    if (tickItem >= 1000) return `${(tickItem / 1000).toFixed(1)} kV`;
    return `${tickItem.toFixed(0)} V`;
};
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        // Tampilkan tanggal dan waktu lengkap di tooltip
        const labelStr = new Date(label).toLocaleString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        return (
            <div className="bg-white p-2 border rounded shadow text-xs">
                <p className="font-semibold mb-2">{labelStr}</p>
                {payload.map(pld => (
                    pld.value !== null && !isNaN(pld.value) &&
                    <p key={pld.dataKey} style={{ color: pld.stroke || pld.fill }}>
                        {pld.name}: {parseFloat(pld.value).toFixed(2)} {pld.unit || ''}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};
const ChartOverlayMessage = ({ loading, error, data, loadingText, errorText, noDataText }) => {
    const showNoData = !loading && !error && (!data || data.length === 0);
    if (loading || error || showNoData) {
      return (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-lg z-10 pointer-events-none">
              <div className="text-center text-gray-500 p-4">
                  {loading && <p>{loadingText}</p>}
                  {error && <p className="text-red-500">{errorText}: {error}</p>}
                  {showNoData && <p>{noDataText}</p>}
              </div>
          </div>
      );
    }
    return null;
};

const IncomerLineChart = ({ title, data, lines }) => {

    const formatXAxisTick = (tick) => {
        try {
            // Selalu format menjadi HH:MM:SS
            return new Date(tick).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (e) { return tick; }
    };
    
    const getTickFormatter = () => {
        if (title.includes('Energy (kWh, kVARh)')) return formatYAxis;
        if (title.includes('Power Factor')) return (val) => val.toFixed(2);
        if (title.includes('Power (kW, kVAR, kVA)')) return formatPowerAxis;
        if (title.includes('Total Harmonic Distortion Voltage (%)')) return (val) => `${val.toFixed(1)} %`;
        if (title.includes('Total Harmonic Distortion Current (%)')) return (val) => `${val.toFixed(1)} %`;
        if (title.includes('Frequency (Hz)')) return (val) => `${val.toFixed(1)} Hz`;
        if (title.includes('Voltage (V)')) return formatVoltAxis;
        if (title.includes('Current (A)')) return (val) => `${val.toFixed(0)} A`;
        return (val) => val.toFixed(0);
    };

    const yAxisDomain = title.includes('Power Factor')
    ? [0, 1.1]
    : title.includes('Current (A)')
    ? [0, dataMax => Math.ceil(dataMax * 1.8)]
    : title.includes('Total Harmonic Distortion')
    ? [0, dataMax => Math.ceil(dataMax * 1.1)]
    : ['auto', 'auto'];

    return (
        <div className="p-4 border rounded-lg bg-white shadow-md relative h-80">
            <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>
            <ResponsiveContainer width="100%" height="85%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                        dataKey="time" 
                        type='number' 
                        scale='time' 
                        domain={['dataMin', 'dataMax']} 
                        tickFormatter={formatXAxisTick} 
                    />
                    <YAxis domain={yAxisDomain} tickFormatter={getTickFormatter()} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {lines.map(line => 
                        <Line 
                            connectNulls 
                            key={line.dataKey} 
                            type="monotone" 
                            dataKey={line.dataKey} 
                            name={line.name} 
                            stroke={line.color} 
                            dot={false} 
                            unit={line.unit} 
                            animationDuration={300} 
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};


const GraphicPage = () => {
  const { trafoId } = useParams();
  const navigate = useNavigate();

  const [incomerData, setIncomerData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(new Date()); // Default hari ini
  const [endDate, setEndDate] = useState(new Date());     // Default hari ini
  const [isPending, startTransition] = useTransition();
  
  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
      if (!trafoId || !startDate || !endDate) return;
      if (startDate > endDate) {
        setError("Start date cannot be after end date.");
        return;
      }

      if (!isBackgroundRefresh) setIsLoading(true);
      setError(null);

      try {
          const params = new URLSearchParams({ 
              endpoint: 'incomer-data', 
              timeframe: 'custom-range',
              startDate: formatDateForAPI(startDate),
              endDate: formatDateForAPI(endDate)
          });

          if (trafoId === 'MV-I') {
              params.append('group', trafoId);
          } else {
              params.append('subgroup', trafoId);
          }
          
          const apiData = await getTrafoHistory(params);
          
          // Selalu proses 'time' menjadi numeric timestamp untuk sumbu X
          const processedData = apiData
              .map(p => ({ ...p, time: new Date(p.time).getTime() }))
              .sort((a, b) => a.time - b.time);

          startTransition(() => {
              setIncomerData(prevData => !isEqual(processedData, prevData) ? processedData : prevData);
          });
      } catch (err) {
          setError(err.message);
      } finally {
          if (!isBackgroundRefresh) setIsLoading(false);
      }
  }, [trafoId, startDate, endDate]);

  useEffect(() => { 
    fetchData(false); 
  }, [fetchData]);
  
  useEffect(() => {
    const isEndDateToday = formatDateForAPI(endDate) === formatDateForAPI(new Date());
    const intervalId = setInterval(() => {
        if (isEndDateToday) {
            fetchData(true);
        }
    }, REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [endDate, fetchData]);

  return (
    <div className="p-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-center mb-2">Electrical Parameter Overview</h1>
        <p className="text-lg text-center mb-4">Detailed electrical parameters for transformer: <strong className="text-red-700">{trafoId}</strong></p>
      </div>
      
      <div className="p-6 border rounded-lg bg-gray-100 shadow-inner">
        <div className="flex flex-wrap justify-center items-center gap-4 p-4 mb-6 border-b">
            <div className="flex items-center gap-2">
                <label htmlFor="startDate" className="font-semibold">Start Date:</label>
                <input 
                    type="date" 
                    id="startDate"
                    value={formatDateForAPI(startDate)} 
                    onChange={(e) => setStartDate(new Date(e.target.value))} 
                    max={formatDateForAPI(new Date())}
                    className="p-2 border rounded-md"
                />
            </div>
            <div className="flex items-center gap-2">
                <label htmlFor="endDate" className="font-semibold">End Date:</label>
                 <input 
                    type="date" 
                    id="endDate"
                    value={formatDateForAPI(endDate)} 
                    onChange={(e) => setEndDate(new Date(e.target.value))} 
                    max={formatDateForAPI(new Date())}
                    className="p-2 border rounded-md"
                />
            </div>
            
            <Button onClick={() => navigate(`/graphic/${trafoId}/stats`)} variant="outline" className="flex items-center gap-2">
                <BarChart size={16} />
                View Max/Min Stats
            </Button>
        </div>
        
        <div className="relative">
             <ChartOverlayMessage loading={isLoading && !isPending} error={error} data={incomerData} loadingText={`Loading data for ${trafoId}...`} errorText="Failed to load data" noDataText="No data available for this period."/>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <h3 className="md:col-span-2 text-xl font-bold text-center text-indigo-700">{trafoId}</h3>
                <IncomerLineChart title="Voltage (V)" data={incomerData} lines={[{ dataKey: 'voltage', name: 'Voltage', color: '#0070C0', unit: 'V' }]} />
                <IncomerLineChart title="Current (A)" data={incomerData} lines={[{ dataKey: 'current', name: 'Current', color: '#FF0000', unit: 'A' }]} />
                <IncomerLineChart title="Total Harmonic Distortion Voltage (%)" data={incomerData} lines={[{ dataKey: 'thd_v_l1', name: 'THDv L1', color: '#FF0000', unit: '%' }, { dataKey: 'thd_v_l2', name: 'THDv L2', color: '#0070C0', unit: '%' }, { dataKey: 'thd_v_l3', name: 'THDv L3', color: '#4EA72E', unit: '%' }]} />
                <IncomerLineChart title="Total Harmonic Distortion Current (%)" data={incomerData} lines={[{ dataKey: 'thd_i_l1', name: 'THDi L1', color: '#FF0000', unit: '%' }, { dataKey: 'thd_i_l2', name: 'THDi L2', color: '#0070C0', unit: '%' }, { dataKey: 'thd_i_l3', name: 'THDi L3', color: '#4EA72E', unit: '%' }]} />
                <IncomerLineChart title="Frequency (Hz)" data={incomerData} lines={[{ dataKey: 'frequency', name: 'Frequency', color: '#FFBB28', unit: 'Hz' }]} />
                <IncomerLineChart title="Energy (kWh, kVARh)" data={incomerData} lines={[{ dataKey: 'stand_kwh', name: 'Active Energy', color: '#4F46E5', unit: 'kWh' }, { dataKey: 'stand_kvarh', name: 'Reactive Energy', color: '#FF5733', unit: 'kVARh' }]} />
                <IncomerLineChart title="Power (kW, kVAR, kVA)" data={incomerData} lines={[{ dataKey: 'active_power_kw', name: 'Active Power', color: '#FF0000', unit: 'kW' }, { dataKey: 'reactive_power_kvar', name: 'Reactive Power', color: '#0070C0', unit: 'kVAR' }, { dataKey: 'apparent_power_kva', name: 'Apparent Power', color: '#4EA72E', unit: 'kVA' }]} />
                <IncomerLineChart title="Power Factor" data={incomerData} lines={[{ dataKey: 'power_factor', name: 'Power Factor', color: '#0088FE', unit: '' }]} />
             </div>
        </div>
      </div>
    </div>
  );
};

export default GraphicPage;