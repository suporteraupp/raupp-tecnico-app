import { supabase, ensureAuthSession } from './client';

export const apiFetchParceiros = async () => {
  try {
    await ensureAuthSession();

    // 1. Join primário com a tabela parceiros_localizacao
    const { data, error } = await supabase
      .from('parceiros')
      .select('*, localizacoes:parceiros_localizacao(*)')
      .order('nome_principal', { ascending: true });

    if (!error && data && data.length > 0) {
      return data;
    }

    // 2. Join secundário sem alias
    const { data: dataAlt, error: errAlt } = await supabase
      .from('parceiros')
      .select('*, parceiros_localizacao(*)')
      .order('nome_principal', { ascending: true });

    if (!errAlt && dataAlt && dataAlt.length > 0) {
      return dataAlt.map(p => ({
        ...p,
        localizacoes: p.localizacoes || p.parceiros_localizacao || []
      }));
    }

    // 3. Fallback manual em memória seguro por ID do parceiro
    const [parcRes, locRes] = await Promise.all([
      supabase.from('parceiros').select('*').order('nome_principal', { ascending: true }),
      supabase.from('parceiros_localizacao').select('*')
    ]);

    const parceirosList = parcRes.data || [];
    const locsGrouped = {};
    (locRes.data || []).forEach(l => {
      const pId = l.parceiros_id ?? l.id_parceiros ?? l.parceiro_id;
      if (pId !== undefined && pId !== null) {
        const key = String(pId);
        if (!locsGrouped[key]) locsGrouped[key] = [];
        locsGrouped[key].push(l);
      }
    });

    return parceirosList.map(p => {
      const pId = p.id_parceiros ?? p.id;
      return {
        ...p,
        localizacoes: p.localizacoes || locsGrouped[String(pId)] || []
      };
    });
  } catch (err) {
    console.warn('Erro ao buscar parceiros:', err);
    return [];
  }
};
