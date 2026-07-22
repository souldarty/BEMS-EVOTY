import React, { useState, useEffect } from "react";
import { getModbusDevices, saveModbusDevice, deleteModbusDevice } from "@/services/apiService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, CheckCircle2, XCircle, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/AuthContext'; 

const ModbusDevice = () => {
  const [devices, setDevices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: "", name: "", ip_address: "", port: 502, unit_id: 1, group_mv: "MV-A", subgroup_mv: "", device_type: "FRER" });
  
  const { toast } = useToast();
  const { user } = useAuth(); 

  // --- LOGIKA HAK AKSES ---
  const canModify = user?.role === 'Administrator' || user?.role === 'Coordinator';

  // --- STATE UNTUK FITUR FILTER & SEARCH ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGroup, setFilterGroup] = useState("");

  const fetchDevices = async () => {
    try {
      const res = await getModbusDevices();
      if (res.success) setDevices(res.data);
    } catch (error) {
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await saveModbusDevice(formData);
      toast({ title: "Sukses", description: "Device berhasil disimpan" });
      setIsModalOpen(false);
      fetchDevices();
    } catch (error) {
      toast({ title: "Error", description: "Gagal menyimpan device", variant: "destructive" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus device ini?")) return;
    try {
      await deleteModbusDevice(id);
      toast({ title: "Sukses", description: "Device berhasil dihapus" });
      fetchDevices();
    } catch (error) {
      toast({ title: "Error", description: "Gagal menghapus device", variant: "destructive" });
    }
  };

  const openModal = (device = null) => {
    if (device) {
      setFormData(device);
    } else {
      setFormData({ id: "", name: "", ip_address: "", port: 502, unit_id: 1, group_mv: "MV-A", subgroup_mv: "", device_type: "FRER" });
    }
    setIsModalOpen(true);
  };

  // --- LOGIKA FILTERING ---
  const uniqueGroups = [...new Set(devices.map(d => d.group_mv))].filter(Boolean);
  
  const filteredDevices = devices.filter(device => {
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = 
      (device.name || "").toLowerCase().includes(searchLower) ||
      (device.ip_address || "").toLowerCase().includes(searchLower) ||
      (device.port || "").toString().includes(searchLower) ||
      (device.unit_id || "").toString().includes(searchLower) ||
      (device.group_mv || "").toLowerCase().includes(searchLower) ||
      (device.subgroup_mv || "").toLowerCase().includes(searchLower) ||
      (device.device_type || "").toLowerCase().includes(searchLower);
                        
    const matchGroup = filterGroup === "" || device.group_mv === filterGroup;

    return matchSearch && matchGroup;
  });

  // --- LOGIKA PEMBATASAN DEVICE MV-I (INCOMER PUSAT) ---
  const hasMVI = devices.some(d => d.group_mv === "MV-I" || d.device_type === "ACUVIM");
  
  const isMviDisabled = hasMVI && formData.group_mv !== "MV-I";
  const isAcuvimDisabled = hasMVI && formData.device_type !== "ACUVIM";

  return (
    <div className="p-4 bg-slate-800 rounded-lg text-white w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold whitespace-nowrap shrink-0">Modbus Device Management</h2>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto md:flex-1 md:justify-end">
          
          <div className="relative w-full sm:max-w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Cari nama, IP, port, slave, dll..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-900 border-slate-700 text-white h-9 text-sm w-full focus:border-blue-500"
            />
          </div>

          <select 
            value={filterGroup} 
            onChange={(e) => setFilterGroup(e.target.value)} 
            className="w-full sm:w-auto h-9 bg-slate-900 border border-slate-700 text-slate-200 rounded px-3 text-sm focus:outline-none focus:border-blue-500 shrink-0 cursor-pointer"
          >
            <option value="">Semua Group</option>
            <option value="MV-A">MV-A</option>
            <option value="MV-B">MV-B</option>
            <option value="MV-C">MV-C</option>
            <option value="MV-I">MV-I</option>
            <option value="MV-U">MV-U</option>
          </select>

          {canModify && (
            <Button onClick={() => openModal()} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 h-9 px-4 shrink-0">
              <Plus className="mr-2 h-4 w-4" /> Tambah Device
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300 border border-slate-700">
          <thead className="text-xs text-gray-400 uppercase bg-slate-900 border-b border-slate-700">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">Nama</th>
              <th className="px-4 py-3 whitespace-nowrap">IP Address</th>
              <th className="px-4 py-3 whitespace-nowrap">Port</th>
              <th className="px-4 py-3 whitespace-nowrap">Slave ID</th>
              <th className="px-4 py-3 whitespace-nowrap">Group</th>
              <th className="px-4 py-3 min-w-[200px]">Subgroup</th>
              <th className="px-4 py-3 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 whitespace-nowrap">Last Seen</th>
              {canModify && <th className="px-4 py-3 text-center whitespace-nowrap">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {filteredDevices.length > 0 ? (
              filteredDevices.map((d) => (
                <tr key={d.id} className="border-b border-slate-700 hover:bg-slate-700">
                  <td className="px-4 py-3 font-semibold text-white">{d.name}</td>
                  <td className="px-4 py-3">{d.ip_address}</td>
                  <td className="px-4 py-3">{d.port}</td>
                  <td className="px-4 py-3">{d.unit_id}</td>
                  <td className="px-4 py-3 font-mono text-blue-400">{d.group_mv}</td>
                  <td className="px-4 py-3">{d.subgroup_mv}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {/* REVISI STATUS: Ditambahkan Tooltip untuk memperjelas batas waktu 5 jam */}
                    {d.is_connected ? (
                      <span className="flex items-center text-green-500 font-medium" title="Data terakhir terbaca dalam waktu kurang dari 5 jam">
                        <CheckCircle2 className="h-4 w-4 mr-1"/> Online
                      </span>
                    ) : (
                      <span className="flex items-center text-red-500 font-medium" title="Tidak ada data baru selama lebih dari 5 jam">
                        <XCircle className="h-4 w-4 mr-1"/> Offline
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {d.last_seen 
                      ? new Date(d.last_seen).toLocaleString('id-ID', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'}) 
                      : '-'}
                  </td>
                  {canModify && (
                    <td className="px-4 py-3 text-center flex justify-center gap-2">
                      <Button size="sm" variant="outline" className="text-blue-400 border-blue-400 hover:bg-blue-900" onClick={() => openModal(d)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-400 border-red-400 hover:bg-red-900" onClick={() => handleDelete(d.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={canModify ? "9" : "8"} className="px-4 py-8 text-center text-slate-500 italic">
                  Tidak ada perangkat yang cocok dengan pencarian Anda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && canModify && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-6 rounded-lg w-full max-w-md shadow-xl border border-slate-600 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-bold mb-4 text-white tracking-wide">{formData.id ? 'Edit' : 'Tambah'} Device</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nama Device</label>
                <Input placeholder="Contoh: MVA - Incomer 1" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="bg-slate-900 border-slate-600 text-white focus:border-blue-500" />
              </div>
              
              <div>
                <label className="text-xs text-slate-400 mb-1 block">IP Gateway</label>
                <Input placeholder="Contoh: 10.130.223.59" value={formData.ip_address} onChange={(e) => setFormData({...formData, ip_address: e.target.value})} required className="bg-slate-900 border-slate-600 text-white focus:border-blue-500" />
              </div>
              
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="text-xs text-slate-400 mb-1 block">Port</label>
                  <Input type="number" placeholder="502" value={formData.port} onChange={(e) => setFormData({...formData, port: e.target.value})} required className="bg-slate-900 border-slate-600 text-white focus:border-blue-500" />
                </div>
                <div className="w-1/2">
                  <label className="text-xs text-slate-400 mb-1 block">Slave ID</label>
                  <Input type="number" placeholder="1" value={formData.unit_id} onChange={(e) => setFormData({...formData, unit_id: e.target.value})} required className="bg-slate-900 border-slate-600 text-white focus:border-blue-500" />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="text-xs text-slate-400 mb-1 block">Group MV</label>
                  <select value={formData.group_mv} onChange={(e) => setFormData({...formData, group_mv: e.target.value})} className="w-full h-10 px-3 bg-slate-900 border-slate-600 text-white rounded-md border focus:outline-none focus:border-blue-500 cursor-pointer">
                    <option value="MV-A">MV-A</option>
                    <option value="MV-B">MV-B</option>
                    <option value="MV-C">MV-C</option>
                    <option value="MV-I" disabled={isMviDisabled}>
                      MV-I {isMviDisabled ? "(Maks 1)" : ""}
                    </option>
                    <option value="MV-U">MV-U</option>
                  </select>
                </div>
                <div className="w-1/2">
                  <label className="text-xs text-slate-400 mb-1 block">Tipe Device</label>
                  <select value={formData.device_type} onChange={(e) => setFormData({...formData, device_type: e.target.value})} className="w-full h-10 px-3 bg-slate-900 border-slate-600 text-white rounded-md border focus:outline-none focus:border-blue-500 cursor-pointer">
                    <option value="FRER">FRER</option>
                    <option value="M2M">M2M</option>
                    <option value="ACUVIM" disabled={isAcuvimDisabled}>
                      ACUVIM {isAcuvimDisabled ? "(Maks 1)" : ""}
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Subgroup MV (Harus sama persis dengan Frontend)</label>
                <Input placeholder="Contoh: Incomer Trafo #1" value={formData.subgroup_mv} onChange={(e) => setFormData({...formData, subgroup_mv: e.target.value})} required className="bg-slate-900 border-slate-600 text-white focus:border-blue-500" />
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-white hover:bg-slate-700">Batal</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-500 font-bold">Simpan Device</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModbusDevice;