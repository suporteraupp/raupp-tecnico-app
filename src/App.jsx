import React, { useState, useEffect } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useEstoqueVolante } from './hooks/useEstoqueVolante';
import { useChamados } from './hooks/useChamados';

import { Login } from './components/Login';
import { Header } from './components/Header';
import { TabNav } from './components/TabNav';
import { OsCard } from './components/OsCard';
import { ClientList } from './components/ClientList';
import { CityFilter } from './components/CityFilter';
import { TechMaleta } from './components/TechMaleta';
import { SignatureModal } from './components/SignatureModal';
import { EquipmentHistoryModal } from './components/EquipmentHistoryModal';

function TechnicalApp() {
  const { user, loading: authLoading, logout } = useAuth();
  const { showToast } = useToast();
  const { maletaMetrics, updateMaletaMetrics } = useEstoqueVolante();

  const [currentTab, setCurrentTab] = useState('aberto');
  const [selectedCity, setSelectedCity] = useState('');
  const [activeOsForSignature, setActiveOsForSignature] = useState(null);
  const [historyModalData, setHistoryModalData] = useState(null);

  const {
    loading: dataLoading,
    loadingParceiros,
    parceiros,
    loadData,
    startOs,
    completeOs,
    getFilteredData
  } = useChamados({ showToast, updateMaletaMetrics });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleOpenHistory = (equipamentoId, equipamentoLabel, numeroSerie) => {
    setHistoryModalData({ equipamentoId, equipamentoLabel, numeroSerie });
  };

  const handleStartOs = async (osId) => {
    const ok = await startOs(osId);
    if (ok) {
      setCurrentTab('em_atendimento');
    }
  };

  const handleCompleteOsSubmit = async (payload) => {
    if (!activeOsForSignature) return;
    await completeOs(activeOsForSignature.id_os_chamados, payload);
    setActiveOsForSignature(null);
    setCurrentTab('concluido');
  };

  const handleLogout = () => {
    logout();
    setSelectedCity('');
  };

  if (!user && !authLoading) {
    return <Login showToast={showToast} />;
  }

  const {
    availableCities,
    abertos,
    emCurso,
    concluidos,
    filteredList,
    filteredByCityParceiros
  } = getFilteredData(currentTab, selectedCity);

  return (
    <div className="app-container">
      {/* Ambient Background */}
      <div className="bg-decor bg-decor-1"></div>
      <div className="bg-decor bg-decor-2"></div>

      <Header user={user} onRefresh={loadData} onLogout={handleLogout} />

      <TabNav
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        counts={{
          abertos: abertos.length,
          emCurso: emCurso.length,
          concluidos: concluidos.length,
          clientes: filteredByCityParceiros.length,
          maletaTotal: maletaMetrics.total,
          maletaAlertas: maletaMetrics.alertas
        }}
      />

      {!dataLoading && currentTab !== 'maleta' && (
        <CityFilter
          selectedCity={selectedCity}
          onSelectCity={setSelectedCity}
          cities={availableCities}
        />
      )}

      <main style={{ minHeight: '300px', position: 'relative', zIndex: 10 }}>
        {currentTab === 'maleta' ? (
          <TechMaleta showToast={showToast} />
        ) : currentTab === 'clientes' ? (
          <ClientList parceiros={parceiros} loading={loadingParceiros} selectedCity={selectedCity} />
        ) : dataLoading ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
            <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ color: '#00a2e8' }}></i>
            <p style={{ marginTop: '12px', fontWeight: 500 }}>Carregando Ordens de Serviço...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <i className="fa-solid fa-folder-open fa-3x" style={{ opacity: 0.5 }}></i>
            <p style={{ marginTop: '12px', fontWeight: 500 }}>
              {selectedCity
                ? `Nenhuma Ordem de Serviço na cidade de ${selectedCity} nesta aba.`
                : 'Nenhuma Ordem de Serviço nesta aba.'}
            </p>
          </div>
        ) : (
          <div className="os-cards-container">
            {filteredList.map(os => (
              <OsCard
                key={os.id_os_chamados}
                os={os}
                currentTab={currentTab}
                onStartOs={handleStartOs}
                onOpenSignatureModal={setActiveOsForSignature}
                onOpenHistory={handleOpenHistory}
              />
            ))}
          </div>
        )}
      </main>

      {activeOsForSignature && (
        <SignatureModal
          os={activeOsForSignature}
          onClose={() => setActiveOsForSignature(null)}
          onSubmit={handleCompleteOsSubmit}
          showToast={showToast}
        />
      )}

      {historyModalData && (
        <EquipmentHistoryModal
          equipamentoId={historyModalData.equipamentoId}
          equipamentoLabel={historyModalData.equipamentoLabel}
          numeroSerie={historyModalData.numeroSerie}
          onClose={() => setHistoryModalData(null)}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <TechnicalApp />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
