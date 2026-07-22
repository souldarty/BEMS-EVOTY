import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom"; 
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Save, Trash2, Edit, X, AlertTriangle, Lock, Menu } from "lucide-react";
import { getPerformanceEntries, managePerformanceEntry, deletePerformanceEntry, getEnergyData } from "@/services/apiService";

import astra from "@/img/astra.svg";
import pirelli from "@/img/pirelli.svg";

// --- Date Helpers ---
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 7 }, (_, i) => currentYear + 2 - i);
const months = [
    { value: 1, label: 'JAN' }, { value: 2, label: 'FEB' }, { value: 3, label: 'MAR' },
    { value: 4, label: 'APR' }, { value: 5, label: 'MEI' }, { value: 6, label: 'JUN' },
    { value: 7, label: 'JUL' }, { value: 8, label: 'AGU' }, { value: 9, label: 'SEP' },
    { value: 10, label: 'OKT' }, { value: 11, label: 'NOV' }, { value: 12, label: 'DES' }
];
const getMonthLabel = (monthValue) => months.find(m => m.value == monthValue)?.label || '';

const formatDateTime = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()].label;
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `SUBANG, ${day} ${month} ${year} - ${hours}:${minutes} WIB`;
};

// --- Reusable Modal Component (Dark Mode) ---
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/80 backdrop-blur-sm" onClick={onClose}>
                    <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ duration: 0.2 }} className="relative bg-[#1e293b] rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-[#0f172a]/50">
                            <h3 className="text-base font-bold text-white uppercase tracking-wider">{title}</h3>
                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><X className="h-4 w-4" /></Button>
                        </div>
                        <div className="p-6 text-slate-200">{children}</div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// --- GenericInputView Component (Seamless Background & Teks Tegas) ---
const defaultConfig = { ACT: { label: 'ACT ENERGY', placeholder: 'Otomatis' }, MP: { label: 'MP ENERGY', placeholder: 'misal: 5.50' }, FC: { label: 'FC ENERGY', placeholder: 'misal: 5.45' } };

const GenericInputView = ({ title, tableType, entries, fetchEntries, allEnergyData = [], productionEntries = [], fields = ['ACT', 'MP', 'FC'], fieldConfig = defaultConfig, years, months, canModify }) => {
    const { toast } = useToast();
    const isEnergyInput = tableType === 'energy_performance';
    const showFC = fields.includes('FC');
    const showMP = fields.includes('MP');

    const initialNewEntry = { year: new Date().getFullYear(), month: new Date().getMonth() + 1, ACT: "", MP: "", FC: "" };
    const [newEntry, setNewEntry] = useState(initialNewEntry);
    const [displayYear, setDisplayYear] = useState(new Date().getFullYear());
    const [modalState, setModalState] = useState({ type: null, data: null });

    const tableData = useMemo(() => {
        const filteredEntries = entries.filter(e => Number(e.year) === displayYear);
        return months.map(month => ({ ...month, entry: filteredEntries.find(e => Number(e.month) === month.value) }));
    }, [displayYear, entries, months]);

    const calculatedACT = useMemo(() => {
        if (!isEnergyInput || !newEntry.year || !newEntry.month) return "";
        const monthlyEnergy = allEnergyData.monthly?.find(e => Number(e.year) === newEntry.year && Number(e.month) === newEntry.month);
        const productionData = productionEntries.find(p => Number(p.year) === newEntry.year && Number(p.month) === newEntry.month);
        const totalGJ = monthlyEnergy?.totalGJ || 0;
        const prodACT = parseFloat(String(productionData?.ACT || '0').replace(',', '.'));
        if (totalGJ > 0 && prodACT > 0) return (totalGJ / prodACT).toFixed(2);
        return "";
    }, [isEnergyInput, newEntry.year, newEntry.month, allEnergyData, productionEntries]);

    useEffect(() => { if (isEnergyInput) setNewEntry(prev => ({ ...prev, ACT: calculatedACT })); }, [calculatedACT, isEnergyInput]);

    const formatForApi = (value) => { 
        if (value === null || value === undefined || String(value).trim() === '') return '0'; 
        return String(value).replace(/,/g, ''); 
    };

    const handleApiCall = async (method, payload, id = null) => {
        try {
            let result = method === 'DELETE' ? await deletePerformanceEntry(tableType, id) : await managePerformanceEntry(method, tableType, payload, id);
            toast({ title: "Success", description: result.message }); 
            await fetchEntries(); 
            return true;
        } catch (error) { 
            toast({ variant: "destructive", title: "API Error", description: error.message }); 
            return false; 
        }
    };
    
    const openEditModal = (entry) => setModalState({ type: 'edit', data: { ...entry } });
    const openDeleteModal = (entry) => setModalState({ type: 'delete', data: entry });
    const closeModal = () => setModalState({ type: null, data: null });

    const handleAddNewEntry = async (e) => { 
        e.preventDefault(); 
        const payload = { 
            ...newEntry, 
            ACT: formatForApi(newEntry.ACT), 
            MP: formatForApi(showMP ? newEntry.MP : '0'), 
            FC: formatForApi(showFC ? newEntry.FC : '0') 
        }; 
        if (await handleApiCall('POST', payload)) setNewEntry(initialNewEntry); 
    };

    const handleDeleteConfirm = async () => { 
        if (modalState.type === 'delete' && modalState.data?.id) await handleApiCall('DELETE', null, modalState.data.id); 
        closeModal(); 
    };

    const handleUpdateConfirm = async () => { 
        if (modalState.type === 'edit' && modalState.data?.id) { 
            const payload = { 
                id: modalState.data.id,
                year: modalState.data.year,
                month: modalState.data.month,
                ACT: formatForApi(modalState.data.ACT), 
                MP: formatForApi(showMP ? modalState.data.MP : '0'), 
                FC: formatForApi(showFC ? modalState.data.FC : '0') 
            }; 
            await handleApiCall('PUT', payload, modalState.data.id); 
        } 
        closeModal(); 
    };
    
    const formatDisplayNumber = (value) => { if (value === null || value === undefined) return ''; const num = parseFloat(String(value).replace(',', '.')); return isNaN(num) ? '' : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full min-h-0 bg-transparent px-2 mt-2">
            
            {/* REVISI: Mengubah syarat dari isAdministrator menjadi canModify */}
            {canModify ? (
                <div className="flex-none pb-6 border-b border-slate-800">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest mb-5">{title.toUpperCase()}</h2>
                    <form onSubmit={handleAddNewEntry}>
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                            <div><Label className="text-slate-400 mb-1.5 block text-[11px] uppercase tracking-wider font-bold">Year</Label><Select value={String(newEntry.year)} onValueChange={(v) => setNewEntry({ ...newEntry, year: Number(v) })} ><SelectTrigger className="h-10 bg-[#1e293b] border-slate-700 text-white font-semibold"><SelectValue /></SelectTrigger><SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label className="text-slate-400 mb-1.5 block text-[11px] uppercase tracking-wider font-bold">Month</Label><Select value={String(newEntry.month)} onValueChange={(v) => setNewEntry({ ...newEntry, month: Number(v) })} ><SelectTrigger className="h-10 bg-[#1e293b] border-slate-700 text-white font-semibold"><SelectValue /></SelectTrigger><SelectContent>{months.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent></Select></div>
                            
                            <div className="md:col-span-1"><Label className="text-blue-400 font-bold mb-1.5 block text-[11px] uppercase tracking-wider">{fieldConfig.ACT.label}</Label><Input type="text" inputMode="decimal" placeholder={fieldConfig.ACT.placeholder} value={newEntry.ACT} onChange={(e) => !isEnergyInput && setNewEntry({ ...newEntry, ACT: e.target.value })} readOnly={isEnergyInput} required className={`h-10 font-bold ${isEnergyInput ? "bg-slate-800/50 text-slate-500 border-slate-700 cursor-not-allowed" : "bg-[#1e293b] text-white border-slate-700 focus-visible:ring-blue-500"}`} /></div>
                            {showMP && (<div className="md:col-span-1"><Label className="text-amber-400 font-bold mb-1.5 block text-[11px] uppercase tracking-wider">{fieldConfig.MP.label}</Label><Input type="text" inputMode="decimal" placeholder={fieldConfig.MP.placeholder} value={newEntry.MP} onChange={(e) => setNewEntry({ ...newEntry, MP: e.target.value })} className="h-10 bg-[#1e293b] text-white font-bold border-slate-700 focus-visible:ring-amber-500" /></div>)}
                            {showFC && (<div className="md:col-span-1"><Label className="text-emerald-400 font-bold mb-1.5 block text-[11px] uppercase tracking-wider">{fieldConfig.FC.label}</Label><Input type="text" inputMode="decimal" placeholder={fieldConfig.FC.placeholder} value={newEntry.FC} onChange={(e) => setNewEntry({ ...newEntry, FC: e.target.value })} className="h-10 bg-[#1e293b] text-white font-bold border-slate-700 focus-visible:ring-emerald-500" /></div>)}
                            
                            <div className="md:col-span-1"><Button type="submit" className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg"><PlusCircle className="h-4 w-4 mr-2" /> SAVE</Button></div>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="flex-none bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-lg flex items-center mb-4 mt-4">
                    <Lock className="h-5 w-5 mr-3"/><p className="text-sm font-medium">Read-Only Access. Contact Administrator or Coordinator.</p>
                </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden min-h-0 pt-4 pb-2">
                <div className="flex items-center justify-between pb-3 flex-shrink-0">
                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">DATA OVERVIEW</h3>
                    <Select value={String(displayYear)} onValueChange={(v) => setDisplayYear(Number(v))}><SelectTrigger className="w-32 h-9 bg-[#1e293b] border-slate-700 text-white font-semibold rounded-lg"><SelectValue placeholder="Tahun" /></SelectTrigger><SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <table className="w-full text-sm text-center border-collapse">
                        <thead className="bg-[#0f172a] text-slate-400 font-bold uppercase tracking-widest sticky top-0 z-10 border-b border-slate-800">
                            <tr>
                                <th className="px-4 py-4 border-b border-slate-800">Year</th><th className="px-4 py-4 border-b border-slate-800">Month</th>
                                <th className="px-4 py-4 border-b border-slate-800 text-blue-500">{fieldConfig.ACT.label}</th>
                                {showMP && <th className="px-4 py-4 border-b border-slate-800 text-amber-500">{fieldConfig.MP.label}</th>}
                                {showFC && <th className="px-4 py-4 border-b border-slate-800 text-emerald-500">{fieldConfig.FC.label}</th>}
                                {/* REVISI: Action kolom untuk Admin & Coordinator */}
                                {canModify && <th className="px-4 py-4 border-b border-slate-800 text-center">Action</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {tableData.map(({ label, value, entry }) => (
                                <tr key={value} className="hover:bg-slate-800/30 transition-colors">
                                    {entry ? (
                                        <>
                                            <td className="px-4 py-4 text-slate-400 font-semibold">{entry.year}</td>
                                            <td className="px-4 py-4 text-white font-bold">{getMonthLabel(entry.month)}</td>
                                            <td className="px-4 py-4 text-blue-400 font-bold text-base">{formatDisplayNumber(entry.ACT)}</td>
                                            {showMP && <td className="px-4 py-4 text-amber-400 font-bold text-base">{formatDisplayNumber(entry.MP)}</td>}
                                            {showFC && <td className="px-4 py-4 text-emerald-400 font-bold text-base">{formatDisplayNumber(entry.FC)}</td>}
                                            {/* REVISI: Action button untuk Admin & Coordinator */}
                                            {canModify && (
                                                <td className="px-4 py-4 flex justify-center gap-3">
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:bg-slate-700 hover:text-blue-400 rounded-full" onClick={() => openEditModal(entry)}><Edit className="h-4 w-4" /></Button>
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 rounded-full" onClick={() => openDeleteModal(entry)}><Trash2 className="h-4 w-4" /></Button>
                                                </td>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-4 py-4 text-slate-600 font-medium">{displayYear}</td><td className="px-4 py-4 text-slate-500 font-medium">{label}</td>
                                            <td colSpan={canModify ? fields.length + 2 : fields.length + 1} className="text-center py-4 text-slate-600 text-sm italic font-medium">No data</td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* REVISI: Modal Edit & Hapus juga dikontrol oleh canModify */}
            {canModify && (
                <Modal isOpen={modalState.type !== null} onClose={closeModal} title={modalState.type === 'edit' ? 'Edit Data' : 'Konfirmasi Hapus'}>
                    {modalState.type === 'edit' && modalState.data && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label className="mb-1.5 block text-slate-400 text-xs tracking-wider font-bold">YEAR</Label><Select value={String(modalState.data.year)} onValueChange={(v) => setModalState(prev => ({...prev, data: {...prev.data, year: Number(v)}}))}><SelectTrigger className="bg-[#0f172a] border-slate-700 text-white font-semibold h-10"><SelectValue /></SelectTrigger><SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
                                <div><Label className="mb-1.5 block text-slate-400 text-xs tracking-wider font-bold">MONTH</Label><Select value={String(modalState.data.month)} onValueChange={(v) => setModalState(prev => ({...prev, data: {...prev.data, month: Number(v)}}))}><SelectTrigger className="bg-[#0f172a] border-slate-700 text-white font-semibold h-10"><SelectValue /></SelectTrigger><SelectContent>{months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent></Select></div>
                            </div>
                            <div><Label className="mb-1.5 block text-blue-400 font-bold text-xs tracking-wider">{fieldConfig.ACT.label}</Label><Input type="text" inputMode="decimal" value={modalState.data.ACT ?? ''} onChange={(e) => !isEnergyInput && setModalState(prev => ({...prev, data: {...prev.data, ACT: e.target.value}}))} readOnly={isEnergyInput} className={`bg-[#0f172a] border-slate-700 text-white font-bold h-10 ${isEnergyInput ? "opacity-60 cursor-not-allowed" : ""}`} /></div>
                            {showMP && (<div><Label className="mb-1.5 block text-amber-400 font-bold text-xs tracking-wider">{fieldConfig.MP.label}</Label><Input type="text" inputMode="decimal" value={modalState.data.MP ?? ''} onChange={(e) => setModalState(prev => ({...prev, data: {...prev.data, MP: e.target.value}}))} className="bg-[#0f172a] border-slate-700 text-white font-bold h-10" /></div>)}
                            {showFC && (<div><Label className="mb-1.5 block text-emerald-400 font-bold text-xs tracking-wider">{fieldConfig.FC.label}</Label><Input type="text" inputMode="decimal" value={modalState.data.FC ?? ''} onChange={(e) => setModalState(prev => ({...prev, data: {...prev.data, FC: e.target.value}}))} className="bg-[#0f172a] border-slate-700 text-white font-bold h-10" /></div>)}
                            <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-700"><Button variant="ghost" className="text-slate-400 hover:text-white" onClick={closeModal}>Batal</Button><Button onClick={handleUpdateConfirm} className="bg-blue-600 hover:bg-blue-500 text-white font-bold"><Save className="h-4 w-4 mr-2" /> Simpan</Button></div>
                        </div>
                    )}
                    {modalState.type === 'delete' && (
                        <div>
                            <div className="flex items-center space-x-4 mb-6"><div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/20"><AlertTriangle className="h-6 w-6 text-rose-400" /></div><p className="text-sm font-medium text-slate-300">Yakin menghapus data ini? Aksi ini permanen.</p></div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700"><Button variant="ghost" className="text-slate-400 hover:text-white" onClick={closeModal}>Batal</Button><Button variant="destructive" onClick={handleDeleteConfirm} className="bg-rose-600 hover:bg-rose-500 font-bold"><Trash2 className="h-4 w-4 mr-2" /> Hapus</Button></div>
                        </div>
                    )}
                </Modal>
            )}
        </motion.div>
    );
};

// --- Chart Components ---
const CustomBarLabel = ({ x, y, width, height, value }) => {
  if (!value || value <= 0) return null;
  const formattedValue = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const labelX = x + width / 2;
  const labelY = y + height / 2;
  return (
    <g>
      <rect x={labelX - 22} y={labelY - 12} width={44} height={24} fill="#0f172a" fillOpacity={0.8} stroke="#0ea5e9" strokeWidth={1} rx={4} />
      <text x={labelX} y={labelY} fill="#38bdf8" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="bold" >{formattedValue}</text>
    </g>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const actData = payload.find(p => p.dataKey === 'act');
    const prevYearACTData = payload.find(p => p.dataKey === 'prevYearACT');
    const mpData = payload.find(p => p.dataKey === 'mp');
    const fcData = payload.find(p => p.dataKey === 'fc');
    return (
      <div className="bg-[#1e293b] text-white p-4 border border-slate-700 rounded-xl shadow-2xl text-sm min-w-[180px]">
        <p className="font-bold text-slate-200 mb-2 border-b border-slate-700 pb-2">{label}</p>
        <div className="space-y-2 mt-2">
            {actData && <div className="flex items-center justify-between"><div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-cyan-500 mr-2 shadow-sm"></div><span className="text-slate-300 font-medium">{actData.name}</span></div><span className="font-bold text-cyan-400">{actData.value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>}
            {prevYearACTData && <div className="flex items-center justify-between"><div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-slate-500 mr-2 shadow-sm"></div><span className="text-slate-400 font-medium">{prevYearACTData.name}</span></div><span className="font-semibold text-slate-300">{prevYearACTData.value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>}
            {(mpData || fcData) && <hr className="border-slate-700 my-1.5"/>}
            {mpData && mpData.value > 0 && <div className="flex items-center justify-between"><div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2 shadow-sm"></div><span className="text-slate-300 font-medium">{mpData.name}</span></div><span className="font-bold text-amber-400">{mpData.value.toFixed(2)}</span></div>}
            {fcData && fcData.value > 0 && <div className="flex items-center justify-between"><div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 shadow-sm"></div><span className="text-slate-300 font-medium">{fcData.name}</span></div><span className="font-bold text-emerald-400">{fcData.value.toFixed(2)}</span></div>}
        </div>
      </div>
    );
  }
  return null;
};

const CustomLegend = () => (
    <ul className="flex justify-center pb-2 pt-2">
      <li className="flex items-center mx-4"><div className="w-3 h-3 rounded-full bg-slate-500 mr-2"></div><span className="text-xs font-bold text-slate-400 tracking-wider">ACT (Prev)</span></li>
      <li className="flex items-center mx-4"><div className="w-3 h-3 rounded-full bg-cyan-500 mr-2 shadow-sm"></div><span className="text-xs font-bold text-cyan-400 tracking-wider">ACT</span></li>
      <li className="flex items-center mx-4"><div className="w-3 h-3 rounded-full bg-amber-500 mr-2 shadow-sm"></div><span className="text-xs font-bold text-amber-400 tracking-wider">MP</span></li>
      <li className="flex items-center mx-4"><div className="w-3 h-3 rounded-full bg-emerald-500 mr-2 shadow-sm"></div><span className="text-xs font-bold text-emerald-400 tracking-wider">FC</span></li>
    </ul>
);

const ChartView = ({ chartData, selectedYear }) => (
    <div className="flex-1 flex flex-col min-h-0 pt-2 pb-0">
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: -20 }}>
                <defs>
                    <linearGradient id="colorAct" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.6} />
                <XAxis dataKey="monthLabel" scale="point" padding={{ left: 30, right: 30 }} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} tickLine={false} axisLine={{ stroke: '#475569' }} />
                <YAxis yAxisId="left" orientation="left" tick={{fill: '#94a3b8', fontSize: 12}} tickLine={false} axisLine={{ stroke: '#475569' }} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#1e293b', opacity: 0.5}} />
                <Legend content={<CustomLegend />} verticalAlign="bottom" height={40} />
                
                <Bar yAxisId="left" dataKey="prevYearACT" name={`ACT (${selectedYear - 1})`} fill="#475569" radius={[4, 4, 0, 0]} barSize={26} />
                <Bar yAxisId="left" dataKey="act" name="ACT" fill="url(#colorAct)" radius={[4, 4, 0, 0]} barSize={26}>
                    <LabelList dataKey="act" content={<CustomBarLabel />} />
                </Bar>
                <Line yAxisId="left" type="monotone" dataKey="mp" name="MP" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, strokeWidth: 2, fill: '#0f172a' }} activeDot={{ r: 7, strokeWidth: 0 }} />
                <Line yAxisId="left" type="monotone" dataKey="fc" name="FC" stroke="#10b981" strokeWidth={3} dot={{ r: 5, strokeWidth: 2, fill: '#0f172a' }} activeDot={{ r: 7, strokeWidth: 0 }} />
            </ComposedChart>
        </ResponsiveContainer>
    </div>
);

const DataTableView = ({ chartData, selectedYear }) => {
    if (!chartData || chartData.length === 0) return null;
    const formatCell = (value) => (typeof value !== 'number' || value === 0) ? '0.00' : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (
        <div className="flex-none h-[35%] min-h-[180px] overflow-hidden flex flex-col mb-1 border-t border-slate-800 mt-2">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-xs text-center border-collapse">
                    <thead className="bg-[#0f172a] sticky top-0 z-10 border-b border-slate-700">
                        <tr>
                            <th className="px-3 py-3 border-r border-slate-800 w-28">&nbsp;</th>
                            {chartData.map(item => <th key={item.monthLabel} className="px-2 py-3 border-r border-slate-800 last:border-r-0 font-bold text-slate-500 uppercase tracking-widest">{item.monthLabel}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        <tr className="hover:bg-slate-800/30 transition-colors">
                            <th className="px-3 py-2.5 border-r border-slate-800 text-left bg-slate-800/30 text-slate-400 font-bold">{`ACT ${selectedYear - 1}`}</th>
                            {chartData.map((item, index) => <td key={index} className="px-2 py-2.5 border-r border-slate-800 last:border-r-0 text-slate-400 font-semibold">{formatCell(item.prevYearACT)}</td>)}
                        </tr>
                        <tr className="hover:bg-blue-900/10 transition-colors">
                            <th className="px-3 py-2.5 border-r border-slate-800 text-left bg-blue-900/20 text-blue-400 font-bold">ACT</th>
                            {chartData.map((item, index) => <td key={index} className="px-2 py-2.5 border-r border-slate-800 last:border-r-0 text-cyan-400 font-bold text-sm">{formatCell(item.act)}</td>)}
                        </tr>
                        <tr className="hover:bg-amber-900/10 transition-colors">
                            <th className="px-3 py-2.5 border-r border-slate-800 text-left bg-amber-900/20 text-amber-500 font-bold">MP</th>
                            {chartData.map((item, index) => <td key={index} className="px-2 py-2.5 border-r border-slate-800 last:border-r-0 text-amber-400 font-bold">{formatCell(item.mp)}</td>)}
                        </tr>
                        <tr className="hover:bg-emerald-900/10 transition-colors">
                            <th className="px-3 py-2.5 border-r border-slate-800 text-left bg-emerald-900/20 text-emerald-500 font-bold">FC</th>
                            {chartData.map((item, index) => <td key={index} className="px-2 py-2.5 border-r border-slate-800 last:border-r-0 text-emerald-400 font-bold">{formatCell(item.fc)}</td>)}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Main Performance Component ---
const Performance = ({ onToggleSidebar }) => {
  const [searchParams] = useSearchParams();
  const activeView = searchParams.get("tab") || "chart";

  const [productionEntries, setProductionEntries] = useState([]);
  const [energyPerformanceEntries, setEnergyPerformanceEntries] = useState([]);
  const [energyData, setEnergyData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  // REVISI: Mengubah hak akses modifikasi menjadi Administrator ATAU Coordinator
  const canModify = user?.role === 'Administrator' || user?.role === 'Coordinator';

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const energyFieldConfig = { ACT: { label: "ACT ENERGY", placeholder: "Otomatis" }, MP: { label: "MP ENERGY", placeholder: "misal: 5.50" }, FC: { label: "FC ENERGY", placeholder: "misal: 5.45" } };
  const productionFieldConfig = { ACT: { label: "ACT PRODUCTION", placeholder: "misal: 1570.50" }, MP: { label: "MP PRODUCTION", placeholder: "misal: 1600.00" } };
  
  useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(timer); }, []);

  const fetchAllData = useCallback(async () => {
    try {
        const [prodData, energyPerfData, energyDataResult] = await Promise.all([ getPerformanceEntries('production_entries'), getPerformanceEntries('energy_performance'), getEnergyData() ]);
        setProductionEntries(prodData); setEnergyPerformanceEntries(energyPerfData); setEnergyData(energyDataResult);
    } catch (error) { toast({ variant: "destructive", title: "API Error", description: error.message }); }
  }, [toast]);

  useEffect(() => { fetchAllData(); const intervalId = setInterval(fetchAllData, 1000); return () => clearInterval(intervalId); }, [fetchAllData]);

  const chartData = useMemo(() => {
    const parse = (value) => parseFloat(String(value || '0').replace(',', '.')) || 0;
    const energyPerfMap = new Map(energyPerformanceEntries.map(p => [`${p.year}-${p.month}`, { ACT: parse(p.ACT), MP: parse(p.MP), FC: parse(p.FC) }]));
    const energyGJMap = new Map((energyData.monthly || []).map(e => [`${e.year}-${e.month}`, e.totalGJ || 0]));
    const productionACTMap = new Map(productionEntries.map(p => [`${p.year}-${p.month}`, parse(p.ACT)]));

    return months.map(m => {
        const key = `${selectedYear}-${m.value}`;
        const prevYearKey = `${selectedYear - 1}-${m.value}`;
        const perfData = energyPerfMap.get(key) || { ACT: 0, MP: 0, FC: 0 };
        const totalGJ = energyGJMap.get(key) || 0;
        const productionACT = productionACTMap.get(key) || 0;
        const prevYearPerfData = energyPerfMap.get(prevYearKey) || { ACT: 0 };

        let displayACT = perfData.ACT;
        if (displayACT === 0 && productionACT > 0 && totalGJ > 0) displayACT = totalGJ / productionACT;

        const originalFC = perfData.FC;
        let finalFC = originalFC;
        const isPastMonth = selectedYear < currentYear || (selectedYear === currentYear && m.value < currentMonth);
        if (isPastMonth && displayACT > 0) finalFC = displayACT;

        return { monthLabel: m.label, act: displayACT, mp: perfData.MP, fc: finalFC, prevYearACT: prevYearPerfData.ACT };
    });
  }, [selectedYear, energyPerformanceEntries, energyData, productionEntries, currentYear, currentMonth]);

  const handleMenuClick = () => {
    if (typeof onToggleSidebar === 'function') {
        onToggleSidebar();
    } else {
        toast({ variant: "destructive", title: "Error Sidebar", description: "Pastikan App.jsx telah diperbarui dengan onToggleSidebar={toggleSidebar} pada rute /performance." });
    }
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'chart':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col flex-1 min-h-0 bg-transparent px-2">
            <div className="flex items-center justify-end mb-2 flex-shrink-0">
                 <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-[110px] h-9 bg-[#1e293b] text-white border-slate-700 shadow-sm rounded-md focus:ring-blue-500 font-bold">
                        <SelectValue placeholder="Tahun" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => <SelectItem key={y} value={String(y)} className="font-semibold">{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <ChartView chartData={chartData} selectedYear={selectedYear} />
            <DataTableView chartData={chartData} selectedYear={selectedYear} />
          </motion.div>
        );
      case 'energy_input': 
        return <GenericInputView key="energy_performance" title="Energy Performance Input" tableType="energy_performance" entries={energyPerformanceEntries} fetchEntries={fetchAllData} allEnergyData={energyData} productionEntries={productionEntries} fields={['ACT', 'MP', 'FC']} fieldConfig={energyFieldConfig} years={years} months={months} canModify={canModify} />;
      case 'production_input': 
        return <GenericInputView key="production_entries" title="Production Data Input" tableType="production_entries" entries={productionEntries} fetchEntries={fetchAllData} fields={['ACT', 'MP']} fieldConfig={productionFieldConfig} years={years} months={months} canModify={canModify} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-full w-full bg-[#0f172a] font-sans overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 pl-6 pr-6 pt-4 pb-2 relative">
            
            <div className="relative flex items-center w-full h-10 mb-5 flex-shrink-0 z-10">
                <button onClick={handleMenuClick} className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-blue-400 border border-slate-700 rounded-md transition-colors text-sm font-bold tracking-widest shadow-sm">
                    <Menu className="h-4 w-4 text-white" />
                    <span className="text-white">MENU</span>
                </button>
                
                <h2 className="absolute left-1/2 transform -translate-x-1/2 text-xl lg:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-200 tracking-[0.1em] uppercase drop-shadow-md whitespace-nowrap pointer-events-none">
                    PERFORMANCE INDICATOR
                </h2>
            </div>

            <main className="flex-1 min-h-0 w-full flex flex-col relative">
                {renderActiveView()}
            </main>

            <footer className="flex-none flex flex-col sm:flex-row items-center justify-between px-2 py-3 w-full border-t border-slate-800/50 mt-2">
                <div className="flex items-center space-x-4">
                    <div className="bg-[#FFE600] px-2 py-1 rounded flex items-center justify-center">
                        <img src={pirelli} alt="Pirelli" className="h-4 object-contain" />
                    </div>
                    <div className="bg-white px-2 py-1 rounded flex items-center justify-center">
                        <img src={astra} alt="Astra Otoparts" className="h-4 object-contain" />
                    </div>
                </div>
                <div className="text-[11px] font-bold tracking-widest text-slate-500">
                    {formatDateTime(currentTime)}
                </div>
            </footer>
        </div>
    </div>
  );
};

export default Performance;