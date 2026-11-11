export const TAB_STATUS_ABERTO = 'aberto';
export const TAB_STATUS_EM_CURSO = 'em_atendimento';
export const TAB_STATUS_CONCLUIDO = 'concluido';
export const TAB_CLIENTES = 'clientes';
export const TAB_MALETA = 'maleta';

export const matchesStatus = (status, tab) => {
  const s = (status || '').toLowerCase().trim();
  if (tab === TAB_STATUS_ABERTO) return s === 'aberto' || s === 'abertos' || s === 'novo' || s === 'pendente';
  if (tab === TAB_STATUS_EM_CURSO) return s === 'em_atendimento' || s === 'em_curso' || s === 'em curso' || s === 'em atendimento';
  if (tab === TAB_STATUS_CONCLUIDO) return s === 'concluido' || s === 'concluído' || s === 'fechado' || s === 'finalizado';
  return s === tab;
};

const PRIORITY_WEIGHT = {
  urgente: 0,
  alta: 1,
  normal: 2,
  baixa: 3
};

export const sortChamadosByTab = (list = [], tab = TAB_STATUS_ABERTO) => {
  return [...list].sort((a, b) => {
    if (tab === TAB_STATUS_CONCLUIDO) {
      const dateA = new Date(a.data_fechamento || a.updated_at || a.data_abertura || a.created_at || 0).getTime();
      const dateB = new Date(b.data_fechamento || b.updated_at || b.data_abertura || b.created_at || 0).getTime();
      return dateB - dateA;
    }

    const prioA = PRIORITY_WEIGHT[(a.prioridade || 'normal').toLowerCase().trim()] ?? 2;
    const prioB = PRIORITY_WEIGHT[(b.prioridade || 'normal').toLowerCase().trim()] ?? 2;
    if (prioA !== prioB) return prioA - prioB;

    const openA = new Date(a.data_abertura || a.created_at || 0).getTime();
    const openB = new Date(b.data_abertura || b.created_at || 0).getTime();
    return openB - openA;
  });
};
