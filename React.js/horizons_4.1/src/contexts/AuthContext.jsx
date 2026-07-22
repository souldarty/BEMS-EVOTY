import React, { createContext, useState, useEffect, useCallback, useContext } from "react";

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 menit

// 1. Context Dibuat
const AuthContext = createContext(null);

// 2. Provider Component Dibuat
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("sessionData");
    localStorage.removeItem("lastUnloadTimestamp");
  }, []);

  useEffect(() => {
    const checkSession = () => {
      const lastUnloadTimestamp = localStorage.getItem("lastUnloadTimestamp");
      if (lastUnloadTimestamp) {
        const timeSinceLastUnload = new Date().getTime() - parseInt(lastUnloadTimestamp, 10);
        if (timeSinceLastUnload > SESSION_TIMEOUT) {
          localStorage.removeItem("sessionData");
          localStorage.removeItem("lastUnloadTimestamp");
          setUser(null);
          setLoading(false);
          return;
        }
      }
      const sessionDataString = localStorage.getItem("sessionData");
      if (sessionDataString) {
        try {
          const { user: sessionUser } = JSON.parse(sessionDataString);
          setUser(sessionUser);
        } catch (e) {
          setUser(null);
        }
      }
      localStorage.removeItem("lastUnloadTimestamp");
      setLoading(false);
    };

    checkSession();

    const handleBeforeUnload = () => {
      if (localStorage.getItem("sessionData")) {
        localStorage.setItem("lastUnloadTimestamp", new Date().getTime().toString());
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [logout]);

  const login = (userData) => {
    const sessionData = { user: userData };
    setUser(userData);
    localStorage.setItem("sessionData", JSON.stringify(sessionData));
    localStorage.removeItem("lastUnloadTimestamp");
  };

  const value = { user, login, logout, isAuthenticated: !!user };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// 3. Custom Hook Dibuat dan di-export dari sini
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};