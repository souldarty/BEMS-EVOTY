import React, { useState, useRef, forwardRef, useEffect } from "react";
import { CSSTransition } from "react-transition-group";
import { useNavigate } from "react-router-dom";
import { getTotalFactory } from "@/services/apiService";
import factory from "@/img/factory.png";
import pirelliban from "@/img/pirelli.svg";
import astra from "@/img/astra.svg"; 
import { MdFullscreen } from "react-icons/md";
import { ChevronRight, Menu } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Helper: Format timestamp ke "DD MMM HH:MM"
// ─────────────────────────────────────────────────────────────
const formatLastSeen = (date) => {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  const day   = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('id-ID', { month: 'short' });
  const hours = String(d.getHours()).padStart(2, '0');
  const mins  = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${hours}:${mins}`;
};

// ─────────────────────────────────────────────────────────────
// 1. Komponen Tabel Parameter (ElectricalInfoBox)
// ─────────────────────────────────────────────────────────────
const ElectricalInfoBox = ({ title, values, isOnline, lastSeen, onClick }) => {
  const lastSeenLabel = formatLastSeen(lastSeen);

  return (
    <div
      onClick={onClick}
      className="group flex flex-col w-[13vw] min-w-[160px] bg-slate-900/75 backdrop-blur-md border border-slate-500/30 shadow-2xl rounded-xl overflow-hidden select-none transition-all duration-300 cursor-pointer hover:border-blue-400/80 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:-translate-y-1 active:scale-95"
    >
      {/* Header Tabel */}
      <div className="bg-slate-800/60 p-2.5 border-b border-slate-500/30 flex justify-between items-center relative transition-colors group-hover:bg-slate-800/80">
        <div className="flex flex-col items-start">
          <span className="text-[0.8vw] font-extrabold uppercase tracking-widest text-white drop-shadow-md">
            {title}
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                isOnline
                  ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,1)]'
                  : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]'
              }`}
            />
            <span
              className={`text-[9px] font-bold uppercase tracking-widest ${
                isOnline ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
          <ChevronRight className="w-4 h-4 text-blue-300" />
        </div>
      </div>

      {/* Grid Data - Menampilkan Parameter JIKA Online, Menampilkan Waktu Terakhir JIKA Offline */}
      {isOnline ? (
        <div className="grid grid-cols-2 text-white border-collapse bg-transparent">
          <div className="border-r border-b border-slate-500/30 p-2 flex flex-col items-center justify-center min-h-[45px] group-hover:bg-slate-800/40 transition-colors">
            <span className="text-[9px] text-slate-300 uppercase font-semibold tracking-widest mb-1">Voltage</span>
            <span className="font-mono font-bold text-[12px] tracking-tight text-blue-50 drop-shadow-sm">
              {values?.voltage || "-"}
            </span>
          </div>
          <div className="border-b border-slate-500/30 p-2 flex flex-col items-center justify-center min-h-[45px] group-hover:bg-slate-800/40 transition-colors">
            <span className="text-[9px] text-slate-300 uppercase font-semibold tracking-widest mb-1">THD-I</span>
            <span className="font-mono font-bold text-[12px] tracking-tight text-blue-50 drop-shadow-sm">
              {values?.thdi || "-"}
            </span>
          </div>
          <div className="border-r border-slate-500/30 p-2 flex flex-col items-center justify-center min-h-[45px] group-hover:bg-slate-800/40 transition-colors">
            <span className="text-[9px] text-slate-300 uppercase font-semibold tracking-widest mb-1">Power</span>
            <span className="font-mono font-bold text-[12px] tracking-tight text-amber-200 drop-shadow-sm">
              {values?.power || "-"}
            </span>
          </div>
          <div className="p-2 flex flex-col items-center justify-center min-h-[45px] group-hover:bg-slate-800/40 transition-colors">
            <span className="text-[9px] text-slate-300 uppercase font-semibold tracking-widest mb-1">Energy</span>
            <span className="font-mono font-bold text-[12px] tracking-tight text-emerald-300 drop-shadow-sm">
              {values?.energy || "-"}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-2 min-h-[90px] bg-slate-800/40 transition-colors">
          <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-widest mb-1">Last Data Taken</span>
          <span className="font-mono font-bold text-[13px] tracking-tight text-slate-300 drop-shadow-sm">
            {lastSeenLabel || "-"}
          </span>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 2. Komponen DashboardView (Area Peta)
// ─────────────────────────────────────────────────────────────
const DashboardView = forwardRef(({ roomStates }, ref) => {
  const navigate = useNavigate();

  const dashboardItems = [
    { id: 'mv-b', isEnabled: true, title: "MV-B", route: "/mvBMonitoring", pos: { x: 20, y: 22 }, target: { x: 34, y: 31 }, path: "H" },
    { id: 'mv-c', isEnabled: true, title: "MV-C", route: "/mvCMonitoring", pos: { x: 46, y: 22 }, target: { x: 59, y: 31 }, path: "H" },
    { id: 'mv-i', isEnabled: true, title: "MV-I", route: "/mvIMonitoring", pos: { x: 75, y: 74 }, target: { x: 89, y: 20 }, path: "H" },
    { id: 'mv-u', isEnabled: true, title: "MV-U", route: "/mvUMonitoring", pos: { x: 35, y: 74 }, target: { x: 20, y: 65 }, path: "H" },
    { id: 'mv-a', isEnabled: true, title: "MV-A", route: "/mvAMonitoring", pos: { x: 55, y: 74 }, target: { x: 19, y: 52 }, path: "V" },
  ];

  const enabledItems = dashboardItems.filter(item => item.isEnabled);

  return (
    <div ref={ref} className="absolute inset-0 w-full h-full">
      <svg
        className="absolute inset-0 w-full h-full z-10 pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {enabledItems.map((item) => (
          <g key={item.id}>
            <path
              d={
                item.path === "V"
                  ? `M ${item.pos.x} ${item.pos.y} L ${item.pos.x} ${item.target.y} L ${item.target.x} ${item.target.y}`
                  : `M ${item.pos.x} ${item.pos.y} L ${item.target.x} ${item.pos.y} L ${item.target.x} ${item.target.y}`
              }
              fill="none"
              stroke="white"
              strokeWidth="0.3"
            />
            <circle
              cx={item.target.x}
              cy={item.target.y}
              r="0.8"
              fill="white"
              stroke="black"
              strokeWidth="0.1"
            />
          </g>
        ))}
      </svg>

      {enabledItems.map(item => {
        const roomState = roomStates[item.id] || { data: null, isOnline: false, lastSeen: null };
        return (
          <div
            key={item.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
            style={{ top: `${item.pos.y}%`, left: `${item.pos.x}%` }}
          >
            <ElectricalInfoBox
              title={item.title}
              values={roomState.data}
              isOnline={roomState.isOnline}
              lastSeen={roomState.lastSeen}
              onClick={() => navigate(item.route)}
            />
          </div>
        );
      })}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// 3. Komponen Utama (RealtimeContent)
// ─────────────────────────────────────────────────────────────
const RealtimeContent = ({ onToggleSidebar }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState("");

  const [roomStates, setRoomStates] = useState({
    'mv-a': { data: null, isOnline: false, lastSeen: null },
    'mv-b': { data: null, isOnline: false, lastSeen: null },
    'mv-c': { data: null, isOnline: false, lastSeen: null },
    'mv-i': { data: null, isOnline: false, lastSeen: null },
    'mv-u': { data: null, isOnline: false, lastSeen: null },
  });

  const mapContainerRef  = useRef(null);
  const dashboardViewRef = useRef(null);
  const ROOM_IDS = ['mv-a', 'mv-b', 'mv-c', 'mv-i', 'mv-u'];

  const fetchAllRooms = async () => {
    try {
      const result = await getTotalFactory();
      const now = new Date(); // Waktu sekarang
      
      setRoomStates(prev => {
        const next = { ...prev };
        ROOM_IDS.forEach(roomId => {
          const roomData = result.success && result.data ? result.data[roomId] : null;
          
          if (roomData) {
            const dataTimestamp = roomData.timestamp ? new Date(roomData.timestamp) : prev[roomId].lastSeen || new Date();
            
            // REVISI: Hitung selisih waktu dalam satuan JAM
            const diffHours = (now - dataTimestamp) / (1000 * 60 * 60);
            
            // REVISI: Perangkat dianggap Online JIKA data yang diterima berumur <= 5 Jam
            const isDataOnline = diffHours <= 5;

            if (isDataOnline) {
              next[roomId] = {
                data: {
                  voltage: `${roomData.voltage} V`,
                  thdi:    `${roomData.thd_avg} %`,
                  power:   `${roomData.power_kw} KW`,
                  energy:  `${roomData.stand_kwh} KWH`,
                },
                isOnline: true,
                lastSeen: dataTimestamp,
              };
            } else {
              // Jika lewat 5 Jam -> Offline dan data dikosongkan
              next[roomId] = {
                data: null,
                isOnline: false,
                lastSeen: dataTimestamp,
              };
            }
          } else {
            next[roomId] = { ...prev[roomId], isOnline: false };
          }
        });
        return next;
      });
    } catch {
      setRoomStates(prev => {
        const next = { ...prev };
        ROOM_IDS.forEach(roomId => {
          next[roomId] = { ...prev[roomId], isOnline: false };
        });
        return next;
      });
    }
  };

  useEffect(() => {
    fetchAllRooms();
    const interval = setInterval(fetchAllRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    const updateDateTime = () => {
      const now = new Date();
      setCurrentDateTime(
        `SUBANG, ${now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()} - ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })} WIB`
      );
    };

    updateDateTime();
    const timeInterval = setInterval(updateDateTime, 1000);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      clearInterval(timeInterval);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) mapContainerRef.current.requestFullscreen();
    else document.exitFullscreen();
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#050a14] overflow-hidden text-slate-100 font-sans">
      {!isFullscreen && (
        <header className="h-[65px] bg-[#0a1120] flex items-center justify-between px-6 z-30 border-b border-slate-800/80 flex-shrink-0 shadow-md">
          <div className="flex-1 flex justify-start">
            <button
              onClick={onToggleSidebar}
              className="group flex items-center gap-2.5 bg-[#0f2541] hover:bg-blue-600 border border-[#1e3a8a] hover:border-blue-400 px-4 py-1.5 rounded-lg transition-all duration-300 shadow-[0_0_10px_rgba(30,58,138,0.5)] hover:shadow-[0_0_15px_rgba(59,130,246,0.6)] active:scale-95"
            >
              <Menu className="w-5 h-5 text-blue-400 group-hover:text-white transition-colors" />
              <span className="text-xs font-bold tracking-widest text-blue-100 group-hover:text-white uppercase transition-colors">
                Menu
              </span>
            </button>
          </div>

          <h1 className="text-lg md:text-xl font-extrabold tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-blue-200 uppercase text-center flex-shrink-0 drop-shadow-sm">
            Electrical Monitoring System
          </h1>

          <div className="flex-1 flex justify-end">
            <button
              onClick={toggleFullscreen}
              className="bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-md flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors shadow-lg active:scale-95 text-white"
            >
              <MdFullscreen size={20} /> Fullscreen
            </button>
          </div>
        </header>
      )}

      <main className="flex-grow relative bg-[#050a14] overflow-hidden">
        <div
          ref={mapContainerRef}
          className="absolute inset-0 w-full h-full overflow-hidden transition-all duration-500"
        >
          <img src={factory} alt="Layout" className="absolute inset-0 w-full h-full object-fill opacity-80" />

          <div className="absolute inset-0">
            <CSSTransition
              nodeRef={dashboardViewRef}
              in={true}
              timeout={300}
              classNames="view-transition"
              appear
            >
              <DashboardView ref={dashboardViewRef} roomStates={roomStates} />
            </CSSTransition>
          </div>
        </div>
      </main>

      {!isFullscreen && (
        <footer className="h-[45px] bg-[#0a1120] px-6 flex justify-between items-center border-t border-slate-800/80 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-6 opacity-80 hover:opacity-100 transition-opacity">
            <img src={pirelliban} className="h-7 rounded-md" alt="Pirelli Logo" />
            <img src={astra} className="h-7 rounded-md" alt="Astra Logo" />
          </div>
          <p className="text-sm md:text-base font-mono font-semibold tracking-wider text-slate-400 uppercase">
            {currentDateTime}
          </p>
        </footer>
      )}
    </div>
  );
};

export default function HomePage({ onToggleSidebar }) {
  return <RealtimeContent onToggleSidebar={onToggleSidebar} />;
}