import React, { useMemo, memo } from 'react';

// --- ASSETS IMPORT ---
import factory9 from "@/img/factory9.png";
import EvotyLogo2 from "@/img/evoty2.svg";
import astra from "@/img/astra.svg";
import pirelli from "@/img/pirelli.svg";
import pirelliban from "@/img/pirelliban.jpg";
import metzeler from "@/img/metzeler.png";
import aspirapremio from "@/img/aspirapremio.png";

// --- ICONS ---
import { GiElectric } from "react-icons/gi";
import { IoIosWater } from "react-icons/io";
import { BsFire } from "react-icons/bs";
import { MdAir, MdSolarPower, MdRecycling } from "react-icons/md";
import { PiBowlSteamFill } from "react-icons/pi";

/**
 * Komponen Garis Konektor (Memoized)
 */
const ConnectorLine = memo(({ x1, y1, x2, y2 }) => (
    <React.Fragment>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="black" strokeWidth="3" opacity="0.15" />
        <line 
            x1={x1} y1={y1} x2={x2} y2={y2} 
            stroke="white" 
            strokeWidth="1.5" 
            markerEnd="url(#circle-arrow-outline)" 
            strokeDasharray="5 3"
            className="animate-dash"
        />
    </React.Fragment>
));

/**
 * Komponen Label Ikon (Reusable)
 */
const IconLabel = ({ icon: Icon, label, subLabel, colorClass, style }) => (
    <div className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10" style={style}>
        <div className="flex flex-col items-center p-1.5 min-w-[65px] rounded-lg bg-black/60 backdrop-blur-md border border-white/10 shadow-xl transition-transform hover:scale-110">
            <Icon size={24} className={`${colorClass} drop-shadow-md`} />
            <span className="text-[9px] font-bold text-white mt-0.5 uppercase tracking-tighter">{label}</span>
            {subLabel && <span className="text-[8px] font-medium text-blue-300 leading-none">{subLabel}</span>}
        </div>
    </div>
);

const EnergyMapping = () => {
    const lineConfigs = useMemo(() => [
        { x1: '80.25%', y1: '22.8%', x2: '80.25%', y2: '32%' },
        { x1: '23%', y1: '48.3%', x2: '23%', y2: '62%' },
        { x1: '34%', y1: '35%', x2: '34%', y2: '43%' },
        { x1: '55.3%', y1: '34.7%', x2: '55.3%', y2: '43%' },
        { x1: '19.5%', y1: '84%', x2: '22%', y2: '74%' },
        { x1: '29%', y1: '84%', x2: '26.5%', y2: '74%' },
        { x1: '24.4%', y1: '84%', x2: '24.4%', y2: '74%' },
        { x1: '75%', y1: '65%', x2: '77%', y2: '50%' },
        { x1: '75%', y1: '65%', x2: '73.8%', y2: '52%' },
        { x1: '6%', y1: '36.5%', x2: '6%', y2: '50%' },
        { x1: '51%', y1: '17.8%', x2: '51%', y2: '37%' },
    ], []);

    return (
        <div className="fixed inset-0 w-screen h-screen flex flex-col overflow-hidden bg-black text-white selection:bg-red-500">
            
            {/* --- HEADER (Compact 7vh) --- */}
            <header className="h-[7vh] min-h-[50px] bg-gray-900/90 flex items-center justify-between px-6 z-30 border-b border-white/10 backdrop-blur-xl">
                <div className="flex items-center space-x-3 grayscale opacity-60">
                    <img src={pirelliban} alt="Pirelli" className="h-5" />
                    <img src={metzeler} alt="Metzeler" className="h-5" />
                    <img src={aspirapremio} alt="Aspira" className="h-5" />
                </div>
                
                <h1 className="text-xl md:text-2xl font-black tracking-[0.2em] uppercase italic text-center">
                    Energy <span className="text-red-600">Mapping</span>
                </h1>

                <div className="flex items-center space-x-2 text-[9px] font-mono text-green-500 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="hidden sm:inline">LIVE TELEMETRY</span>
                </div>
            </header>

            {/* --- MAIN AREA (86vh) --- */}
            <main className="h-[86vh] relative w-full flex items-center justify-center bg-[#050505]">
                {/* Image Container with precise 16:9 Aspect Ratio Control */}
                <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
                    <div className="relative w-full h-full max-w-full max-h-full aspect-video shadow-2xl overflow-hidden bg-black">
                        
                        {/* Background Factory - Object Fit Fill to ensure no gaps */}
                        <img
                            src={factory9}
                            alt="Factory Map"
                            className="absolute inset-0 w-full h-full object-fill z-0 select-none pointer-events-none"
                            loading="eager"
                        />

                        {/* SVG Connections */}
                        <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                            <defs>
                                <marker id="circle-arrow-outline" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                                    <circle cx="3" cy="3" r="2" fill="#1F497D" stroke="white" strokeWidth="0.5" />
                                </marker>
                                <style>{`
                                    .animate-dash { stroke-dashoffset: 100; animation: dash-flow 4s linear infinite; }
                                    @keyframes dash-flow { to { stroke-dashoffset: 0; } }
                                `}</style>
                            </defs>
                            {lineConfigs.map((line, i) => <ConnectorLine key={i} {...line} />)}
                        </svg>

                        {/* Interactive UI Overlay */}
                        <div className="absolute inset-0 z-20">
                            {/* Sustainability Corner */}
                            <div className="absolute bottom-[5%] left-[3%] flex flex-col items-center group cursor-help">
                                <MdRecycling size={50} className="text-green-500 animate-[spin_10s_linear_infinite] drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                <span className="text-[9px] font-black text-green-400 mt-1 bg-black/40 px-2 py-0.5 rounded">ECO-SYSTEM</span>
                            </div>

                            {/* Data Points */}
                            <IconLabel icon={GiElectric} label="Electric" subLabel="MV-I" colorClass="text-yellow-400" style={{ top: '15%', left: '80.25%' }} />
                            <IconLabel icon={GiElectric} label="Electric" subLabel="MV-A" colorClass="text-yellow-400" style={{ top: '42%', left: '23%' }} />
                            <IconLabel icon={GiElectric} label="Electric" subLabel="MV-B" colorClass="text-yellow-400" style={{ top: '28%', left: '34%' }} />
                            <IconLabel icon={GiElectric} label="Electric" subLabel="MV-C" colorClass="text-yellow-400" style={{ top: '28%', left: '55.3%' }} />
                            <IconLabel icon={GiElectric} label="Electric" subLabel="MV-U" colorClass="text-yellow-400" style={{ top: '88%', left: '19.5%' }} />
                            
                            <IconLabel icon={IoIosWater} label="Water" subLabel="WTP" colorClass="text-blue-400" style={{ top: '88%', left: '29%' }} />
                            <IconLabel icon={MdAir} label="Air" subLabel="COMP" colorClass="text-slate-200" style={{ top: '88%', left: '24.4%' }} />
                            <IconLabel icon={IoIosWater} label="Water" subLabel="WWTP" colorClass="text-blue-500" style={{ top: '30%', left: '6%' }} />
                            <IconLabel icon={MdSolarPower} label="PV Solar" colorClass="text-orange-400" style={{ top: '70%', left: '75%' }} />

                            {/* Boiler Hub */}
                            <div className="absolute top-[8%] left-[51%] -translate-x-1/2">
                                <div className="flex space-x-3 p-2 rounded-xl bg-black/80 backdrop-blur-lg border border-red-500/20 shadow-2xl">
                                    <div className="flex flex-col items-center px-2 border-r border-white/5"><BsFire className="text-red-500" size={20} /><span className="text-[7px]">GAS</span></div>
                                    <div className="flex flex-col items-center px-2 border-r border-white/5"><MdAir className="text-gray-400" size={20} /><span className="text-[7px]">AIR</span></div>
                                    <div className="flex flex-col items-center px-2"><PiBowlSteamFill className="text-blue-300" size={20} /><span className="text-[7px]">STEAM</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* --- FOOTER (7vh) --- */}
            <footer className="h-[7vh] min-h-[50px] bg-gray-900 flex items-center justify-between px-10 border-t border-white/5 z-30">
                <img src={pirelli} alt="Pirelli" className="h-6 opacity-80 hover:opacity-100 transition-opacity" />
                <img src={EvotyLogo2} alt="Evoty" className="h-8 md:h-10" />
                <img src={astra} alt="Astra" className="h-6 opacity-80 hover:opacity-100 transition-opacity" />
            </footer>
        </div>
    );
};

export default EnergyMapping;