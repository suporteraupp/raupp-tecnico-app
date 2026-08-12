import React, { useState, useEffect, useCallback } from 'react';
import { getToken, getUser, apiFetchChamados, apiAtualizarStatusChamado, removeToken } from './config/api';
import { Login } from './components/Login';
import { Header } from './components/Header';
import { TabNav } from './components/TabNav';
import { OsCard } from './components/OsCard';
import { SignatureModal } from './components/SignatureModal';
import { Toast } from './components/Toast';

export function App() {
  const [user, setUserState] = useState(null);
  const [chamados, setChamados] = useState([]);
  const [currentTab, setCurrentTab] = useState('aberto');
  const [loading, setLoading] = useState(true);
  const [activeOsForSignature, setActiveOsForSignature] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast({ message: '', type: 'info' });
  };

  const loadChamados = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetchChamados();
      setChamados(data);
    } catch (err) {
      console.error('Erro ao carregar chamados:', err);
      showToast(err.message || 'Erro ao carregar chamados.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    const u = getUser();
    if (token && u) {
      setUserState(u);
      loadChamados();
    } else {
      setLoading(false);
    }
  }, [loadChamados]);

  const handleLoginSuccess = (userObj) => {
    setUserState(userObj);
    loadChamados();
  };

  const handleLogout = () => {
    removeToken();
    setUserState(null);
    setChamados([]);
  };

  const handleStartOs = async (osId) => {
    try {
      await apiAtualizarStatusChamado(osId, { status_chamado: 'em_atendimento' });
      showToast('Atendimento iniciado com sucesso!', 'success');
      setCurrentTab('em_atendimento');
      loadChamados();
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
      loadChamados();
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

  // Filtragem e Contadores
  const abertos = chamados.filter(c => c.status_chamado === 'aberto');
  const emCurso = chamados.filter(c => c.status_chamado === 'em_atendimento');
  const concluidos = chamados.filter(c => c.status_chamado === 'concluido');
  const filteredList = chamados.filter(c => c.status_chamado === currentTab);

  return (
    <div className="app-container">
      {/* Background Decorativo Raupp ERP (Blobs de luz Azul e Laranja) */}
      <div className="bg-decor bg-decor-1"></div>
      <div className="bg-decor bg-decor-2"></div>

      <Toast message={toast.message} type={toast.type} onClose={closeToast} />

      <Header user={user} onRefresh={loadChamados} onLogout={handleLogout} />

      <TabNav
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        counts={{
          abertos: abertos.length,
          emCurso: emCurso.length,
          concluidos: concluidos.length
        }}
      />

      <main style={{ minHeight: '300px', position: 'relative', zIndex: 10 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
            <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ color: '#00a2e8' }}></i>
            <p style={{ marginTop: '12px', fontWeight: 500 }}>Carregando Ordens de Serviço...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <i className="fa-solid fa-folder-open fa-3x" style={{ opacity: 0.5 }}></i>
            <p style={{ marginTop: '12px', fontWeight: 500 }}>Nenhuma Ordem de Serviço nesta aba.</p>
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
