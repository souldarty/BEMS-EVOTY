import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";

// This custom hook provides a clean way to access the auth context.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // This error helps catch bugs where the hook is used outside the provider.
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};