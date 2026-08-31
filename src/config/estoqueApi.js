/**
 * Módulo de Gestão de Estoque Volante (Maleta do Técnico / Carro)
 * Raupp Técnico App - ERP Soluções em Impressão
 */

const STORAGE_KEY_ESTOQUE = 'raupp_tech_maleta_estoque';
const STORAGE_KEY_HISTORICO = 'raupp_tech_maleta_historico';
const STORAGE_KEY_SOLICITACOES = 'raupp_tech_maleta_solicitacoes';

// Lista inicial de peças padrão na maleta do técnico (Seed Data)
const INITIAL_MALETA_ITEMS = [
  {
    id: 'p-101',
    codigo: 'TN-CF226A',
    nome: 'Toner HP CF226A / 26A',
    categoria: 'Toner',
    compatibilidade: 'HP LaserJet Pro M402 / M426',
    quantidade: 3,
    qtdMinima: 1,
    unidade: 'unid',
    cor: '#00a2e8'
  },
  {
    id: 'p-102',
    codigo: 'TN-TN580',
    nome: 'Toner Brother TN-580 / 650',
    categoria: 'Toner',
    compatibilidade: 'Brother DCP-8080 / 8085 / 8480',
    quantidade: 2,
    qtdMinima: 1,
    unidade: 'unid',
    cor: '#00a2e8'
  },
  {
    id: 'p-103',
    codigo: 'TN-W2022A',
    nome: 'Toner Colorido Amarelo HP W2022A (416A)',
    categoria: 'Toner',
    compatibilidade: 'HP Color LaserJet Pro M454 / M479',
    quantidade: 1,
    qtdMinima: 1,
    unidade: 'unid',
    cor: '#eab308'
  },
  {
    id: 'p-104',
    codigo: 'DR-DR520',
    nome: 'Cilindro / Fotocondutor Brother DR-520',
    categoria: 'Cilindro',
    compatibilidade: 'Brother DCP-8080 / 8085 / MFC-8890',
    quantidade: 1,
    qtdMinima: 1,
    unidade: 'unid',
    cor: '#a855f7'
  },
  {
    id: 'p-105',
    codigo: 'ROL-HP402',
    nome: 'Kit Rolete de Tração (Pickup Roller) HP M402',
    categoria: 'Roletes',
    compatibilidade: 'HP LaserJet M402 / M403 / M426',
    quantidade: 4,
    qtdMinima: 2,
    unidade: 'kit',
    cor: '#10b981'
  },
  {
    id: 'p-106',
    codigo: 'LAM-RIC301',
    nome: 'Lâmina de Limpeza do Cilindro Ricoh MP 301',
    categoria: 'Peça Interna',
    compatibilidade: 'Ricoh Aficio MP 201 / MP 301',
    quantidade: 2,
    qtdMinima: 1,
    unidade: 'unid',
    cor: '#f97316'
  },
  {
    id: 'p-107',
    codigo: 'CHIP-CF258A',
    nome: 'Chip para Toner HP CF258A (58A)',
    categoria: 'Chip',
    compatibilidade: 'HP LaserJet M404 / M428',
    quantidade: 5,
    qtdMinima: 2,
    unidade: 'unid',
    cor: '#ec4899'
  }
];

// Obtém todas as peças do estoque volante
export const getEstoqueVolante = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ESTOQUE);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_ESTOQUE, JSON.stringify(INITIAL_MALETA_ITEMS));
      return INITIAL_MALETA_ITEMS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler estoque volante:', err);
    return INITIAL_MALETA_ITEMS;
  }
};

// Salva a lista de peças do estoque volante
export const salvarEstoqueVolante = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY_ESTOQUE, JSON.stringify(items));
  } catch (err) {
    console.error('Erro ao salvar estoque volante:', err);
  }
};

// Obtém o histórico de movimentações
export const getHistoricoMovimentacoes = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORICO);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Adiciona um registro no histórico
export const registrarHistorico = (tipo, pecaNome, quantidade, detalhe) => {
  try {
    const historico = getHistoricoMovimentacoes();
    const novoReg = {
      id: 'h-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      data: new Date().toISOString(),
      tipo, // 'baixa_os', 'entrada_manual', 'baixa_manual', 'solicitacao'
      pecaNome,
      quantidade,
      detalhe
    };
    historico.unshift(novoReg);
    // Limita aos últimos 50 registros
    localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(historico.slice(0, 50)));
    return novoReg;
  } catch (err) {
    console.error('Erro ao registrar histórico:', err);
  }
};

// Atualiza a quantidade de uma peça (delta pode ser positivo para entrada ou negativo para baixa)
export const atualizarQuantidadePeca = (pecaId, delta, motivo = 'Ajuste manual') => {
  const items = getEstoqueVolante();
  const index = items.findIndex(p => p.id === pecaId);
  if (index === -1) throw new Error('Peça não encontrada no estoque volante.');

  const peca = items[index];
  const novaQtd = Math.max(0, (peca.quantidade || 0) + delta);
  items[index] = { ...peca, quantidade: novaQtd };

  salvarEstoqueVolante(items);

  const tipo = delta < 0 ? 'baixa_manual' : 'entrada_manual';
  registrarHistorico(tipo, peca.nome, Math.abs(delta), motivo);

  return items[index];
};

// Adiciona uma nova peça ao catálogo da maleta
export const cadastrarNovaPeca = (dadosPeca) => {
  const items = getEstoqueVolante();
  const novaPeca = {
    id: 'p-' + Date.now(),
    codigo: dadosPeca.codigo?.trim().toUpperCase() || 'PEC-' + Math.floor(Math.random() * 8999 + 1000),
    nome: dadosPeca.nome.trim(),
    categoria: dadosPeca.categoria || 'Toner',
    compatibilidade: dadosPeca.compatibilidade?.trim() || 'Multimarca',
    quantidade: parseInt(dadosPeca.quantidade) || 0,
    qtdMinima: parseInt(dadosPeca.qtdMinima) || 1,
    unidade: dadosPeca.unidade || 'unid',
    cor: dadosPeca.categoria === 'Toner' ? '#00a2e8' : '#a855f7'
  };

  items.unshift(novaPeca);
  salvarEstoqueVolante(items);
  registrarHistorico('entrada_manual', novaPeca.nome, novaPeca.quantidade, 'Cadastro de nova peça na maleta');
  return novaPeca;
};

// Registra baixa de peças na conclusão de uma OS
export const darBaixaPecasOS = (osNumero, clienteNome, pecasUtilizadas) => {
  if (!pecasUtilizadas || pecasUtilizadas.length === 0) return;

  const items = getEstoqueVolante();

  pecasUtilizadas.forEach(pu => {
    const idx = items.findIndex(item => item.id === pu.id);
    if (idx !== -1) {
      const qtdUsada = parseInt(pu.qtdUtilizada) || 1;
      items[idx].quantidade = Math.max(0, items[idx].quantidade - qtdUsada);

      registrarHistorico(
        'baixa_os',
        items[idx].nome,
        qtdUsada,
        `Consumo na OS #${osNumero || 'S/N'} (${clienteNome || 'Cliente'})`
      );
    }
  });

  salvarEstoqueVolante(items);
};

// Obter solicitações de reposição
export const getSolicitacoesReposicao = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SOLICITACOES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Registrar solicitação de reposição para o almoxarifado central
export const criarSolicitacaoReposicao = (pecaId, pecaNome, qtdSolicitada, observacao = '') => {
  const solicitacoes = getSolicitacoesReposicao();
  const novaSol = {
    id: 'sol-' + Date.now(),
    data: new Date().toISOString(),
    pecaId,
    pecaNome,
    qtdSolicitada: parseInt(qtdSolicitada) || 1,
    observacao,
    status: 'pendente' // 'pendente', 'aprovada', 'atendida'
  };
  solicitacoes.unshift(novaSol);
  localStorage.setItem(STORAGE_KEY_SOLICITACOES, JSON.stringify(solicitacoes));

  registrarHistorico(
    'solicitacao',
    pecaNome,
    novaSol.qtdSolicitada,
    `Solicitação de reposição enviada ao almoxarifado ${observacao ? `("${observacao}")` : ''}`
  );

  return novaSol;
};
