import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Performance from "@/components/Performance";
import CostAnalysis from "@/components/CostAnalysis";
import CarbonFootprint from "@/components/CarbonFootprint";
import Login from "@/components/Login";
import Settings from "@/components/Settings";
import GraphicPage from "@/components/Graphic/GraphicPage";
import MaxMinPage from "@/components/Graphic/MaxMinPage";
import HomePage from "./components/TotalFactory";
import TotalProduction from "./components/TotalProduction"; 
import MvAMonitoring from "@/components/mvAMonitoring";
import MvBMonitoring from "@/components/mvBMonitoring";
import MvCMonitoring from "@/components/mvCMonitoring";
import MvUMonitoring from "@/components/mvUMonitoring";
import MvIMonitoring from "@/components/mvIMonitoring";
import TrafoPerformance from "./components/TrafoPerformance";
import TotalEnergy from "./components/TotalEnergy";
import EnergyConsumption from "./components/EnergyConsumption";
import KWHConsumptionTable from "./components/KWHConsumptionTable"; 
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from "@/components/ui/toast";

// REVISI: Route diperbarui agar mengizinkan Administrator, Coordinator, dan Operator masuk ke Settings
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  if (!user || !['Administrator', 'Coordinator', 'Operator'].includes(user?.role)) {
    return <Navigate to="home" state={{ from: location }} replace />;
  }
  return children;
};

export const MONITORING_PATHS = [
  "/mvAMonitoring",  
  "/mvBMonitoring",  
  "/mvCMonitoring",  
  "/mvUMonitoring",  
  "/mvIMonitoring",
  "/consumption"
];

function AppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // =========================================================================
  // LOGIKA SSO: Menangkap token JWT dari URL setelah callback.php
  // =========================================================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get('sso_token');
    const username = params.get('username');
    const role = params.get('role');

    if (ssoToken && username) {
      localStorage.setItem('tokenBEMS', ssoToken);
      console.log("Token JWT dari SSO berhasil disimpan ke browser!");

      login({
        username: username,
        role: role || 'Operator' 
      });

      navigate('/home/maintenance', { replace: true });
    }
  }, [login, navigate]);
  // =========================================================================

  useEffect(() => {
    if (location.pathname === "/totalenergy" || location.pathname === "/kwh-consumption") {
      setIsSidebarOpen(true);
    }
  }, [location.pathname]);

  if (!user) {
    return <Login />;
  }

  const isMonitoringPage = MONITORING_PATHS.includes(location.pathname);

  const dashboardPaths = [
    "/",
    "/home",
    "/home/produksi",     
    "/home/maintenance",  
    "/totalenergy",
    "/kwh-consumption",
    "/trafoperformance",
  ];

  const isFullWidthPage = dashboardPaths.includes(location.pathname) || isMonitoringPage;

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const hideFloatingMenuPaths = ['/carbon', '/cost', '/home/produksi', '/home/maintenance', '/performance'];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900">

      {!isMonitoringPage && (
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={toggleSidebar}
        />
      )}

      <div
        className={`flex-1 flex flex-col min-h-screen overflow-hidden transition-all duration-300 ease-in-out bg-[#0f172a] ${
          isSidebarOpen && !isMonitoringPage ? 'lg:ml-64' : 'ml-0'
        }`}
      >
        
        {!isMonitoringPage && !isSidebarOpen && !hideFloatingMenuPaths.includes(location.pathname) && (
          <div className="p-4 absolute z-40">
            <button 
              onClick={toggleSidebar} 
              className="bg-slate-800 p-2 rounded-md hover:bg-slate-700 shadow-lg border border-slate-600 transition-all"
            >
              <Menu className="h-6 w-6 text-white" />
            </button>
          </div>
        )}

        <div
          className={`flex-1 overflow-auto h-full w-full ${
            isFullWidthPage ? 'p-0' : 'px-6 py-6 bg-slate-900'
          }`}
        >
          <div className={`w-full h-full ${isFullWidthPage ? '' : 'max-w-8xl mx-auto space-y-6'}`}>
            <Routes>
              <Route path="/"                element={<Navigate to="/home/maintenance" replace />} />
              <Route path="/home"            element={<Navigate to="/home/maintenance" replace />} />
              <Route path="/home/maintenance" element={<HomePage onToggleSidebar={toggleSidebar} />} />
              <Route path="/home/produksi"    element={<TotalProduction onToggleSidebar={toggleSidebar} />} />
              
              <Route path="/performance" element={<Performance onToggleSidebar={toggleSidebar} />} />
              <Route path="/cost"             element={<CostAnalysis onToggleSidebar={toggleSidebar} />} />
              <Route path="/carbon"           element={<CarbonFootprint onToggleSidebar={toggleSidebar} />} />
              <Route path="/trafoperformance" element={<TrafoPerformance />} />
              
              <Route path="/totalenergy"      element={<TotalEnergy />} />
              <Route path="/kwh-consumption"  element={<KWHConsumptionTable />} /> 

              <Route path="/mvAMonitoring"    element={<MvAMonitoring />} />
              <Route path="/mvBMonitoring"    element={<MvBMonitoring />} />
              <Route path="/mvCMonitoring"    element={<MvCMonitoring />} />
              <Route path="/mvUMonitoring"    element={<MvUMonitoring />} />
              <Route path="/mvIMonitoring"    element={<MvIMonitoring />} />

              <Route path="/graphic/:trafoId"       element={<GraphicPage />} />
              <Route path="/graphic/:trafoId/stats" element={<MaxMinPage />} />
              <Route path="/consumption"            element={<EnergyConsumption />} />
              <Route path="/settings"               element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="*"                       element={<Navigate to="/home/maintenance" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}

const App = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter basename={import.meta.env.VITE_BASE_PATH}>
          <AppContent />
        </BrowserRouter>
        <Toaster />
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;