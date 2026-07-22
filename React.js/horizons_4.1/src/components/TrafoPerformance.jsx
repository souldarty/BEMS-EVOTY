import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrafoData } from '@/services/apiService';
import ReactFlow, { 
    Background, 
    Controls, 
    useNodesState, 
    useEdgesState, 
    Handle, 
    Position,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

import astra from "@/img/astra.svg";
import pirelli from "@/img/pirelli.svg";

// --- Konfigurasi Status Modern ---
const statusConfig = {
    On: { bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-400', border: 'border-emerald-500/50', text: 'ON' },     
    Off: { bgColor: 'bg-red-500/20', textColor: 'text-red-400', border: 'border-red-500/50', text: 'OFF' },    
    Trip: { bgColor: 'bg-blue-500/20', textColor: 'text-blue-400', border: 'border-blue-500/50', text: 'TRIP' },  
    Default: { bgColor: 'bg-slate-500/20', textColor: 'text-slate-400', border: 'border-slate-500/50', text: 'N/A' } 
};

// --- Komponen Icon Minimalis ---
const TrafoIcon = ({ isOff }) => (
    <svg className={`w-10 h-10 mb-1 transition-colors duration-300 ${isOff ? 'text-red-500' : 'text-emerald-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 9a3 3 0 100-6 3 3 0 000 6zM16 9a3 3 0 100-6 3 3 0 000 6zM8 21a3 3 0 100-6 3 3 0 000 6zM16 21a3 3 0 100-6 3 3 0 000 6z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 9v6M16 9v6M12 12h-4M16 12h-4" />
    </svg>
);

const SwitchIcon = ({ isOff }) => (
    <svg className={`w-7 h-7 mb-1 transition-colors duration-300 ${isOff ? 'text-red-500' : 'text-emerald-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {isOff ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h4l4-4 4 4h2M13 12v8" />
        ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 12v8" />
        )}
    </svg>
);

// --- Custom Nodes React Flow ---

const SupplyNode = ({ data }) => (
    <div className="flex flex-col items-center justify-center">
        <div className="text-slate-100 text-[14px] font-black tracking-widest mb-1 bg-slate-800 px-6 py-2 rounded-lg border border-slate-600 shadow-xl">
            {data.label}
        </div>
        <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-red-600 !border-2 !border-slate-900" />
    </div>
);

const SwitchNode = ({ data }) => {
    const { switchId, statusText, status, power, isOff } = data;
    const currentStatus = statusConfig[status] || statusConfig.Default;
    return (
        <div className="bg-slate-800/95 border border-slate-600 rounded-xl p-2.5 flex flex-col items-center min-w-[120px] shadow-2xl backdrop-blur-md transition-all hover:border-blue-500">
            <Handle type="target" position={Position.Top} className="!opacity-0" />
            <SwitchIcon isOff={isOff} />
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wide leading-tight h-5 flex items-center justify-center">{switchId}</div>
            <div className="text-slate-100 text-[12px] font-bold mb-1.5">{statusText}</div>
            <div className={`px-3 py-0.5 rounded text-[10px] font-bold border ${currentStatus.bgColor} ${currentStatus.textColor} ${currentStatus.border}`}>
                {currentStatus.text}
            </div>
            {power && <div className="mt-2 text-amber-400 text-[11px] font-mono font-bold bg-slate-900 px-2 py-0.5 rounded border border-amber-500/20 shadow-inner">{power}</div>}
            <Handle type="source" position={Position.Bottom} className="!opacity-0" />
        </div>
    );
};

const TransformerNode = ({ data }) => {
    const { trId, busName, status, power, isOff } = data;
    const currentStatus = statusConfig[status] || statusConfig.Default;
    return (
        <div className="bg-slate-800/95 border border-slate-600 rounded-2xl p-3 flex flex-col items-center w-[145px] shadow-2xl backdrop-blur-md transition-all hover:border-blue-500">
            <Handle type="target" position={Position.Top} className="!opacity-0" />
            <TrafoIcon isOff={isOff} />
            <div className="text-slate-100 text-lg font-black">{trId}</div>
            <div className={`px-4 py-0.5 rounded-full text-[10px] font-black tracking-widest border mb-2 shadow-sm ${currentStatus.bgColor} ${currentStatus.textColor} ${currentStatus.border}`}>
                {currentStatus.text}
            </div>
            <div className="w-full bg-slate-900 border border-amber-500/30 rounded-lg py-1.5 flex justify-center mb-1 shadow-inner">
                <span className="text-amber-400 text-xs font-mono font-bold tracking-wider">{power}</span>
            </div>
            <div className="text-slate-400 text-[10px] font-bold text-center uppercase tracking-tighter leading-tight h-5 flex items-center justify-center">
                {busName}
            </div>
        </div>
    );
};

const SectionNode = ({ data }) => (
    <div style={{ width: data.width, height: data.height }} className="bg-slate-800/10 border-2 border-dashed border-slate-700/50 rounded-[2rem] p-4 relative pointer-events-none transition-all duration-300">
        <div className="absolute -top-3 left-8 bg-slate-950 px-4 py-0.5 text-slate-500 font-black tracking-[0.2em] text-sm rounded-full border border-slate-800 shadow-sm transition-all duration-300">
            {data.label}
        </div>
    </div>
);

// --- TATA LETAK & KOORDINAT PRESISI YANG BENAR-BENAR SIMETRIS ---
const edgeOptions = {
    type: 'step',
    style: { stroke: '#ef4444', strokeWidth: 3 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444', width: 20, height: 20 },
};

const initialNodes = [
    // --- TOP SUPPLY & INCOMER (Presisi Tengah) ---
    { id: 'pln-supply', type: 'supply', position: { x: 740, y: 0 }, data: { label: '20 KV PLN SUPPLY' } },
    { id: 'grid-incomer', type: 'switch', position: { x: 742, y: 80 }, data: { apiId: 'GRID-INCOMER', switchId: 'GRID', statusText: 'INCOMER', power: '0 kWh', status: 'On' } },

    // --- SECTION MV-I (Center Presisi) ---
    { id: 'g-mv-i', type: 'section', position: { x: 620, y: 220 }, data: { label: 'MV-I', width: 360, height: 180 }, zIndex: -1, draggable: false },
    { id: 'mv-i-loop-u', type: 'switch', position: { x: 650, y: 255 }, data: { switchId: 'LOOP', statusText: 'MV-U', status: 'On' } },
    { id: 'mv-i-loop-c', type: 'switch', position: { x: 835, y: 255 }, data: { switchId: 'LOOP', statusText: 'MV-C', status: 'On' } },

    // --- SECTION MV-U (Left Presisi) ---
    { id: 'g-mv-u', type: 'section', position: { x: 50, y: 440 }, data: { label: 'MV-U', width: 520, height: 280 }, zIndex: -1, draggable: false },
    // Nodes in MV-U box: Pusat x = 300. Jarak presisi antar node.
    { id: 'mv-u-loop-i', type: 'switch', position: { x: 420, y: 500 }, data: { switchId: 'LOOP', statusText: 'MV-I', status: 'On' } },
    { id: 'tr1-utility', type: 'transformer', position: { x: 245, y: 485 }, data: { apiId: 'TR#1-Utility Bus A', trId: 'TR#1', busName: 'Utility Bus A', power: '0 kWh', status: 'Off' } },
    { id: 'tr2-utility', type: 'transformer', position: { x: 80, y: 485 }, data: { apiId: 'TR#2-Utility Bus B', trId: 'TR#2', busName: 'Utility Bus B', power: '0 kWh', status: 'Off' } },
    { id: 'mv-u-loop-a', type: 'switch', position: { x: -100, y: 500 }, data: { switchId: 'LOOP', statusText: 'MV-A', status: 'On' } },

    // --- SECTION MV-C (Right Presisi) ---
    { id: 'g-mv-c', type: 'section', position: { x: 1030, y: 440 }, data: { label: 'MV-C', width: 520, height: 280 }, zIndex: -1, draggable: false },
    // Nodes in MV-C box: Pusat x = 1290. Jarak presisi antar node.
    { id: 'mv-c-loop-i', type: 'switch', position: { x: 1060, y: 500 }, data: { switchId: 'LOOP', statusText: 'MV-I', status: 'On' } },
    { id: 'tr1-curing', type: 'transformer', position: { x: 1210, y: 485 }, data: { apiId: 'TR#1-Curing Bus A', trId: 'TR#1', busName: 'Curing Bus A', power: '0 kWh', status: 'Off' } },
    { id: 'tr2-curing', type: 'transformer', position: { x: 1375, y: 485 }, data: { apiId: 'TR#2-Curing Bus B', trId: 'TR#2', busName: 'Curing Bus B', power: '0 kWh', status: 'Off' } },
    { id: 'mv-c-loop-b', type: 'switch', position: { x: 1560, y: 500 }, data: { switchId: 'LOOP', statusText: 'MV-B', status: 'On' } },

    // --- SECTION MV-A (Bottom Left Presisi) ---
    { id: 'g-mv-a', type: 'section', position: { x: 50, y: 760 }, data: { label: 'MV-A', width: 710, height: 300 }, zIndex: -1, draggable: false },
    // Nodes in MV-A box: Pusat x = 400. Jarak presisi antar node.
    { id: 'mv-a-loop-u', type: 'switch', position: { x: 80, y: 820 }, data: { switchId: 'LOOP', statusText: 'MV-U', status: 'On' } },
    { id: 'tr1-mixing', type: 'transformer', position: { x: 230, y: 805 }, data: { apiId: 'TR#1-Mixing Bus A', trId: 'TR#1', busName: 'Mixing Bus A', power: '0 kWh', status: 'Off' } },
    { id: 'tr2-mixing', type: 'transformer', position: { x: 395, y: 805 }, data: { apiId: 'TR#2-Mixing Bus B', trId: 'TR#2', busName: 'Mixing Bus B', power: '0 kWh', status: 'Off' } },
    { id: 'tr3-mixing', type: 'transformer', position: { x: 560, y: 805 }, data: { apiId: 'TR#3-Mixing Bus C', trId: 'TR#3', busName: 'Mixing Bus C', power: '0 kWh', status: 'Off' } },
    { id: 'mv-a-loop-b', type: 'switch', position: { x: 720, y: 820 }, data: { switchId: 'LOOP', statusText: 'MV-B', status: 'On' } },

    // --- SECTION MV-B (Bottom Right Presisi) ---
    { id: 'g-mv-b', type: 'section', position: { x: 840, y: 760 }, data: { label: 'MV-B', width: 710, height: 300 }, zIndex: -1, draggable: false },
    // Nodes in MV-B box: Pusat x = 1190. Jarak presisi antar node.
    { id: 'mv-b-loop-a', type: 'switch', position: { x: 860, y: 820 }, data: { switchId: 'LOOP', statusText: 'MV-A', status: 'On' } },
    { id: 'tr1-building', type: 'transformer', position: { x: 1010, y: 805 }, data: { apiId: 'TR#1-Building Bus A', trId: 'TR#1', busName: 'Building Bus A', power: '0 kWh', status: 'Off' } },
    { id: 'tr2-building', type: 'transformer', position: { x: 1175, y: 805 }, data: { apiId: 'TR#2-Building Bus B', trId: 'TR#2', busName: 'Building Bus B', power: '0 kWh', status: 'Off' } },
    { id: 'tr3-building', type: 'transformer', position: { x: 1340, y: 805 }, data: { apiId: 'TR#3-Building Bus C', trId: 'TR#3', busName: 'Building Bus C', power: '0 kWh', status: 'Off' } },
    { id: 'mv-b-loop-c', type: 'switch', position: { x: 1520, y: 820 }, data: { switchId: 'LOOP', statusText: 'MV-C', status: 'On' } },
];

const initialEdges = [
    { id: 'e-pln-grid', source: 'pln-supply', target: 'grid-incomer', ...edgeOptions },
    { id: 'e-grid-u', source: 'grid-incomer', target: 'mv-i-loop-u', ...edgeOptions },
    { id: 'e-grid-c', source: 'grid-incomer', target: 'mv-i-loop-c', ...edgeOptions },
    { id: 'e-iu', source: 'mv-i-loop-u', target: 'mv-u-loop-i', ...edgeOptions },
    { id: 'e-ic', source: 'mv-i-loop-c', target: 'mv-c-loop-i', ...edgeOptions },
    { id: 'e-ua', source: 'mv-u-loop-a', target: 'mv-a-loop-u', ...edgeOptions },
    { id: 'e-cb', source: 'mv-c-loop-b', target: 'mv-b-loop-c', ...edgeOptions },
    { id: 'e-ab', source: 'mv-a-loop-b', target: 'mv-b-loop-a', ...edgeOptions },
    { id: 'eu1', source: 'mv-u-loop-i', target: 'tr1-utility', ...edgeOptions },
    { id: 'eu2', source: 'mv-u-loop-i', target: 'tr2-utility', ...edgeOptions },
    { id: 'eu3', source: 'mv-u-loop-i', target: 'mv-u-loop-a', ...edgeOptions },
    { id: 'ec1', source: 'mv-c-loop-i', target: 'tr1-curing', ...edgeOptions },
    { id: 'ec2', source: 'mv-c-loop-i', target: 'tr2-curing', ...edgeOptions },
    { id: 'ec3', source: 'mv-c-loop-i', target: 'mv-c-loop-b', ...edgeOptions },
    { id: 'ea1', source: 'mv-a-loop-u', target: 'tr1-mixing', ...edgeOptions },
    { id: 'ea2', source: 'mv-a-loop-u', target: 'tr2-mixing', ...edgeOptions },
    { id: 'ea3', source: 'mv-a-loop-u', target: 'tr3-mixing', ...edgeOptions },
    { id: 'ea4', source: 'mv-a-loop-u', target: 'mv-a-loop-b', ...edgeOptions },
    { id: 'eb1', source: 'mv-b-loop-a', target: 'tr1-building', ...edgeOptions },
    { id: 'eb2', source: 'mv-b-loop-a', target: 'tr2-building', ...edgeOptions },
    { id: 'eb3', source: 'mv-b-loop-a', target: 'tr3-building', ...edgeOptions },
    { id: 'eb4', source: 'mv-b-loop-a', target: 'mv-b-loop-c', ...edgeOptions },
];

const InfoModal = ({ data, onClose }) => {
    const navigate = useNavigate();
    if (!data) return null;
    const handleHistoryClick = () => { if (data.title) navigate(`/graphic/${encodeURIComponent(data.title)}`); };
    const DataRowInTable = ({ label, value }) => (
        <>
            <td className="py-2 text-slate-400 text-xs font-medium">{label}</td>
            <td className="py-2 font-mono text-slate-100 text-xs text-right tracking-tight">{value}</td>
        </>
    );
    const dataPairs = [
        [{ label: 'Voltage', value: data.voltage }, { label: 'Active Power', value: data.activePower }],
        [{ label: 'Current', value: data.current }, { label: 'Reactive Power', value: data.reactivePower }],
        [{ label: 'Frequency', value: data.frequency }, { label: 'Apparent Power', value: data.apparentPower }],
        [{ label: 'THDv L1_AVG', value: data.thdvL1 }, { label: 'THDi L1_AVG', value: data.thdiL1 }],
        [{ label: 'THDv L2_AVG', value: data.thdvL2 }, { label: 'THDi L2_AVG', value: data.thdiL2 }],
        [{ label: 'THDv L3_AVG', value: data.thdvL3 }, { label: 'THDi L3_AVG', value: data.thdiL3 }],
    ];

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300" onClick={onClose}>
            <div className="bg-slate-900 text-slate-200 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.6)] w-full max-w-2xl overflow-hidden border border-slate-700 transition-all duration-300 shadow-inner" onClick={(e) => e.stopPropagation()}>
                <div className="bg-slate-800/80 p-5 border-b border-slate-700 flex justify-between items-center shadow-md">
                    <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tighter">
                        <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>{data.title}
                    </h2>
                    <button className="bg-blue-600/20 text-blue-400 border border-blue-500/50 font-black py-1.5 px-6 rounded-xl hover:bg-blue-600 hover:text-white transition-all duration-300 shadow-sm" onClick={handleHistoryClick}>History</button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 flex items-center justify-center h-40 shadow-inner"><span className="text-slate-600 font-black tracking-widest uppercase text-sm">Visual Preview</span></div>
                        <div className="flex flex-col justify-between space-y-4">
                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 shadow-inner">
                                <table className="w-full">
                                    <tbody className="divide-y divide-slate-700/50">
                                        <tr><DataRowInTable label="Active Energy" value={data.activeEnergy} /></tr>
                                        <tr><DataRowInTable label="Reactive Energy" value={data.reactiveEnergy} /></tr>
                                        <tr><DataRowInTable label="Power Factor" value={data.powerFactor} /></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className={`px-4 py-2 rounded-xl text-center text-xs font-black border uppercase tracking-widest shadow-inner ${data.status === 'On' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>{data.status}</div>
                        </div>
                    </div>
                    <div className="bg-slate-800/30 rounded-2xl border border-slate-700 p-4 shadow-inner">
                        <table className="w-full text-xs table-fixed">
                            <tbody className="divide-y divide-slate-700/50">
                                {dataPairs.map(([d1, d2], index) => (
                                    <tr key={index}><td className="py-2 text-slate-400 font-medium tracking-tight h-10 flex items-center">{d1.label}</td><td className="py-2 font-mono text-slate-200 tracking-tight">{d1.value}</td><td className="py-2 text-slate-400 font-medium pl-6 border-l border-slate-700/50 tracking-tight h-10 flex items-center">{d2.label}</td><td className="py-2 font-mono text-slate-200 tracking-tight">{d2.value}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GraphicContent = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [modalData, setModalData] = useState(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const nodeTypes = useMemo(() => ({ supply: SupplyNode, switch: SwitchNode, transformer: TransformerNode, section: SectionNode }), []);

    const componentApiMap = {
        'GRID-INCOMER': 'MV-I', 'TR#1-Utility Bus A': 'MV-U Trafo 1', 'TR#2-Utility Bus B': 'MV-U Trafo 2',
        'TR#1-Curing Bus A': 'MV-C Trafo 1', 'TR#2-Curing Bus B': 'MV-C Trafo 2', 'TR#1-Mixing Bus A': 'MV-A Trafo 1',
        'TR#2-Mixing Bus B': 'MV-A Trafo 2', 'TR#3-Mixing Bus C': 'MV-A Trafo 3', 'TR#4-Mixing Bus D': 'MV-A Trafo 4',
        'TR#1-Building Bus A': 'MV-B Trafo 1', 'TR#2-Building Bus B': 'MV-B Trafo 2', 'TR#3-Building Bus C': 'MV-B Trafo 3', 'TR#4-Building Bus D': 'MV-B Trafo 4',
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getTrafoData();
                setNodes((nds) => nds.map((node) => {
                    if (node.data.apiId) {
                        const rawKey = componentApiMap[node.data.apiId];
                        const rawData = data[rawKey] || { status: 'Off', activeEnergyKwh: 0, title: node.data.apiId };
                        return { ...node, data: { ...node.data, status: rawData.status, isOff: rawData.status === 'Off' || rawData.status === 'Trip', power: `${(rawData.activeEnergyKwh || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })} kWh`, rawData: rawData } };
                    }
                    return node;
                }));
            } catch (e) { console.error("Fetch Error:", e.message); } finally { setIsLoading(false); }
        };
        fetchData();
        const interval = setInterval(fetchData, 1000);
        return () => clearInterval(interval);
    }, [setNodes]);

    const onNodeClick = useCallback((e, node) => { if (node.data.apiId && node.data.rawData) {
        const d = node.data.rawData;
        const formatNum = (num) => (typeof num === 'number' ? num : 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });
        const formatPower = (num) => (typeof num === 'number' ? num : 0).toFixed(2);
        const formatPerc = (num) => (typeof num === 'number' ? num : 0).toFixed(2);
        setModalData({ title: d.title || 'N/A', status: d.status || 'N/A', activeEnergy: `${formatNum(d.activeEnergyKwh)} kWh`, reactiveEnergy: `${formatNum(d.reactiveEnergyKvarh)} kVARh`, powerFactor: formatPower(d.powerFactor), temperature: `${d.temperature || 0} °C`, voltage: `${formatNum(d.voltage)} V`, current: (d.current || 0).toFixed(1) + ' A', frequency: (d.frequency || 0).toFixed(2) + ' Hz', activePower: formatPower(d.activePower) + ' kW', reactivePower: formatPower(d.reactivePower) + ' kVAR', apparentPower: formatPower(d.apparentPower) + ' kVA', thdvL1: formatPerc(d.thd_v_l1) + '%', thdvL2: formatPerc(d.thd_v_l2) + '%', thdvL3: formatPerc(d.thd_v_l3) + '%', thdiL1: formatPerc(d.thd_i_l1) + '%', thdiL2: formatPerc(d.thd_i_l2) + '%', thdiL3: formatPerc(d.thd_i_l3) + '%' });
    }}, []);

    if (isLoading) return <div className="h-[78.4vh] bg-slate-950 flex flex-col items-center justify-center text-blue-400 animate-pulse"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4 shadow-xl"></div>Memuat Data Realtime...</div>;

    return (
        <div className="h-[78.4vh] bg-slate-950 p-4 relative">
            <div className="w-full h-full bg-slate-900/40 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden shadow-inner">
                <ReactFlow 
                    nodes={nodes} 
                    edges={edges} 
                    onNodesChange={onNodesChange} 
                    onEdgesChange={onEdgesChange} 
                    onNodeClick={onNodeClick} 
                    nodeTypes={nodeTypes} 
                    fitView attributionPosition="bottom-right" minZoom={0.1} maxZoom={1.5}
                    // REVISI 1: Matikan zoom dan pan agar tetap di tempatnya.
                    zoomOnScroll={false}
                    zoomOnPinch={false}
                    zoomOnDoubleClick={false}
                    panOnDrag={false}
                >
                    <Background color="#1e293b" gap={24} size={1} />
                    <Controls className="!bg-slate-800 !border-slate-700 !fill-white !rounded-xl overflow-hidden shadow-2xl" />
                </ReactFlow>
            </div>
            <InfoModal data={modalData} onClose={() => setModalData(null)} />
        </div>
    );
};

const TrafoPerformancePage = () => {
    return (
        <div className="h-[93vh] bg-slate-950 flex flex-col font-sans selection:bg-blue-500/30">
            <header className="bg-slate-900 py-5 z-20 border-b border-slate-800 shadow-xl flex justify-center items-center h-20 shadow-[0_10px_20px_rgba(0,0,0,0.3)]">
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 tracking-tight h-10 flex items-center">Trafo Performance Overview</h1>
            </header>
            <main className="flex-grow relative">
                {/* REVISI 3 & 4: Komponen Panduan Floating yang Direvisi */}
                <div className="absolute top-8 left-8 text-slate-400 p-5 bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl z-20 pointer-events-none transition-all duration-300 border-l-4 border-l-blue-500 shadow-inner">
                    <p className="font-black text-slate-100 mb-2.5 flex items-center gap-2 uppercase text-xs tracking-widest h-5">
                        <svg className="w-4.5 h-4.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        DASHBOARD INFO
                    </p>
                    <ul className="text-[10px] space-y-1.5 font-bold opacity-80 h-10">
                        <li className="flex items-center gap-2.5 h-4"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-md"></div> Click Node to See Details</li>
                        {/* Teks panduan zoom dihapus karena fitur dimatikan */}
                    </ul>
                </div>
                <GraphicContent />
            </main>
            <footer className="bg-slate-900 flex justify-between items-center px-10 py-5 z-20 border-t border-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.3)] h-20">
                {/* REVISI FOOTER: Tampilkan logo tanpa pembungkus putih modern */}
                <div className="p-0.5 rounded-xl border border-slate-700/50 h-12 flex items-center justify-center transition-all duration-300">
                    <img src={pirelli} alt="Pirelli" className="h-8 md:h-10 rounded-lg shadow-sm" />
                </div>
                <div className="p-0.5 rounded-xl border border-slate-700/50 h-12 flex items-center justify-center transition-all duration-300">
                    <img src={astra} alt="ASTRA" className="h-8 md:h-10 rounded-lg shadow-sm" />
                </div>
            </footer>
        </div>
    );
};

export default TrafoPerformancePage;