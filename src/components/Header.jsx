import React from 'react';
import { removeToken } from '../config/api';

export function Header({ user, onRefresh, onLogout }) {
  const handleLogout = () => {
    removeToken();
    onLogout();
  };

  return (
    <header className="app-header">
      <div className="header-title-area">
        <div className="logo-wrapper">
          <img
            src="/assets/logo.png"
            alt="Raupp Soluções em Impressão"
            className="logo-img"
          />
        </div>
        <div>
          <h1 className="header-app-name">App do Técnico</h1>
          <span className="header-tech-badge">
            <span className="status-dot-live"></span>
            {user?.nome || 'Técnico em Campo'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onRefresh}
          className="btn-mobile btn-call"
          style={{ padding: '9px 13px', fontSize: '0.9rem' }}
          title="Atualizar Chamados"
        >
          <i className="fa-solid fa-rotate"></i>
        </button>

        <button
          onClick={handleLogout}
          className="btn-mobile"
          style={{
            padding: '9px 13px',
            fontSize: '0.9rem',
            background: 'rgba(244, 63, 94, 0.15)',
            color: '#fb7185',
            border: '1px solid rgba(244, 63, 94, 0.3)'
          }}
          title="Sair"
        >
          <i className="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </header>
  );
}
