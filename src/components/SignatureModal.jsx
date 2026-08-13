import React, { useRef, useState, useEffect } from 'react';

export function SignatureModal({ os, onClose, onSubmit, showToast }) {
  const canvasRef = useRef(null);
  const [laudo, setLaudo] = useState('');
  const [contadorPb, setContadorPb] = useState('');
  const [contadorCor, setContadorCor] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      resizeCanvas();
    }
  }, []);

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 160;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setHasSignature(false);
  };

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
    setHasSignature(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handleMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
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
      const laudoCompleto = `${laudo.trim()}\n---ASSINATURA---\n${signatureBase64}`;
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
      <div className="modal-card">
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
              placeholder="Descreva testes executados, peças trocadas e solução..."
              value={laudo}
              onChange={(e) => setLaudo(e.target.value)}
              required
            ></textarea>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="form-group-field" style={{ flex: 1 }}>
              <label className="form-label-styled">Contador P&B Atual</label>
              <input
                type="number"
                className="input-styled"
                placeholder="Ex: 15420"
                value={contadorPb}
                onChange={(e) => setContadorPb(e.target.value)}
              />
            </div>
            <div className="form-group-field" style={{ flex: 1 }}>
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
