import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function Login({ showToast }) {
  const { login, signUp } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!usuario.trim() || !password.trim()) {
      if (showToast) showToast('Preencha usuário/e-mail e senha.', 'warning');
      return;
    }

    try {
      setLoading(true);
      if (isRegistering) {
        const res = await signUp(usuario.trim(), password.trim());
        if (res.isNew) {
          if (showToast) showToast(`Conta criada com sucesso! Bem-vindo, ${res.user.nome}!`, 'success');
        } else {
          if (showToast) showToast(res.message, 'info');
          setIsRegistering(false);
        }
      } else {
        const data = await login(usuario.trim(), password.trim());
        if (showToast) showToast(`Bem-vindo, ${data.user.nome}!`, 'success');
      }
    } catch (err) {
      const errorMsg = err.message || 'Erro ao processar autenticação.';
      setAuthError(errorMsg);
      if (showToast) showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      zIndex: 10
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div className="os-card" style={{ padding: '36px 28px', margin: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img
              src="/assets/logo.png"
              alt="Raupp Soluções em Impressão"
              style={{
                maxWidth: '220px',
                height: 'auto',
                margin: '0 auto 16px',
                display: 'block',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))'
              }}
            />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>App do Técnico</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Raupp Soluções em Impressão</p>
          </div>

          {/* Abas Alternar Login / Cadastro */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '4px',
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            {/* Botão Entrar */}
            <button
              type="button"
              onClick={() => { setIsRegistering(false); setAuthError(''); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '0.86rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                background: !isRegistering ? 'var(--raupp-blue-primary)' : 'transparent',
                color: !isRegistering ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              <i className="fa-solid fa-right-to-bracket" style={{ marginRight: '6px' }}></i> Entrar
            </button>
            <button
              type="button"
              onClick={() => { setIsRegistering(true); setAuthError(''); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '0.86rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                background: isRegistering ? 'var(--raupp-blue-primary)' : 'transparent',
                color: isRegistering ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              <i className="fa-solid fa-user-plus" style={{ marginRight: '6px' }}></i> Criar Conta
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group-field">
              <label className="form-label-styled">
                USUÁRIO OU E-MAIL <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <i className="fa-solid fa-user" style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                  fontSize: '1rem'
                }}></i>
                <input
                  type="text"
                  className="input-styled"
                  style={{ paddingLeft: '44px' }}
                  placeholder="Seu usuário ou e-mail"
                  value={usuario}
                  onChange={(e) => {
                    setUsuario(e.target.value);
                    if (authError) setAuthError('');
                  }}
                />
              </div>
            </div>

            <div className="form-group-field">
              <label className="form-label-styled">
                SENHA <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <i className="fa-solid fa-lock" style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                  fontSize: '1rem'
                }}></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-styled"
                  style={{ paddingLeft: '44px', paddingRight: '44px' }}
                  placeholder={isRegistering ? 'Mínimo 6 caracteres' : '••••••••'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (authError) setAuthError('');
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px',
                    fontSize: '0.95rem'
                  }}
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-mobile btn-complete"
              disabled={loading}
              style={{ width: '100%', marginTop: '10px', padding: '14px', fontSize: '1rem' }}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Processando...
                </>
              ) : isRegistering ? (
                <>
                  <i className="fa-solid fa-user-plus"></i> Cadastrar e Entrar
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket"></i> Acessar Painel Técnico
                </>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <i className="fa-solid fa-shield-halved" style={{ marginRight: '6px', color: 'var(--raupp-blue-light)' }}></i>
            Conectado ao Raupp ERP Supabase
          </div>
        </div>
      </div>
    </div>
  );
}


