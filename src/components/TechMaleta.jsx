import React, { useState, useEffect, useCallback } from 'react';
import {
  getEstoqueVolante,
  atualizarQuantidadePeca,
  cadastrarNovaPeca,
  getHistoricoMovimentacoes,
  criarSolicitacaoReposicao,
  getSolicitacoesReposicao
} from '../config/estoqueApi';

export function TechMaleta({ showToast }) {
  const [estoque, setEstoque] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showReposicaoModal, setShowReposicaoModal] = useState(false);

  // Estados dos Formulários
  const [newPeca, setNewPeca] = useState({
    codigo: '',
    nome: '',
    categoria: 'Toner',
    compatibilidade: '',
    quantidade: '2',
    qtdMinima: '1',
    unidade: 'unid'
  });

  const [solicitarData, setSolicitarData] = useState({
    pecaId: '',
    quantidade: '1',
    observacao: ''
  });

  const [historico, setHistorico] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);

  const carregarDados = useCallback(() => {
    const items = getEstoqueVolante();
    setEstoque(items);
    setHistorico(getHistoricoMovimentacoes());
    setSolicitacoes(getSolicitacoesReposicao());
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleUpdateQtd = (id, delta, motivo) => {
    try {
      atualizarQuantidadePeca(id, delta, motivo);
      carregarDados();
      const acao = delta > 0 ? 'Entrada' : 'Baixa';
      showToast(`${acao} registrada com sucesso no estoque volante!`, 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar estoque.', 'error');
    }
  };

  const handleCreatePeca = (e) => {
    e.preventDefault();
    if (!newPeca.nome.trim()) {
      showToast('Por favor, informe a descrição da peça.', 'warning');
      return;
    }
    cadastrarNovaPeca(newPeca);
    showToast('Nova peça adicionada à maleta do técnico!', 'success');
    setShowAddModal(false);
    setNewPeca({
      codigo: '',
      nome: '',
      categoria: 'Toner',
      compatibilidade: '',
      quantidade: '2',
      qtdMinima: '1',
      unidade: 'unid'
    });
    carregarDados();
  };

  const handleSendSolicitacao = (e) => {
    e.preventDefault();
    if (!solicitarData.pecaId) {
      showToast('Selecione a peça para solicitar ao almoxarifado.', 'warning');
      return;
    }

    const peca = estoque.find(p => p.id === solicitarData.pecaId);
    if (!peca) return;

    criarSolicitacaoReposicao(
      peca.id,
      peca.nome,
      solicitarData.quantidade,
      solicitarData.observacao
    );

    showToast(`Solicitação de ${solicitarData.quantidade}x ${peca.nome} enviada ao almoxarifado!`, 'success');
    setShowReposicaoModal(false);
    setSolicitarData({ pecaId: '', quantidade: '1', observacao: '' });
    carregarDados();
  };

  // Filtragem
  const filteredEstoque = estoque.filter(item => {
    const matchSearch =
      item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.compatibilidade.toLowerCase().includes(searchTerm.toLowerCase());

    const matchCategory =
      categoryFilter === 'todos' ||
      item.categoria.toLowerCase() === categoryFilter.toLowerCase();

    return matchSearch && matchCategory;
  });

  // Estatísticas do Estoque Volante
  const totalModelos = estoque.length;
  const totalUnidades = estoque.reduce((acc, item) => acc + (item.quantidade || 0), 0);
  const itensEmAlerta = estoque.filter(item => item.quantidade <= item.qtdMinima);
  const categoriasUnicas = Array.from(new Set(estoque.map(i => i.categoria)));

  return (
    <div className="maleta-wrapper">
      {/* Banner Responsivo da Maleta */}
      <div className="maleta-banner">
        <div className="maleta-banner-header">
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-briefcase" style={{ color: '#00a2e8' }}></i>
              Estoque Volante do Técnico
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Gestão de suprimentos e peças em posse no veículo / maleta
            </p>
          </div>

          <div className="maleta-banner-actions">
            <button
              onClick={() => setShowReposicaoModal(true)}
              className="btn-mobile"
              style={{
                background: 'rgba(249, 115, 22, 0.2)',
                color: '#fb923c',
                border: '1px solid rgba(249, 115, 22, 0.4)',
                fontSize: '0.8rem'
              }}
            >
              <i className="fa-solid fa-paper-plane"></i> Pedir Reposição
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-mobile"
              style={{
                background: 'rgba(0, 162, 232, 0.2)',
                color: '#38bdf8',
                border: '1px solid rgba(0, 162, 232, 0.4)',
                fontSize: '0.8rem'
              }}
            >
              <i className="fa-solid fa-plus"></i> Nova Peça
            </button>
          </div>
        </div>

        {/* Grid de Métricas Responsivo */}
        <div className="maleta-metrics-grid">
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px', padding: '10px', border: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#38bdf8' }}>{totalUnidades}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Peças no Carro</div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px', padding: '10px', border: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#a855f7' }}>{totalModelos}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Modelos Na Maleta</div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px', padding: '10px', border: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f97316' }}>{solicitacoes.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Pedidos Central</div>
          </div>

          <div
            onClick={() => setShowHistoryModal(true)}
            style={{
              background: itensEmAlerta.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              borderRadius: '10px',
              padding: '10px',
              border: `1px solid ${itensEmAlerta.length > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              textAlign: 'center',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: itensEmAlerta.length > 0 ? '#f87171' : '#34d399' }}>
              {itensEmAlerta.length}
            </div>
            <div style={{ fontSize: '0.7rem', color: itensEmAlerta.length > 0 ? '#fca5a5' : '#6ee7b7', textTransform: 'uppercase' }}>
              {itensEmAlerta.length > 0 ? '⚠️ Alerta Reposição' : '✅ Nível Seguro'}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}></i>
          <input
            type="text"
            className="input-styled"
            placeholder="Buscar peça por código, nome ou impressora..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              &times;
            </button>
          )}
        </div>

        {/* Chips de Categoria com Scroll Touch Suave */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          <button
            onClick={() => setCategoryFilter('todos')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '0.78rem',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: categoryFilter === 'todos' ? '#00a2e8' : 'rgba(255,255,255,0.06)',
              color: categoryFilter === 'todos' ? '#ffffff' : '#94a3b8'
            }}
          >
            Todos ({estoque.length})
          </button>
          {categoriasUnicas.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: categoryFilter === cat ? '#00a2e8' : 'rgba(255,255,255,0.06)',
                color: categoryFilter === cat ? '#ffffff' : '#94a3b8'
              }}
            >
              {cat} ({estoque.filter(i => i.categoria === cat).length})
            </button>
          ))}
          <button
            onClick={() => setShowHistoryModal(true)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '0.78rem',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: 'rgba(30, 41, 59, 0.6)',
              color: '#cbd5e1',
              flexShrink: 0
            }}
          >
            <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '6px', color: '#38bdf8' }}></i>
            Histórico
          </button>
        </div>
      </div>

      {/* Grid Responsivo de Cards de Peças */}
      {filteredEstoque.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <i className="fa-solid fa-box-open fa-3x" style={{ opacity: 0.4 }}></i>
          <p style={{ marginTop: '12px', fontWeight: 500 }}>Nenhuma peça encontrada com este filtro na maleta.</p>
        </div>
      ) : (
        <div className="maleta-cards-grid">
          {filteredEstoque.map(item => {
            const isZero = item.quantidade === 0;
            const isLow = item.quantidade <= item.qtdMinima && !isZero;

            let badgeBg = 'rgba(16, 185, 129, 0.15)';
            let badgeColor = '#34d399';
            let badgeText = `${item.quantidade} ${item.unidade || 'unid'}`;

            if (isZero) {
              badgeBg = 'rgba(239, 68, 68, 0.2)';
              badgeColor = '#f87171';
              badgeText = 'SEM ESTOQUE (0)';
            } else if (isLow) {
              badgeBg = 'rgba(245, 158, 11, 0.2)';
              badgeColor = '#fbbf24';
              badgeText = `BAIXO (${item.quantidade} ${item.unidade || 'unid'})`;
            }

            return (
              <div
                key={item.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.75)',
                  borderRadius: '14px',
                  border: isZero
                    ? '1px solid rgba(239, 68, 68, 0.4)'
                    : isLow
                    ? '1px solid rgba(245, 158, 11, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.06)', color: '#94a3b8', letterSpacing: '0.5px' }}>
                      {item.codigo}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '3px 10px', borderRadius: '12px', background: badgeBg, color: badgeColor }}>
                      {badgeText}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '0.98rem', fontWeight: '700', color: '#f8fafc', margin: '0 0 6px 0', lineHeight: 1.3 }}>
                    {item.nome}
                  </h3>

                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-print" style={{ color: '#64748b' }}></i>
                    {item.compatibilidade}
                  </p>
                </div>

                {/* Ações Rápidas de Ajuste (+ Entrada / - Baixa) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', gap: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Mínimo: {item.qtdMinima} {item.unidade}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => handleUpdateQtd(item.id, -1, 'Baixa manual via app')}
                      disabled={item.quantidade === 0}
                      title="Dar baixa em 1 unidade"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: item.quantidade === 0 ? 'not-allowed' : 'pointer',
                        opacity: item.quantidade === 0 ? 0.4 : 1
                      }}
                    >
                      <i className="fa-solid fa-minus"></i>
                    </button>

                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f8fafc', minWidth: '24px', textAlign: 'center' }}>
                      {item.quantidade}
                    </span>

                    <button
                      onClick={() => handleUpdateQtd(item.id, 1, 'Entrada manual via app')}
                      title="Adicionar 1 unidade"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fa-solid fa-plus"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Cadastro de Nova Peça com Form-Row Responsivo */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-title-row">
              <h3 className="modal-title">
                <i className="fa-solid fa-box-archive" style={{ color: '#38bdf8', marginRight: '8px' }}></i>
                Cadastrar Peça na Maleta
              </h3>
              <button className="modal-close-icon" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreatePeca}>
              <div className="form-group-field">
                <label className="form-label-styled">Descrição / Nome da Peça *</label>
                <input
                  type="text"
                  className="input-styled"
                  placeholder="Ex: Toner HP CF258A (58A)"
                  value={newPeca.nome}
                  onChange={(e) => setNewPeca({ ...newPeca, nome: e.target.value })}
                  required
                />
              </div>

              <div className="form-row-responsive">
                <div className="form-group-field">
                  <label className="form-label-styled">Código Peça/PN</label>
                  <input
                    type="text"
                    className="input-styled"
                    placeholder="Ex: TN-CF258A"
                    value={newPeca.codigo}
                    onChange={(e) => setNewPeca({ ...newPeca, codigo: e.target.value })}
                  />
                </div>

                <div className="form-group-field">
                  <label className="form-label-styled">Categoria</label>
                  <select
                    className="input-styled"
                    value={newPeca.categoria}
                    onChange={(e) => setNewPeca({ ...newPeca, categoria: e.target.value })}
                  >
                    <option value="Toner">Toner</option>
                    <option value="Cilindro">Cilindro / Drum</option>
                    <option value="Roletes">Roletes / Pickup</option>
                    <option value="Peça Interna">Peça Interna / Fusor</option>
                    <option value="Chip">Chip</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="form-group-field">
                <label className="form-label-styled">Impressora / Compatibilidade</label>
                <input
                  type="text"
                  className="input-styled"
                  placeholder="Ex: HP LaserJet M404 / M428"
                  value={newPeca.compatibilidade}
                  onChange={(e) => setNewPeca({ ...newPeca, compatibilidade: e.target.value })}
                />
              </div>

              <div className="form-row-responsive">
                <div className="form-group-field">
                  <label className="form-label-styled">Qtd Inicial no Carro</label>
                  <input
                    type="number"
                    className="input-styled"
                    value={newPeca.quantidade}
                    onChange={(e) => setNewPeca({ ...newPeca, quantidade: e.target.value })}
                    min="0"
                  />
                </div>

                <div className="form-group-field">
                  <label className="form-label-styled">Qtd Mínima Alerta</label>
                  <input
                    type="number"
                    className="input-styled"
                    value={newPeca.qtdMinima}
                    onChange={(e) => setNewPeca({ ...newPeca, qtdMinima: e.target.value })}
                    min="1"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn-mobile"
                  onClick={() => setShowAddModal(false)}
                  style={{ flex: 1, background: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1' }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-mobile btn-complete" style={{ flex: 1 }}>
                  <i className="fa-solid fa-check"></i> Cadastrar Peça
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Solicitação de Reposição */}
      {showReposicaoModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-title-row">
              <h3 className="modal-title">
                <i className="fa-solid fa-paper-plane" style={{ color: '#f97316', marginRight: '8px' }}></i>
                Solicitar Reposição ao Almoxarifado
              </h3>
              <button className="modal-close-icon" onClick={() => setShowReposicaoModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleSendSolicitacao}>
              <div className="form-group-field">
                <label className="form-label-styled">Selecione o Item da Maleta *</label>
                <select
                  className="input-styled"
                  value={solicitarData.pecaId}
                  onChange={(e) => setSolicitarData({ ...solicitarData, pecaId: e.target.value })}
                  required
                >
                  <option value="">-- Escolha uma peça --</option>
                  {estoque.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} (Disp: {p.quantidade})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group-field">
                <label className="form-label-styled">Quantidade Desejada *</label>
                <input
                  type="number"
                  className="input-styled"
                  value={solicitarData.quantidade}
                  onChange={(e) => setSolicitarData({ ...solicitarData, quantidade: e.target.value })}
                  min="1"
                  required
                />
              </div>

              <div className="form-group-field">
                <label className="form-label-styled">Observação / Urgência</label>
                <textarea
                  className="input-styled"
                  rows="2"
                  placeholder="Ex: Preciso de urgência para o chamado do cliente X amanhã cedo..."
                  value={solicitarData.observacao}
                  onChange={(e) => setSolicitarData({ ...solicitarData, observacao: e.target.value })}
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn-mobile"
                  onClick={() => setShowReposicaoModal(false)}
                  style={{ flex: 1, background: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1' }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-mobile" style={{ flex: 1, background: '#f97316', color: '#ffffff' }}>
                  <i className="fa-solid fa-paper-plane"></i> Enviar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Histórico de Movimentações */}
      {showHistoryModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '550px' }}>
            <div className="modal-title-row">
              <h3 className="modal-title">
                <i className="fa-solid fa-clock-rotate-left" style={{ color: '#38bdf8', marginRight: '8px' }}></i>
                Histórico da Maleta
              </h3>
              <button className="modal-close-icon" onClick={() => setShowHistoryModal(false)}>&times;</button>
            </div>

            <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
              {historico.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>Nenhuma movimentação registrada até o momento.</p>
              ) : (
                historico.map(h => {
                  const dataFmt = new Date(h.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                  const isBaixa = h.tipo.includes('baixa');
                  const isSolicitacao = h.tipo === 'solicitacao';

                  let icon = isBaixa ? 'fa-minus-circle' : isSolicitacao ? 'fa-paper-plane' : 'fa-plus-circle';
                  let iconColor = isBaixa ? '#f87171' : isSolicitacao ? '#fb923c' : '#34d399';

                  return (
                    <div
                      key={h.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        marginBottom: '8px',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className={`fa-solid ${icon}`} style={{ color: iconColor }}></i>
                          {h.pecaNome}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.72rem' }}>{dataFmt}</span>
                      </div>
                      <div style={{ color: '#94a3b8', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                        <span>{h.detalhe}</span>
                        <span style={{ fontWeight: '700', color: iconColor }}>
                          {isBaixa ? '-' : isSolicitacao ? 'solic. ' : '+'}{h.quantidade} unid
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
