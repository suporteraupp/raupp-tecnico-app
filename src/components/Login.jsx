import React, { useState } from 'react';
import { apiLogin, setToken, setUser } from '../config/api';

export function Login({ onLoginSuccess, showToast }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usuario.trim() || !password.trim()) {
      showToast('Preencha usuário/e-mail e senha.', 'warning');
      return;
    }

    try {
      setLoading(true);
      const data = await apiLogin(usuario.trim(), password.trim());
      setToken(data.token);
      setUser(data.user);
      showToast(`Bem-vindo, ${data.user.nome}!`, 'success');
      onLoginSuccess(data.user);
    } catch (err) {
      showToast(err.message || 'Erro ao realizar login.', 'error');
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
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
                  onChange={(e) => setUsuario(e.target.value)}
                  required
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
                  type="password"
                  className="input-styled"
                  style={{ paddingLeft: '44px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
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
                  <i className="fa-solid fa-spinner fa-spin"></i> Entrando...
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
