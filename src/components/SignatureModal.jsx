import React, { useRef, useState, useEffect, useCallback } from 'react';
import { getEstoqueVolante, darBaixaPecasOS } from '../config/estoqueApi';

export function SignatureModal({ os, onClose, onSubmit, showToast }) {
  const canvasRef = useRef(null);
  const [laudo, setLaudo] = useState('');
  const [contadorPb, setContadorPb] = useState('');
  const [contadorCor, setContadorCor] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estados para Peças da Maleta
  const [estoqueVolante, setEstoqueVolante] = useState([]);
  const [selectedPecaId, setSelectedPecaId] = useState('');
  const [qtdPecaUsada, setQtdPecaUsada] = useState('1');
  const [pecasUtilizadas, setPecasUtilizadas] = useState([]);

  useEffect(() => {
    // Carrega peças disponíveis na maleta do técnico
    async function loadItems() {
      const items = await getEstoqueVolante();
      setEstoqueVolante(items.filter(i => i.quantidade > 0));
    }
    loadItems();
  }, []);

  const handleAddPecaOS = () => {
    if (!selectedPecaId) {
      showToast('Selecione uma peça da maleta.', 'warning');
      return;
    }

    const pecaObj = estoqueVolante.find(p => p.id === selectedPecaId);
    if (!pecaObj) return;

    const qtd = parseInt(qtdPecaUsada) || 1;
    if (qtd > pecaObj.quantidade) {
      showToast(`Você possui apenas ${pecaObj.quantidade} unidades de ${pecaObj.nome} na maleta.`, 'warning');
      return;
    }

    // Se já estiver na lista, apenas soma a quantidade
    const idx = pecasUtilizadas.findIndex(p => p.id === selectedPecaId);
    if (idx !== -1) {
      const novasList = [...pecasUtilizadas];
      novasList[idx].qtdUtilizada += qtd;
      setPecasUtilizadas(novasList);
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

    if (tempImgData && hasSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = tempImgData;
    }
  }, [hasSignature]);

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
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handleMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    setHasSignature(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

      const laudoCompleto = `${laudoSanitizado}${resumoPecasText}\n---ASSINATURA---\n${signatureBase64}`;

      // Dá baixa automática no estoque volante
      if (pecasUtilizadas.length > 0) {
        const clienteNome = os.parceiro?.nome_principal || os.solicitante_nome || 'Cliente';
        await darBaixaPecasOS(os.numero_os, clienteNome, pecasUtilizadas);
      }

      await onSubmit({
        status_chamado: 'concluido',
        laudo_tecnico: laudoCompleto,
        contador_pb_atendimento: contadorPb ? parseInt(contadorPb) : undefined,
        contador_cor_atendimento: contadorCor ? parseInt(contadorCor) : undefined
      });
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
          <button className="modal-close-icon" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
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

          {/* Seção de Peças & Consumíveis do Estoque Volante */}
          <div className="form-group-field" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <label className="form-label-styled" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-briefcase" style={{ color: '#00a2e8' }}></i>
              Peças Utilizadas (Estoque Volante do Carro)
            </label>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <select
                className="input-styled"
                style={{ flex: '3 1 180px', fontSize: '0.8rem' }}
                value={selectedPecaId}
                onChange={(e) => setSelectedPecaId(e.target.value)}
              >
                <option value="">-- Selecionar Peça da Maleta --</option>
                {estoqueVolante.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome} (Disp: {p.quantidade} {p.unidade})
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
