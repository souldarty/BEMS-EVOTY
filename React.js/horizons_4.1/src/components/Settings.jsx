import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom"; 
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Settings2, Save, Trash2, UserPlus, Eye, EyeOff, Lock, X, AlertTriangle, Key, UserX, UserCheck, UserCog } from "lucide-react";
import { getSettings, manageSettings } from "@/services/apiService";

import astra from "@/img/astra.svg";
import pirelli from "@/img/pirelli.svg";

// IMPORT KOMPONEN MODBUS DEVICE
import ModbusDevice from "./ModbusDevice"; 

// --- Komponen Modal Generik (Dark Theme) ---
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/80 backdrop-blur-sm" onClick={onClose}>
                    <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ duration: 0.2 }} className="relative bg-[#1e293b] rounded-xl shadow-2xl w-full max-w-md m-4 overflow-hidden border border-slate-700" onClick={(e) => e.stopPropagation()}>
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

// --- Komponen Modal Konfirmasi Kata Sandi (Dark Theme) ---
const PasswordConfirmationModal = ({ isOpen, onClose, onConfirm, password, setPassword, error, loading }) => {
  if (!isOpen) return null;
  const handleSubmit = (e) => { e.preventDefault(); onConfirm(); };
  return (
    <div className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-[#1e293b] p-7 rounded-xl shadow-2xl w-full max-w-sm m-4 border border-slate-700">
        <h3 className="text-lg font-bold mb-2 text-white uppercase tracking-widest">Konfirmasi Edit</h3>
        <p className="text-sm mb-5 text-slate-400">Untuk alasan keamanan, masukkan kata sandi Anda untuk melanjutkan.</p>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <input id="password-confirm" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full bg-[#0f172a] border border-slate-700 text-white rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Masukkan kata sandi" required autoFocus />
            {error && <p className="text-sm text-rose-500 text-center font-medium">{error}</p>}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700 mt-4">
              <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="text-slate-300 hover:text-white">Batal</Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white font-bold">{loading ? "Memverifikasi..." : "Konfirmasi"}</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Komponen Pengaturan Utama ---
const Settings = () => {
  const [searchParams] = useSearchParams();
  const activeView = searchParams.get("tab") || "parameters";

  const { user } = useAuth();
  const { toast } = useToast();
  
  // Hak akses: Administrator dan Coordinator dapat merubah parameter & kelola akun
  const canModify = user?.role === 'Administrator' || user?.role === 'Coordinator';

  const [currentTime, setCurrentTime] = useState(new Date());

  // State untuk Pengaturan Parameter
  const initialDataStructure = [
    { id: 1, title: "LWBP Cost", unit: "IDR" },
    { id: 2, title: "WBP Cost", unit: "IDR", calculated: true },
    { id: 3, title: "kVARh Cost", unit: "IDR" },
    { id: 4, title: "Comparative Factor (K)", unit: "Factor K" },
    { id: 5, title: "Power Factor", unit: "Power Factor" },
    { id: 6, title: "LWBP Discount", unit: "%", hasDateTimeRange: true },
    { id: 7, title: "WBP Discount", unit: "%", hasDateTimeRange: true },
    { id: 8, title: "PPJ", unit: "%" },
    { id: 9, title: "CO2 Emission Factor (Electric Power)", unit: "kg CO2/kWh" },
  ];
  const [data, setData] = useState(
    initialDataStructure.map(item => ({
      ...item, value: "", author: "", published: null, startDateTime: null, endDateTime: null, dbId: null,
    }))
  );
  const [editingId, setEditingId] = useState(null);
  const [newValue, setNewValue] = useState("");
  const [editingStartDate, setEditingStartDate] = useState("");
  const [editingStartTime, setEditingStartTime] = useState("");
  const [editingEndDate, setEditingEndDate] = useState("");
  const [editingEndTime, setEditingEndTime] = useState("");

  // State untuk Manajemen Akun
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'Operator' });
  const [showPassword, setShowPassword] = useState(false);

  // State untuk Modal Ganti Sandi
  const [changePwdState, setChangePwdState] = useState({
      isOpen: false,
      user: null,
      step: 1,
      oldPwd: '',
      newPwd: '',
      confirmPwd: '',
      showOld: false,
      showNew: false,
      showConfirm: false,
      error: '',
      loading: false
  });

  // State untuk Modal Ganti Role (BARU)
  const [changeRoleState, setChangeRoleState] = useState({
      isOpen: false,
      user: null,
      newRole: '',
      error: '',
      loading: false
  });

  // State untuk Modal Konfirmasi Kata Sandi
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [pendingEditData, setPendingEditData] = useState(null);

  // State untuk Modal Generik (untuk hapus user)
  const [modalState, setModalState] = useState({ type: null, data: null });

  useEffect(() => {
    loadParameterSettings();
    loadUsers();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Fungsi Utilitas & Format ---
  const formatDateTimeFull = (date) => {
    const months = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `SUBANG, ${day} ${month} ${year} - ${hours}:${minutes} WIB`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  };
    
  const formatInputDate = (date) => date ? new Date(date).toISOString().split('T')[0] : "";
  const formatInputTime = (date) => date ? new Date(date).toTimeString().slice(0, 5) : "";
  
  const formatRupiah = (angka) => {
    const num = parseFloat(angka);
    if (isNaN(num)) return `Rp0.00`;
    const parts = num.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `Rp${parts.join('.')}`;
  };

  const unformatRupiah = (str) => String(str).replace(/Rp|\s|,/g, "");
  const formatValue = (value, unit) => (value === null || value === "" || isNaN(value)) ? "-" : unit === "IDR" ? formatRupiah(value) : String(value);
  
  // --- Logika Pengaturan Parameter ---
  const loadParameterSettings = async () => {
    try {
      const result = await getSettings("getParameters");
      if (result.success) {
        const loadedSettingsMap = new Map(result.settings.map(s => [s.title, s]));
        setData(initialDataStructure.map(item => {
          const loaded = loadedSettingsMap.get(item.title);
          return { ...item, ...loaded, published: loaded?.published ? new Date(loaded.published) : null, startDateTime: loaded?.start_datetime ? new Date(loaded.start_datetime) : null, endDateTime: loaded?.end_datetime ? new Date(loaded.end_datetime) : null };
        }));
      }
    } catch (err) { console.error("Error loading parameters:", err); }
  };
  
  const saveParameterToDb = async (payload) => {
    try { return await manageSettings(payload); } catch (err) { return { success: false, message: err.message }; }
  };

  const handleSave = async (row) => {
    const valueToSave = (row.unit === "IDR") ? unformatRupiah(newValue) : newValue;
    const startDateTimeToSave = row.hasDateTimeRange ? `${editingStartDate} ${editingStartTime}` : null;
    const endDateTimeToSave = row.hasDateTimeRange ? `${editingEndDate} ${editingEndTime}` : null;

    const result = await saveParameterToDb({ action: "saveParameter", title: row.title, value: valueToSave, unit: row.unit, author: user?.username, start_datetime: startDateTimeToSave, end_datetime: endDateTimeToSave });
    
    if (result.success) {
      if (row.title === "LWBP Cost" || row.title === "Comparative Factor (K)") {
        const lwbp = row.title === "LWBP Cost" ? parseFloat(valueToSave) : parseFloat(data.find(i => i.title === "LWBP Cost")?.value) || 0;
        const factorK = row.title === "Comparative Factor (K)" ? parseFloat(valueToSave) : parseFloat(data.find(i => i.title === "Comparative Factor (K)")?.value) || 0;
        await saveParameterToDb({ action: "saveParameter", title: "WBP Cost", value: (lwbp * factorK).toFixed(2), unit: "IDR", author: user?.username });
      }
      toast({ title: "Success", description: "Parameter has been saved successfully." });
      loadParameterSettings();
      setEditingId(null);
    } else { 
      toast({ variant: "destructive", title: "Save Error", description: result.message });
    }
  };

  // --- Logika Konfirmasi Edit ---
  const handleEditRequest = (row) => {
    if (editingId === row.id || !canModify) return;
    setPendingEditData(row);
    setPasswordError("");
    setPasswordInput("");
    setIsPasswordModalOpen(true);
  };

  const handlePasswordConfirm = async () => {
    setPasswordError("");
    setModalLoading(true);
    try {
        const result = await manageSettings({ action: 'verifyPassword', username: user?.username, password: passwordInput });
        if (result.success) { setIsPasswordModalOpen(false); initiateActualEdit(pendingEditData); }
        else { setPasswordError(result.message || "Incorrect password."); }
    } catch (err) { setPasswordError(err.message || "Network issue. Please try again."); } 
    finally { setModalLoading(false); }
  };
  
  const initiateActualEdit = (row) => {
    setEditingId(row.id);
    setNewValue(row.unit === 'IDR' ? formatRupiah(row.value || "0") : row.value || "");
    setEditingStartDate(formatInputDate(row.startDateTime)); setEditingStartTime(formatInputTime(row.startDateTime));
    setEditingEndDate(formatInputDate(row.endDateTime)); setEditingEndTime(formatInputTime(row.endDateTime));
    setPendingEditData(null);
  };

  const handleCancelEdit = () => { setIsPasswordModalOpen(false); setPendingEditData(null); };
  
  // --- Logika Manajemen Akun ---
  const loadUsers = async () => {
    try { 
        const result = await getSettings("getUsers"); 
        if (result.success) {
            setUsers(result.users); 
        } else {
            toast({ variant: "destructive", title: "Gagal Memuat Akun", description: result.message || "Terjadi kesalahan pada server." });
        }
    } catch (err) { 
        console.error("Error loading users:", err);
        toast({ variant: "destructive", title: "Error Server", description: "Gagal mengambil data dari server database." });
    }
  };

  const handleAccountChange = (e) => setNewUser(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) {
      toast({ variant: "destructive", title: "Validation Error", description: "Username and password are required." });
      return;
    }
    try {
      await manageSettings({ ...newUser, action: 'addUser' });
      toast({ title: "Success", description: `User "${newUser.username}" has been added.` });
      setNewUser({ username: '', password: '', role: 'Operator' });
      loadUsers();
    } catch (err) { toast({ variant: "destructive", title: "Error Adding User", description: err.message || "A network error occurred." }); }
  };

  const openDeleteModal = (userToDelete) => setModalState({ type: 'deleteUser', data: userToDelete });
  const closeModal = () => setModalState({ type: null, data: null });

  const handleDeleteUserConfirm = async () => {
    if (modalState.type === 'deleteUser' && modalState.data?.id) {
        try {
            await manageSettings({ id: modalState.data.id, action: 'deleteUser' });
            toast({ title: "Success", description: `User "${modalState.data.username}" has been deleted.` });
            loadUsers();
        } catch (err) { toast({ variant: "destructive", title: "Error Deleting User", description: err.message || "A network error occurred." }); } 
        finally { closeModal(); }
    }
  };

  // --- Logika Nonaktifkan/Aktifkan User ---
  const handleToggleStatus = async (targetUser) => {
      const isCurrentlyActive = Number(targetUser.is_active) === 1;
      const newStatus = isCurrentlyActive ? 0 : 1;
      const statusText = newStatus === 1 ? "diaktifkan" : "dinonaktifkan";

      try {
          const result = await manageSettings({
              action: 'toggleUserStatus',
              id: targetUser.id,
              is_active: newStatus
          });

          if (result.success) {
              toast({ title: "Success", description: `Akun "${targetUser.username}" berhasil ${statusText}.` });
              setUsers(prevUsers => 
                  prevUsers.map(u => u.id === targetUser.id ? { ...u, is_active: newStatus } : u)
              );
              loadUsers();
          } else {
              toast({ variant: "destructive", title: "Error", description: result.message });
          }
      } catch (err) {
          toast({ variant: "destructive", title: "Network Error", description: err.message || "Gagal mengubah status user." });
      }
  };

  // --- Logika Ganti Role (BARU) ---
  const openChangeRoleModal = (targetUser) => {
      setChangeRoleState({
          isOpen: true,
          user: targetUser,
          newRole: targetUser.role,
          error: '',
          loading: false
      });
  };

  const closeChangeRoleModal = () => {
      setChangeRoleState(prev => ({ ...prev, isOpen: false }));
  };

  const handleSaveNewRole = async (e) => {
      e.preventDefault();
      
      // Validasi tambahan di frontend
      if (changeRoleState.newRole === changeRoleState.user.role) {
          closeChangeRoleModal();
          return;
      }

      setChangeRoleState(prev => ({ ...prev, loading: true, error: '' }));
      try {
          const result = await manageSettings({ 
              action: 'updateUserRole', 
              id: changeRoleState.user.id, 
              role: changeRoleState.newRole 
          });
          
          if (result.success) {
              toast({ title: "Success", description: `Role untuk "${changeRoleState.user.username}" berhasil diperbarui menjadi ${changeRoleState.newRole}.` });
              
              // Optimistic UI Update untuk Role
              setUsers(prevUsers => 
                  prevUsers.map(u => u.id === changeRoleState.user.id ? { ...u, role: changeRoleState.newRole } : u)
              );
              
              closeChangeRoleModal();
              loadUsers(); // Sinkronisasi database
          } else {
              setChangeRoleState(prev => ({ ...prev, error: result.message || "Gagal memperbarui role.", loading: false }));
          }
      } catch (err) {
          setChangeRoleState(prev => ({ ...prev, error: "Terjadi kesalahan jaringan.", loading: false }));
      }
  };

  // --- Logika Ganti Sandi ---
  const openChangePwdModal = (targetUser) => {
      setChangePwdState({
          isOpen: true,
          user: targetUser,
          step: 1,
          oldPwd: '',
          newPwd: '',
          confirmPwd: '',
          showOld: false,
          showNew: false,
          showConfirm: false,
          error: '',
          loading: false
      });
  };

  const closeChangePwdModal = () => {
      setChangePwdState(prev => ({ ...prev, isOpen: false }));
  };

  const handleChangePwdChange = (e) => {
      setChangePwdState(prev => ({ ...prev, [e.target.name]: e.target.value, error: '' }));
  };

  const togglePwdVisibility = (field) => {
      setChangePwdState(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleVerifyOldPwd = async (e) => {
      e.preventDefault();
      setChangePwdState(prev => ({ ...prev, loading: true, error: '' }));
      try {
          const result = await manageSettings({ 
              action: 'verifyPassword', 
              username: changePwdState.user.username, 
              password: changePwdState.oldPwd 
          });
          if (result.success) { 
              setChangePwdState(prev => ({ ...prev, step: 2, loading: false })); 
          } else { 
              setChangePwdState(prev => ({ ...prev, error: "Sandi lama tidak sesuai.", loading: false })); 
          }
      } catch (err) { 
          setChangePwdState(prev => ({ ...prev, error: "Gagal memverifikasi jaringan.", loading: false })); 
      }
  };

  const handleSaveNewPwd = async (e) => {
      e.preventDefault();
      if (changePwdState.newPwd !== changePwdState.confirmPwd) {
          setChangePwdState(prev => ({ ...prev, error: "Sandi baru tidak cocok." }));
          return;
      }
      if (changePwdState.newPwd.length < 4) {
          setChangePwdState(prev => ({ ...prev, error: "Sandi baru minimal 4 karakter." }));
          return;
      }

      setChangePwdState(prev => ({ ...prev, loading: true, error: '' }));
      try {
          const result = await manageSettings({ 
              action: 'updateUserPassword', 
              id: changePwdState.user.id, 
              password: changePwdState.newPwd 
          });
          if (result.success) {
              toast({ title: "Success", description: `Sandi untuk "${changePwdState.user.username}" berhasil diperbarui.` });
              closeChangePwdModal();
          } else {
              setChangePwdState(prev => ({ ...prev, error: result.message || "Gagal memperbarui sandi.", loading: false }));
          }
      } catch (err) {
          setChangePwdState(prev => ({ ...prev, error: "Terjadi kesalahan jaringan.", loading: false }));
      }
  };

  const lwbpCost = parseFloat(data.find(d => d.title === "LWBP Cost")?.value) || 0;
  const comparativeFactorK = parseFloat(data.find(d => d.title === "Comparative Factor (K)")?.value) || 0;
  const wbpCostCalculated = lwbpCost * comparativeFactorK;

  return (
    <div className="flex flex-col h-full w-full bg-[#0f172a] font-sans overflow-hidden text-slate-200 p-4 md:p-6">
      <PasswordConfirmationModal isOpen={isPasswordModalOpen} onClose={handleCancelEdit} onConfirm={handlePasswordConfirm} password={passwordInput} setPassword={setPasswordInput} error={passwordError} loading={modalLoading} />
      
      {/* Modal Hapus User */}
      <Modal isOpen={modalState.type === 'deleteUser'} onClose={closeModal} title="Confirm Deletion">
          <div>
              <div className="flex items-center space-x-4 mb-6">
                 <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/20">
                     <AlertTriangle className="h-6 w-6 text-rose-400" />
                 </div>
                 <p className="text-sm text-slate-300">Are you sure you want to delete the user <strong>{modalState.data?.username}</strong>? This action cannot be undone.</p>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                  <Button variant="ghost" onClick={closeModal} className="text-slate-400 hover:text-white">Cancel</Button>
                  <Button variant="destructive" onClick={handleDeleteUserConfirm} className="bg-rose-600 hover:bg-rose-500 font-bold"><Trash2 className="h-4 w-4 mr-2" /> Delete</Button>
              </div>
          </div>
      </Modal>

      {/* Modal Ganti Role (BARU) */}
      <Modal isOpen={changeRoleState.isOpen} onClose={closeChangeRoleModal} title={`Ubah Hak Akses: ${changeRoleState.user?.username}`}>
          <form onSubmit={handleSaveNewRole}>
              <div className="space-y-4">
                  <p className="text-sm text-slate-400">Pilih role baru untuk mengatur tingkat kewenangan akun ini.</p>
                  <div>
                      <select 
                          value={changeRoleState.newRole} 
                          onChange={(e) => setChangeRoleState(prev => ({ ...prev, newRole: e.target.value, error: '' }))} 
                          className="w-full bg-[#0f172a] border border-slate-700 p-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500" 
                          required
                      >
                          <option value="Operator">Operator</option>
                          <option value="Coordinator">Coordinator</option>
                          {/* Pilihan Administrator hanya muncul jika yang sedang login adalah Administrator */}
                          {user?.role === 'Administrator' && <option value="Administrator">Administrator</option>}
                      </select>
                  </div>
                  {changeRoleState.error && <p className="text-sm text-rose-500 font-medium">{changeRoleState.error}</p>}
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                      <Button type="button" variant="ghost" onClick={closeChangeRoleModal} className="text-slate-400 hover:text-white">Batal</Button>
                      <Button type="submit" disabled={changeRoleState.loading} className="bg-blue-600 hover:bg-blue-500 text-white font-bold">
                          {changeRoleState.loading ? "Menyimpan..." : "Simpan Perubahan"}
                      </Button>
                  </div>
              </div>
          </form>
      </Modal>

      {/* Modal Ganti Sandi */}
      <Modal isOpen={changePwdState.isOpen} onClose={closeChangePwdModal} title={`Ganti Sandi: ${changePwdState.user?.username}`}>
          {changePwdState.step === 1 ? (
              <form onSubmit={handleVerifyOldPwd}>
                  <div className="space-y-4">
                      <p className="text-sm text-slate-400">Masukkan sandi lama untuk memverifikasi kepemilikan akun.</p>
                      <div className="relative">
                          <input type={changePwdState.showOld ? "text" : "password"} name="oldPwd" value={changePwdState.oldPwd} onChange={handleChangePwdChange} placeholder="Sandi Lama" className="w-full bg-[#0f172a] border border-slate-700 p-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500 pr-10" required autoFocus />
                          <button type="button" onClick={() => togglePwdVisibility('showOld')} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white">
                              {changePwdState.showOld ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}
                          </button>
                      </div>
                      {changePwdState.error && <p className="text-sm text-rose-500 font-medium">{changePwdState.error}</p>}
                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                          <Button type="button" variant="ghost" onClick={closeChangePwdModal} className="text-slate-400 hover:text-white">Batal</Button>
                          <Button type="submit" disabled={changePwdState.loading} className="bg-blue-600 hover:bg-blue-500 text-white font-bold">{changePwdState.loading ? "Loading..." : "Lanjut"}</Button>
                      </div>
                  </div>
              </form>
          ) : (
              <form onSubmit={handleSaveNewPwd}>
                  <div className="space-y-4">
                      <p className="text-sm text-slate-400">Masukkan sandi baru untuk akun ini.</p>
                      <div className="relative">
                          <input type={changePwdState.showNew ? "text" : "password"} name="newPwd" value={changePwdState.newPwd} onChange={handleChangePwdChange} placeholder="Sandi Baru" className="w-full bg-[#0f172a] border border-slate-700 p-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500 pr-10" required autoFocus />
                          <button type="button" onClick={() => togglePwdVisibility('showNew')} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white">
                              {changePwdState.showNew ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}
                          </button>
                      </div>
                      <div className="relative">
                          <input type={changePwdState.showConfirm ? "text" : "password"} name="confirmPwd" value={changePwdState.confirmPwd} onChange={handleChangePwdChange} placeholder="Verifikasi Sandi Baru" className="w-full bg-[#0f172a] border border-slate-700 p-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500 pr-10" required />
                          <button type="button" onClick={() => togglePwdVisibility('showConfirm')} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white">
                              {changePwdState.showConfirm ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}
                          </button>
                      </div>
                      {changePwdState.error && <p className="text-sm text-rose-500 font-medium">{changePwdState.error}</p>}
                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                          <Button type="button" variant="ghost" onClick={closeChangePwdModal} className="text-slate-400 hover:text-white">Batal</Button>
                          <Button type="submit" disabled={changePwdState.loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"><Save className="h-4 w-4 mr-2" /> Simpan</Button>
                      </div>
                  </div>
              </form>
          )}
      </Modal>

      <div className="relative flex items-center w-full h-10 mb-5 flex-shrink-0">
          <h2 className="text-xl lg:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-200 tracking-[0.1em] uppercase drop-shadow-md">
              {activeView === 'parameters' ? "PARAMETER SETTINGS" : 
               activeView === 'modbus' ? "MODBUS DEVICE MANAGEMENT" : 
               "ACCOUNT MANAGEMENT"}
          </h2>
      </div>

      <main className="flex-1 min-h-0 w-full overflow-y-auto custom-scrollbar pr-2 pb-4">
        
        {activeView === 'modbus' && (
          <ModbusDevice />
        )}

        {activeView === 'parameters' && (
          <div className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-xl overflow-hidden h-fit">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-[#0f172a] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 border-b border-slate-800">Parameter</th>
                    <th className="px-6 py-4 border-b border-slate-800">Value</th>
                    <th className="px-6 py-4 border-b border-slate-800">Unit</th>
                    <th className="px-6 py-4 border-b border-slate-800">Actions</th>
                    <th className="px-6 py-4 border-b border-slate-800">Author</th>
                    <th className="px-6 py-4 border-b border-slate-800">Published</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-slate-800/50 text-slate-300">
                  {data.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">{row.title}</td>
                      <td className="px-6 py-4 font-medium">
                        {row.title === "WBP Cost" ? (
                          <span className="text-blue-400 font-bold">{formatRupiah(wbpCostCalculated)}</span>
                        ) : editingId === row.id ? (
                          row.hasDateTimeRange ? (
                            <div className="flex flex-col gap-2 max-w-[250px]">
                               <input type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="bg-[#0f172a] border border-slate-600 rounded px-3 py-1.5 w-full text-white focus:outline-none focus:border-blue-500" />
                               <div className="flex gap-2">
                                  <input type="date" value={editingStartDate} onChange={(e) => setEditingStartDate(e.target.value)} className="bg-[#0f172a] border border-slate-600 rounded px-2 py-1 w-full text-white text-xs"/>
                                  <input type="time" value={editingStartTime} onChange={(e) => setEditingStartTime(e.target.value)} className="bg-[#0f172a] border border-slate-600 rounded px-2 py-1 w-full text-white text-xs"/>
                               </div>
                               <div className="flex gap-2">
                                  <input type="date" value={editingEndDate} onChange={(e) => setEditingEndDate(e.target.value)} className="bg-[#0f172a] border border-slate-600 rounded px-2 py-1 w-full text-white text-xs" />
                                  <input type="time" value={editingEndTime} onChange={(e) => setEditingEndTime(e.target.value)} className="bg-[#0f172a] border border-slate-600 rounded px-2 py-1 w-full text-white text-xs" />
                               </div>
                            </div>
                          ) : (
                            <input type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="bg-[#0f172a] border border-slate-600 rounded px-3 py-1.5 w-full max-w-[200px] text-white focus:outline-none focus:border-blue-500"/>
                          )
                        ) : (
                          row.hasDateTimeRange ? (
                            <div className="text-xs space-y-1">
                              <span className="text-base text-blue-400 font-bold">{formatValue(row.value, row.unit)}</span><br/>
                              <span className="text-slate-400">Period: {formatDateTime(row.startDateTime)} <br/>to {formatDateTime(row.endDateTime)}</span>
                            </div>
                          ) : (
                            <span className="text-base text-blue-400 font-bold">{formatValue(row.value, row.unit)}</span>
                          )
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-400">{row.unit}</td>
                      <td className="px-6 py-4">
                        {row.calculated ? (<span className="text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Calculated</span>) : 
                          editingId === row.id ? (
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-bold" onClick={() => handleSave(row)}><Save className="h-4 w-4 mr-1" /> Save</Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-700" onClick={() => handleEditRequest(row)} disabled={!canModify}>
                                <Settings2 className="h-4 w-4" />
                            </Button>
                          )
                        }
                      </td>
                      <td className="px-6 py-4 text-slate-400">{row.author || "-"}</td>
                      <td className="px-6 py-4 text-slate-400">{formatDateTime(row.published)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Akses Tab Akun dibatasi hanya untuk Administrator & Coordinator */}
        {activeView === 'accounts' && (
          !canModify ? (
             <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-8 rounded-2xl shadow-sm w-full flex flex-col items-center justify-center text-center my-10">
                 <Lock className="h-12 w-12 mb-4 text-amber-400"/>
                 <h3 className="font-bold uppercase tracking-wider text-lg mb-2">Akses Ditolak</h3>
                 <p className="text-sm text-slate-400 max-w-md">Role Operator memiliki hak akses terbatas (hanya lihat) dan tidak memiliki kewenangan untuk mengakses atau mengelola manajemen akun.</p>
             </div>
          ) : (
             <div className="flex flex-col md:flex-row gap-6 h-fit">
               <div className="md:w-1/3 flex-none h-fit">
                 <div className="bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-slate-700">
                     <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-5 flex items-center"><UserPlus className="mr-2 h-5 w-5 text-blue-400"/>Add Account</h3>
                     <form onSubmit={handleSaveUser} className="space-y-4">
                         <input type="text" name="username" value={newUser.username} onChange={handleAccountChange} placeholder="Username" className="w-full bg-[#0f172a] border border-slate-700 p-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500" required />
                         <div className="relative">
                           <input type={showPassword ? "text" : "password"} name="password" value={newUser.password} onChange={handleAccountChange} placeholder="Password" className="w-full bg-[#0f172a] border border-slate-700 p-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500 pr-10" required />
                           <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white">
                               {showPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5"/>}
                           </button>
                         </div>
                         <select name="role" value={newUser.role} onChange={handleAccountChange} className="w-full bg-[#0f172a] border border-slate-700 p-2.5 rounded-lg text-white focus:outline-none focus:border-blue-500" required>
                             <option value="Operator">Operator</option>
                             <option value="Coordinator">Coordinator</option>
                             {user?.role === 'Administrator' && <option value="Administrator">Administrator</option>}
                         </select>
                         <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg mt-2"><Save className="h-4 w-4 mr-2" /> Save User</Button>
                     </form>
                 </div>
               </div>

               <div className="md:w-2/3 bg-[#1e293b] rounded-2xl border border-slate-700 shadow-xl overflow-hidden h-fit">
                   <div className="overflow-x-auto">
                       <table className="w-full text-sm text-left border-collapse">
                           <thead className="bg-[#0f172a] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-800">
                               <tr>
                                   <th className="px-6 py-4 border-b border-slate-800">Username</th>
                                   <th className="px-6 py-4 border-b border-slate-800">Role</th>
                                   <th className="px-6 py-4 border-b border-slate-800">Status</th>
                                   <th className="px-6 py-4 border-b border-slate-800">Created At</th>
                                   <th className="px-6 py-4 border-b border-slate-800 text-center">Actions</th>
                               </tr>
                           </thead>
                           <tbody className="bg-transparent divide-y divide-slate-800/50 text-slate-300">
                               {users.length === 0 ? (
                                   <tr>
                                       <td colSpan="5" className="px-6 py-8 text-center text-slate-400 font-medium">
                                           Tidak ada data pengguna atau gagal memuat dari server.
                                       </td>
                                   </tr>
                               ) : (
                                   users.map((u) => {
                                       // --- ATURAN HIERARKI HAK AKSES ---
                                       const isTargetAdminRole = u.role === 'Administrator';
                                       const isTargetDefaultAdmin = u.username?.toLowerCase() === 'admin';
                                       const isSelf = u.username === user?.username;
                                       
                                       // Coordinator tidak bisa mengubah Administrator manapun
                                       const cannotTouchByHierarchy = user?.role === 'Coordinator' && isTargetAdminRole;
                                       
                                       // Administrator bisa mengubah role siapa saja, kecuali akun bawaan 'admin' dan dirinya sendiri (biar tidak lockout)
                                       // Coordinator bisa mengubah role selain Administrator dan bukan dirinya sendiri
                                       let disableRoleChange = false;
                                       if (user?.role === 'Administrator') {
                                           disableRoleChange = isTargetDefaultAdmin || isSelf;
                                       } else if (user?.role === 'Coordinator') {
                                           disableRoleChange = isTargetAdminRole || isSelf;
                                       }

                                       const disablePwdChange = isTargetDefaultAdmin || cannotTouchByHierarchy;
                                       const disableStatusToggle = isTargetDefaultAdmin || cannotTouchByHierarchy || isSelf;
                                       const disableDelete = isTargetDefaultAdmin || cannotTouchByHierarchy || isSelf;

                                       const isActiveUser = Number(u.is_active) === 1;

                                       return (
                                           <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                                               <td className="px-6 py-4 font-bold text-white">{u.username}</td>
                                               <td className="px-6 py-4 font-medium text-blue-400">{u.role}</td>
                                               <td className="px-6 py-4">
                                                   <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                       isActiveUser ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                   }`}>
                                                       {isActiveUser ? 'Aktif' : 'Nonaktif'}
                                                   </span>
                                               </td>
                                               <td className="px-6 py-4 text-slate-400">{formatDateTime(u.created_at?.date || u.created_at)}</td>
                                               <td className="px-6 py-4 flex justify-center gap-1">
                                                   {/* Tombol Ubah Role (BARU) */}
                                                   <Button variant="ghost" size="icon" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-full" onClick={() => openChangeRoleModal(u)} disabled={disableRoleChange} title="Ubah Hak Akses (Role)">
                                                       <UserCog className="h-4 w-4" />
                                                   </Button>
                                                   <Button variant="ghost" size="icon" className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 rounded-full" onClick={() => openChangePwdModal(u)} disabled={disablePwdChange} title="Ganti Sandi">
                                                       <Key className="h-4 w-4" />
                                                   </Button>
                                                   <Button variant="ghost" size="icon" className={`rounded-full ${isActiveUser ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/20' : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20'}`} onClick={() => handleToggleStatus(u)} disabled={disableStatusToggle} title={isActiveUser ? "Nonaktifkan Akun" : "Aktifkan Akun"}>
                                                       {isActiveUser ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                                   </Button>
                                                   <Button variant="ghost" size="icon" className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-full" onClick={() => openDeleteModal(u)} disabled={disableDelete} title="Hapus Akun">
                                                       <Trash2 className="h-4 w-4" />
                                                   </Button>
                                               </td>
                                           </tr>
                                       );
                                   })
                               )}
                           </tbody>
                       </table>
                   </div>
               </div>
             </div>
          )
        )}
      </main>

      <footer className="flex-none flex flex-col sm:flex-row items-center justify-between px-2 py-3 w-full border-t border-slate-800/50 mt-2">
          <div className="flex items-center space-x-4">
              <div className="bg-[#FFE600] px-2 py-1 rounded flex items-center justify-center">
                  <img src={pirelli} alt="Pirelli" className="h-6 object-contain" />
              </div>
              <div className="bg-white px-2 py-1 rounded flex items-center justify-center">
                  <img src={astra} alt="Astra Otoparts" className="h-6 object-contain" />
              </div>
          </div>
          <div className="text-[15px] font-bold tracking-widest text-slate-500">
              {formatDateTimeFull(currentTime)}
          </div>
      </footer>
    </div>
  );
};

export default Settings;