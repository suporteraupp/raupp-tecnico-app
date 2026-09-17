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
  const numSerie = getSerialNumber(equip, os);

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

  const rawDesc = (os.os_equipamento_descricao || equip.nome || equip.descricao || '').trim();
  const tipoEq = (equip.tipo_equipamento || 'Impressora').trim();

  const osEquipDesc = (rawDesc && rawDesc !== 'Impressora' && rawDesc !== 'Multifuncional') ? rawDesc : '';

  const detectedBrand = rawMarca || detectBrand(osEquipDesc) || detectBrand(rawModelo) || detectBrand(rawDesc) || null;

  let fullPrinterName = '';
  if (rawMarca && rawModelo) {
    fullPrinterName = `${rawMarca} ${rawModelo}`;
  } else if (detectedBrand && rawModelo && !rawModelo.toLowerCase().includes(detectedBrand.toLowerCase())) {
    fullPrinterName = `${detectedBrand} ${rawModelo}`;
  } else if (osEquipDesc) {
    fullPrinterName = osEquipDesc;
  } else if (rawModelo) {
    fullPrinterName = detectedBrand ? `${detectedBrand} ${rawModelo}` : rawModelo;
  } else if (rawMarca) {
    fullPrinterName = `${rawMarca} ${tipoEq}`;
  } else if (numSerie) {
    fullPrinterName = `${tipoEq} (${numSerie})`;
  } else if (os.numero_os) {
    fullPrinterName = `${tipoEq} OS #${os.numero_os}`;
  } else {
    fullPrinterName = tipoEq;
  }

  return {
    detectedBrand,
    fullPrinterName,
    numSerie
  };
};
