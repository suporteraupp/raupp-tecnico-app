/**
 * Módulo de Gestão de Estoque Volante (Maleta do Técnico / Carro)
 * Raupp Técnico App - ERP Soluções em Impressão
 * Conectado diretamente à tabela 'produtos' no Supabase PostgreSQL
 */

import { supabase } from './api';

const STORAGE_KEY_ESTOQUE = 'raupp_tech_maleta_estoque';
const STORAGE_KEY_HISTORICO = 'raupp_tech_maleta_historico';
const STORAGE_KEY_SOLICITACOES = 'raupp_tech_maleta_solicitacoes';

// Helper: Converte linha da tabela 'produtos' do Supabase para o contrato de Peça do App
const produtoToPeca = (p) => ({
  id: p.id_produtos,
  codigo: p.codigo_sku || String(p.id_produtos).substring(0, 8).toUpperCase(),
  nome: p.nome_produto,
  categoria: p.categoria || 'Peças',
  compatibilidade: p.marca_modelo_compativel || 'Multimarca',
  quantidade: typeof p.qtd_estoque === 'number' ? p.qtd_estoque : parseInt(p.qtd_estoque) || 0,
  qtdMinima: typeof p.qtd_estoque_minimo === 'number' ? p.qtd_estoque_minimo : parseInt(p.qtd_estoque_minimo) || 1,
  unidade: p.unidade_medida || 'unid',
  cor: (p.categoria || '').toLowerCase().includes('insumo') || (p.categoria || '').toLowerCase().includes('toner') ? '#00a2e8' : '#a855f7'
});

// Helper: Obtém cache local de segurança (Fallback Offline)
const getEstoqueCache = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ESTOQUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Helper: Salva cache local
const salvarEstoqueCache = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY_ESTOQUE, JSON.stringify(items));
  } catch (err) {
    console.error('Erro ao atualizar cache local do estoque:', err);
  }
};

/**
 * Busca todas as peças/produtos do estoque diretamente na tabela 'produtos' do Supabase
 */
export const getEstoqueVolante = async () => {
  try {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('nome_produto', { ascending: true });

    if (!error && data && data.length > 0) {
      const pecas = data.map(produtoToPeca);
      salvarEstoqueCache(pecas);
      return pecas;
    }

    if (error) {
      console.warn('Erro ao consultar tabela produtos no Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Falha na comunicação com o Supabase produtos, usando cache local:', err);
  }

  return getEstoqueCache();
};

/**
 * Salva a lista inteira no cache local (se necessário)
 */
export const salvarEstoqueVolante = async (items) => {
  salvarEstoqueCache(items);
};

/**
 * Obtém histórico de movimentações (Cache local de histórico + auditoria)
 */
export const getHistoricoMovimentacoes = async () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORICO);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Registra movimentação no histórico
 */
export const registrarHistorico = async (tipo, pecaNome, quantidade, detalhe) => {
  const novoReg = {
    id: 'h-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    data: new Date().toISOString(),
    tipo,
    pecaNome,
    quantidade,
    detalhe
  };

  try {
    const historico = await getHistoricoMovimentacoes();
    historico.unshift(novoReg);
    localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(historico.slice(0, 50)));
  } catch (err) {
    console.error('Erro ao gravar histórico:', err);
  }

  return novoReg;
};

/**
 * Atualiza a quantidade em estoque de um produto diretamente na tabela 'produtos' do Supabase
 */
export const atualizarQuantidadePeca = async (pecaId, delta, motivo = 'Ajuste manual') => {
  const pecas = await getEstoqueVolante();
  const index = pecas.findIndex(p => String(p.id) === String(pecaId) || p.codigo === pecaId);
  if (index === -1) throw new Error('Peça/Produto não encontrado no estoque.');

  const peca = pecas[index];
  const novaQtd = Math.max(0, (peca.quantidade || 0) + delta);
  pecas[index] = { ...peca, quantidade: novaQtd };

  salvarEstoqueCache(pecas);

  const tipo = delta < 0 ? 'baixa_manual' : 'entrada_manual';
  await registrarHistorico(tipo, peca.nome, Math.abs(delta), motivo);

  // Atualização direta no Supabase (tabela produtos)
  try {
    const isUuid = peca.id && !String(peca.id).startsWith('p-');
    let query = supabase.from('produtos').update({
      qtd_estoque: novaQtd,
      updated_at: new Date().toISOString()
    });

    if (isUuid) {
      query = query.eq('id_produtos', peca.id);
    } else {
      query = query.eq('codigo_sku', peca.codigo);
    }

    const { error } = await query;
    if (error) {
      console.warn('Erro ao atualizar quantidade na tabela produtos do Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Falha na requisição ao Supabase produtos:', err);
  }

  return pecas[index];
};

/**
 * Cadastra uma nova peça/produto diretamente na tabela 'produtos' do Supabase
 */
export const cadastrarNovaPeca = async (dadosPeca) => {
  const pecas = await getEstoqueVolante();
  const sku = dadosPeca.codigo?.trim().toUpperCase() || 'PEC-' + Math.floor(Math.random() * 8999 + 1000);
  const qtd = parseInt(dadosPeca.quantidade) || 0;
  const qtdMin = parseInt(dadosPeca.qtdMinima) || 1;

  const novaPecaLocal = {
    id: 'p-' + Date.now(),
    codigo: sku,
    nome: dadosPeca.nome.trim(),
    categoria: dadosPeca.categoria || 'Peças',
    compatibilidade: dadosPeca.compatibilidade?.trim() || 'Multimarca',
    quantidade: qtd,
    qtdMinima: qtdMin,
    unidade: dadosPeca.unidade || 'UN',
    cor: dadosPeca.categoria === 'Toner' ? '#00a2e8' : '#a855f7'
  };

  pecas.unshift(novaPecaLocal);
  salvarEstoqueCache(pecas);

  await registrarHistorico('entrada_manual', novaPecaLocal.nome, qtd, 'Cadastro de nova peça no estoque');

  // Inserção na tabela 'produtos' do Supabase
  try {
    const payload = {
      codigo_sku: sku,
      nome_produto: dadosPeca.nome.trim(),
      categoria: dadosPeca.categoria || 'Peças',
      marca_modelo_compativel: dadosPeca.compatibilidade?.trim() || 'Multimarca',
      qtd_estoque: qtd,
      qtd_estoque_minimo: qtdMin,
      unidade_medida: dadosPeca.unidade || 'UN',
      status: 'Ativo'
    };

    const { data, error } = await supabase
      .from('produtos')
      .insert(payload)
      .select();

    if (!error && data && data.length > 0) {
      novaPecaLocal.id = data[0].id_produtos;
      pecas[0].id = data[0].id_produtos;
      salvarEstoqueCache(pecas);
    } else if (error) {
      console.warn('Erro ao inserir produto na tabela produtos do Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Erro ao cadastrar peça no Supabase:', err);
  }

  return novaPecaLocal;
};

/**
 * Registra baixa automática de peças na tabela 'produtos' do Supabase ao concluir uma OS
 */
export const darBaixaPecasOS = async (osNumero, clienteNome, pecasUtilizadas) => {
  if (!pecasUtilizadas || pecasUtilizadas.length === 0) return;

  const pecas = await getEstoqueVolante();

  for (const pu of pecasUtilizadas) {
    const idx = pecas.findIndex(item => String(item.id) === String(pu.id) || item.codigo === pu.codigo);
    if (idx !== -1) {
      const qtdUsada = parseInt(pu.qtdUtilizada) || 1;
      const novaQtd = Math.max(0, pecas[idx].quantidade - qtdUsada);
      pecas[idx].quantidade = novaQtd;

      await registrarHistorico(
        'baixa_os',
        pecas[idx].nome,
        qtdUsada,
        `Consumo na OS #${osNumero || 'S/N'} (${clienteNome || 'Cliente'})`
      );

      // Atualiza Supabase (tabela produtos)
      try {
        const isUuid = pecas[idx].id && !String(pecas[idx].id).startsWith('p-');
        let query = supabase.from('produtos').update({
          qtd_estoque: novaQtd,
          updated_at: new Date().toISOString()
        });

        if (isUuid) {
          query = query.eq('id_produtos', pecas[idx].id);
        } else {
          query = query.eq('codigo_sku', pecas[idx].codigo);
        }

        await query;
      } catch (err) {
        console.warn('Erro ao atualizar baixa de produtos no Supabase:', err);
      }
    }
  }

  salvarEstoqueCache(pecas);
};

/**
 * Obter solicitações de reposição
 */
export const getSolicitacoesReposicao = async () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SOLICITACOES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Criar solicitação de reposição
 */
export const criarSolicitacaoReposicao = async (pecaId, pecaNome, qtdSolicitada, observacao = '') => {
  const novaSol = {
    id: 'sol-' + Date.now(),
    data: new Date().toISOString(),
    pecaId,
    pecaNome,
    qtdSolicitada: parseInt(qtdSolicitada) || 1,
    observacao,
    status: 'pendente'
  };

  try {
    const solicitacoes = await getSolicitacoesReposicao();
    solicitacoes.unshift(novaSol);
    localStorage.setItem(STORAGE_KEY_SOLICITACOES, JSON.stringify(solicitacoes));
  } catch (err) {
    console.error('Erro ao gravar solicitação local:', err);
  }

  await registrarHistorico(
    'solicitacao',
    pecaNome,
    novaSol.qtdSolicitada,
    `Solicitação de reposição para almoxarifado ${observacao ? `("${observacao}")` : ''}`
  );

  return novaSol;
};
