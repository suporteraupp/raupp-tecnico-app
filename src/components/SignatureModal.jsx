import React, { useRef, useState, useEffect, useCallback } from 'react';
import { getEstoqueVolante, darBaixaPecasOS } from '../services/supabase/produtosService';
import { salvarAlertaPreventivoLocal } from '../services/supabase/chamadosService';
import { extractPrinterInfo, classifyPecaCompatibility } from '../domain/equipamentos/brandDetector';

const CHECKLIST_ETAPAS = [
  {
    id: 'limpeza',
    label: 'Limpeza interna e externa (óptica, vidro do scanner e tracionadores/roletes)'
  },
  {
    id: 'desgaste',
    label: 'Verificação de desgaste de peças (fusor, cilindro, unidade de imagem e pickup roller)'
  },
  {
    id: 'teste',
    label: 'Impressão de página de teste / relatório de configuração e verificação de qualidade'
  }
];

const PECAS_DESGASTE_COMUNS = [
  'Fusor / Unidade Fusora',
  'Cilindro / Drum',
  'Roletes / Pickup Roller',
  'Unidade de Imagem',
  'Belt / Correia de Transferência'
];

export function SignatureModal({ os, onClose, onSubmit, showToast }) {
  const canvasRef = useRef(null);
  const [laudo, setLaudo] = useState('');
  const [contadorPb, setContadorPb] = useState('');
  const [contadorCor, setContadorCor] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checklist, setChecklist] = useState({
    limpeza: false,
    desgaste: false,
    teste: false
  });

  const totalChecklist = CHECKLIST_ETAPAS.length;
  const concluidosChecklist = CHECKLIST_ETAPAS.filter(etapa => checklist[etapa.id]).length;
  const checklistCompleto = concluidosChecklist === totalChecklist;

  const toggleChecklistItem = (id) => {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Estados para Alerta Preventivo (Peça no Fim da Vida Útil)
  const [temAlertaPreventivo, setTemAlertaPreventivo] = useState(false);
  const [pecaFimVida, setPecaFimVida] = useState('');
  const [obsFimVida, setObsFimVida] = useState('');
  const [gerarOsPreventiva, setGerarOsPreventiva] = useState(true);

  // Estados para Peças da Maleta
  const [estoqueVolante, setEstoqueVolante] = useState([]);
  const [selectedPecaId, setSelectedPecaId] = useState('');
  const [qtdPecaUsada, setQtdPecaUsada] = useState('1');
  const [pecasUtilizadas, setPecasUtilizadas] = useState([]);

  const equip = os?.equipamento || {};
  const { detectedBrand, fullPrinterName, numSerie } = extractPrinterInfo(equip, os);

  // Filtra estritamente apenas peças e insumos compatíveis com a Marca / Modelo deste equipamento
  const pecasCompativeis = estoqueVolante
    .map(p => ({
      ...p,
      nivelCompat: classifyPecaCompatibility(p, equip, os)
    }))
    .filter(p => p.nivelCompat === 'modelo' || p.nivelCompat === 'marca');

  useEffect(() => {
    // Carrega peças disponíveis na maleta do técnico
    async function loadItems() {
      try {
        const items = await getEstoqueVolante();
        setEstoqueVolante((items || []).filter(i => i.quantidade > 0));
      } catch (err) {
        console.warn('Erro ao carregar maleta:', err);
      }
    }
    loadItems();
  }, []);

  const handleAddPecaOS = () => {
    if (!selectedPecaId) {
      showToast('Selecione uma peça da maleta.', 'warning');
      return;
    }

    const pecaObj = estoqueVolante.find(p => String(p.id) === String(selectedPecaId));
    if (!pecaObj) return;

    const qtd = parseInt(qtdPecaUsada) || 1;
    if (qtd < 1) {
      showToast('Informe uma quantidade válida.', 'warning');
      return;
    }
    const jaAdicionada = pecasUtilizadas.find(p => String(p.id) === String(pecaObj.id))?.qtdUtilizada || 0;
    if (qtd + jaAdicionada > pecaObj.quantidade) {
      showToast(`Você possui apenas ${pecaObj.quantidade} unidades de ${pecaObj.nome} na maleta.`, 'warning');
      return;
    }

    // Se já estiver na lista, apenas soma a quantidade
    const idx = pecasUtilizadas.findIndex(p => String(p.id) === String(pecaObj.id));
    if (idx !== -1) {
      setPecasUtilizadas(pecasUtilizadas.map((p, i) =>
        i === idx ? { ...p, qtdUtilizada: p.qtdUtilizada + qtd } : p
      ));
    } else {
      setPecasUtilizadas([
        ...pecasUtilizadas,
        {
          id: pecaObj.id,
          nome: pecaObj.nome,
          codigo: pecaObj.codigo,
          qtdUtilizada: qtd
        }
      ]);
    }

    setSelectedPecaId('');
    setQtdPecaUsada('1');
    showToast(`Peça "${pecaObj.nome}" adicionada à Ordem de Serviço!`, 'info');
  };

  const handleRemovePecaOS = (id) => {
    setPecasUtilizadas(pecasUtilizadas.filter(p => p.id !== id));
  };

  const hasSignatureRef = useRef(false);
  const lastPosRef = useRef(null);
  const strokeDistanceRef = useRef(0);
  useEffect(() => { hasSignatureRef.current = hasSignature; }, [hasSignature]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();

    let tempImgData = null;
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    if (oldWidth > 0 && oldHeight > 0) {
      try {
        tempImgData = canvas.toDataURL('image/png');
      } catch {
        tempImgData = null;
      }
    }

    canvas.width = rect.width;
    canvas.height = 160;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tempImgData && hasSignatureRef.current) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = tempImgData;
    }
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      resizeCanvas();
    }

    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        const rect = canvasRef.current.parentElement.getBoundingClientRect();
        if (rect.width > 0 && canvasRef.current.width !== rect.width) {
          resizeCanvas();
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resizeCanvas]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleStart = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    lastPosRef.current = pos;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handleMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);

    if (lastPosRef.current) {
      const dx = pos.x - lastPosRef.current.x;
      const dy = pos.y - lastPosRef.current.y;
      strokeDistanceRef.current += Math.hypot(dx, dy);
      if (strokeDistanceRef.current >= 15 && !hasSignature) {
        setHasSignature(true);
      }
    }
    lastPosRef.current = pos;

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handleEnd = () => {
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    strokeDistanceRef.current = 0;
    lastPosRef.current = null;
    setHasSignature(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checklistCompleto) {
      showToast('Por favor, conclua todas as etapas obrigatórias do Checklist Técnico.', 'warning');
      return;
    }
    if (temAlertaPreventivo && !pecaFimVida.trim()) {
      showToast('Informe qual peça está no fim da vida útil (ex: Fusor, Cilindro).', 'warning');
      return;
    }
    if (!laudo.trim()) {
      showToast('Por favor, descreva o laudo técnico do atendimento.', 'warning');
      return;
    }
    if (!hasSignature) {
      showToast('Por favor, solicite a assinatura do cliente no celular.', 'warning');
      return;
    }

    const canvas = canvasRef.current;
    const signatureBase64 = canvas.toDataURL('image/png');

    try {
      setLoading(true);

      const resumoChecklistText =
        '\n--- CHECKLIST TÉCNICO EXECUTADO ---\n' +
        CHECKLIST_ETAPAS.map(etapa => `[✓] ${etapa.label}`).join('\n');

      let resumoAlertaPreventivoText = '';
      let textoAlertaCurto = '';
      if (temAlertaPreventivo && pecaFimVida.trim()) {
        const detalhe = obsFimVida.trim() || 'Vai durar apenas mais algumas impressões — levar peça na próxima visita.';
        textoAlertaCurto = `${pecaFimVida.trim()} (${fullPrinterName}) — ${detalhe}`;
        resumoAlertaPreventivoText =
          `\n--- ALERTA PREVENTIVO (PEÇA NO FIM DA VIDA ÚTIL) ---\n` +
          `⚠️ ${textoAlertaCurto}`;
      }

      // Formata contadores P&B e Color no laudo quando informados
      const pbVal = contadorPb !== '' ? parseInt(contadorPb, 10) : undefined;
      const corVal = contadorCor !== '' ? parseInt(contadorCor, 10) : undefined;
      if ((pbVal !== undefined && pbVal < 0) || (corVal !== undefined && corVal < 0)) {
        showToast('Os contadores não podem ter valores negativos.', 'warning');
        setLoading(false);
        return;
      }

      let resumoContadoresText = '';
      if (pbVal !== undefined || corVal !== undefined) {
        const linhasContadores = [];
        if (pbVal !== undefined && !Number.isNaN(pbVal)) linhasContadores.push(`- P&B: ${pbVal.toLocaleString('pt-BR')} páginas`);
        if (corVal !== undefined && !Number.isNaN(corVal)) linhasContadores.push(`- Color: ${corVal.toLocaleString('pt-BR')} páginas`);
        if (linhasContadores.length > 0) {
          resumoContadoresText = '\n--- MEDIDORES NO ATENDIMENTO ---\n' + linhasContadores.join('\n');
        }
      }

      // Formata lista de peças no laudo técnico
      let resumoPecasText = '';
      if (pecasUtilizadas.length > 0) {
        resumoPecasText = '\n--- PEÇAS UTILIZADAS (ESTOQUE VOLANTE) ---\n' +
          pecasUtilizadas.map(p => `- ${p.qtdUtilizada}x ${p.nome} [${p.codigo}]`).join('\n');
      }

      // Sanitiza o laudo para evitar injeção de delimitadores de assinatura
      const laudoSanitizado = laudo.trim()
        .replace(/---ASSINATURA---/g, '[ASSINATURA]')
        .replace(/\[Assinatura Digital\]:/g, '[Assinatura Digital]');

      const laudoCompleto = `${laudoSanitizado}${resumoChecklistText}${resumoAlertaPreventivoText}${resumoContadoresText}${resumoPecasText}\n---ASSINATURA---\n${signatureBase64}`;

      if (textoAlertaCurto) {
        const eqId = os.equipamentos_id ?? equip?.id_equipamentos;
        salvarAlertaPreventivoLocal(eqId, numSerie, textoAlertaCurto);
      }

      const preventivaInfo = temAlertaPreventivo && gerarOsPreventiva && pecaFimVida.trim()
        ? {
            osOriginal: os,
            pecaAlerta: `${pecaFimVida.trim()} (${fullPrinterName})`,
            detalheAlerta: obsFimVida.trim() || 'Vai durar apenas mais algumas impressões — levar peça no carro.'
          }
        : null;

      // 1º conclui a OS (e cria/reabre a preventiva se marcado); só depois dá baixa no estoque
      await onSubmit({
        status_chamado: 'concluido',
        laudo_tecnico: laudoCompleto,
        contador_pb_atendimento: pbVal !== undefined && !Number.isNaN(pbVal) ? pbVal : undefined,
        contador_cor_atendimento: corVal !== undefined && !Number.isNaN(corVal) ? corVal : undefined,
        preventivaInfo
      });

      if (pecasUtilizadas.length > 0) {
        try {
          const clienteNome = os.parceiro?.nome_principal || os.solicitante_nome || 'Cliente';
          await darBaixaPecasOS(os.numero_os, clienteNome, pecasUtilizadas);
        } catch (err) {
          showToast(`OS concluída, mas houve erro ao baixar o estoque: ${err.message || err}`, 'warning');
        }
      }
    } catch (err) {
      showToast(err.message || 'Erro ao finalizar chamado.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '540px' }}>
        <div className="modal-title-row">
          <h3 className="modal-title">
            <i className="fa-solid fa-signature" style={{ color: '#60a5fa', marginRight: '8px' }}></i>
            Finalizar Ordem de Serviço
          </h3>
          <button className="modal-close-icon" onClick={onClose} disabled={loading}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Checklist Obrigatório de Procedimentos do Técnico */}
          <div
            className="form-group-field"
            style={{
              background: checklistCompleto ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 255, 255, 0.03)',
              padding: '12px',
              borderRadius: '12px',
              border: `1px solid ${checklistCompleto ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
              <label className="form-label-styled" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <i className="fa-solid fa-list-check" style={{ color: checklistCompleto ? '#34d399' : '#38bdf8' }}></i>
                Checklist de Procedimentos *
              </label>

              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 9px',
                  borderRadius: '12px',
                  background: checklistCompleto ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.18)',
                  color: checklistCompleto ? '#34d399' : '#fbbf24',
                  border: `1px solid ${checklistCompleto ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`
                }}
              >
                {checklistCompleto ? '✅ Completo' : `${concluidosChecklist}/${totalChecklist} etapas`}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {CHECKLIST_ETAPAS.map((etapa, idx) => {
                const checked = !!checklist[etapa.id];
                return (
                  <div
                    key={etapa.id}
                    onClick={() => toggleChecklistItem(etapa.id)}
                    role="checkbox"
                    aria-checked={checked}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        toggleChecklistItem(etapa.id);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      background: checked ? 'rgba(16, 185, 129, 0.14)' : 'rgba(7, 9, 14, 0.65)',
                      border: `1px solid ${checked ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <i
                      className={checked ? 'fa-solid fa-square-check' : 'fa-regular fa-square'}
                      style={{
                        fontSize: '1.15rem',
                        color: checked ? '#34d399' : '#64748b',
                        flexShrink: 0
                      }}
                    ></i>
                    <span
                      style={{
                        fontSize: '0.82rem',
                        lineHeight: 1.35,
                        color: checked ? '#f8fafc' : '#cbd5e1',
                        fontWeight: checked ? 600 : 400
                      }}
                    >
                      <strong style={{ color: checked ? '#34d399' : '#38bdf8', marginRight: '4px' }}>
                        {idx + 1}.
                      </strong>
                      {etapa.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alerta Preventivo: Peça no Fim da Vida Útil (Vai durar poucas impressões) */}
          <div
            className="form-group-field"
            style={{
              background: temAlertaPreventivo ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.03)',
              padding: '12px',
              borderRadius: '12px',
              border: `1px solid ${temAlertaPreventivo ? 'rgba(245, 158, 11, 0.45)' : 'rgba(255, 255, 255, 0.08)'}`,
              transition: 'all 0.2s ease'
            }}
          >
            <div
              onClick={() => setTemAlertaPreventivo(!temAlertaPreventivo)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: temAlertaPreventivo ? '#fbbf24' : '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f59e0b' }}></i>
                Constatou peça gasta (vai durar só mais algumas impressões)?
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: temAlertaPreventivo ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)',
                  color: temAlertaPreventivo ? '#0f172a' : '#94a3b8'
                }}
              >
                {temAlertaPreventivo ? 'SIM (Ativo)' : 'NÃO'}
              </span>
            </div>

            {temAlertaPreventivo && (
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed rgba(245, 158, 11, 0.3)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label className="form-label-styled" style={{ fontSize: '0.74rem', color: '#fcd34d' }}>
                    Qual peça está no limite da vida útil? *
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {PECAS_DESGASTE_COMUNS.map(itemNome => {
                      const selecionado = pecaFimVida === itemNome;
                      return (
                        <button
                          key={itemNome}
                          type="button"
                          onClick={() => setPecaFimVida(itemNome)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '14px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: selecionado ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.14)',
                            background: selecionado ? 'rgba(245, 158, 11, 0.28)' : 'rgba(15, 23, 42, 0.7)',
                            color: selecionado ? '#fef08a' : '#cbd5e1'
                          }}
                        >
                          {selecionado ? '⚠️ ' : ''}{itemNome}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    className="input-styled"
                    style={{ fontSize: '0.82rem' }}
                    placeholder="Ou digite a peça (ex: Fusor Brother HL-L5102DW)..."
                    value={pecaFimVida}
                    onChange={(e) => setPecaFimVida(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label-styled" style={{ fontSize: '0.74rem', color: '#fcd34d' }}>
                    Estimativa / Aviso para o Próximo Atendimento
                  </label>
                  <input
                    type="text"
                    className="input-styled"
                    style={{ fontSize: '0.82rem' }}
                    placeholder="Ex: Vai durar só mais ~1.000 impressões. Levar fusor na próxima visita!"
                    value={obsFimVida}
                    onChange={(e) => setObsFimVida(e.target.value)}
                  />
                </div>

                <div
                  onClick={() => setGerarOsPreventiva(!gerarOsPreventiva)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(7, 9, 14, 0.6)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontSize: '0.78rem',
                    color: '#fef3c7'
                  }}
                >
                  <i
                    className={gerarOsPreventiva ? 'fa-solid fa-square-check' : 'fa-regular fa-square'}
                    style={{ color: gerarOsPreventiva ? '#fbbf24' : '#64748b', fontSize: '1.05rem' }}
                  ></i>
                  <span>
                    <strong>Abrir automaticamente uma OS Preventiva</strong> no sistema para lembrar de levar esta peça na próxima visita
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="form-group-field">
            <label className="form-label-styled">Laudo Técnico / Solução Aplicada *</label>
            <textarea
              className="input-styled"
              rows="3"
              placeholder="Descreva testes executados, causa do defeito e solução..."
              value={laudo}
              onChange={(e) => setLaudo(e.target.value)}
              required
            ></textarea>
          </div>

          {/* Seção de Peças & Consumíveis do Estoque Volante (Restrito à Marca/Modelo da OS) */}
          <div className="form-group-field" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <label className="form-label-styled" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <i className="fa-solid fa-briefcase" style={{ color: '#00a2e8' }}></i>
              Peças e Insumos Compatíveis ({fullPrinterName})
            </label>

            {/* Banner informativo do Modelo da Impressora vinculada à OS */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              padding: '6px 10px',
              borderRadius: '8px',
              marginBottom: '10px',
              fontSize: '0.76rem'
            }}>
              <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-print" style={{ color: '#38bdf8' }}></i>
                Equipamento: <strong style={{ color: '#f8fafc' }}>{fullPrinterName}</strong>
              </span>
              <span style={{ color: pecasCompativeis.length > 0 ? '#34d399' : '#f87171', fontWeight: 600, fontSize: '0.72rem' }}>
                {pecasCompativeis.length > 0
                  ? `✅ ${pecasCompativeis.length} peça(s) compatível(is)`
                  : '⚠️ Nenhuma peça para este modelo na maleta'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <select
                className="input-styled"
                style={{ flex: '3 1 180px', fontSize: '0.8rem' }}
                value={selectedPecaId}
                onChange={(e) => setSelectedPecaId(e.target.value)}
                disabled={pecasCompativeis.length === 0}
              >
                <option value="">
                  {pecasCompativeis.length > 0
                    ? `-- Selecionar peça para ${fullPrinterName || detectedBrand} --`
                    : `-- Sem peças para ${fullPrinterName || detectedBrand} no estoque --`}
                </option>
                {pecasCompativeis.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome} [{p.compatibilidade}] (Disp: {p.quantidade} {p.unidade})
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: '6px', flex: '1 1 100px' }}>
                <input
                  type="number"
                  className="input-styled"
                  style={{ flex: 1, textAlign: 'center', fontSize: '0.8rem' }}
                  value={qtdPecaUsada}
                  onChange={(e) => setQtdPecaUsada(e.target.value)}
                  min="1"
                />

                <button
                  type="button"
                  className="btn-mobile"
                  onClick={handleAddPecaOS}
                  style={{ background: '#00a2e8', color: '#fff', padding: '0 14px' }}
                  title="Adicionar à OS"
                >
                  <i className="fa-solid fa-plus"></i>
                </button>
              </div>
            </div>

            {/* Lista de Peças Selecionadas */}
            {pecasUtilizadas.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                {pecasUtilizadas.map(p => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(0, 162, 232, 0.12)',
                      border: '1px solid rgba(0, 162, 232, 0.25)',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '0.78rem'
                    }}
                  >
                    <span style={{ color: '#f8fafc', fontWeight: '600' }}>
                      {p.qtdUtilizada}x {p.nome} <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>[{p.codigo}]</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePecaOS(p.id)}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-row-responsive">
            <div className="form-group-field">
              <label className="form-label-styled">Contador P&B Atual</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                className="input-styled"
                placeholder="Ex: 15420"
                value={contadorPb}
                onChange={(e) => setContadorPb(e.target.value)}
              />
            </div>
            <div className="form-group-field">
              <label className="form-label-styled">Contador Color Atual</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                className="input-styled"
                placeholder="Ex: 3200"
                value={contadorCor}
                onChange={(e) => setContadorCor(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group-field">
            <label className="form-label-styled">
              <i className="fa-solid fa-pen-nib" style={{ marginRight: '6px' }}></i>
              Assinatura do Cliente no Celular *
            </label>
            <div className="signature-box">
              <canvas
                ref={canvasRef}
                className="signature-canvas-element"
                style={{ touchAction: 'none' }}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
              ></canvas>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <button
                type="button"
                className="btn-mobile"
                onClick={clearCanvas}
                style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.3)', padding: '4px 12px' }}
              >
                <i className="fa-solid fa-eraser"></i> Limpar Assinatura
              </button>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', alignSelf: 'center' }}>Desenhe com o dedo acima</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              className="btn-mobile"
              onClick={onClose}
              disabled={loading}
              style={{ flex: 1, background: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-mobile btn-complete"
              disabled={loading}
              style={{ flex: 2 }}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Concluindo...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check"></i> Concluir OS
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
