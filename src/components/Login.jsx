import React, { useState } from 'react';
import { apiLogin, apiSignUp, setToken, setUser } from '../config/api';

export function Login({ onLoginSuccess, showToast }) {
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
      showToast('Preencha usuário/e-mail e senha.', 'warning');
      return;
    }

    try {
      setLoading(true);
      if (isRegistering) {
        const res = await apiSignUp(usuario.trim(), password.trim());
        if (res.isNew) {
          showToast(`Conta criada com sucesso! Bem-vindo, ${res.user.nome}!`, 'success');
          onLoginSuccess(res.user);
        } else {
          showToast(res.message, 'info');
          setIsRegistering(false);
        }
      } else {
        const data = await apiLogin(usuario.trim(), password.trim());
        setToken(data.token);
        setUser(data.user);
        if (data.wasFallback) {
          showToast('Servidor API offline. Conectado em Modo Demonstração!', 'info');
        } else {
          showToast(`Bem-vindo, ${data.user.nome}!`, 'success');
        }
        onLoginSuccess(data.user);
      }
    } catch (err) {
      const errorMsg = err.message || 'Erro ao processar autenticação.';
      setAuthError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRegister = async () => {
    if (!usuario.trim() || !password.trim()) {
      setIsRegistering(true);
      showToast('Preencha um usuário e senha para cadastrar.', 'warning');
      return;
    }
    try {
      setLoading(true);
      setAuthError('');
      const res = await apiSignUp(usuario.trim(), password.trim());
      if (res.isNew) {
        showToast(`Conta cadastrada com sucesso! Bem-vindo, ${res.user.nome}!`, 'success');
        onLoginSuccess(res.user);
      } else {
        showToast(res.message, 'info');
      }
    } catch (err) {
      setAuthError(err.message || 'Erro ao criar conta no Supabase.');
      showToast(err.message || 'Erro ao criar conta.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setLoading(true);
      setAuthError('');
      const data = await apiLogin(usuario.trim() || 'Técnico Raupp', '', true);
      showToast('Entrou no Modo Demonstração (Sem Backend)!', 'info');
      onLoginSuccess(data.user);
    } catch {
      showToast('Erro ao iniciar modo demonstração.', 'error');
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

          {authError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '20px',
              color: '#fca5a5',
              fontSize: '0.86rem',
              lineHeight: '1.4'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <i className="fa-solid fa-circle-exclamation" style={{ color: '#ef4444', fontSize: '1.1rem', marginTop: '2px' }}></i>
                <div>
                  <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '2px' }}>Aviso de Autenticação</strong>
                  {authError}
                </div>
              </div>
              <div style={{
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px dashed rgba(239, 68, 68, 0.2)',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={handleQuickRegister}
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#6ee7b7',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600
                  }}
                >
                  <i className="fa-solid fa-user-plus"></i>
                  Cadastrar esta Conta no Supabase
                </button>
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600
                  }}
                >
                  <i className="fa-solid fa-bolt"></i>
                  Modo Demonstração
                </button>
              </div>
            </div>
          )}

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

            <button
              type="button"
              onClick={handleDemoLogin}
              className="btn-mobile"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.9rem',
                background: 'rgba(56, 189, 248, 0.1)',
                color: '#38bdf8',
                border: '1px dashed rgba(56, 189, 248, 0.4)'
              }}
            >
              <i className="fa-solid fa-bolt"></i> Entrar em Modo Demonstração (Offline)
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


