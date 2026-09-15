import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getToken, getUser, removeToken } from '../services/supabase/client';
import { apiLogin, apiSignUp } from '../services/supabase/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const u = getUser();
    if (token && u) {
      setUser(u);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (usuario, password) => {
    const res = await apiLogin(usuario, password);
    setUser(res.user);
    return res;
  }, []);

  const signUp = useCallback(async (usuario, password) => {
    const res = await apiSignUp(usuario, password);
    if (res.isNew) {
      setUser(res.user);
    }
    return res;
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signUp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return ctx;
}
