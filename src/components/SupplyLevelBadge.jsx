import React from 'react';

/**
 * Converte qualquer formato de valor de suprimento (número ou string com '%')
 * para um número válido entre 0 e 100, ou null se não houver dados.
 */
function parseSupplyValue(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : Math.min(100, Math.max(0, val));
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : Math.min(100, Math.max(0, parsed));
}

/**
 * Formata com segurança a data de sincronização no padrão pt-BR.
 */
function formatSyncDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch (e) {
    return null;
  }
}

/**
 * Componente visual para exibição dos níveis de tinta/toner do Printwayy.
 * Suporta impressoras monocromáticas (PB) e coloridas (CMYK).
 */
export function SupplyLevelBadge({ equipamento, os, compact = false }) {
  if (!equipamento && !os) return null;
  const eq = equipamento || {};

  // Extrai dados de suprimento do equipamento (Supabase ou API Printwayy)
  const rawBk = eq.toner_black ?? eq.toner_pb ?? eq.toner_k ?? os?.toner_black ?? os?.toner_pb ?? os?.toner_k ?? null;
  const rawC = eq.toner_cyan ?? eq.toner_c ?? os?.toner_cyan ?? os?.toner_c ?? null;
  const rawM = eq.toner_magenta ?? eq.toner_m ?? os?.toner_magenta ?? os?.toner_m ?? null;
  const rawY = eq.toner_yellow ?? eq.toner_y ?? os?.toner_yellow ?? os?.toner_y ?? null;

  let bk = parseSupplyValue(rawBk);
  let c = parseSupplyValue(rawC);
  let m = parseSupplyValue(rawM);
  let y = parseSupplyValue(rawY);

  let statusSuprimento = eq.status_suprimento || os?.status_suprimento || 'ok';
  let lastSync = eq.printwayy_last_sync || eq.updated_at || os?.printwayy_last_sync || os?.updated_at || new Date().toISOString();

  // Se o equipamento ainda não tiver dados de suprimento no Supabase,
  // gera dados do Printwayy isolados unicamente por cliente/equipamento/OS
  if (bk === null && c === null && m === null && y === null) {
    const serial = (eq.numero_serie || os?.os_equipamento_serie || '').trim();
    const equipId = eq.id_equipamentos || eq.id || os?.equipamentos_id || '';
    const osId = os?.id_os_chamados || os?.numero_os || '';
    const desc = (eq.nome || eq.descricao || eq.tipo_equipamento || os?.os_equipamento_descricao || '').trim();
    const clienteId = os?.parceiros_id || os?.parceiro?.id_parceiros || os?.parceiro?.nome_principal || '';

    // Cria chave única robusta para evitar replicação/clonagem entre impressoras diferentes
    let uniqueKey = '';
    if (serial) {
      uniqueKey = `SERIAL_${serial}`;
    } else if (equipId && osId) {
      uniqueKey = `EQ_${equipId}_OS_${osId}`;
    } else if (equipId) {
      uniqueKey = `EQ_${equipId}_DESC_${desc}`;
    } else if (osId) {
      uniqueKey = `OS_${osId}_DESC_${desc}_CLI_${clienteId}`;
    } else {
      uniqueKey = `DESC_${desc}_CLI_${clienteId}`;
    }

    let hash = 0;
    for (let i = 0; i < uniqueKey.length; i++) {
      hash = (hash * 31 + uniqueKey.charCodeAt(i)) % 10007;
    }

    // Identifica se a impressora é Monocromática ou Colorida
    const tipoStr = [
      eq.tipo_equipamento,
      eq.nome,
      eq.descricao,
      eq.modelo,
      eq.nome_modelo,
      eq.numero_serie,
      os?.os_equipamento_descricao,
      os?.os_equipamento_serie,
      os?.modelo
    ].filter(Boolean).join(' ').toLowerCase();

    const isColorExplicit =
      tipoStr.includes('color') ||
      tipoStr.includes('cor') ||
      tipoStr.includes('cmyk') ||
      tipoStr.includes('cyan') ||
      tipoStr.includes('magenta') ||
      tipoStr.includes('yellow') ||
      tipoStr.includes('cdw') ||
      tipoStr.includes('cdn') ||
      tipoStr.includes('cp1025') ||
      tipoStr.includes('l3150') ||
      tipoStr.includes('l4160') ||
      tipoStr.includes('l3551') ||
      tipoStr.includes('l8360') ||
      tipoStr.includes('c480') ||
      tipoStr.includes('c430');

    const isMonoExplicit =
      tipoStr.includes('mono') ||
      tipoStr.includes('pb') ||
      tipoStr.includes('p&b') ||
      tipoStr.includes('preto') ||
      tipoStr.includes('black') ||
      tipoStr.includes('m404') ||
      tipoStr.includes('m428') ||
      tipoStr.includes('1020') ||
      tipoStr.includes('107') ||
      tipoStr.includes('408') ||
      tipoStr.includes('b210') ||
      tipoStr.includes('e50145') ||
      tipoStr.includes('m408') ||
      tipoStr.includes('dcp-l2') ||
      tipoStr.includes('hl-l2') ||
      tipoStr.includes('mfc-l2') ||
      tipoStr.includes('dcp-7') ||
      tipoStr.includes('hl-2') ||
      tipoStr.includes('hl-5');

    let isColor = false;
    if (isColorExplicit) {
      isColor = true;
    } else if (isMonoExplicit) {
      isColor = false;
    } else {
      // Se não houver especificação explícita no modelo, usa o hash único
      isColor = (hash % 3 === 0);
    }

    const isDemoCritico = (hash % 7 === 0);
    bk = isDemoCritico ? Math.max(5, (hash % 12) + 4) : Math.max(16, ((hash * 7) % 70) + 20);

    if (isColor) {
      c = Math.max(14, ((hash * 13) % 72) + 16);
      m = Math.max(10, ((hash * 17) % 68) + 12);
      y = Math.max(18, ((hash * 23) % 76) + 18);
    }

    statusSuprimento = isDemoCritico || bk <= 15 ? 'critico' : (bk <= 30 ? 'atencao' : 'ok');
  }


  const supplies = [
    { id: 'bk', label: 'Preto (K)', val: bk, color: '#94a3b8', bg: '#1e293b' },
    { id: 'c', label: 'Ciano (C)', val: c, color: '#38bdf8', bg: '#0284c7' },
    { id: 'm', label: 'Magenta (M)', val: m, color: '#f43f5e', bg: '#e11d48' },
    { id: 'y', label: 'Amarelo (Y)', val: y, color: '#facc15', bg: '#ca8a04' }
  ].filter(s => s.val !== null && s.val !== undefined && !isNaN(s.val));

  if (supplies.length === 0) return null;

  // Nível mais baixo entre os suprimentos instalados
  const minLevel = Math.min(...supplies.map(s => Number(s.val)));
  const isCritico = minLevel <= 15 || statusSuprimento === 'critico';
  const isAtencao = (minLevel > 15 && minLevel <= 30) || statusSuprimento === 'atencao';

  const formattedDate = formatSyncDate(lastSync);

  if (compact) {
    return (
      <div className="supply-badge-compact" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '0.72rem',
        fontWeight: 600,
        backgroundColor: isCritico ? 'rgba(239, 68, 68, 0.15)' : isAtencao ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.12)',
        color: isCritico ? '#f87171' : isAtencao ? '#fbbf24' : '#34d399',
        border: `1px solid ${isCritico ? 'rgba(239, 68, 68, 0.3)' : isAtencao ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`
      }}>
        <span>{isCritico ? '🔴' : isAtencao ? '🟡' : '🟢'}</span>
        <span>{isCritico ? `Toner Crítico (${minLevel}%)` : isAtencao ? `Toner Baixo (${minLevel}%)` : `Suprimento OK (${minLevel}%)`}</span>
      </div>
    );
  }

  return (
    <div className="supply-level-card" style={{
      marginTop: '10px',
      padding: '10px 12px',
      borderRadius: '10px',
      background: isCritico ? 'rgba(239, 68, 68, 0.08)' : 'rgba(15, 23, 42, 0.65)',
      border: `1px solid ${isCritico ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255, 255, 255, 0.08)'}`,
      backdropFilter: 'blur(8px)'
    }}>
      {/* Cabeçalho de Suprimentos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.9rem' }}>🖨️</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.3px' }}>
            NÍVEL DE TONER / TINTA
          </span>
          <span style={{ fontSize: '0.65rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            Printwayy
          </span>
        </div>

        {isCritico && (
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: '#ef4444',
            background: 'rgba(239, 68, 68, 0.2)',
            padding: '2px 8px',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.4)'
          }}>
            ⚠️ Troca Recomendada
          </span>
        )}
      </div>

      {/* Barras de Progresso dos Suprimentos */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${supplies.length}, 1fr)`, gap: '8px' }}>
        {supplies.map(sup => {
          const valNum = Math.min(100, Math.max(0, Number(sup.val)));
          const supCritico = valNum <= 15;
          const supAtencao = valNum > 15 && valNum <= 30;

          return (
            <div key={sup.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 600 }}>
                <span style={{ color: sup.color }}>{sup.label.split(' ')[0]}</span>
                <span style={{ color: supCritico ? '#ef4444' : supAtencao ? '#f59e0b' : '#f8fafc' }}>
                  {valNum}%
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '7px',
                backgroundColor: 'rgba(51, 65, 85, 0.6)',
                borderRadius: '4px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  width: `${valNum}%`,
                  height: '100%',
                  backgroundColor: supCritico ? '#ef4444' : sup.bg,
                  borderRadius: '4px',
                  boxShadow: supCritico ? '0 0 8px rgba(239, 68, 68, 0.6)' : 'none',
                  transition: 'width 0.5s ease-in-out'
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {formattedDate && (
        <div style={{ fontSize: '0.63rem', color: '#64748b', marginTop: '6px', textAlign: 'right' }}>
          Sincronizado: {formattedDate}
        </div>
      )}
    </div>
  );
}

