import { useState, useCallback } from 'react';
import { getEstoqueVolante } from '../services/supabase/produtosService';

export function useEstoqueVolante() {
  const [maletaMetrics, setMaletaMetrics] = useState({ total: 0, alertas: 0 });

  const updateMaletaMetrics = useCallback(async () => {
    try {
      const items = await getEstoqueVolante();
      const alertas = (items || []).filter(i => i.quantidade <= i.qtdMinima).length;
      setMaletaMetrics({ total: items.length, alertas });
    } catch {
      setMaletaMetrics({ total: 0, alertas: 0 });
    }
  }, []);

  return { maletaMetrics, updateMaletaMetrics };
}
