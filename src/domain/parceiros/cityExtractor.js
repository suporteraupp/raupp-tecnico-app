export const getCityString = (obj = {}) => {
  return (obj.end_cidade || obj.cidade || obj.end_cid || obj.nome_cidade || '').trim();
};

export const extractPartnerCities = (p) => {
  const pCities = new Set();
  const mainCity = getCityString(p);
  if (mainCity) pCities.add(mainCity);

  if (Array.isArray(p.localizacoes)) {
    p.localizacoes.forEach(l => {
      const lCity = getCityString(l);
      if (lCity) pCities.add(lCity);
    });
  }
  return pCities;
};

export const buildAvailableCities = (parceiros = [], chamados = [], currentTab = 'aberto', matchesStatusFn) => {
  const citiesMap = {};

  parceiros.forEach(p => {
    const pCities = extractPartnerCities(p);
    pCities.forEach(city => {
      const key = city.toUpperCase();
      if (!citiesMap[key]) {
        citiesMap[key] = { name: city, count: 0 };
      }
    });
  });

  chamados.forEach(c => {
    const loc = c.parceiro_localizacao || {};
    const parceiro = c.parceiro || {};
    const city = getCityString(c) || getCityString(loc) || getCityString(parceiro);
    if (city) {
      const key = city.toUpperCase();
      if (!citiesMap[key]) {
        citiesMap[key] = { name: city, count: 0 };
      }
    }
  });

  if (currentTab === 'clientes') {
    parceiros.forEach(p => {
      const pCities = extractPartnerCities(p);
      pCities.forEach(city => {
        const key = city.toUpperCase();
        if (citiesMap[key]) {
          citiesMap[key].count += 1;
        }
      });
    });
  } else {
    const targetChamados = (currentTab === 'aberto' || currentTab === 'em_atendimento' || currentTab === 'concluido')
      ? chamados.filter(c => matchesStatusFn(c.status_chamado, currentTab))
      : chamados;

    targetChamados.forEach(c => {
      const loc = c.parceiro_localizacao || {};
      const parceiro = c.parceiro || {};
      const city = getCityString(c) || getCityString(loc) || getCityString(parceiro);
      if (city) {
        const key = city.toUpperCase();
        if (citiesMap[key]) {
          citiesMap[key].count += 1;
        }
      }
    });
  }

  return Object.values(citiesMap)
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};
