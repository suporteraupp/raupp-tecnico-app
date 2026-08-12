import React from 'react';

export function TabNav({ currentTab, onChangeTab, counts }) {
  return (
    <div className="tab-navigation">
      <button
        className={`tab-button ${currentTab === 'aberto' ? 'active' : ''}`}
        onClick={() => onChangeTab('aberto')}
      >
        <i className="fa-solid fa-clock-rotate-left"></i>
        <span>Abertos</span>
        <span className="tab-count-chip">{counts.abertos}</span>
      </button>

      <button
        className={`tab-button ${currentTab === 'em_atendimento' ? 'active' : ''}`}
        onClick={() => onChangeTab('em_atendimento')}
      >
        <i className="fa-solid fa-person-digging"></i>
        <span>Em Curso</span>
        <span className="tab-count-chip">{counts.emCurso}</span>
      </button>

      <button
        className={`tab-button ${currentTab === 'concluido' ? 'active' : ''}`}
        onClick={() => onChangeTab('concluido')}
      >
        <i className="fa-solid fa-circle-check"></i>
        <span>Fechados</span>
        <span className="tab-count-chip">{counts.concluidos}</span>
      </button>
    </div>
  );
}
