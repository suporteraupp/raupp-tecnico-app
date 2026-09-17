import { supabase, ensureAuthSession } from './client';

const VALID_OS_COLUMNS = [
  'id_os_chamados', 'numero_os', 'origem', 'parceiros_id', 'parceiros_localizacao_id',
  'equipamentos_id', 'tipo_chamado', 'status_chamado', 'medidor_atendimento',
  'os_equipamento_descricao', 'os_equipamento_serie', 'os_equipamento_acessorios',
  'tipo_os', 'status_os', 'prioridade', 'solicitante_nome', 'solicitante_telefone',
  'data_agendamento', 'descricao_problema', 'laudo_tecnico', 'tecnico_designado_id',
  'valor_servico', 'valor_pecas', 'data_abertura', 'data_fechamento', 'updated_at', 'contratos_id'
];

export const apiFetchChamados = async () => {
  try {
    await ensureAuthSession();

    // 1. Carrega tabelas de apoio para marcas e modelos
    const [marcasRes, modelosRes] = await Promise.all([
      supabase.from('equipamentos_marcas').select('*'),
      supabase.from('equipamentos_modelos').select('*')
    ]);

    const marcasMap = {};
    (marcasRes.data || []).forEach(m => {
      if (m.id_marca) marcasMap[m.id_marca] = m.nome_marca;
    });

    const modelosMap = {};
    (modelosRes.data || []).forEach(m => {
      if (m.id_modelo) modelosMap[m.id_modelo] = m.nome_modelo;
    });

    const enrichEquipamento = (eq) => {
      if (!eq) return null;
      const nomeMarca = marcasMap[eq.marca_id] || (typeof eq.marca === 'string' ? eq.marca : eq.marca?.nome_marca) || '';
      const nomeModelo = modelosMap[eq.modelo_id] || (typeof eq.modelo === 'string' ? eq.modelo : eq.modelo?.nome_modelo) || '';

      return {
        ...eq,
        nome_marca: nomeMarca,
        marca_nome: nomeMarca,
        marca: nomeMarca || eq.marca,
        nome_modelo: nomeModelo,
        modelo_nome: nomeModelo,
        modelo: nomeModelo || eq.modelo
      };
    };

    // 2. Busca OSs, Parceiros, Localizações e Equipamentos em paralelo
    const [osRes, parcRes, locRes, eqRes] = await Promise.all([
      supabase.from('os_chamados').select('*'),
      supabase.from('parceiros').select('*'),
      supabase.from('parceiros_localizacao').select('*'),
      supabase.from('equipamentos').select('*')
    ]);

    const osList = osRes.data || [];

    const parceirosMap = {};
    (parcRes.data || []).forEach(p => {
      const pId = p.id_parceiros ?? p.id_parceiro ?? p.id;
      if (pId !== undefined && pId !== null) parceirosMap[String(pId)] = p;
    });

    const locsMap = {};
    (locRes.data || []).forEach(l => {
      const lPk = l.id_parceiros_localizacao ?? l.id;
      if (lPk !== undefined && lPk !== null) locsMap[String(lPk)] = l;
    });

    const eqMapById = {};
    const eqMapBySerial = {};
    (eqRes.data || []).forEach(e => {
      const enriched = enrichEquipamento(e);
      if (e.id_equipamentos) eqMapById[String(e.id_equipamentos)] = enriched;
      if (e.numero_serie) eqMapBySerial[String(e.numero_serie).trim().toUpperCase()] = enriched;
    });

    return osList.map(os => {
      const pId = os.parceiros_id ?? os.parceiro_id;
      const lId = os.parceiros_localizacao_id ?? os.parceiro_localizacao_id;
      const eId = os.equipamentos_id ?? os.equipamento_id;
      const eSerial = os.os_equipamento_serie ? String(os.os_equipamento_serie).trim().toUpperCase() : '';

      const matchedEq = (eId != null ? eqMapById[String(eId)] : null) || (eSerial ? eqMapBySerial[eSerial] : null);

      return {
        ...os,
        parceiro: os.parceiro || (pId != null ? parceirosMap[String(pId)] : null),
        parceiro_localizacao: os.parceiro_localizacao || (lId != null ? locsMap[String(lId)] : null),
        equipamento: enrichEquipamento(os.equipamento) || matchedEq
      };
    });
  } catch (err) {
    console.warn('Erro ao buscar chamados no Supabase:', err);
    return [];
  }
};

export const apiFetchHistoricoEquipamento = async (equipamentoId) => {
  if (!equipamentoId) return [];

  try {
    await ensureAuthSession();
    const { data, error } = await supabase
      .from('os_chamados')
      .select('*, parceiro:parceiros!parceiros_id(*), parceiro_localizacao:parceiros_localizacao!parceiros_localizacao_id(*), equipamento:equipamentos!equipamentos_id(*)')
      .eq('equipamentos_id', equipamentoId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      return data;
    }

    const { data: plainData } = await supabase
      .from('os_chamados')
      .select('*')
      .eq('equipamentos_id', equipamentoId)
      .order('created_at', { ascending: false })
      .limit(10);

    return plainData || [];
  } catch (err) {
    console.warn('Erro ao buscar histórico do equipamento:', err);
    return [];
  }
};

export const apiAtualizarStatusChamado = async (id, payload) => {
  try {
    await ensureAuthSession();

    const cleanPayload = {};
    for (const k of Object.keys(payload)) {
      if (VALID_OS_COLUMNS.includes(k) && payload[k] !== undefined) {
        cleanPayload[k] = payload[k];
      }
    }

    if (payload.status_chamado === 'concluido' && !cleanPayload.data_fechamento) {
      cleanPayload.data_fechamento = new Date().toISOString();
    }

    if (payload.contador_pb_atendimento !== undefined || payload.contador_cor_atendimento !== undefined) {
      cleanPayload.medidor_atendimento = payload.contador_pb_atendimento ?? payload.contador_cor_atendimento;
    }

    const { error } = await supabase
      .from('os_chamados')
      .update(cleanPayload)
      .eq('id_os_chamados', id);

    if (!error) {
      return { success: true };
    }
    throw new Error(error.message || 'Erro ao salvar alteração no Supabase.');
  } catch (err) {
    console.warn('Erro ao atualizar no Supabase:', err);
    throw new Error(err.message || 'Falha ao atualizar Ordem de Serviço no Supabase.');
  }
};

export const apiAtualizarSuprimentosPrintwayy = async (equipamentoId, osId, supplies) => {
  try {
    await ensureAuthSession();
    const payload = {
      toner_black: supplies.black ?? null,
      toner_cyan: supplies.cyan ?? null,
      toner_magenta: supplies.magenta ?? null,
      toner_yellow: supplies.yellow ?? null,
      printwayy_last_sync: new Date().toISOString()
    };

    if (equipamentoId) {
      const { error: eqErr } = await supabase
        .from('equipamentos')
        .update(payload)
        .eq('id_equipamentos', equipamentoId);

      if (!eqErr) return { success: true };
    }

    if (osId) {
      const { error: osErr } = await supabase
        .from('os_chamados')
        .update(payload)
        .eq('id_os_chamados', osId);

      if (!osErr) return { success: true };
    }

    return { success: true, localOnly: true };
  } catch (err) {
    console.warn('Erro ao salvar suprimentos no Supabase:', err);
    return { success: false, error: err };
  }
};
