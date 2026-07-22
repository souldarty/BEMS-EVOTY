// src/components/realtime2.jsx

import { useEffect, useState, useCallback, memo } from 'react';
import factory5 from "@/img/factory5.png";
import EvotyLogo2 from "@/img/evoty2.svg";
import astra from "@/img/astra.svg";
import pirelli from "@/img/pirelli.svg";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- KONFIGURASI POWER METER DITEMPATKAN DI SINI ---
const powerMeterConfig = {
    'MV-A': [
        { name: "Incomer Trafo # 1", description: "" },
        { name: "101-11-02", description: "BY1.1 TSE+RD 116.01" },
        { name: "101-11-11", description: "BY1.1 Aux. MB (Mixer Control) + D&W 115.01" },
        { name: "101-06-01", description: "(Oil Storage)" },
        { name: "108-A1-LV01", description: "(DB Lab/2)" },
        { name: "101-A2-LV01-2", description: "(DB Lab.lighting)" },
        { name: "MCC MV-A", description: "(AHU MV-A)"},
        { name: "101-06-02", description: "Manual Small Chemical Dosing" },
        { name: "101-11-15", description: "( Rubber Cutter )" },
        { name: "101-11-01", description: "" },
        { name: "101-11-06", description: "( Batch off control By 1.1 118. 01 )" },
        { name: "101-A1-LV01", description: "(MCC/MR/01-AHU)" },
        { name: "Incomer Trafo # 2", description: "" },
        { name: "101-21-23", description: "BY2.1  Aux. FC (Mixer Control) + D&W 215.01" },
        { name: "101-21-02", description: "BY2.1 1˚ Roll Mill Distribution 400V 216.10" },
        { name: "101-21-03", description: "BY2.1 2˚ Roll Mill Distribution 400V 216.20" },
        { name: "101-21-04", description: "BY2.1 3˚ Roll Mill Distribution 400V 216.30" },
        { name: "101-06-04", description: "Pneumatic Transport Service 10,0" },
        { name: "A-DG1-1-1", description: "(ATS MV A)" },
        { name: "DB A2-LV01-1", description: "(Power & Lighting)" },
        { name: "101.A2-LV01-1 - Non Industrial", description: "(Lighting Raw Material Elev.0)" },
        { name: "NEW RAW MATERIAL WAREHOUSE EXPAND", description: "(Lighting Raw Material Elev.7) - Non Industri" },
        { name: "DB A2-LV01-2", description: "(Power & Lighting)" },
        { name: "101.A2-LV01-4  ELV 7", description: "(Power & Lighting RM. Warehouse) - Non Industri" },
        { name: "101-21-18", description: "(Bacth off control By 2.1 218. 01)" },
        { name: "101-21-01", description: "" },
        { name: "A1-LV01", description: "(Power & Lighting)" }
    ],
    'MV-B': [
        { name: "Incomer Trafo # 1", description: "" },
        { name: "102-07-01", description: "Inner Liner (Mini Roller Head + Extruder 90mm)" },
        { name: "102-07-02", description: "Extruder 1 (150mm)" },
        { name: "102-07-03", description: "Extruder 2 (150mm)" },
        { name: "102-07-04", description: "Calender" },
        { name: "102-09-01", description: "Bead Building M/C 1" },
        { name: "102-10-01", description: "Bead Building M/C 2" },
        { name: "102-13-01", description: "Bead Filler" },
        { name: "DB- SF/1", description: "" },
        { name: "B-DG1-1-1", description: "ATS MV B" },
        { name: "MCC # 6 non industri", description: "AC Canteen" },
        { name: "MCC # 5 non industri", description: "AC Infirmary" },
        { name: "B2 LV01", description: "Lighting & Power Distribution" },
        { name: "B2 LV02", description: "Power Distribution" },
        { name: "Incomer Trafo # 2", description: "" },
        { name: "102-04-01", description: "Ply Cutting" },
        { name: "102-05-01", description: "Bias Cutter" },
        { name: "SPARE", description: "Mini Slitter" },
        { name: "102-01-01", description: "Calender (250mm)" },
        { name: "102-01-03", description: "Textile Calender Open Mill" },
        { name: "102-01-04", description: "Extruder#1 (250mm)" },
        { name: "102-01-05", description: "Extruder#2 (250mm)" },
        { name: "DB MCC #3", description: "AC Production Office" },
        { name: "Incomer Trafo # 3", description: "" },
        { name: "102-02-01", description: "" },
    ],
    'MV-C': [
        { name: "Incomer Trafo # 1", description: "" },
        { name: "C1 LV01", description: "Lighting & Power Distribution" },
        { name: "104-C1-LV04", description: "Spray painting & condensat" },
        { name: "MCC Vaccum pump", description: "Vaccum & condensat pump" },
        { name: "DB Mech # 3 non industri", description: "Exhaust TB,FP,Musholla & Sand blast" },
        { name: "DB Mech # 3 non industri - Musholla", description: "" },
        { name: "Curing Line D", description: "Busduct Line D Curing" },
        { name: "Curing Line E", description: "Busduct Line E Curing" },
        { name: "Curing Line F", description: "Busduct Line F Curing" },
        { name: "906-C1-LV01 Non industri", description: "Locker Room" },
        { name: "107-C1-LV01", description: "DB Indoor Test" },
        { name: "DB MCC Curing", description: "AHU Curing" },
        { name: "104-C1-LV01", description: "PMCC/CB/2A AHU" },
        { name: "Lighting External 2", description: "Street Lighting Zone 1" },
        { name: "Incomer Trafo # 2", description: "" },
        { name: "104-C2-LV01", description: "Double Power Curing Line A, B & C" },
        { name: "204-DG2-1", description: "Boiler House" },
        { name: "907-C2-LV01", description: "Entrance A" },
        { name: "NEW SDP Pirelli Warehouse", description: "" },
        { name: "Dinamic Balance machine", description: "DBM & Wrapping" },
        { name: "103- Busduct BTU 1", description: "TBM BTU 1" },
        { name: "103- Busduct BTU 2", description: "TBM BTU 2" },
        { name: "103- Busduct BTU 3", description: "TBM BTU 3" },
        { name: "103- Busduct STU 4", description: "TBM STU 4" },
        { name: "103- Busduct STU 5", description: "TBM STU 5" },
        { name: "103- Busduct STU 6", "description": "TBM STU 6" },
        { name: "DB Mech # 2 Non industri", description: "lighting pju, parkiran,futsal rest area , ac entrance B" },
        { name: "MCC 2 Main Office", description: "AC Main office" },
        { name: "DB- 901-C2-LV01", description: "Lighting & power distribution" },
        { name: "DB - GF 902-C2-LV02", description: "Lighting & Receptacle factory5 Office" },
        { name: "DB- AHU Indoor Test", description: "AC & Heater Indoortest" },
        { name: "ATS MV C", description: "UPS 120 KVA" },
        { name: "Bandina M/C", description: "" }
    ],
    'MV-U': [
        { name: "Incomer Trafo # 1", description: "" },
        { name: "202-U1-LV01", description: "Cooling Tower MCC" },
        { name: "U.DG1.1", description: "" },
        { name: "Water Cooled Chiller No. 1", description: "" },
        { name: "Water Cooled Chiller No. 2", description: "" },
        { name: "Air Compressor No.3", description: "" },
        { name: "Incomer Trafo # 2", description: "" },
        { name: "Air", description: "" },
        { name: "Compressor No.1", description: "" },
        { name: "Air Compressor No.2", description: "" },
        { name: "Water Cooled Chiller No. 3", description: "" },
        { name: "202-U2-LV01", description: "Industrial Water Chiller MCC" },
        { name: "U2-LV01", description: "Lighting & Power Distribution" },
        { name: "WWTP", description: "WWTP area" },
        { name: "GUEST HOUSE Non industri", description: ")" },
        { name: "WTP PUMP", description: "" },
        { name: "ATS 2 MV U", description: "" }
    ],
     'MV-I': [
        { name: "MV-A Trafo 1", description: "Sumber dari MV-A", sourceGroup: "MV-A" },
        { name: "MV-A Trafo 2", description: "Sumber dari MV-A", sourceGroup: "MV-A" },
        { name: "MV-B Trafo 1", description: "Sumber dari MV-B", sourceGroup: "MV-B" },
        { name: "MV-B Trafo 2", description: "Sumber dari MV-B", sourceGroup: "MV-B" },
        { name: "MV-C Trafo 1", description: "Sumber dari MV-C", sourceGroup: "MV-C" },
        { name: "MV-C Trafo 2", description: "Sumber dari MV-C", sourceGroup: "MV-C" },
        { name: "MV-U Trafo 1", description: "Sumber dari MV-U", sourceGroup: "MV-U" },
        { name: "MV-U Trafo 2", description: "Sumber dari MV-U", sourceGroup: "MV-U" },
    ],
};

const getLatestData = (dataArray) => {
    const latestMap = new Map();
    dataArray.forEach(item => {
        const key = `${item.group_mv}_${item.subgroup_mv ?? ''}`;
        const timestamp = item.timestamp ? new Date(item.timestamp).getTime() : 0;
        if (!latestMap.has(key) || timestamp > latestMap.get(key).timestamp) {
            latestMap.set(key, { ...item, timestamp });
        }
    });
    return Array.from(latestMap.values());
};

const ValueDisplay = memo(({ value, unit = '', precision = 2 }) => {
    let displayValue;
    if (typeof value === 'number') {
        displayValue = new Intl.NumberFormat('id-ID', {
            maximumFractionDigits: precision,
        }).format(value);
    } else {
        displayValue = value;
    }
    return <>{`${displayValue}${unit ? ' ' + unit : ''}`}</>;
});

const DetailTableRow = memo(({ meter }) => (
    <tr className="odd:bg-white even:bg-gray-50">
        <td className="p-2 border">
            <div className="font-medium">{meter.time}</div>
            <div className="text-xs text-gray-500 mt-1">{meter.description}</div>
        </td>
        <td className="p-2 border text-center align-middle">
            <ValueDisplay value={meter.value} />
        </td>
        <td className="p-2 border text-center align-middle">
            <ValueDisplay value={meter.reactiveValue} />
        </td>
    </tr>
));

const TransformerDataBox = memo(({ item, label, hasLabel = true }) => {
    const voltage = parseFloat(item?.voltage) || 0;
    const current = parseFloat(item?.current) || 0;
    const kwh = parseFloat(item?.stand_kwh) || 0;
    const boxHeight = hasLabel ? 54 : 36;
    const sectionHeight = 18;
    return (
        <motion.div
            className="absolute overflow-hidden"
            style={{ width: 110, height: boxHeight }}
        >
            {hasLabel && (
                <div className="bg-gray-700 text-white font-bold text-center px-1 z-10 text-[11px] flex items-center justify-center" style={{ height: sectionHeight }}>
                    <span>{label}</span>
                </div>
            )}
            <div className="bg-white text-black text-[10px] font-bold text-center z-10 px-1 flex items-center justify-center" style={{ height: sectionHeight, borderTop: '1px solid #c2c2c2' }}>
                <ValueDisplay value={voltage} unit="V" precision={1} /> / <ValueDisplay value={current} unit="A" precision={1}/>
            </div>
            <div className="bg-white text-black text-[11px] font-bold text-center z-10 flex items-center justify-center" style={{ height: sectionHeight }}>
                <ValueDisplay value={kwh} unit="kWh" precision={1} />
            </div>
        </motion.div>
    );
});


const Realtime2 = ({ onNavigate }) => {
    // State untuk data utama yang di-fetch komponen ini
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State untuk UI dan data detail
    const [currentHeaderDateTime, setCurrentHeaderDateTime] = useState('');
    const [timeframe, setTimeframe] = useState('daily');
    const [selectedMV, setSelectedMV] = useState(null);
    const [detailData, setDetailData] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState(null);

    // Fetch data utama (get_data.php)
    useEffect(() => {
        const controller = new AbortController();
        const fetchData = () => {
            fetch('http://10.130.222.254:8080/get_data.php', { signal: controller.signal })
                .then((res) => {
                    if (!res.ok) throw new Error('Network error fetching main data');
                    return res.json();
                })
                .then((json) => {
                    const filtered = getLatestData(json);
                    const dataMap = {};
                    filtered.forEach(item => {
                        const key = `${item.group_mv}_${item.subgroup_mv ?? ''}`;
                        dataMap[key] = item;
                    });
                    setData(dataMap);
                    setLoading(false);
                })
                .catch(err => {
                    if (err.name !== 'AbortError') {
                        setError(err.message);
                        setLoading(false);
                    }
                });
        };
        fetchData();
        const fetchInterval = setInterval(fetchData, 3000);
        return () => {
            clearInterval(fetchInterval);
            controller.abort();
        };
    }, []);

    const handleMVClick = (groupName) => {
        setSelectedMV(current => (current === groupName ? null : groupName));
    };
    
    // Fetch data detail saat MV group dipilih
    useEffect(() => {
        if (!selectedMV) {
            setDetailData([]);
            setDetailError(null);
            return;
        }

        const fetchMvIDetailData = async () => {
            setDetailLoading(true);
            setDetailError(null);
            try {
                const url = `http://10.130.222.254:8080/data_chart_consumption.php?endpoint=mv-trafo-monthly&year=${new Date().getFullYear()}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const monthlyData = await res.json();
                const latestMonthData = monthlyData[new Date().getMonth()] || {};

                const transformedData = (powerMeterConfig['MV-I'] || []).map(meterConfig => ({
                    time: meterConfig.name,
                    description: meterConfig.description,
                    value: latestMonthData[meterConfig.name] || 0,
                    reactiveValue: 'N/A',
                }));
                setDetailData(transformedData);
            } catch (err) {
                setDetailError("Gagal memuat data bulanan.");
                setDetailData((powerMeterConfig['MV-I'] || []).map(m => ({ ...m, value: 'N/A', reactiveValue: 'N/A' })));
            } finally {
                setDetailLoading(false);
            }
        };

        const fetchDetailData = async () => {
            setDetailLoading(true);
            setDetailError(null);
            try {
                const url = `http://10.130.222.254:8080/data_chart_consumption.php?endpoint=mv-detail&group=${encodeURIComponent(selectedMV)}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const jsonData = await res.json();
                const descriptionMap = new Map((powerMeterConfig[selectedMV] || []).map(m => [m.name, m.description]));
                setDetailData(jsonData.map(item => ({ ...item, description: descriptionMap.get(item.time) || '' })));
            } catch (err) {
                setDetailError("Gagal memuat data live.");
                setDetailData((powerMeterConfig[selectedMV] || []).map(m => ({ ...m, value: 'N/A', reactiveValue: 'N/A' })));
            } finally {
                setDetailLoading(false);
            }
        };
        
        let fetchInterval;
        if (selectedMV === 'MV-I') {
            fetchMvIDetailData();
        } else {
            fetchDetailData();
            fetchInterval = setInterval(fetchDetailData, 5000); 
        }

        return () => clearInterval(fetchInterval);
    }, [selectedMV]);

    const mvGroupConfigurations = [
        { groupName: "MV-A", top: 60, left: 145, groupWidth: 220, groupHeight: 136, detailWidth: 550, detailHeight: 400, detailTop: 60, detailLeft: 380, transformers: [ { displayLabel: "OUT TR-1", dataSubgroupKey: "MV-A Trafo 1", row: 0, col: 0 }, { displayLabel: "OUT TR-2", dataSubgroupKey: "MV-A Trafo 2", row: 0, col: 1 }, { displayLabel: "OUT TR-3", dataSubgroupKey: "MV-A Trafo 3", row: 1, col: 0 }, { displayLabel: "OUT TR-4", dataSubgroupKey: "MV-A Trafo 4", row: 1, col: 1 } ] },
        { groupName: "MV-B", top: 60, left: 395, groupWidth: 220, groupHeight: 136, detailWidth: 550, detailHeight: 400, detailTop: 60, detailLeft: 630, transformers: [ { displayLabel: "OUT TR-1", dataSubgroupKey: "MV-B Trafo 1", row: 0, col: 0 }, { displayLabel: "OUT TR-2", dataSubgroupKey: "MV-B Trafo 2", row: 0, col: 1 }, { displayLabel: "OUT TR-3", dataSubgroupKey: "MV-B Trafo 3", row: 1, col: 0 }, { displayLabel: "OUT TR-4", dataSubgroupKey: "MV-B Trafo 4", row: 1, col: 1 } ] },
        { groupName: "MV-I", top: 62, left: 940, groupWidth: 110, groupHeight: 66, detailWidth: 550, detailHeight: 400, detailTop: 62, detailLeft: 375, isSingleBox: true, transformers: [] },
        { groupName: "MV-C", top: 60, left: 640, groupWidth: 220, groupHeight: 84, detailWidth: 550, detailHeight: 400, detailTop: 60, detailLeft: 80, transformers: [ { displayLabel: "OUT TR-1", dataSubgroupKey: "MV-C Trafo 1", row: 0, col: 0 }, { displayLabel: "OUT TR-2", dataSubgroupKey: "MV-C Trafo 2", row: 0, col: 1 } ] },
        { groupName: "MV-U", top: 445, left: 305, groupWidth: 220, groupHeight: 84, detailWidth: 550, detailHeight: 400, detailTop: 130, detailLeft: 540, transformers: [ { displayLabel: "OUT TR-1", dataSubgroupKey: "MV-U Trafo 1", row: 0, col: 0 }, { displayLabel: "OUT TR-2", dataSubgroupKey: "MV-U Trafo 2", row: 0, col: 1 } ] }
    ];

    const formatHeaderDateTime = (date) => {
        const optionsDate = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
        const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Jakarta' };
        return `${date.toLocaleDateString('en-GB', optionsDate)} ${date.toLocaleTimeString('en-GB', optionsTime)} GMT+7`;
    };
    
    useEffect(() => {
        const clockInterval = setInterval(() => setCurrentHeaderDateTime(formatHeaderDateTime(new Date())), 1000);
        return () => clearInterval(clockInterval);
    }, []);

    const findData = useCallback((group, dataSubgroupKey) => {
        return data[`${group}_${dataSubgroupKey ?? ''}`];
    }, [data]);
    
    const renderDetailContent = (mvGroup) => {
        const handleGraphicClick = () => {
            if (onNavigate) {
                onNavigate(`graphic-${mvGroup}`);
            }
        };

        const renderTableContent = () => {
            if (detailLoading && detailData.length === 0) return <tr><td colSpan="3" className="text-center p-4">Loading details...</td></tr>;
            if (!detailData || detailData.length === 0) return <tr><td colSpan="3" className="text-center p-4">No power meter data available.</td></tr>;
            return detailData.map((meter) => <DetailTableRow key={meter.time} meter={meter} />);
        };

        return (
            <>
                <div className="relative flex items-center justify-between p-3 border-b bg-white flex-shrink-0">
                    <button onClick={handleGraphicClick} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded text-sm">Graphic</button>
                    <h3 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold">Detail Power Meter {mvGroup}</h3>
                </div>
                {detailError && <div className="p-2 bg-red-100 text-red-700 text-center text-sm">{detailError}</div>}
                <div className="overflow-y-auto flex-grow">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="sticky top-0 bg-gray-200 z-10">
                            <tr>
                                <th className="p-2 border">Power Meter</th>
                                <th className="p-2 border text-center">{mvGroup === 'MV-I' ? 'Monthly Consumption (kWh)' : 'Active Energy (kWh)'}</th>
                                <th className="p-2 border text-center">Reactive Energy (kVARh)</th>
                            </tr>
                        </thead>
                        <tbody>{renderTableContent()}</tbody>
                    </table>
                </div>
            </>
        );
    };

    const renderLine = (x1, y1, x2, y2) => (
        <svg className="absolute z-0 pointer-events-none" style={{ left: 0, top: 0, width: '100%', height: '100%' }}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth="2" markerEnd="url(#circle-arrow-outline)" />
            <circle cx={x1} cy={y1} r="5" fill="#1F497D" stroke="white" strokeWidth="2" />
            <defs><marker id="circle-arrow-outline" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto"><circle cx="5" cy="5" r="4" fill="white" /><circle cx="5" cy="5" r="3" fill="#1F497D" /></marker></defs>
        </svg>
    );

    const renderMVGroupContainer = ({ groupName, transformers, top, left, groupWidth, groupHeight, isSingleBox = false }) => (
        <div key={groupName} className={`absolute overflow-hidden cursor-pointer ${selectedMV === groupName ? 'z-20' : 'z-10'}`} style={{ top, left, width: groupWidth, height: groupHeight, border: '1px solid #1F497D', borderRadius: '8px' }} onClick={() => handleMVClick(groupName)}>
            <motion.div className="absolute bg-blue-800 text-white font-bold text-center p-1" style={{ top: 0, left: 0, width: '100%', height: 30, borderRadius: '7px 7px 0 0' }} whileHover={{ scale: 1.02 }}>
                <div className="w-full h-full flex items-center justify-center text-sm">{groupName}</div>
            </motion.div>
            <div className="relative" style={{top: 30}}>
                {isSingleBox ? ( <TransformerDataBox item={findData(groupName, "")} hasLabel={false} /> ) : (
                    transformers.map((transformer) => (
                        <div key={transformer.dataSubgroupKey} style={{ position: 'absolute', top: transformer.row * 52, left: transformer.col * 110 }}>
                            <TransformerDataBox item={findData(groupName, transformer.dataSubgroupKey)} label={transformer.displayLabel} hasLabel={true} />
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <motion.div className="border-4 border-gray-400 h-[757px] flex flex-col" style={{ minWidth: '1200px' }}>
            {/* Header */}
            <div className="flex items-center bg-gray-400 px-4 py-2 h-12">
                <div className="flex-1 text-center"><span className="text-[40px] font-bold text-white">MONITORING ELECTRICAL POWER</span></div>
                <div className="flex items-right justify-between">
                    <Select value={timeframe} onValueChange={setTimeframe}>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Select timeframe" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                    </Select></div>
            </div>

            {/* Main Content */}
            <div className="relative w-full flex-grow overflow-hidden">
                <img src={factory5} alt="factory5 Layout" className="absolute w-full h-full object-contain" />
                {mvGroupConfigurations.map((config) => (selectedMV === null || config.groupName === selectedMV) && renderMVGroupContainer(config))}
                {selectedMV === null && <div className="absolute bg-blue-800 text-white text-sm text-center font-bold flex items-center justify-center p-1 border border-blue-800 rounded-lg" style={{ top: 300, left: 1035, width: 100, height: 50, zIndex: 10 }}>20kv Grid Incomer PLN</div>}
                {selectedMV && (() => {
                    const config = mvGroupConfigurations.find(c => c.groupName === selectedMV);
                    if (!config) return null;
                    return <div key="empty-box" className="absolute bg-white border-2 border-gray-500 rounded-lg flex flex-col overflow-hidden" style={{ top: config.detailTop ?? config.top, left: config.detailLeft ?? 0, width: config.detailWidth || 300, height: config.detailHeight || config.groupHeight, zIndex: 30 }}>{renderDetailContent(selectedMV)}</div>;
                })()}
                
                {/* Lines */}
                {selectedMV === null && <svg className="absolute z-0 pointer-events-none" style={{ left: 0, top: 0, width: '100%', height: '100%' }}><polyline points="78,80 970,80 970,460 80,460 80,80" stroke="#b91c1c" strokeWidth="4" fill="none" /><polyline points="1130,330 1180,330 1180,80 1000,80" stroke="#b91c1c" strokeWidth="4" fill="none" /></svg>}
                {selectedMV === null && (() => {
                    const getCenter = (cfg) => ({ x: cfg.left + (cfg.groupWidth / 2), y: cfg.top + cfg.groupHeight });
                    const plnBox = { left: 985, top: 300, width: 200, height: 30 };
                    const centers = Object.fromEntries(mvGroupConfigurations.map(c => [c.groupName, getCenter(c)]));
                    const plnCenter = { x: plnBox.left + (plnBox.width/2), y: plnBox.top };
                    return (
                        <>
                            {renderLine(centers['MV-A'].x, centers['MV-A'].y, centers['MV-A'].x + 165, centers['MV-A'].y + 150)}
                            {renderLine(centers['MV-B'].x, centers['MV-B'].y, centers['MV-B'].x + 30, centers['MV-B'].y + 70)}
                            {renderLine(centers['MV-I'].x, centers['MV-I'].y, centers['MV-I'].x, centers['MV-I'].y + 90)}
                            {renderLine(centers['MV-C'].x, centers['MV-C'].y, centers['MV-C'].x - 10, centers['MV-C'].y + 125)}
                            {renderLine(centers['MV-U'].x, centers['MV-U'].y - 52, centers['MV-U'].x, centers['MV-U'].y - 92)}
                            {renderLine(plnCenter.x, plnCenter.y, plnCenter.x, plnCenter.y - 70)}
                        </>
                    );
                })()}

                {loading && <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xl bg-white bg-opacity-70 px-4 py-2 rounded">Loading data...</p>}
                {error && <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xl text-red-600 bg-white bg-opacity-70 px-4 py-2 rounded">Error: {error}</p>}
            </div>
            
            {/* Footer */}
            <div className="bg-gray-400 h-10 flex items-center px-8 text-2xl font-bold">
                <div className="flex-1 flex items-center space-x-4 h-full"><img src={pirelli} alt="Pirelli Logo" className="h-full py-2" /><img src={EvotyLogo2} alt="Evoluzione Tyres Logo" className="h-full py-2" /><img src={astra} alt="ASTRA Otoparts Logo" className="h-full py-2" /></div>
                <div className="flex-1 text-center"><span className="text-white">SUBANG PLANT</span></div>
                <div className="flex-1 text-right"><span className="text-sm font-semibold text-white">{currentHeaderDateTime}</span></div>
            </div>
        </motion.div>
    );
};

export default Realtime2;