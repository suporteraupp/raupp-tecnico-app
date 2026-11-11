import { getSerialNumber } from './serialNumber';

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

const GENERIC_PRINTER_WORDS = new Set([
  'impressora', 'multifuncional', 'laserjet', 'laser', 'pro', 'enterprise',
  'ecosys', 'workforce', 'ecotank', 'deskjet', 'officejet', 'dcp', 'mfc', 'sl'
]);

const extractModelTokens = (modelStr = '', brandLower = '') => {
  const tokens = new Set();
  const clean = (modelStr || '').toLowerCase().trim();
  if (!clean) return [];

  const parts = clean.split(/[\s,/()]+/).map(t => t.trim()).filter(Boolean);

  parts.forEach(part => {
    if (part === brandLower || GENERIC_PRINTER_WORDS.has(part)) return;

    if (part.length >= 3) {
      tokens.add(part);
      const compact = part.replace(/[-_]/g, '');
      if (compact.length >= 3 && !GENERIC_PRINTER_WORDS.has(compact)) {
        tokens.add(compact);
      }
    }

    if (part.includes('-')) {
      part.split('-').forEach(sub => {
        if (sub.length >= 3 && sub !== brandLower && !GENERIC_PRINTER_WORDS.has(sub)) {
          tokens.add(sub);
        }
      });
    }

    // Extrai núcleos de modelo (ex: "5102" e "l5102" de "HL-L5102DW", "4070" de "MF-4070", "m404" de "M404dw")
    const numMatches = part.match(/[a-z]?\d{3,5}/g);
    if (numMatches) {
      numMatches.forEach(m => {
        if (m.length >= 4) tokens.add(m);
        const onlyDigits = m.replace(/\D/g, '');
        if (onlyDigits.length >= 4) tokens.add(onlyDigits);
      });
    }
  });

  return Array.from(tokens);
};

/**
 * Classifica estritamente a compatibilidade de uma peça com a Marca / Modelo do equipamento da OS.
 * Retorna:
 * - 'modelo': compatível diretamente com o modelo do equipamento (ex: Brother HL-L5102DW ou Samsung MF-4070)
 * - 'marca': compatível com toda a marca do equipamento (sem conflitar com outro modelo)
 * - 'outro': incompatível (outra marca, outro modelo ou sem vínculo com o equipamento da OS)
 */
export const classifyPecaCompatibility = (peca = {}, equip = {}, os = {}) => {
  // 1. Se houver vínculo direto por ID de modelo no banco
  const pecaModeloId = peca.modeloId ?? peca.modelo_id ?? peca.id_modelo;
  const equipModeloId = equip?.modelo_id ?? equip?.id_modelo ?? os?.modelo_id;
  if (pecaModeloId != null && equipModeloId != null) {
    return String(pecaModeloId) === String(equipModeloId) ? 'modelo' : 'outro';
  }

  const { detectedBrand, fullPrinterName } = extractPrinterInfo(equip, os);
  const compatRaw = (peca.compatibilidade || '').trim();
  const compatLower = compatRaw.toLowerCase();
  const compatCompact = compatLower.replace(/[\s\-_]/g, '');
  const nomePecaLower = (peca.nome || '').toLowerCase();
  const nomePecaCompact = nomePecaLower.replace(/[\s\-_]/g, '');

  const rawModelo = (
    (typeof equip?.modelo === 'object' ? equip?.modelo?.nome_modelo : equip?.modelo) ||
    equip?.nome_modelo ||
    equip?.modelo_nome ||
    ''
  ).trim();

  const brandLower = (detectedBrand || '').toLowerCase();
  const modelSource = (rawModelo || fullPrinterName || '').toLowerCase();
  const modelTokens = extractModelTokens(modelSource, brandLower);

  // Detecta se a peça pertence explicitamente a alguma marca
  const pecaBrand = (
    peca.marca ||
    detectBrand(compatRaw) ||
    detectBrand(peca.nome || '') ||
    ''
  ).toLowerCase();

  // Se a OS tem marca identificada (ex: Brother) e a peça é de outra marca (ex: Samsung), bloqueia
  if (brandLower && pecaBrand && pecaBrand !== brandLower && !compatLower.includes(brandLower)) {
    return 'outro';
  }

  // 2. Verifica se a peça bate com o modelo específico do equipamento (ex: HL-L5102DW / MF-4070)
  if (modelTokens.length > 0) {
    const matchesModel = modelTokens.some(token => {
      const tokenCompact = token.replace(/[\s\-_]/g, '');
      return (
        compatLower.includes(token) ||
        compatCompact.includes(tokenCompact) ||
        nomePecaLower.includes(token) ||
        nomePecaCompact.includes(tokenCompact)
      );
    });

    if (matchesModel) {
      return 'modelo';
    }
  }

  // 3. Se a peça pertence à mesma marca do equipamento (ex: Brother ou Samsung)
  const matchesBrand =
    brandLower &&
    (pecaBrand === brandLower ||
      compatLower.includes(brandLower) ||
      (peca.marcaId != null && equip?.marca_id != null && String(peca.marcaId) === String(equip.marca_id)));

  if (matchesBrand) {
    // Se a peça especifica números de outros modelos na compatibilidade que não bateram com o modelo da OS,
    // significa que ela é de outro modelo da mesma marca (ex: peça de Brother HL-1202 numa OS de Brother HL-L5102DW)
    const hasSpecificOtherModelInCompat = /\d{3,5}/.test(compatLower);
    if (modelTokens.length > 0 && hasSpecificOtherModelInCompat) {
      return 'outro';
    }
    return 'marca';
  }

  return 'outro';
};
