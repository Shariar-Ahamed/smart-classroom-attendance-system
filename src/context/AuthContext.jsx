import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "../services/api";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(api.session());
  }, []);

  const login = useCallback(async (username, password) => {
    const u = await api.login(username, password);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}