import { createContext, useContext, useEffect, useState } from "react";

import {
  AUTH_CHANGE_EVENT,
  clearStoredAuth,
  getCurrentUser,
  getStoredAuth,
  loginRequest,
  persistAuth
} from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (!storedAuth?.accessToken) {
      setLoading(false);
      return;
    }

    async function restoreSession() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        setToken(storedAuth.accessToken);
      } catch {
        clearStoredAuth();
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  useEffect(() => {
    function syncAuthState() {
      const storedAuth = getStoredAuth();
      if (!storedAuth?.accessToken) {
        setUser(null);
        setToken("");
      }
    }

    window.addEventListener(AUTH_CHANGE_EVENT, syncAuthState);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, syncAuthState);
  }, []);

  async function login(credentials) {
    const session = await loginRequest(credentials);
    persistAuth(session);
    setUser(session.user);
    setToken(session.accessToken);
    return session.user;
  }

  function logout() {
    clearStoredAuth();
    setUser(null);
    setToken("");
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user && token),
        isAdmin: user?.role === "admin",
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}
