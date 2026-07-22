import React, { useState, useRef, forwardRef, useEffect } from "react";
import { CSSTransition } from "react-transition-group";
import { getTotalFactory } from "@/services/apiService";
import factory from "@/img/factory.png";
import pirelliban from "@/img/pirelli.svg";
import astra from "@/img/astra.svg";
import { MdFullscreen } from "react-icons/md";
import { Menu, Zap, Droplets, Flame, Activity } from "lucide-react";

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
// 1. Komponen Data Produksi (Floating Console Card - Ultra Compact)
// ─────────────────────────────────────────────────────────────
const ConsoleCard = ({ title, values, isOnline, lastSeen, isHovered, onMouseEnter, onMouseLeave }) => {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`flex flex-col w-[9.5vw] min-w-[135px] bg-slate-900/85 backdrop-blur-md border rounded-xl overflow-hidden select-none transition-all duration-300 cursor-pointer ${
        isHovered 
          ? 'border-teal-400 shadow-[0_0_20px_rgba(45,212,191,0.4)] -translate-y-1' 
          : 'border-slate-500/30 shadow-2xl'
      }`}
    >
      {/* Header Room */}
      <div className="bg-slate-800/60 p-2 border-b border-slate-500/30 flex justify-between items-center">
        <span className="text-[9px] font-extrabold uppercase tracking-widest text-white truncate pr-1">
          {title}
        </span>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300 ${
          isOnline ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,1)]' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,1)]'
        }`} />
      </div>

      {/* Body Parameter - Menampilkan 1 Parameter Utama (KWH) */}
      {isOnline ? (
        <div className="p-2 flex flex-col items-center justify-center bg-transparent">
          <span className="text-[8px] text-slate-400 uppercase font-semibold tracking-widest mb-0.5">Energy</span>
          <span className="font-mono font-bold text-[12px] tracking-tight text-teal-300 drop-shadow-sm">
            {values?.kwh || "-"}
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-2 min-h-[44px] bg-slate-800/20">
          <span className="text-[8px] text-slate-400 uppercase font-semibold tracking-widest mb-0.5">Last Seen</span>
          <span className="font-mono text-[9px] font-bold text-slate-300 truncate w-full text-center">
            {formatLastSeen(lastSeen) || "-"}
          </span>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 2. Konfigurasi Penempatan Posisi Area & Garis Penghubung (MAPPING)
// ─────────────────────────────────────────────────────────────
// - pos   : Mengatur posisi koordinat kotak card data website (X, Y dalam %)
// - target: Mengatur posisi titik bulat pointer di lapangan peta (X, Y dalam %)
// - path  : Menentukan alur belokan siku garis ("V" untuk Vertikal dahulu, "H" untuk Horizontal dahulu)
const ROOM_MAPPING = [
  // 1. PLN Incomer (Menggantikan area MV-I)
  { id: 'pln-incomer',   title: 'PLN Incomer',     source: 'mv-i', pos: { x: 89.2, y: 32 },  target: { x: 89.2, y: 20.4 }, path: "V" },
  
  // 2. Mixing (Menggantikan area MV-A)
  { id: 'mixing',        title: 'Mixing',          source: 'mv-a', pos: { x: 12, y: 43 },  target: { x: 20, y: 52 }, path: "H" },
  
  // 3. Semifinishing (Menggantikan area MV-B)
  { id: 'semifinishing', title: 'Semifinishing',   source: 'mv-b', pos: { x: 33, y: 34 }, target: { x: 33, y: 45 }, path: "V" },
  
  // 4. Tyre Building
  { id: 'tyre-building', title: 'Tyre Building',   source: 'mv-b', pos: { x: 44, y: 56 }, target: { x: 44, y: 45 }, path: "V" },
  
  // 5. Curing (Menggantikan area MV-C)
  { id: 'curing',        title: 'Curing',          source: 'mv-c', pos: { x: 56, y: 34 }, target: { x: 56, y: 45 }, path: "V" },
  
  // 6. Finishing
  { id: 'finishing',     title: 'Finishing',       source: 'mv-c', pos: { x: 67, y: 56 }, target: { x: 67, y: 45 }, path: "V" },
  
  // 7. Warehouse
  { id: 'warehouse',     title: 'Warehouse',       source: 'mv-c', pos: { x: 57, y: 70 }, target: { x: 67, y: 70 }, path: "H" },
  
  // 8. General Affair
  { id: 'general-affair',title: 'General Affair',  source: 'mv-c', pos: { x: 73.7, y: 16 }, target: { x: 73.7, y: 26 }, path: "V" },
  
  // 9. Utilities (Menggantikan MV-U, terhubung data MV-A)
  { id: 'utilities',     title: 'Utilities',       source: 'mv-a', pos: { x: 14, y: 65 }, target: { x: 24, y: 65 }, path: "H" },
  
  // 10. R&D Lab
  { id: 'rd-lab',        title: 'R&D Lab',         source: 'mv-a', pos: { x: 54, y: 16 }, target: { x: 63.7, y: 26 }, path: "H" },
];

// ─────────────────────────────────────────────────────────────
// 3. Komponen DashboardView (Layer Garis SVG & Penempatan Card)
// ─────────────────────────────────────────────────────────────
const DashboardView = forwardRef(({ roomStates, hoveredRoom, setHoveredRoom }, ref) => {
  return (
    <div ref={ref} className="absolute inset-0 w-full h-full">
      {/* SVG Vector Layer untuk Garis Penghubung Siku */}
      <svg
        className="absolute inset-0 w-full h-full z-10 pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {ROOM_MAPPING.map((item) => {
          return (
            <g key={item.id}>
              {/* Garis Siku Penghubung - Disamakan dengan TotalFactory */}
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
              {/* Bulatan Node Target - Diubah warnanya menjadi putih seperti TotalFactory */}
              <circle
                cx={item.target.x}
                cy={item.target.y}
                r="0.6"
                fill="white"
                stroke="black"
                strokeWidth="0.1"
              />
            </g>
          );
        })}
      </svg>

      {/* Render Semua Kotak Card Menggunakan Koordinat Absolut pos */}
      {ROOM_MAPPING.map((room) => {
        const roomState = roomStates[room.source] || { data: null, isOnline: false, lastSeen: null };
        return (
          <div
            key={room.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
            style={{ top: `${room.pos.y}%`, left: `${room.pos.x}%` }}
          >
            <ConsoleCard
              title={room.title}
              values={roomState.data}
              isOnline={roomState.isOnline}
              lastSeen={roomState.lastSeen}
              isHovered={hoveredRoom === room.id}
              onMouseEnter={() => setHoveredRoom(room.id)}
              onMouseLeave={() => setHoveredRoom(null)}
            />
          </div>
        );
      })}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// 4. Komponen Utama (TotalProduction)
// ─────────────────────────────────────────────────────────────
const TotalProduction = ({ onToggleSidebar }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState("");
  const [hoveredRoom, setHoveredRoom] = useState(null);

  const [roomStates, setRoomStates] = useState({
    'mv-a': { data: null, isOnline: false, lastSeen: null },
    'mv-b': { data: null, isOnline: false, lastSeen: null },
    'mv-c': { data: null, isOnline: false, lastSeen: null },
    'mv-i': { data: null, isOnline: false, lastSeen: null },
    'mv-u': { data: null, isOnline: false, lastSeen: null },
  });

  const mapContainerRef  = useRef(null);
  const dashboardViewRef = useRef(null);
  const BACKEND_KEYS = ['mv-a', 'mv-b', 'mv-c', 'mv-i', 'mv-u'];

  const fetchAllRooms = async () => {
    try {
      const result = await getTotalFactory();
      const now = new Date();

      setRoomStates(prev => {
        const next = { ...prev };
        BACKEND_KEYS.forEach(sourceId => {
          const roomData = result.success && result.data ? result.data[sourceId] : null;
          
          if (roomData) {
            const dataTimestamp = roomData.timestamp ? new Date(roomData.timestamp) : prev[sourceId].lastSeen || new Date();
            const diffHours = (now - dataTimestamp) / (1000 * 60 * 60);
            const isDataOnline = diffHours <= 5;

            if (isDataOnline) {
              next[sourceId] = {
                data: {
                  // Mengambil data KWH hasil hitung total real-time database dari backend PHP
                  kwh: `${roomData.stand_kwh} KWH`,
                },
                isOnline: true,
                lastSeen: dataTimestamp,
              };
            } else {
              next[sourceId] = {
                data: null,
                isOnline: false,
                lastSeen: dataTimestamp,
              };
            }
          } else {
            next[sourceId] = { ...prev[sourceId], isOnline: false };
          }
        });
        return next;
      });
    } catch {
      setRoomStates(prev => {
        const next = { ...prev };
        BACKEND_KEYS.forEach(sourceId => {
          next[sourceId] = { ...prev[sourceId], isOnline: false };
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
        <header className="h-[65px] bg-[#0a1120] flex items-center justify-between px-6 z-30 border-b border-slate-800/80 flex-shrink-0 shadow-md relative">
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

          <h1 className="text-lg md:text-xl font-extrabold tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-white to-teal-200 uppercase text-center flex-shrink-0 drop-shadow-sm">
            AREA ELECTRICITY MONITORING
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

      {/* Main Area Viewport - Peta Utama Pabrik Secara Penuh */}
      <main className="flex-grow relative bg-[#050a14] overflow-hidden">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full">
          <img 
            src={factory} 
            alt="Factory Layout" 
            className="absolute inset-0 w-full h-full object-cover opacity-70 mix-blend-screen" 
          />
          
          {/* Layer Transisi untuk Merender Komponen Penanda Garis Siku dan Card */}
          <div className="absolute inset-0 z-10">
            <CSSTransition nodeRef={dashboardViewRef} in={true} timeout={300} classNames="view-transition" appear>
              <DashboardView 
                ref={dashboardViewRef} 
                roomStates={roomStates} 
                hoveredRoom={hoveredRoom} 
                setHoveredRoom={setHoveredRoom}
              />
            </CSSTransition>
          </div>
        </div>
      </main>

      {!isFullscreen && (
        <footer className="h-[45px] bg-[#0a1120] px-6 flex justify-between items-center border-t border-slate-800/80 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] relative z-40">
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

export default TotalProduction;