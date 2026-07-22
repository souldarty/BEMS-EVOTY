import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
} from "@/components/ui/navigation-menu";
import { 
  Home, 
  PieChart, 
  Activity, 
  DollarSign, 
  Leaf, 
  AreaChart, 
  Settings as SettingsIcon, 
  LogOut, 
  ChevronDown, 
  ChevronRight,
  Factory,
  Wrench,
  BarChart, 
  FileText,
  SlidersHorizontal,
  Users,
  TableProperties 
} from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import EvotyLogo from '@/img/evoty.svg';

import { MONITORING_PATHS } from "@/App";

const Sidebar = ({ isOpen, onToggle }) => {
  const { user, logout } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  const [isHomeOpen, setIsHomeOpen] = useState(location.pathname.startsWith("/home"));
  const [isPerformanceOpen, setIsPerformanceOpen] = useState(location.pathname.startsWith("/performance"));
  const [isSettingsOpen, setIsSettingsOpen] = useState(location.pathname.startsWith("/settings")); 
  const [isTotalEnergyOpen, setIsTotalEnergyOpen] = useState(location.pathname.startsWith("/totalenergy") || location.pathname.startsWith("/kwh-consumption"));

  if (MONITORING_PATHS.includes(location.pathname)) {
    return null;
  }

  const linkClass = (path) =>
    `flex items-center gap-3 w-full justify-start rounded-lg px-3 py-2 text-sm transition-colors ${
      location.pathname === path
        ? "bg-black font-semibold text-white"
        : "text-gray-300 hover:bg-gray-700 hover:text-white"
    }`;

  const subLinkClass = (path, tab) => {
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get("tab") || (path === "/performance" ? "chart" : "parameters");
    const isActive = location.pathname === path && currentTab === tab;
    return `flex items-center gap-3 w-full justify-start rounded-lg px-3 py-2 text-sm transition-colors ${
      isActive
        ? "bg-black font-semibold text-white"
        : "text-gray-300 hover:bg-gray-700 hover:text-white"
    }`;
  };

  const confirmLogout = () => setShowLogoutDialog(true);
  const cancelLogout = () => setShowLogoutDialog(false);
  const handleLogout = () => {
    setShowLogoutDialog(false);
    logout();
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 1024 && isOpen) {
      onToggle();
    }
  };

  const handleHomeClick = () => {
    setIsHomeOpen(!isHomeOpen);
    navigate("/home");
    if (window.innerWidth < 1024 && isOpen) onToggle();
  };

  const handlePerformanceClick = () => {
    setIsPerformanceOpen(!isPerformanceOpen);
    navigate("/performance?tab=chart");
    if (window.innerWidth < 1024 && isOpen) onToggle();
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(!isSettingsOpen);
    navigate("/settings?tab=parameters"); 
    if (window.innerWidth < 1024 && isOpen) onToggle();
  };

  const handleTotalEnergyClick = () => {
    setIsTotalEnergyOpen(!isTotalEnergyOpen);
    navigate("/totalenergy"); 
    if (window.innerWidth < 1024 && isOpen) onToggle();
  };

  const isHomeActive = location.pathname.startsWith("/home");
  const homeHeaderClass = `flex items-center justify-between w-full cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors ${
    isHomeActive ? "bg-black font-semibold text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
  }`;

  const isPerformanceActive = location.pathname.startsWith("/performance");
  const performanceHeaderClass = `flex items-center justify-between w-full cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors ${
    isPerformanceActive ? "bg-black font-semibold text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
  }`;

  const isSettingsActive = location.pathname.startsWith("/settings");
  const settingsHeaderClass = `flex items-center justify-between w-full cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors ${
    isSettingsActive ? "bg-black font-semibold text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
  }`;

  const isTotalEnergyActive = location.pathname.startsWith("/totalenergy") || location.pathname.startsWith("/kwh-consumption");
  const totalEnergyHeaderClass = `flex items-center justify-between w-full cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors ${
    isTotalEnergyActive ? "bg-black font-semibold text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
  }`;

  return (
    <>
      <div className={`fixed top-0 left-0 h-full w-64 bg-gray-800 shadow-lg z-50 transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-6 py-4 flex-grow overflow-y-auto custom-scrollbar">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white">Energy Management</h2>
          </div>
          
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-gray-400">Welcome, {user?.username}</span>
            <Button variant="ghost" size="sm" onClick={confirmLogout} className="flex items-center gap-2 text-red-500 hover:text-red-400">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>

          <NavigationMenu orientation="vertical" className="flex-col items-start w-full">
            <NavigationMenuList className="flex-col items-start space-y-1 w-full">

              <NavigationMenuItem className="w-full flex-col">
                <div className={homeHeaderClass} onClick={handleHomeClick}>
                  <div className="flex items-center gap-3">
                    <Home className="h-5 w-5 pl-1" />
                    <span className="pl-1">Home</span>
                  </div>
                  {isHomeOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
                {isHomeOpen && (
                  <div className="flex flex-col w-full pl-6 mt-1 space-y-1">
                    <Link to="/home/produksi" className={linkClass("/home/produksi")} onClick={handleLinkClick}><Factory className="h-4 w-4" /><span>Area Monitoring</span></Link>
                    <Link to="/home/maintenance" className={linkClass("/home/maintenance")} onClick={handleLinkClick}><Wrench className="h-4 w-4" /><span>MV Monitoring</span></Link>
                  </div>
                )}
              </NavigationMenuItem>

              <NavigationMenuItem className="w-full flex-col">
                <div className={totalEnergyHeaderClass} onClick={handleTotalEnergyClick}>
                  <div className="flex items-center gap-3">
                    <PieChart className="h-5 w-5 pl-1" />
                    <span className="pl-1">Total Energy</span>
                  </div>
                  {isTotalEnergyOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
                {isTotalEnergyOpen && (
                  <div className="flex flex-col w-full pl-6 mt-1 space-y-1">
                    <Link to="/totalenergy" className={linkClass("/totalenergy")} onClick={handleLinkClick}>
                      <PieChart className="h-4 w-4" />
                      <span>Sankey Diagram</span>
                    </Link>
                    <Link to="/kwh-consumption" className={linkClass("/kwh-consumption")} onClick={handleLinkClick}>
                      <TableProperties className="h-4 w-4" />
                      <span>KWH Consumption</span>
                    </Link>
                  </div>
                )}
              </NavigationMenuItem>

              <NavigationMenuItem className="w-full"><Link to="/trafoperformance" className={linkClass("/trafoperformance")} onClick={handleLinkClick}><Activity className="h-5 w-5" /><span>Transformer Perfomance</span></Link></NavigationMenuItem>
              <NavigationMenuItem className="w-full"><Link to="/cost" className={linkClass("/cost")} onClick={handleLinkClick}><DollarSign className="h-5 w-5" /><span>Cost Analysis</span></Link></NavigationMenuItem>
              <NavigationMenuItem className="w-full"><Link to="/carbon" className={linkClass("/carbon")} onClick={handleLinkClick}><Leaf className="h-5 w-5" /><span>Carbon Footprint</span></Link></NavigationMenuItem>

              <NavigationMenuItem className="w-full flex-col">
                <div className={performanceHeaderClass} onClick={handlePerformanceClick}>
                  <div className="flex items-center gap-3"><AreaChart className="h-5 w-5 pl-1" /><span className="pl-1">Energy Performance Indicator</span></div>
                  {isPerformanceOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
                {isPerformanceOpen && (
                  <div className="flex flex-col w-full pl-6 mt-1 space-y-1">
                    <Link to="/performance?tab=chart" className={subLinkClass("/performance", "chart")} onClick={handleLinkClick}><BarChart className="h-4 w-4" /><span>Analytics</span></Link>
                    <Link to="/performance?tab=energy_input" className={subLinkClass("/performance", "energy_input")} onClick={handleLinkClick}><FileText className="h-4 w-4" /><span>Energy Input</span></Link>
                    <Link to="/performance?tab=production_input" className={subLinkClass("/performance", "production_input")} onClick={handleLinkClick}><FileText className="h-4 w-4" /><span>Production Input</span></Link>
                  </div>
                )}
              </NavigationMenuItem>

              {/* Menu SETTINGS: Dapat diakses oleh ketiga role (Administrator, Coordinator, Operator) */}
              {['Administrator', 'Coordinator', 'Operator'].includes(user?.role) && (
                <NavigationMenuItem className="w-full flex-col">
                  <div className={settingsHeaderClass} onClick={handleSettingsClick}>
                    <div className="flex items-center gap-3">
                      <SettingsIcon className="h-5 w-5 pl-1" />
                      <span className="pl-1">Settings</span>
                    </div>
                    {isSettingsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>

                  {isSettingsOpen && (
                    <div className="flex flex-col w-full pl-6 mt-1 space-y-1">
                      <Link to="/settings?tab=modbus" className={subLinkClass("/settings", "modbus")} onClick={handleLinkClick}>
                        <Activity className="h-4 w-4" />
                        <span>Modbus Device</span>
                      </Link>
                      <Link to="/settings?tab=parameters" className={subLinkClass("/settings", "parameters")} onClick={handleLinkClick}>
                        <SlidersHorizontal className="h-4 w-4" />
                        <span>Parameter</span>
                      </Link>
                      {/* Khusus untuk Operator, sub-halaman Akun tidak ditampilkan */}
                      {(user?.role === 'Administrator' || user?.role === 'Coordinator') && (
                        <Link to="/settings?tab=accounts" className={subLinkClass("/settings", "accounts")} onClick={handleLinkClick}>
                          <Users className="h-4 w-4" />
                          <span>Akun</span>
                        </Link>
                      )}
                    </div>
                  )}
                </NavigationMenuItem>
              )}

            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="p-6 shrink-0">
          <img src={EvotyLogo} alt="Evoty Logo" className="h-14 mx-auto" />
        </div>
      </div>

      {showLogoutDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full text-center">
            <h3 className="text-lg font-semibold mb-4 text-black">Confirm Logout</h3>
            <p className="mb-6 text-black">Are you sure you want to logout?</p>
            <div className="flex justify-center gap-4">
              <Button variant="destructive" onClick={handleLogout}>Logout</Button>
              <Button variant="outline" onClick={cancelLogout} className="text-black hover:bg-gray-100">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;