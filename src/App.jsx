import React, { useState, useEffect, useCallback } from 'react';
import { getToken, getUser, apiFetchChamados, apiFetchParceiros, apiAtualizarStatusChamado, removeToken } from './config/api';
import { Login } from './components/Login';
import { Header } from './components/Header';
import { TabNav } from './components/TabNav';
import { OsCard } from './components/OsCard';
import { ClientList } from './components/ClientList';
import { CityFilter } from './components/CityFilter';
import { SignatureModal } from './components/SignatureModal';
import { Toast } from './components/Toast';

export function App() {
  const [user, setUserState] = useState(null);
  const [chamados, setChamados] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [currentTab, setCurrentTab] = useState('aberto');
  const [selectedCity, setSelectedCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingParceiros, setLoadingParceiros] = useState(false);
  const [activeOsForSignature, setActiveOsForSignature] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast({ message: '', type: 'info' });
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingParceiros(true);
      const [chamadosData, parceirosData] = await Promise.all([
        apiFetchChamados(),
        apiFetchParceiros()
      ]);
      setChamados(chamadosData);
      setParceiros(parceirosData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      showToast(err.message || 'Erro ao carregar dados.', 'error');
    } finally {
      setLoading(false);
      setLoadingParceiros(false);
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    const u = getUser();
    if (token && u) {
      setUserState(u);
      loadData();
    } else {
      setLoading(false);
    }
  }, [loadData]);

  const handleLoginSuccess = (userObj) => {
    setUserState(userObj);
    loadData();
  };

  const handleLogout = () => {
    removeToken();
    setUserState(null);
    setChamados([]);
    setParceiros([]);
    setSelectedCity('');
  };

  const handleStartOs = async (osId) => {
    try {
      await apiAtualizarStatusChamado(osId, { status_chamado: 'em_atendimento' });
      showToast('Atendimento iniciado com sucesso!', 'success');
      setCurrentTab('em_atendimento');
      loadData();
    } catch (err) {
      showToast(err.message || 'Erro ao iniciar atendimento.', 'error');
    }
  };

  const handleCompleteOsSubmit = async (payload) => {
    if (!activeOsForSignature) return;
    try {
      await apiAtualizarStatusChamado(activeOsForSignature.id_os_chamados, payload);
      showToast('Ordem de Serviço concluída com Assinatura Digital!', 'success');
      setActiveOsForSignature(null);
      setCurrentTab('concluido');
      loadData();
    } catch (err) {
      showToast(err.message || 'Erro ao concluir Ordem de Serviço.', 'error');
      throw err;
    }
  };

  // Se não estiver logado, exibe a tela de login
  if (!user && !loading) {
    return (
      <div className="app-container">
        <div className="bg-decor bg-decor-1"></div>
        <div className="bg-decor bg-decor-2"></div>
        <Toast message={toast.message} type={toast.type} onClose={closeToast} />
        <Login onLoginSuccess={handleLoginSuccess} showToast={showToast} />
      </div>
    );
  }

  // Extração de Cidades Únicas com Contadores
  const citiesMap = {};

  chamados.forEach(c => {
    const loc = c.parceiro_localizacao || {};
    const parceiro = c.parceiro || {};
    const city = (loc.end_cidade || parceiro.end_cidade || '').trim();
    if (city) {
      const key = city.toUpperCase();
      if (!citiesMap[key]) {
        citiesMap[key] = { name: city, count: 0 };
      }
      citiesMap[key].count += 1;
    }
  });

  const availableCities = Object.values(citiesMap).sort((a, b) => b.count - a.count);

  // Filtragem por Cidade
  const filteredByCityChamados = selectedCity
    ? chamados.filter(c => {
        const loc = c.parceiro_localizacao || {};
        const parceiro = c.parceiro || {};
        const city = (loc.end_cidade || parceiro.end_cidade || '').toLowerCase();
        return city.includes(selectedCity.toLowerCase());
      })
    : chamados;

  const abertos = filteredByCityChamados.filter(c => c.status_chamado === 'aberto');
  const emCurso = filteredByCityChamados.filter(c => c.status_chamado === 'em_atendimento');
  const concluidos = filteredByCityChamados.filter(c => c.status_chamado === 'concluido');
  const filteredList = filteredByCityChamados.filter(c => c.status_chamado === currentTab);

  const filteredByCityParceiros = selectedCity
    ? parceiros.filter(p => (p.end_cidade || '').toLowerCase().includes(selectedCity.toLowerCase()))
    : parceiros;

  return (
    <div className="app-container">
      {/* Background Decorativo Raupp ERP */}
      <div className="bg-decor bg-decor-1"></div>
      <div className="bg-decor bg-decor-2"></div>

      <Toast message={toast.message} type={toast.type} onClose={closeToast} />

      <Header user={user} onRefresh={loadData} onLogout={handleLogout} />

      <TabNav
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        counts={{
          abertos: abertos.length,
          emCurso: emCurso.length,
          concluidos: concluidos.length,
          clientes: filteredByCityParceiros.length
        }}
      />

      {/* Componente de Filtro por Cidade */}
      {!loading && (
        <CityFilter
          selectedCity={selectedCity}
          onSelectCity={setSelectedCity}
          cities={availableCities}
        />
      )}

      <main style={{ minHeight: '300px', position: 'relative', zIndex: 10 }}>
        {currentTab === 'clientes' ? (
          <ClientList parceiros={parceiros} loading={loadingParceiros} selectedCity={selectedCity} />
        ) : loading ? (
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
          filteredList.map(os => (
            <OsCard
              key={os.id_os_chamados}
              os={os}
              currentTab={currentTab}
              onStartOs={handleStartOs}
              onOpenSignatureModal={setActiveOsForSignature}
            />
          ))
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
    </div>
  );
}
export default App;
