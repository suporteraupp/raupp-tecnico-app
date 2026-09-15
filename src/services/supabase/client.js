import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hvwdcsdbqpuqnsacqdpb.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_ANON_KEY) {
  console.warn('⚠️ AVISO DE SEGURANÇA: VITE_SUPABASE_ANON_KEY não foi encontrada nas variáveis de ambiente.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const getToken = () => localStorage.getItem('raupp_tech_token');
export const setToken = (token) => localStorage.setItem('raupp_tech_token', token);
export const removeToken = () => {
  localStorage.removeItem('raupp_tech_token');
  localStorage.removeItem('raupp_tech_user');
  supabase.auth.signOut().catch(() => {});
};

export const getUser = () => {
  try {
    const u = localStorage.getItem('raupp_tech_user');
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
};

export const setUser = (user) => {
  localStorage.setItem('raupp_tech_user', JSON.stringify(user));
};

export const ensureAuthSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (e) {
    console.warn('Erro ao verificar sessão Supabase:', e);
    return null;
  }
};
