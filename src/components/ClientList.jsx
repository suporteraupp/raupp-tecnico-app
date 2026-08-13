import React, { useState } from 'react';

export function ClientList({ parceiros, loading }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredParceiros = parceiros.filter((p) => {
    const term = searchTerm.toLowerCase();
    const nome = (p.nome_principal || '').toLowerCase();
    const fantasia = (p.nome_secundario || '').toLowerCase();
    const doc = (p.doc_principal || '').toLowerCase();
    const cidade = (p.end_cidade || '').toLowerCase();
    const bairro = (p.end_bairro || '').toLowerCase();
    return (
      nome.includes(term) ||
      fantasia.includes(term) ||
      doc.includes(term) ||
      cidade.includes(term) ||
      bairro.includes(term)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Barra de Pesquisa */}
      <div className="os-card" style={{ padding: '16px 20px', margin: 0 }}>
        <div className="form-group-field" style={{ margin: 0 }}>
          <label className="form-label-styled" style={{ marginBottom: '8px' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ marginRight: '6px', color: '#60a5fa' }}></i>
            Buscar Cliente / Parceiro
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="input-styled"
              style={{ paddingLeft: '40px' }}
              placeholder="Digite o nome, CNPJ/CPF, bairro ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <i
              className="fa-solid fa-search"
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }}
            ></i>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                &times;
              </button>
            )}
          </div>
        </div>
        <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
          <span>Exibindo {filteredParceiros.length} de {parceiros.length} clientes</span>
          {searchTerm && <span>Filtro ativo: "{searchTerm}"</span>}
        </div>
      </div>

      {/* Lista de Clientes */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
          <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ color: '#00a2e8' }}></i>
          <p style={{ marginTop: '12px', fontWeight: 500 }}>Carregando cadastro de clientes...</p>
        </div>
      ) : filteredParceiros.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <i className="fa-solid fa-building-user fa-3x" style={{ opacity: 0.5 }}></i>
          <p style={{ marginTop: '12px', fontWeight: 500 }}>Nenhum cliente encontrado.</p>
        </div>
      ) : (
        filteredParceiros.map((p) => {
          const foneClean = (p.contato1_fone || '').replace(/\D/g, '');
          const hasPhone = foneClean.length >= 8;

          // Endereço principal
          const endLog = p.end_logradouro || '';
          const endNum = p.end_numero || '';
          const endComp = p.end_complemento || '';
          const endBairro = p.end_bairro || '';
          const endCid = p.end_cidade || '';
          const endUf = p.end_uf || '';

          const partesEndereco = [
            endLog ? `${endLog}${endNum ? `, ${endNum}` : ''}` : '',
            endComp,
            endBairro,
            endCid ? `${endCid}${endUf ? ` - ${endUf}` : ''}` : ''
          ].filter(Boolean);

          const enderecoCompleto = partesEndereco.join(' - ');
          const mapsUrl = enderecoCompleto ? `https://maps.google.com/?q=${encodeURIComponent(enderecoCompleto)}` : '#';
          const localizacoes = p.localizacoes || [];

          return (
            <div className="os-card" key={p.id_parceiros}>
              <div className="os-card-top">
                <span className="os-tag" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <i className="fa-solid fa-building" style={{ marginRight: '4px' }}></i>
                  {p.tipo_pessoa || 'PJ'}
                </span>
                {p.doc_principal && (
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>
                    Doc: <strong style={{ color: '#f1f5f9' }}>{p.doc_principal}</strong>
                  </span>
                )}
              </div>

              <div className="client-title">{p.nome_principal}</div>

              {p.nome_secundario && p.nome_secundario !== p.nome_principal && (
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '-4px', marginBottom: '8px' }}>
                  Fantasia: <strong style={{ color: '#cbd5e1' }}>{p.nome_secundario}</strong>
                </div>
              )}

              {enderecoCompleto && (
                <div className="card-detail-row">
                  <i className="fa-solid fa-location-dot" style={{ color: '#f43f5e' }}></i>
                  <span>{enderecoCompleto}</span>
                </div>
              )}

              {(p.contato1_nome || p.contato1_fone) && (
                <div className="card-detail-row">
                  <i className="fa-solid fa-user-gear" style={{ color: '#34d399' }}></i>
                  <span>
                    Contato: <strong style={{ color: '#fff' }}>{p.contato1_nome || 'Responsável'}</strong>{' '}
                    {p.contato1_fone ? `(${p.contato1_fone})` : ''}
                  </span>
                </div>
              )}

              {/* Locais / Filiais cadastradas */}
              {localizacoes.length > 0 && (
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                  <strong style={{ fontSize: '0.72rem', color: '#60a5fa', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>
                    <i className="fa-solid fa-sitemap" style={{ marginRight: '4px' }}></i> Locais / Unidades ({localizacoes.length}):
                  </strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {localizacoes.map((loc) => {
                      const locAddr = [loc.end_logradouro, loc.end_numero, loc.end_bairro, loc.end_cidade].filter(Boolean).join(', ');
                      return (
                        <div
                          key={loc.id_parceiros_localizacao}
                          style={{
                            fontSize: '0.78rem',
                            color: '#cbd5e1',
                            background: 'rgba(15, 23, 42, 0.6)',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.05)'
                          }}
                        >
                          <strong style={{ color: '#38bdf8' }}>{loc.nome_site || 'Unidade'}:</strong> {locAddr || 'Endereço não informado'}
                          {loc.contato1_fone && <span style={{ color: '#94a3b8', marginLeft: '6px' }}>({loc.contato1_fone})</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Botões de Ação Rápida */}
              <div className="actions-grid" style={{ marginTop: '14px' }}>
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
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
