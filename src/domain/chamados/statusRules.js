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
