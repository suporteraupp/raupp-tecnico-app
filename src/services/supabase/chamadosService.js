import { supabase, ensureAuthSession } from './client';

const VALID_OS_COLUMNS = [
  'id_os_chamados', 'numero_os', 'origem', 'parceiros_id', 'parceiros_localizacao_id',
  'equipamentos_id', 'tipo_chamado', 'status_chamado', 'medidor_atendimento',
  'os_equipamento_descricao', 'os_equipamento_serie', 'os_equipamento_acessorios',
  'tipo_os', 'status_os', 'prioridade', 'solicitante_nome', 'solicitante_telefone',
  'data_agendamento', 'descricao_problema', 'laudo_tecnico', 'tecnico_designado_id',
  'valor_servico', 'valor_pecas', 'data_abertura', 'data_fechamento', 'updated_at', 'contratos_id'
];

const STORAGE_KEY_ALERTAS_EQUIP = 'raupp_tech_alertas_equip';

export const extrairAlertaPreventivoDoLaudo = (laudo = '') => {
  if (!laudo || !laudo.includes('--- ALERTA PREVENTIVO (PEÇA NO FIM DA VIDA ÚTIL) ---')) {
    return null;
  }
  const afterTag = laudo.split('--- ALERTA PREVENTIVO (PEÇA NO FIM DA VIDA ÚTIL) ---')[1] || '';
  const cleanBlock = afterTag
    .split(/--- (?:MEDIDORES|PEÇAS|ASSINATURA)|---ASSINATURA---/)[0]
    .trim();
  return cleanBlock || null;
};

export const salvarAlertaPreventivoLocal = (equipId, serie, textoAlerta) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALERTAS_EQUIP);
    const map = raw ? JSON.parse(raw) : {};
    if (equipId) map[`id:${equipId}`] = textoAlerta;
    if (serie) map[`sn:${String(serie).trim().toUpperCase()}`] = textoAlerta;
    localStorage.setItem(STORAGE_KEY_ALERTAS_EQUIP, JSON.stringify(map));
  } catch {
    // Ignora erro local
  }
};

const getAlertaPreventivoLocal = (equipId, serie) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALERTAS_EQUIP);
    const map = raw ? JSON.parse(raw) : {};
    if (equipId && map[`id:${equipId}`]) return map[`id:${equipId}`];
    if (serie && map[`sn:${String(serie).trim().toUpperCase()}`]) {
      return map[`sn:${String(serie).trim().toUpperCase()}`];
    }
    return null;
  } catch {
    return null;
  }
};

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

    if (osRes.error) throw osRes.error;
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

    // Descobre o último alerta preventivo registrado para cada equipamento nas OSs concluídas
    const alertasPorEquipId = {};
    const alertasPorSerie = {};
    const sortedByDate = [...osList].sort((a, b) => {
      const da = new Date(a.data_fechamento || a.updated_at || a.data_abertura || a.created_at || 0).getTime();
      const db = new Date(b.data_fechamento || b.updated_at || b.data_abertura || b.created_at || 0).getTime();
      return db - da;
    });

    sortedByDate.forEach(item => {
      const alerta = extrairAlertaPreventivoDoLaudo(item.laudo_tecnico);
      if (!alerta) return;
      const eId = item.equipamentos_id ?? item.equipamento_id;
      const eSerial = item.os_equipamento_serie ? String(item.os_equipamento_serie).trim().toUpperCase() : '';
      if (eId != null && !alertasPorEquipId[String(eId)]) {
        alertasPorEquipId[String(eId)] = alerta;
      }
      if (eSerial && !alertasPorSerie[eSerial]) {
        alertasPorSerie[eSerial] = alerta;
      }
    });

    return osList.map(os => {
      const pId = os.parceiros_id ?? os.parceiro_id;
      const lId = os.parceiros_localizacao_id ?? os.parceiro_localizacao_id;
      const eId = os.equipamentos_id ?? os.equipamento_id;
      const eSerial = os.os_equipamento_serie ? String(os.os_equipamento_serie).trim().toUpperCase() : '';

      const matchedEq = (eId != null ? eqMapById[String(eId)] : null) || (eSerial ? eqMapBySerial[eSerial] : null);
      const eqSerial = eSerial || (matchedEq?.numero_serie ? String(matchedEq.numero_serie).trim().toUpperCase() : '');

      const alertaPreventivo =
        (eId != null ? alertasPorEquipId[String(eId)] : null) ||
        (eqSerial ? alertasPorSerie[eqSerial] : null) ||
        getAlertaPreventivoLocal(eId, eqSerial);

      return {
        ...os,
        parceiro: os.parceiro || (pId != null ? parceirosMap[String(pId)] : null),
        parceiro_localizacao: os.parceiro_localizacao || (lId != null ? locsMap[String(lId)] : null),
        equipamento: enrichEquipamento(os.equipamento) || matchedEq,
        alerta_preventivo: alertaPreventivo || null
      };
    });
  } catch (err) {
    console.warn('Erro ao buscar chamados no Supabase:', err);
    throw new Error('Não foi possível carregar as Ordens de Serviço: ' + (err.message || err));
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

export const apiReabrirChamado = async (osOriginal, motivoAlerta = '') => {
  await ensureAuthSession();

  const descAtual = String(osOriginal.descricao_problema || '').trim();
  const alertaExistente = motivoAlerta || osOriginal.alerta_preventivo || '';
  const prefixoReabertura = alertaExistente
    ? `[RETORNO PREVENTIVO - LEVAR PEÇA: ${alertaExistente.replace(/^⚠️\s*/, '')}]`
    : '[CHAMADO REABERTO PELO TÉCNICO PARA RETORNO]';

  const novaDescricao = descAtual.startsWith('[RETORNO PREVENTIVO') || descAtual.startsWith('[CHAMADO REABERTO')
    ? descAtual
    : `${prefixoReabertura} ${descAtual}`.trim();

  const updatePayload = {
    status_chamado: 'aberto',
    data_fechamento: null,
    descricao_problema: novaDescricao
  };

  if (osOriginal.laudo_tecnico) {
    updatePayload.laudo_tecnico = osOriginal.laudo_tecnico;
  }

  const { error } = await supabase
    .from('os_chamados')
    .update(updatePayload)
    .eq('id_os_chamados', osOriginal.id_os_chamados);

  if (error) {
    throw new Error(error.message || 'Não foi possível reabrir o chamado.');
  }

  return { success: true, mode: 'reopened' };
};

export const apiCriarChamadoPreventivo = async (osOriginal, pecaAlerta, detalheAlerta, laudoFinalizado = '') => {
  await ensureAuthSession();

  const numOsRef = osOriginal.numero_os || String(osOriginal.id_os_chamados || '').substring(0, 6).toUpperCase();
  const descricaoPreventiva = `[PREVENTIVA - LEVAR PEÇA: ${pecaAlerta}] Diagnosticado na OS #${numOsRef} que a peça (${pecaAlerta}) vai durar poucas impressões. ${detalheAlerta ? `Obs: ${detalheAlerta}` : ''}`.trim();

  const origemSegura = String(osOriginal.origem || 'App').trim().slice(0, 10);
  const foneSeguro = osOriginal.solicitante_telefone
    ? String(osOriginal.solicitante_telefone).trim().slice(0, 20)
    : null;

  const novoChamado = {
    origem: origemSegura,
    parceiros_id: osOriginal.parceiros_id ?? null,
    parceiros_localizacao_id: osOriginal.parceiros_localizacao_id ?? null,
    equipamentos_id: osOriginal.equipamentos_id ?? osOriginal.equipamento?.id_equipamentos ?? null,
    os_equipamento_descricao: osOriginal.os_equipamento_descricao ?? null,
    os_equipamento_serie: osOriginal.os_equipamento_serie ?? osOriginal.equipamento?.numero_serie ?? null,
    tecnico_designado_id: osOriginal.tecnico_designado_id ?? null,
    contratos_id: osOriginal.contratos_id ?? null,
    tipo_chamado: osOriginal.tipo_chamado || 'Preventiva',
    tipo_os: osOriginal.tipo_os ?? null,
    status_chamado: 'aberto',
    prioridade: osOriginal.prioridade || 'Alta',
    solicitante_nome: osOriginal.solicitante_nome || 'Diagnóstico Preventivo do Técnico',
    solicitante_telefone: foneSeguro,
    descricao_problema: descricaoPreventiva,
    laudo_tecnico: `--- ALERTA PREVENTIVO (PEÇA NO FIM DA VIDA ÚTIL) ---\n⚠️ ${pecaAlerta}${detalheAlerta ? ` — ${detalheAlerta}` : ''}`,
    data_abertura: new Date().toISOString()
  };

  // Remove chaves nulas/indefinidas para evitar conflitos com defaults do banco
  const cleanInsert = {};
  Object.keys(novoChamado).forEach(k => {
    if (VALID_OS_COLUMNS.includes(k) && novoChamado[k] !== null && novoChamado[k] !== undefined) {
      cleanInsert[k] = novoChamado[k];
    }
  });

  const { data, error } = await supabase
    .from('os_chamados')
    .insert(cleanInsert)
    .select();

  if (!error && data && data.length > 0) {
    return { ...data[0], mode: 'created' };
  }

  // Fallback automático: caso o perfil do técnico não tenha permissão de INSERT (RLS) ou
  // exista restrição adicional na tabela, reabre a própria OS mantendo todo o laudo e histórico
  return await apiReabrirChamado(
    {
      ...osOriginal,
      laudo_tecnico: laudoFinalizado || osOriginal.laudo_tecnico
    },
    `${pecaAlerta}${detalheAlerta ? ` (${detalheAlerta})` : ''}`
  );
};
