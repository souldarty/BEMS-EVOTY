import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { getTrafoHistory } from '@/services/apiService'; // Import the service

const PARAMETERS_TO_ANALYZE = [
    { key: 'voltage', name: 'Voltage', unit: 'V' },
    { key: 'current', name: 'Current', unit: 'A' },
    { key: 'frequency', name: 'Frequency', unit: 'Hz' },
    { key: 'active_power_kw', name: 'Active Power', unit: 'kW' },
    { key: 'reactive_power_kvar', name: 'Reactive Power', unit: 'kVAR' },
    { key: 'apparent_power_kva', name: 'Apparent Power', unit: 'kVA' },
    { key: 'power_factor', name: 'Power Factor', unit: '' },
    { key: 'thd_v_l1', name: 'THD Voltage L1', unit: '%' },
    { key: 'thd_v_l2', name: 'THD Voltage L2', unit: '%' },
    { key: 'thd_v_l3', name: 'THD Voltage L3', unit: '%' },
    { key: 'thd_i_l1', name: 'THD Current L1', unit: '%' },
    { key: 'thd_i_l2', name: 'THD Current L2', unit: '%' },
    { key: 'thd_i_l3', name: 'THD Current L3', unit: '%' },
];

const MaxMinPage = () => {
    const { trafoId } = useParams();
    const navigate = useNavigate();

    const [allData, setAllData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedYear, setSelectedYear] = useState('All');

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ endpoint: 'all-data' });
             if (trafoId === 'MV-I') {
              params.append('group', trafoId);
          } else {
              params.append('subgroup', trafoId);
          }
            
            // Use the centralized API service function
            const data = await getTrafoHistory(params);

            const cleanedData = data.filter(d => d.timestamp && !isNaN(new Date(d.timestamp)));
            setAllData(cleanedData);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [trafoId]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const availableYears = useMemo(() => {
        if (!allData.length) return [];
        const yearsSet = new Set(allData.map(d => new Date(d.timestamp).getFullYear()));
        return Array.from(yearsSet).sort((a, b) => b - a);
    }, [allData]);

    const filteredData = useMemo(() => {
        if (selectedYear === 'All') return allData;
        const year = parseInt(selectedYear, 10);
        return allData.filter(d => new Date(d.timestamp).getFullYear() === year);
    }, [allData, selectedYear]);

    const statistics = useMemo(() => {
        if (!filteredData.length) return [];

        return PARAMETERS_TO_ANALYZE.map(param => {
            let maxRecord = null;
            let minRecord = null;

            for(const record of filteredData) {
                if (record[param.key] !== null && !isNaN(record[param.key])) {
                    maxRecord = record;
                    minRecord = record;
                    break;
                }
            }

            if (maxRecord === null) {
                return { parameter: param.name, unit: param.unit, maxValue: 'N/A', maxTimestamp: 'N/A', minValue: 'N/A', minTimestamp: 'N/A' };
            }

            for (const record of filteredData) {
                 const value = parseFloat(record[param.key]);
                 if (value === null || isNaN(value)) continue;

                 if (value > parseFloat(maxRecord[param.key])) maxRecord = record;
                 if (value < parseFloat(minRecord[param.key])) minRecord = record;
            }
            
            const formatTimestamp = (ts) => new Date(ts).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

            return {
                parameter: param.name,
                unit: param.unit,
                maxValue: `${parseFloat(maxRecord[param.key]).toFixed(2)} ${param.unit}`,
                maxTimestamp: formatTimestamp(maxRecord.timestamp),
                minValue: `${parseFloat(minRecord[param.key]).toFixed(2)} ${param.unit}`,
                minTimestamp: formatTimestamp(minRecord.timestamp),
            };
        });
    }, [filteredData]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><p>Loading statistical data...</p></div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen text-red-500"><p>Error: {error}</p></div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Maximum & Minimum Statistics</h1>
                    <p className="text-md text-gray-600">
                        Analysis for transformer: <strong className="text-red-700">{trafoId}</strong>
                    </p>
                </div>
                 <Button onClick={() => navigate(`/graphic/${trafoId}`)} variant="outline" className="flex items-center gap-2">
                    <ArrowLeft size={16} />
                    Back to Graphic
                </Button>
            </div>

            <div className="p-4 border rounded-lg bg-white shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Years</SelectItem>
                            {availableYears.map(year => (
                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameter</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Maximum</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Timestamp</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Minimum</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Timestamp</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {statistics.length > 0 ? statistics.map((stat, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stat.parameter}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{stat.maxValue}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.maxTimestamp}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{stat.minValue}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stat.minTimestamp}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">No data available for the selected period.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MaxMinPage;
