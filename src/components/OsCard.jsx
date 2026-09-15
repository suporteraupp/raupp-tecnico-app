import React, { useState } from 'react';
import { SupplyLevelBadge } from './SupplyLevelBadge';

export function OsCard({ os, currentTab, onStartOs, onOpenSignatureModal, onOpenHistory }) {
  const [expanded, setExpanded] = useState(currentTab === 'em_atendimento');

  const parceiro = os.parceiro || {};
  const loc = os.parceiro_localizacao || {};
  const equip = os.equipamento || {};

  const rawMarca = (
    (typeof equip.marca === 'object' ? equip.marca?.nome_marca : equip.marca) ||
    equip.nome_marca ||
    equip.marca_nome ||
    ''
  ).trim();

  const rawModelo = (
    (typeof equip.modelo === 'object' ? equip.modelo?.nome_modelo : equip.modelo) ||
    equip.nome_modelo ||
    equip.modelo_nome ||
    ''
  ).trim();

  const osEquipDesc = (os.os_equipamento_descricao || equip.nome || equip.descricao || equip.tipo_equipamento || '').trim();

  const detectBrand = (str = '') => {
    const s = str.toLowerCase();
    if (s.includes('brother')) return 'Brother';
    if (s.includes('hp') || s.includes('hewlett')) return 'HP';
    if (s.includes('samsung')) return 'Samsung';
    if (s.includes('lexmark')) return 'Lexmark';
    if (s.includes('kyocera')) return 'Kyocera';
    if (s.includes('ricoh')) return 'Ricoh';
    if (s.includes('canon')) return 'Canon';
    if (s.includes('epson')) return 'Epson';
    if (s.includes('xerox')) return 'Xerox';
    if (s.includes('okidata') || s.includes('oki')) return 'OKI';
    return null;
  };

  const detectedBrand = rawMarca || detectBrand(osEquipDesc) || detectBrand(rawModelo) || null;

  let fullPrinterName = '';
  if (rawMarca && rawModelo) {
    fullPrinterName = `${rawMarca} ${rawModelo}`;
  } else if (detectedBrand && rawModelo && !rawModelo.toLowerCase().includes(detectedBrand.toLowerCase())) {
    fullPrinterName = `${detectedBrand} ${rawModelo}`;
  } else if (osEquipDesc) {
    fullPrinterName = osEquipDesc;
  } else if (rawModelo) {
    fullPrinterName = rawModelo;
  } else {
    fullPrinterName = 'Impressora Não Especificada';
  }

  const numSerie = os.os_equipamento_serie || equip.numero_serie || '';

  const prioClass = `prio-${(os.prioridade || 'normal').toLowerCase()}`;
  const numOsFormatted = os.numero_os ? `OS #${os.numero_os}` : `OS #${String(os.id_os_chamados || '').substring(0, 8).toUpperCase()}`;


  // Telefone / Contatos
  const foneCliente = os.solicitante_telefone || loc.contato1_fone || parceiro.contato1_fone || parceiro.doc_principal || '';
  const foneClean = foneCliente.replace(/\D/g, '');
  const hasPhone = foneClean.length >= 8;
  const waNumber = foneClean.startsWith('55') && foneClean.length >= 12 ? foneClean : `55${foneClean}`;

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

  // Tratamento do Laudo Técnico + Assinatura Digital embutida
  let laudoTexto = os.laudo_tecnico || '';
  let laudoAssinatura = null;

  if (laudoTexto.includes('---ASSINATURA---')) {
    const parts = laudoTexto.split('---ASSINATURA---');
    laudoTexto = parts[0].trim();
    laudoAssinatura = parts[1] ? parts[1].trim() : null;
  } else if (laudoTexto.includes('[Assinatura Digital]:')) {
    const parts = laudoTexto.split('[Assinatura Digital]:');
    laudoTexto = parts[0].trim();
    laudoAssinatura = parts[1] ? parts[1].trim() : null;
  }

  return (
    <div className="os-card" style={{ padding: '14px 16px' }}>
      {/* Cabeçalho do Card (Visão Compacta Sempre Visível) */}
      <div className="os-card-top" style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="os-tag">{numOsFormatted}</span>
          <span className={`badge-prio ${prioClass}`}>
            {os.prioridade || 'Normal'}
          </span>
          <SupplyLevelBadge equipamento={equip} os={os} compact={true} />
        </div>

        <button
          className="btn-expand-toggle"
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#38bdf8',
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
              <i className="fa-solid fa-chevron-up"></i> Recolher
            </>
          ) : (
            <>
              <i className="fa-solid fa-chevron-down"></i> Detalhes
            </>
          )}
        </button>
      </div>


      <div className="client-title" style={{ fontSize: '1.05rem', marginBottom: '4px' }}>
        {parceiro.nome_principal || 'Cliente Não Identificado'}
      </div>

      {/* Nome e Marca da Impressora Destacados */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <i className="fa-solid fa-print" style={{ color: '#00a2e8', fontSize: '0.9rem' }}></i>
        {detectedBrand && (
          <span style={{
            background: 'rgba(0, 162, 232, 0.16)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            padding: '1px 7px',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.4px',
            textTransform: 'uppercase'
          }}>
            {detectedBrand}
          </span>
        )}
        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc' }}>
          {fullPrinterName}
        </span>
        {numSerie && (
          <span style={{ fontSize: '0.76rem', color: '#94a3b8', marginLeft: 'auto' }}>
            Série: <strong style={{ color: '#cbd5e1' }}>{numSerie}</strong>
          </span>
        )}
      </div>

      {/* Problema Resumido */}
      <div style={{ fontSize: '0.84rem', color: '#cbd5e1', marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: expanded ? 'none' : '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        <strong style={{ color: '#60a5fa' }}>Problema:</strong> {os.descricao_problema}
      </div>

      {/* Ações diretas rápidas de fluxo */}
      {!expanded && (
        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
          {currentTab === 'aberto' && (
            <button className="btn-mobile btn-start" onClick={() => onStartOs(os.id_os_chamados)} style={{ padding: '8px 12px', fontSize: '0.84rem' }}>
              <i className="fa-solid fa-play"></i> Iniciar Atendimento
            </button>
          )}

          {currentTab === 'em_atendimento' && (
            <button className="btn-mobile btn-complete" onClick={() => onOpenSignatureModal(os)} style={{ padding: '8px 12px', fontSize: '0.84rem' }}>
              <i className="fa-solid fa-signature"></i> Concluir & Coletar Assinatura
            </button>
          )}
        </div>
      )}

      {/* Área Expandida (Detalhes Completos) */}
      {expanded && (
        <div style={{ animation: 'fadeIn 0.2s ease-out', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
          {enderecoCompleto && (
            <div className="card-detail-row">
              <i className="fa-solid fa-location-dot"></i>
              <span>{enderecoCompleto}</span>
            </div>
          )}

          <div className="equipment-chip-box" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-print" style={{ color: '#60a5fa' }}></i>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {detectedBrand && (
                    <span style={{
                      background: 'linear-gradient(135deg, #00a2e8, #0284c7)',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase'
                    }}>
                      {detectedBrand}
                    </span>
                  )}
                  <span className="equipment-chip" style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                    {fullPrinterName}
                  </span>
                </div>
                {numSerie && (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '3px' }}>
                    Série: <strong style={{ color: '#f1f5f9' }}>{numSerie}</strong>
                  </div>
                )}
              </div>
            </div>

            {onOpenHistory && (os.equipamentos_id || equip.id_equipamentos) && (
              <button
                type="button"
                onClick={() => onOpenHistory(os.equipamentos_id || equip.id_equipamentos, fullPrinterName, numSerie)}
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  padding: '4px 9px',
                  borderRadius: '10px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap'
                }}
                title="Ver Histórico de Manutenções deste Equipamento"
              >
                <i className="fa-solid fa-clock-rotate-left"></i> Histórico
              </button>
            )}
          </div>

          <SupplyLevelBadge equipamento={equip} os={os} />

          {os.solicitante_nome && (

            <div className="card-detail-row">
              <i className="fa-solid fa-user"></i>
              <span>Solicitante: <strong style={{ color: '#fff' }}>{os.solicitante_nome}</strong> {foneCliente ? `(${foneCliente})` : ''}</span>
            </div>
          )}

          {laudoTexto && (
            <div className="laudo-box">
              <strong style={{ color: '#34d399', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>
                <i className="fa-solid fa-clipboard-check" style={{ marginRight: '4px', color: '#34d399' }}></i> Laudo Técnico:
              </strong>
              <span style={{ color: '#f1f5f9', whiteSpace: 'pre-wrap' }}>{laudoTexto}</span>

              {laudoAssinatura && (
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed rgba(52, 211, 153, 0.3)' }}>
                  <strong style={{ color: '#60a5fa', fontSize: '0.72rem', display: 'block', textTransform: 'uppercase', marginBottom: '6px' }}>
                    <i className="fa-solid fa-signature" style={{ marginRight: '4px', color: '#60a5fa' }}></i> Assinatura Digital do Cliente:
                  </strong>
                  <div style={{ background: '#ffffff', borderRadius: '6px', padding: '6px 12px', display: 'inline-block', maxWidth: '100%' }}>
                    <img
                      src={laudoAssinatura}
                      alt="Assinatura do Cliente"
                      style={{ maxHeight: '65px', display: 'block', maxWidth: '100%', objectFit: 'contain' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="actions-grid">
            {enderecoCompleto && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-mobile btn-maps">
                <i className="fa-solid fa-map-location-dot"></i> Maps / Waze
              </a>
            )}

            {hasPhone && (
              <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className="btn-mobile btn-wats">
                <i className="fa-brands fa-whatsapp"></i> WhatsApp
              </a>
            )}

            {currentTab === 'aberto' && (
              <button className="btn-mobile btn-start" onClick={() => onStartOs(os.id_os_chamados)}>
                <i className="fa-solid fa-play"></i> Iniciar Atendimento
              </button>
            )}

            {currentTab === 'em_atendimento' && (
              <button className="btn-mobile btn-complete" onClick={() => onOpenSignatureModal(os)}>
                <i className="fa-solid fa-signature"></i> Concluir & Coletar Assinatura
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
