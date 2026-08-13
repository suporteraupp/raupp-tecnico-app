import React from 'react';

export function CityFilter({ selectedCity, onSelectCity, cities }) {
  if (!cities || cities.length === 0) return null;

  return (
    <div
      style={{
        margin: '0 16px 12px 16px',
        padding: '10px 14px',
        background: 'rgba(15, 20, 30, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-map-location-dot" style={{ color: '#38bdf8' }}></i>
          Filtro por Cidade
        </span>

        {selectedCity && (
          <button
            onClick={() => onSelectCity('')}
            style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fb7185',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <i className="fa-solid fa-xmark"></i> Limpar Filtro
          </button>
        )}
      </div>

      {/* Carrossel / Lista de Chips de Cidades */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '2px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <button
          onClick={() => onSelectCity('')}
          style={{
            padding: '5px 12px',
            borderRadius: '20px',
            border: selectedCity === '' ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
            background: selectedCity === '' ? 'linear-gradient(135deg, #0284c7, #00a2e8)' : 'rgba(255, 255, 255, 0.05)',
            color: selectedCity === '' ? '#ffffff' : '#94a3b8',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease'
          }}
        >
          Todas ({cities.reduce((acc, c) => acc + c.count, 0)})
        </button>

        {cities.map((item) => {
          const isActive = selectedCity.toLowerCase() === item.name.toLowerCase();
          return (
            <button
              key={item.name}
              onClick={() => onSelectCity(isActive ? '' : item.name)}
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                border: isActive ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                background: isActive ? 'linear-gradient(135deg, #0284c7, #00a2e8)' : 'rgba(255, 255, 255, 0.05)',
                color: isActive ? '#ffffff' : '#cbd5e1',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
            >
              <i className="fa-solid fa-city" style={{ fontSize: '0.7rem', opacity: isActive ? 1 : 0.6 }}></i>
              {item.name}
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                  color: isActive ? '#fff' : '#94a3b8',
                  marginLeft: '2px'
                }}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
