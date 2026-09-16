import { getSerialNumber } from '../../services/printwayyService';

export const detectBrand = (str = '') => {
  const s = str.toLowerCase();
  if (s.includes('brother')) return 'Brother';
  if (s.includes('hp') || s.includes('hewlett')) return 'HP';
  if (s.includes('samsung')) return 'Samsung';
  if (s.includes('lexmark')) return 'Lexmark';
  if (s.includes('kyocera')) return 'Kyocera';
  if (s.includes('ricoh')) return 'Ricoh';
  if (s.includes('canon')) return 'Canon';
  if (s.includes('epson')) return 'Epson';
  if (s.includes('xerox')) return 'Xerox';
  if (s.includes('okidata') || s.includes('oki')) return 'OKI';
  return null;
};

export const extractPrinterInfo = (equip = {}, os = {}) => {
  const rawMarca = (
    (typeof equip.marca === 'object' ? equip.marca?.nome_marca : equip.marca) ||
    equip.nome_marca ||
    equip.marca_nome ||
    ''
  ).trim();

  const rawModelo = (
    (typeof equip.modelo === 'object' ? equip.modelo?.nome_modelo : equip.modelo) ||
    equip.nome_modelo ||
    equip.modelo_nome ||
    ''
  ).trim();

  const osEquipDesc = (os.os_equipamento_descricao || equip.nome || equip.descricao || equip.tipo_equipamento || '').trim();

  const detectedBrand = rawMarca || detectBrand(osEquipDesc) || detectBrand(rawModelo) || null;

  let fullPrinterName = '';
  if (rawMarca && rawModelo) {
    fullPrinterName = `${rawMarca} ${rawModelo}`;
  } else if (detectedBrand && rawModelo && !rawModelo.toLowerCase().includes(detectedBrand.toLowerCase())) {
    fullPrinterName = `${detectedBrand} ${rawModelo}`;
  } else if (osEquipDesc) {
    fullPrinterName = osEquipDesc;
  } else if (rawModelo) {
    fullPrinterName = rawModelo;
  } else {
    fullPrinterName = 'Impressora Não Especificada';
  }

  const numSerie = getSerialNumber(equip, os);

  return {
    detectedBrand,
    fullPrinterName,
    numSerie
  };
};
