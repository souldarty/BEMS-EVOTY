import React, { useState, useEffect, useCallback, memo } from "react";
import { useAuth } from '@/contexts/AuthContext';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import Evoty from "@/img/Evoty.png";
import { loginUser } from "@/services/apiService"; 

const API_BASE_URL = import.meta.env.VITE_API_URL
const BrandHeader = memo(() => (
  <div className="mb-6 text-center select-none">
    <h2 className="text-[32px] md:text-[36px] font-bold leading-tight text-gray-700">Maintenance</h2>
    <h2 className="text-[32px] md:text-[36px] font-bold leading-tight text-gray-700">Excellent</h2>
  </div>
));

const Login = () => {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // --- TAMBAHAN: Menangkap Pesan Penolakan (Error) dari SSO Callback ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoError = params.get('error');

    if (ssoError) {
      setError(ssoError); // Munculkan notifikasi merah
      // Bersihkan parameter ?error dari URL secara instan agar rapi kembali
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  // ---------------------------------------------------------------------

  const handleInputChange = useCallback((e) => {
    const { id, value } = e.target;
    setCredentials(prev => ({ ...prev, [id]: value }));
    if (error) setError(""); 
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const data = await loginUser(credentials);
      
      if (data.success && data.user) {
        if (data.token) {
            localStorage.setItem('tokenBEMS', data.token);
            console.log("Token JWT berhasil disimpan di browser!");
        }
        login(data.user);
      } else {
        setError(data.message || "Login gagal.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Koneksi bermasalah.");
    } finally {
      setLoading(false);
    }
  };

  const handleSSOLogin = () => {
    window.location.href = API_BASE_URL + "/login.php?SSO=login";
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-[#F8FAFC] p-4 antialiased">
      <img
        src={Evoty}
        alt="Evoty Logo"
        className="w-full max-w-[280px] md:max-w-md h-auto mb-4 object-contain"
        loading="eager"
      />

      <motion.div
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md rounded-2xl bg-white p-6 md:p-8 shadow-xl border border-gray-100"
      >
        <BrandHeader />
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username">ID</Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              value={credentials.username}
              onChange={handleInputChange}
              placeholder="Enter your ID"
              required
              disabled={loading}
              className={`h-11 transition-all ${error ? "border-red-500 focus-visible:ring-red-400" : "focus-visible:ring-blue-400"}`}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={credentials.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              required
              disabled={loading}
              className={`h-11 transition-all ${error ? "border-red-500 focus-visible:ring-red-400" : "focus-visible:ring-blue-400"}`}
            />
          </div>

          <AnimatePresence mode="popLayout">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg border border-red-100"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <Button 
            type="submit" 
            className="w-full h-11 text-base font-semibold transition-all active:scale-[0.98] bg-gray-700 hover:bg-blue-700" 
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Logging in...
              </span>
            ) : "Login"}
          </Button>
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        className="w-full max-w-md mt-4"
      >
        <Button
          type="button"
          onClick={handleSSOLogin}
          disabled={loading}
          className="w-full h-11 text-base font-semibold transition-all active:scale-[0.98] bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-md border border-blue-500 flex items-center justify-center gap-2"
        >
          <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
          Login with LDAP
        </Button>
      </motion.div>
    </div>
  );
};

export default Login;