/**
 * Módulo de Integração de API com o Raupp ERP
 */

const API_BASE_URL = 'http://localhost:3000';

export const getToken = () => localStorage.getItem('raupp_tech_token');
export const setToken = (token) => localStorage.setItem('raupp_tech_token', token);
export const removeToken = () => {
    localStorage.removeItem('raupp_tech_token');
    localStorage.removeItem('raupp_tech_user');
};

export const getUser = () => {
    try {
        const u = localStorage.getItem('raupp_tech_user');
        return u ? JSON.parse(u) : null;
    } catch (e) {
        return null;
    }
};

export const setUser = (user) => {
    localStorage.setItem('raupp_tech_user', JSON.stringify(user));
};

export const getAuthHeaders = () => {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

export const apiLogin = async (usuario, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.erro || 'Erro ao realizar login.');
    }
    return data;
};

export const apiFetchChamados = async () => {
    const response = await fetch(`${API_BASE_URL}/chamados`, {
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        if (response.status === 401) {
            removeToken();
            throw new Error('Sessão expirada. Faça login novamente.');
        }
        const data = await response.json().catch(() => ({}));
        throw new Error(data.erro || 'Erro ao buscar chamados.');
    }
    return await response.json();
};

export const apiAtualizarStatusChamado = async (id, payload) => {
    const response = await fetch(`${API_BASE_URL}/chamados/${id}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.erro || 'Erro ao atualizar chamado.');
    }
    return data;
};
