import React, { useState, useEffect } from 'react';
import { getPrintwayyDataBySerial } from '../services/printwayyService';
import { fetchPrintwayyDataBySerial } from '../services/printwayyApi';

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
 * Componente visual elegante para exibição dos níveis de tinta/toner do Printwayy.
 */
export function SupplyLevelBadge({ equipamento, os, compact = false }) {
  if (!equipamento && !os) return null;

  const initialPwData = getPrintwayyDataBySerial(equipamento, os);
  const [pwData, setPwData] = useState(initialPwData);

  useEffect(() => {
    let isMounted = true;
    const serial = initialPwData.serial;

    if (serial) {
      fetchPrintwayyDataBySerial(serial).then(apiRes => {
        if (isMounted && apiRes && apiRes.supplies) {
          setPwData(prev => ({
            ...prev,
            isRealData: true,
            supplies: {
              black: apiRes.supplies.black ?? apiRes.supplies.preto ?? prev.supplies.black,
              cyan: apiRes.supplies.cyan ?? apiRes.supplies.ciano ?? prev.supplies.cyan,
              magenta: apiRes.supplies.magenta ?? prev.supplies.magenta,
              yellow: apiRes.supplies.yellow ?? apiRes.supplies.amarelo ?? prev.supplies.yellow
            }
          }));
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [initialPwData.serial]);

  const { bk, c, m, y } = {
    bk: pwData.supplies.black,
    c: pwData.supplies.cyan,
    m: pwData.supplies.magenta,
    y: pwData.supplies.yellow
  };

  const statusSuprimento = pwData.statusSuprimento;
  const lastSync = pwData.lastSync;

  const supplies = [
    { id: 'bk', label: 'Preto (K)', val: bk, color: '#94a3b8', bg: '#1e293b' },
    { id: 'c', label: 'Ciano (C)', val: c, color: '#38bdf8', bg: '#0284c7' },
    { id: 'm', label: 'Magenta (M)', val: m, color: '#f43f5e', bg: '#e11d48' },
    { id: 'y', label: 'Amarelo (Y)', val: y, color: '#facc15', bg: '#ca8a04' }
  ].filter(s => s.val !== null && s.val !== undefined && !isNaN(s.val));

  if (supplies.length === 0) return null;

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


