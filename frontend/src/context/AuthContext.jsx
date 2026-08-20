import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem("ht_user")); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  useEffect(() => {
    const MIN_SPLASH_MS = 1600;
    const startedAt = Date.now();
    const finishLoading = () => {
      const remaining = MIN_SPLASH_MS - (Date.now() - startedAt);
      if (remaining > 0) setTimeout(() => setLoading(false), remaining);
      else setLoading(false);
    };

    const token = localStorage.getItem("ht_token");
    if (!token) { finishLoading(); return; }
    authAPI.me()
      .then(r => { setUser(r.user); finishLoading(); })
      .catch(() => {
        localStorage.removeItem("ht_token");
        localStorage.removeItem("ht_user");
        setUser(null);
        finishLoading();
      });
  }, []);

  const login = async (username, password) => {
    const res = await authAPI.login({ username, password });
    localStorage.setItem("ht_token", res.token);
    localStorage.setItem("ht_user",  JSON.stringify(res.user));
    setUser(res.user);
    setJustLoggedIn(true);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem("ht_token");
    localStorage.removeItem("ht_user");
    setUser(null);
    setJustLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, justLoggedIn, clearJustLoggedIn: () => setJustLoggedIn(false) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
