import React, { useState, useEffect } from 'react';
import { apiFetchHistoricoEquipamento } from '../config/api';

export function EquipmentHistoryModal({ equipamentoId, equipamentoLabel, numeroSerie, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const data = await apiFetchHistoricoEquipamento(equipamentoId);
        setHistory(data);
      } catch (err) {
        console.error('Erro ao carregar histórico do equipamento:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [equipamentoId]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '540px' }}
      >
        <div className="modal-title-row">
          <div>
            <div className="modal-title">
              <i className="fa-solid fa-clock-rotate-left" style={{ color: '#38bdf8' }}></i>
              Histórico do Equipamento
            </div>
            <div style={{ fontSize: '0.84rem', color: '#94a3b8', marginTop: '4px' }}>
              <strong style={{ color: '#f8fafc' }}>{equipamentoLabel || 'Impressora'}</strong>
              {numeroSerie && <span> • Série: <strong style={{ color: '#38bdf8' }}>{numeroSerie}</strong></span>}
            </div>
          </div>

          <button className="modal-close-icon" onClick={onClose} title="Fechar">
            &times;
          </button>
        </div>

        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ color: '#00a2e8' }}></i>
              <p style={{ marginTop: '12px', fontWeight: 500 }}>Carregando histórico do equipamento...</p>
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <i className="fa-solid fa-clipboard-question fa-3x" style={{ opacity: 0.4 }}></i>
              <p style={{ marginTop: '12px', fontWeight: 500 }}>Nenhum atendimento anterior registrado para este equipamento.</p>
            </div>
          ) : (
            history.map((osItem) => {
              const numOs = osItem.numero_os ? `OS #${osItem.numero_os}` : `OS #${String(osItem.id_os_chamados || '').substring(0, 8).toUpperCase()}`;
              const dateStr = osItem.created_at ? new Date(osItem.created_at).toLocaleDateString('pt-BR') : 'Data não informada';
              
              let laudoTexto = osItem.laudo_tecnico || '';
              let laudoAssinatura = null;
              if (laudoTexto.includes('---ASSINATURA---')) {
                const parts = laudoTexto.split('---ASSINATURA---');
                laudoTexto = parts[0].trim();
                laudoAssinatura = parts[1] ? parts[1].trim() : null;
              }

              const statusColor =
                osItem.status_chamado === 'concluido' ? '#10b981' :
                osItem.status_chamado === 'em_atendimento' ? '#f59e0b' : '#38bdf8';

              const statusLabel =
                osItem.status_chamado === 'concluido' ? 'Concluído' :
                osItem.status_chamado === 'em_atendimento' ? 'Em Atendimento' : 'Aberto';

              return (
                <div
                  key={osItem.id_os_chamados}
                  style={{
                    background: 'rgba(7, 9, 14, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderLeft: `4px solid ${statusColor}`,
                    borderRadius: '14px',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="os-tag" style={{ fontSize: '0.78rem' }}>{numOs}</span>
                      <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                        <i className="fa-regular fa-calendar" style={{ marginRight: '4px' }}></i>
                        {dateStr}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: `${statusColor}20`,
                        color: statusColor,
                        border: `1px solid ${statusColor}40`
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.84rem', color: '#cbd5e1', marginBottom: '6px' }}>
                    <strong style={{ color: '#60a5fa' }}>Problema:</strong> {osItem.descricao_problema}
                  </div>

                  {laudoTexto && (
                    <div style={{ fontSize: '0.82rem', background: 'rgba(16, 185, 129, 0.08)', padding: '8px 10px', borderRadius: '8px', marginTop: '6px' }}>
                      <strong style={{ color: '#34d399', fontSize: '0.72rem', display: 'block', textTransform: 'uppercase', marginBottom: '3px' }}>
                        Laudo Técnico Anterior:
                      </strong>
                      <span style={{ color: '#f1f5f9', whiteSpace: 'pre-wrap' }}>{laudoTexto}</span>

                      {laudoAssinatura && (
                        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed rgba(52, 211, 153, 0.3)' }}>
                          <span style={{ fontSize: '0.7rem', color: '#38bdf8', display: 'block', marginBottom: '4px' }}>Assinatura Coletada:</span>
                          <div style={{ background: '#ffffff', borderRadius: '4px', padding: '4px 8px', display: 'inline-block' }}>
                            <img src={laudoAssinatura} alt="Assinatura" style={{ maxHeight: '45px', display: 'block' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div style={{ marginTop: '18px', textAlign: 'right' }}>
          <button
            className="btn-mobile btn-call"
            onClick={onClose}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Fechar Histórico
          </button>
        </div>
      </div>
    </div>
  );
}
