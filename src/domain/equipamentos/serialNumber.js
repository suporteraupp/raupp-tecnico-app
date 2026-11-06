/**
 * Extrai e normaliza o Número de Série de um equipamento ou Ordem de Serviço,
 * aceitando múltiplas variações de nomes de colunas do banco de dados.
 */
export const getSerialNumber = (equipamento = {}, os = {}) => {
  const eq = equipamento || {};
  const osObj = os || {};

  const possibleSerials = [
    osObj.os_equipamento_serie,
    osObj.numero_serie,
    osObj.num_serie,
    osObj.serial,
    eq.numero_serie,
    eq.num_serie,
    eq.serial,
    eq.serial_number,
    eq.nr_serie,
    eq.n_serie,
    eq.equipamento_serie
  ];

  for (const raw of possibleSerials) {
    if (raw && typeof raw === 'string' && raw.trim().length > 0 && raw.trim() !== 'N/A' && raw.trim() !== 'null') {
      return raw.trim().toUpperCase();
    }
  }

  return '';
};
