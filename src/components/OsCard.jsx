import React from 'react';

export function OsCard({ os, currentTab, onStartOs, onOpenSignatureModal }) {
  const parceiro = os.parceiro || {};
  const loc = os.parceiro_localizacao || {};
  const equip = os.equipamento || {};
  const marca = equip.marca ? equip.marca.nome_marca : '';
  const modelo = equip.modelo ? equip.modelo.nome_modelo : '';
  const equipLabel = [marca, modelo].filter(Boolean).join(' ') || equip.tipo_equipamento || 'Equipamento não especificado';

  const prioClass = `prio-${(os.prioridade || 'normal').toLowerCase()}`;
  const numOsFormatted = os.numero_os ? `OS #${os.numero_os}` : `OS #${String(os.id_os_chamados || '').substring(0, 8).toUpperCase()}`;

  // Telefone / Contatos
  const foneCliente = os.solicitante_telefone || loc.contato1_fone || parceiro.contato1_fone || parceiro.doc_principal || '';
  const foneClean = foneCliente.replace(/\D/g, '');
  const hasPhone = foneClean.length >= 8;

  // Endereço Completo real (pega do local da OS ou do cadastro principal do parceiro)
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
    <div className="os-card">
      <div className="os-card-top">
        <span className="os-tag">{numOsFormatted}</span>
        <span className={`badge-prio ${prioClass}`}>
          <i className="fa-solid fa-triangle-exclamation"></i>
          {os.prioridade || 'Normal'}
        </span>
      </div>

      <div className="client-title">{parceiro.nome_principal || 'Cliente Não Identificado'}</div>

      {enderecoCompleto && (
        <div className="card-detail-row">
          <i className="fa-solid fa-location-dot"></i>
          <span>{enderecoCompleto}</span>
        </div>
      )}

      <div className="equipment-chip-box">
        <i className="fa-solid fa-print" style={{ color: '#60a5fa' }}></i>
        <div>
          <span className="equipment-chip">{equipLabel}</span>
          {equip.numero_serie && (
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '8px' }}>
              Série: <strong style={{ color: '#f1f5f9' }}>{equip.numero_serie}</strong>
            </span>
          )}
        </div>
      </div>

      {os.solicitante_nome && (
        <div className="card-detail-row">
          <i className="fa-solid fa-user"></i>
          <span>Solicitante: <strong style={{ color: '#fff' }}>{os.solicitante_nome}</strong> {foneCliente ? `(${foneCliente})` : ''}</span>
        </div>
      )}

      <div className="problem-box">
        <strong style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>
          <i className="fa-solid fa-circle-info" style={{ marginRight: '4px', color: '#60a5fa' }}></i> Problema Relatado:
        </strong>
        <span style={{ color: '#f1f5f9' }}>{os.descricao_problema}</span>
      </div>

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
          <a href={`https://wa.me/55${foneClean}`} target="_blank" rel="noopener noreferrer" className="btn-mobile btn-wats">
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
  );
}
