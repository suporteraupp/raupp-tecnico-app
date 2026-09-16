/**
 * Cliente de Integração Direta com a API do Printwayy.
 * 
 * Utiliza a Chave da API (VITE_PRINTWAYY_API_KEY) para consultar o parque de impressoras,
 * contadores e níveis de suprimentos de forma nativa e em tempo real.
 */

const PRINTWAYY_API_KEY = import.meta.env.VITE_PRINTWAYY_API_KEY || '7E12C7B3-FBEB-42CB-8C75-7E25E99EAACA';

/**
 * Consulta a API do Printwayy buscando dados reais de suprimento pelo Número de Série.
 */
export const fetchPrintwayyDataBySerial = async (serialNumber) => {
  if (!serialNumber) return null;
  const cleanSerial = String(serialNumber).trim().toUpperCase();

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'api-key': PRINTWAYY_API_KEY,
    'printwayy-token': PRINTWAYY_API_KEY,
    'Authorization': `Bearer ${PRINTWAYY_API_KEY}`
  };

  const endpoints = [
    `/api/printwayy/v1/dispositivos?serial=${cleanSerial}`,
    `/api/printwayy/v1/devices?serial=${cleanSerial}`,
    `https://api.printwayy.com/v1/dispositivos?serial=${cleanSerial}`,
    `https://api.printwayy.com/v1/devices?serial=${cleanSerial}`
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { method: 'GET', headers });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          console.log(`⚡ Dados reais recebidos da API Printwayy para ${cleanSerial}:`, data);
          return data;
        }
      }
    } catch (err) {
      // Ignora falha de endpoint individual
    }
  }

  return null;
};
