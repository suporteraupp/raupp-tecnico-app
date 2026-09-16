import { createClient } from '@supabase/supabase-js';

// Carrega variáveis com prefixo VITE_ exigido pelo Vite
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY;

// Verificação explícita de variáveis de ambiente
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ ERRO SUPABASE: Variáveis de ambiente não encontradas!');
  console.error('Certifique-se de definir VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ou VITE_SUPABASE_KEY) no seu arquivo .env.');
  console.log('Valores atuais:', {
    VITE_SUPABASE_URL: SUPABASE_URL || 'UNDEFINED',
    VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? 'DEFINIDA (oculta por segurança)' : 'UNDEFINED'
  });
} else {
  console.log('⚡ Supabase Client inicializado com a URL:', SUPABASE_URL);
}

export const supabase = createClient(
  SUPABASE_URL || 'https://hvwdcsdbqpuqnsacqdpb.supabase.co',
  SUPABASE_ANON_KEY || ''
);

/**
 * Função utilitária para testar a conexão com a tabela tb_clientes com logs detalhados
 */
export const testarConexaoTbClientes = async () => {
  console.log('🔍 Iniciando teste de consulta na tabela [tb_clientes]...');
  console.log('URL de destino:', SUPABASE_URL);

  try {
    const { data, error, status, statusText } = await supabase
      .from('tb_clientes')
      .select('*');

    if (error) {
      console.error('❌ ERRO NA CONSULTA SUPABASE:');
      console.error('Status HTTP:', status, statusText);
      console.error('Código do Erro:', error.code);
      console.error('Mensagem:', error.message);
      console.error('Detalhes:', error.details);
      console.error('Dica (Hint):', error.hint);
      console.error('Objeto de erro completo:', error);
      return { success: false, error };
    }

    console.log('✅ SUCESSO! Dados retornados da tabela tb_clientes:');
    console.table(data);
    return { success: true, data };
  } catch (err) {
    console.error('💥 EXCEÇÃO INESPERADA AO CONECTAR AO SUPABASE:', err);
    return { success: false, error: err };
  }
};

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
