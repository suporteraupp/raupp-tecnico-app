import React, { useState } from 'react';
import { OsCard } from './OsCard';

export function BatchOsCard({ group, currentTab, onStartOs, onStartBatch, onOpenSignatureModal, onOpenBatchSignatureModal }) {
  const [expanded, setExpanded] = useState(currentTab === 'em_atendimento');

  // Se for apenas 1 chamado no grupo, renderiza o OsCard tradicional
  if (!group.chamados || group.chamados.length <= 1) {
    const singleOs = group.chamados && group.chamados[0] ? group.chamados[0] : group;
    return (
      <OsCard
        os={singleOs}
        currentTab={currentTab}
        onStartOs={onStartOs}
        onOpenSignatureModal={onOpenSignatureModal}
      />
    );
  }

  const parceiro = group.parceiro || {};
  const loc = group.localizacao || {};
  const chamados = group.chamados || [];

  // Endereço Completo real
  const endLog = loc.end_logradouro || parceiro.end_logradouro || '';
  const endNum = loc.end_numero || parceiro.end_numero || '';
  const endComp = loc.end_complemento || parceiro.end_complemento || '';
  const endBairro = loc.end_bairro || parceiro.end_bairro || '';
  const endCid = loc.end_cidade || parceiro.end_cidade || '';
  const endUf = loc.end_uf || parceiro.end_uf || '';
  const localNome = loc.nome_site && loc.nome_site !== 'Principal' ? loc.nome_site : '';

  const partesEndereco = [
    localNome ? `[${localNome}]` : '',
    endLog ? `${endLog}${endNum ? `, ${endNum}` : ''}` : '',
    endComp,
    endBairro,
    endCid ? `${endCid}${endUf ? ` - ${endUf}` : ''}` : ''
  ].filter(Boolean);

  const enderecoCompleto = partesEndereco.join(' - ');
  const mapsUrl = enderecoCompleto ? `https://maps.google.com/?q=${encodeURIComponent(enderecoCompleto)}` : '#';

  // Telefone / Contatos
  const foneCliente = loc.contato1_fone || parceiro.contato1_fone || parceiro.doc_principal || '';
  const foneClean = foneCliente.replace(/\D/g, '');
  const hasPhone = foneClean.length >= 8;

  const osIds = chamados.map(c => c.id_os_chamados);

  return (
    <div
      className="os-card"
      style={{
        padding: '16px',
        border: '1px solid rgba(168, 85, 247, 0.4)',
        background: 'rgba(17, 24, 39, 0.85)',
        boxShadow: '0 12px 32px rgba(168, 85, 247, 0.15)'
      }}
    >
      {/* Faixa Superior de Destaque do Lote */}
      <div className="os-card-top" style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span
            className="os-tag"
            style={{
              background: 'rgba(168, 85, 247, 0.2)',
              color: '#c084fc',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              fontWeight: 700
            }}
          >
            <i className="fa-solid fa-layer-group" style={{ marginRight: '5px' }}></i>
            LOTE ({chamados.length} OSs)
          </span>

          <span
            style={{
              fontSize: '0.72rem',
              background: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: 600
            }}
          >
            <i className="fa-solid fa-building" style={{ marginRight: '4px' }}></i>
            {localNome || 'Mesmo Endereço'}
          </span>
        </div>

        <button
          className="btn-expand-toggle"
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#c084fc',
            padding: '4px 10px',
            borderRadius: '16px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          {expanded ? (
            <>
              <i className="fa-solid fa-chevron-up"></i> Recolher Lote
            </>
          ) : (
            <>
              <i className="fa-solid fa-chevron-down"></i> Ver Lote ({chamados.length})
            </>
          )}
        </button>
      </div>

      <div className="client-title" style={{ fontSize: '1.1rem', color: '#ffffff', marginBottom: '4px' }}>
        {parceiro.nome_principal || 'Cliente Não Identificado'}
      </div>

      {enderecoCompleto && (
        <div className="card-detail-row" style={{ marginBottom: '8px' }}>
          <i className="fa-solid fa-location-dot" style={{ color: '#c084fc' }}></i>
          <span style={{ fontSize: '0.84rem', color: '#cbd5e1' }}>{enderecoCompleto}</span>
        </div>
      )}

      {/* Lista Resumida dos Equipamentos do Lote */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', marginBottom: '10px' }}>
        {chamados.map((osItem) => {
          const equip = osItem.equipamento || {};
          const marca = equip.marca ? equip.marca.nome_marca : '';
          const modelo = equip.modelo ? equip.modelo.nome_modelo : '';
          const equipLabel = [marca, modelo].filter(Boolean).join(' ') || equip.tipo_equipamento || 'Equipamento';
          const numOs = osItem.numero_os ? `#${osItem.numero_os}` : `#${String(osItem.id_os_chamados || '').substring(0, 6)}`;

          return (
            <div
              key={osItem.id_os_chamados}
              style={{
                fontSize: '0.82rem',
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '10px',
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '8px'
              }}
            >
              <div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '3px' }}>
                  <strong style={{ color: '#38bdf8' }}>{numOs}</strong>
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>{equipLabel}</span>
                  {equip.numero_serie && (
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                      (Série: {equip.numero_serie})
                    </span>
                  )}
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '0.78rem' }}>
                  <strong style={{ color: '#94a3b8' }}>Defeito:</strong> {osItem.descricao_problema}
                </div>
              </div>

              {expanded && currentTab === 'em_atendimento' && (
                <button
                  onClick={() => onOpenSignatureModal(osItem)}
                  style={{
                    background: 'rgba(249, 115, 22, 0.15)',
                    border: '1px solid rgba(249, 115, 22, 0.3)',
                    color: '#f97316',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Concluir Solo
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Botões de Ação do Lote Completo */}
      <div className="actions-grid" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
        {enderecoCompleto && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-mobile btn-maps">
            <i className="fa-solid fa-map-location-dot"></i> Maps / Waze
          </a>
        )}

        {hasPhone && (
          <a href={`https://wa.me/55${foneClean}`} target="_blank" rel="noopener noreferrer" className="btn-mobile btn-wats">
            <i className="fa-brands fa-whatsapp"></i> WhatsApp
          </a>
        )}

        {currentTab === 'aberto' && (
          <button
            className="btn-mobile btn-start"
            onClick={() => onStartBatch ? onStartBatch(osIds) : onStartOs(osIds[0])}
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              boxShadow: '0 4px 16px rgba(168, 85, 247, 0.4)'
            }}
          >
            <i className="fa-solid fa-play"></i> Iniciar Atendimento do Lote ({chamados.length} OSs)
          </button>
        )}

        {currentTab === 'em_atendimento' && (
          <button
            className="btn-mobile btn-complete"
            onClick={() => onOpenBatchSignatureModal ? onOpenBatchSignatureModal(chamados) : onOpenSignatureModal(chamados[0])}
            style={{
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              boxShadow: '0 4px 16px rgba(249, 115, 22, 0.4)'
            }}
          >
            <i className="fa-solid fa-signature"></i> Concluir Lote ({chamados.length} OSs) com 1 Assinatura
          </button>
        )}
      </div>
    </div>
  );
}
