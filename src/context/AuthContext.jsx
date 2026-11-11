import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, getToken, getUser, removeToken, ensureAuthSession } from '../services/supabase/client';
import { apiLogin, apiSignUp, syncUserProfileCache } from '../services/supabase/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const token = getToken();
      const u = getUser();
      if (token && u) {
        const session = await ensureAuthSession();
        if (!active) return;
        if (session) {
          setUser(u);
          const synced = await syncUserProfileCache();
          if (active && synced) setUser(synced);
        } else {
          removeToken();
        }
      }
      if (active) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        localStorage.removeItem('raupp_tech_token');
        localStorage.removeItem('raupp_tech_user');
        setUser(null);
      }
    });
    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const login = useCallback(async (usuario, password) => {
    const res = await apiLogin(usuario, password);
    setUser(res.user);
    return res;
  }, []);

  const signUp = useCallback(async (usuario, password, email = '') => {
    const res = await apiSignUp(usuario, password, email);
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

// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return ctx;
}
