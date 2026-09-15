import { useState, useCallback } from 'react';
import { apiFetchChamados, apiAtualizarStatusChamado } from '../services/supabase/chamadosService';
import { apiFetchParceiros } from '../services/supabase/parceirosService';
import { matchesStatus } from '../domain/chamados/statusRules';
import { buildAvailableCities, getCityString, extractPartnerCities } from '../domain/parceiros/cityExtractor';

export function useChamados({ showToast, updateMaletaMetrics }) {
  const [chamados, setChamados] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingParceiros, setLoadingParceiros] = useState(false);

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
      if (updateMaletaMetrics) {
        await updateMaletaMetrics();
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      if (showToast) {
        showToast(err.message || 'Erro ao carregar dados.', 'error');
      }
    } finally {
      setLoading(false);
      setLoadingParceiros(false);
    }
  }, [showToast, updateMaletaMetrics]);

  const startOs = useCallback(async (osId) => {
    try {
      await apiAtualizarStatusChamado(osId, { status_chamado: 'em_atendimento' });
      if (showToast) showToast('Atendimento iniciado com sucesso!', 'success');
      await loadData();
      return true;
    } catch (err) {
      if (showToast) showToast(err.message || 'Erro ao iniciar atendimento.', 'error');
      return false;
    }
  }, [loadData, showToast]);

  const completeOs = useCallback(async (osId, payload) => {
    try {
      await apiAtualizarStatusChamado(osId, payload);
      if (showToast) showToast('Ordem de Serviço concluída com Assinatura Digital e Baixa de Peças!', 'success');
      await loadData();
      if (updateMaletaMetrics) await updateMaletaMetrics();
      return true;
    } catch (err) {
      if (showToast) showToast(err.message || 'Erro ao concluir Ordem de Serviço.', 'error');
      throw err;
    }
  }, [loadData, showToast, updateMaletaMetrics]);

  const getFilteredData = (currentTab, selectedCity) => {
    const availableCities = buildAvailableCities(parceiros, chamados, currentTab, matchesStatus);

    const filteredByCityChamados = selectedCity
      ? chamados.filter(c => {
          const loc = c.parceiro_localizacao || {};
          const parceiro = c.parceiro || {};
          const city = (getCityString(c) || getCityString(loc) || getCityString(parceiro)).toLowerCase();
          return city.includes(selectedCity.toLowerCase());
        })
      : chamados;

    const abertos = filteredByCityChamados.filter(c => matchesStatus(c.status_chamado, 'aberto'));
    const emCurso = filteredByCityChamados.filter(c => matchesStatus(c.status_chamado, 'em_atendimento'));
    const concluidos = filteredByCityChamados.filter(c => matchesStatus(c.status_chamado, 'concluido'));
    const filteredList = filteredByCityChamados.filter(c => matchesStatus(c.status_chamado, currentTab));

    const filteredByCityParceiros = selectedCity
      ? parceiros.filter(p => {
          const selCity = selectedCity.toLowerCase();
          const pCities = extractPartnerCities(p);
          return Array.from(pCities).some(c => c.toLowerCase().includes(selCity));
        })
      : parceiros;

    return {
      chamados,
      parceiros,
      availableCities,
      abertos,
      emCurso,
      concluidos,
      filteredList,
      filteredByCityParceiros
    };
  };

  return {
    chamados,
    parceiros,
    loading,
    loadingParceiros,
    loadData,
    startOs,
    completeOs,
    getFilteredData
  };
}
