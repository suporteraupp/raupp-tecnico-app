/**
 * Módulo de Integração Direta com o Supabase & Fallback Offline
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hvwdcsdbqpuqnsacqdpb.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2d2Rjc2RicXB1cW5zYWNxZHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDEyMzAsImV4cCI6MjA5NjYxNzIzMH0.hU0KeR0nD0dU8mm_3yc5XfVxJ7iUGG123KtP8BsrP-Q';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const getToken = () => localStorage.getItem('raupp_tech_token');
export const setToken = (token) => localStorage.setItem('raupp_tech_token', token);
export const removeToken = () => {
    localStorage.removeItem('raupp_tech_token');
    localStorage.removeItem('raupp_tech_user');
    supabase.auth.signOut();
};

export const getUser = () => {
    try {
        const u = localStorage.getItem('raupp_tech_user');
        return u ? JSON.parse(u) : null;
    } catch {
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

const ensureAuthSession = async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    } catch (e) {
        console.warn('Erro ao verificar sessão Supabase:', e);
        return null;
    }
};

const formatEmail = (input) => {
    const clean = (input || '').trim();
    if (!clean) return '';
    if (clean.includes('@')) return clean.toLowerCase();
    // Normaliza acentos (ex: João -> joao) e converte para minúsculas
    const normalized = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return `${normalized}@raupp.com.br`;
};

export const apiLogin = async (usuario, password) => {
    const cleanUsuario = (usuario || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanUsuario || !cleanPassword) {
        throw new Error('Preencha o usuário/e-mail e a senha.');
    }

    const loginEmail = formatEmail(cleanUsuario);

    const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: cleanPassword
    });

    if (error || !data?.session) {
        const rawMsg = error?.message || '';
        let translatedMsg = 'Usuário/E-mail ou senha incorretos.';

        if (/invalid login credentials|invalid email or password/i.test(rawMsg)) {
            translatedMsg = 'Credenciais incorretas! E-mail/usuário ou senha inválidos no Supabase Auth.';
        } else if (/email not confirmed/i.test(rawMsg)) {
            translatedMsg = 'Seu e-mail ainda não foi confirmado no Supabase Auth. Verifique a caixa de entrada ou desative "Confirm email" no painel do Supabase.';
        } else if (/user not found/i.test(rawMsg)) {
            translatedMsg = 'Usuário não encontrado no Supabase Auth.';
        } else if (/too many requests|rate limit/i.test(rawMsg)) {
            translatedMsg = 'Muitas tentativas malsucedidas. Por favor, aguarde alguns instantes.';
        } else if (rawMsg) {
            translatedMsg = `Erro na autenticação: ${rawMsg}`;
        }

        const authErr = new Error(translatedMsg);
        authErr.isAuthError = true;
        authErr.rawMessage = rawMsg;
        throw authErr;
    }

    const userObj = {
        id: data.user.id,
        nome: cleanUsuario || data.user.user_metadata?.nome || data.user.email?.split('@')[0] || 'Técnico',
        email: data.user.email
    };

    setToken(data.session.access_token);
    setUser(userObj);
    return { token: data.session.access_token, user: userObj };
};

export const apiSignUp = async (usuario, password) => {
    const cleanUsuario = (usuario || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanUsuario || !cleanPassword) {
        throw new Error('Preencha o usuário/e-mail e a senha para criar a conta.');
    }

    if (cleanPassword.length < 6) {
        throw new Error('A senha deve possuir no mínimo 6 caracteres.');
    }

    const loginEmail = formatEmail(cleanUsuario);

    const { data, error } = await supabase.auth.signUp({
        email: loginEmail,
        password: cleanPassword,
        options: {
            data: { nome: cleanUsuario }
        }
    });

    if (error) {
        const rawMsg = error.message || '';
        let msg = 'Erro ao cadastrar usuário no Supabase.';

        if (/user already registered|user_already_exists/i.test(rawMsg)) {
            msg = 'Este usuário/e-mail já está cadastrado. Tente realizar o login.';
        } else if (/password should be at least/i.test(rawMsg)) {
            msg = 'A senha deve ter pelo menos 6 caracteres.';
        } else if (rawMsg) {
            msg = `Erro no cadastro: ${rawMsg}`;
        }
        throw new Error(msg);
    }

    let session = data?.session;
    let user = data?.user;

    // Salva/atualiza os dados do novo usuário na tabela 'profiles' (perfis)
    if (user?.id) {
        try {
            await supabase.from('profiles').upsert({
                id_profiles: user.id,
                nome_completo: cleanUsuario,
                usuario: cleanUsuario,
                email_recuperacao: loginEmail,
                role: 'tecnico',
                updated_at: new Date().toISOString()
            });
        } catch (err) {
            console.warn('Erro ao salvar na tabela profiles:', err);
        }
    }

    // Tenta efetuar o login automático se o Supabase não retornar a sessão diretamente no signUp
    if (!session) {
        try {
            const { data: loginData } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password: cleanPassword
            });
            if (loginData?.session) {
                session = loginData.session;
                user = loginData.user;
            }
        } catch {
            // Ignora falha de auto-login e avisa sobre necessidade de confirmação
        }
    }

    if (session && user) {
        const userObj = {
            id: user.id,
            nome: cleanUsuario || user.user_metadata?.nome || user.email?.split('@')[0] || 'Técnico',
            email: user.email
        };
        setToken(session.access_token);
        setUser(userObj);
        return { token: session.access_token, user: userObj, isNew: true };
    }

    return {
        success: true,
        needConfirmation: true,
        message: 'Conta criada no Supabase! Se a opção de confirmação de e-mail estiver ativa no seu projeto Supabase, verifique sua caixa de entrada ou desative "Confirm email" no painel para entrar.'
    };
};

export const apiFetchChamados = async () => {
    try {
        await ensureAuthSession();

        // 1. Tenta a query de join primária
        const { data, error } = await supabase
            .from('os_chamados')
            .select('*, parceiro:parceiros!parceiros_id(*), parceiro_localizacao:parceiros_localizacao!parceiros_localizacao_id(*), equipamento:equipamentos!equipamentos_id(*)');

        if (!error && data && data.length > 0 && data[0].parceiro) {
            return data;
        }

        if (error) {
            console.warn('Erro na query primária de os_chamados, tentando query secundária:', error);
        }

        // 2. Tenta query de join secundária sem FKs explícitas
        const { data: dataAlt, error: errAlt } = await supabase
            .from('os_chamados')
            .select('*, parceiro:parceiros(*), parceiro_localizacao:parceiros_localizacao(*), equipamento:equipamentos(*)');

        if (!errAlt && dataAlt && dataAlt.length > 0 && dataAlt[0].parceiro) {
            return dataAlt;
        }

        // 3. Fallback Infalível: Busca todas as tabelas em paralelo e une em memória
        console.warn('Executando fallback manual de junção para os_chamados...');
        const [osRes, parcRes, locRes, eqRes] = await Promise.all([
            supabase.from('os_chamados').select('*'),
            supabase.from('parceiros').select('*'),
            supabase.from('parceiros_localizacao').select('*'),
            supabase.from('equipamentos').select('*')
        ]);

        const osList = osRes.data || [];
        const parceirosMap = {};
        (parcRes.data || []).forEach(p => {
            const pId = p.id_parceiros || p.id;
            if (pId) parceirosMap[pId] = p;
        });

        const locsMap = {};
        (locRes.data || []).forEach(l => {
            const lId = l.id_parceiros_localizacao || l.id_parceiro_localizacao || l.id;
            if (lId) locsMap[lId] = l;
        });

        const eqMap = {};
        (eqRes.data || []).forEach(e => {
            const eId = e.id_equipamentos || e.id;
            if (eId) eqMap[eId] = e;
        });

        return osList.map(os => ({
            ...os,
            parceiro: os.parceiro || parceirosMap[os.parceiros_id || os.parceiro_id] || null,
            parceiro_localizacao: os.parceiro_localizacao || locsMap[os.parceiros_localizacao_id || os.parceiro_localizacao_id] || null,
            equipamento: os.equipamento || eqMap[os.equipamentos_id || os.equipamento_id] || null
        }));
    } catch (err) {
        console.warn('Erro ao buscar chamados no Supabase:', err);
    }

    return [];
};

export const apiFetchHistoricoEquipamento = async (equipamentoId) => {
    if (!equipamentoId) return [];

    try {
        await ensureAuthSession();
        const { data, error } = await supabase
            .from('os_chamados')
            .select('*, parceiro:parceiros!parceiros_id(*), parceiro_localizacao:parceiros_localizacao!parceiros_localizacao_id(*), equipamento:equipamentos!equipamentos_id(*)')
            .eq('equipamentos_id', equipamentoId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (!error && data) {
            return data;
        }

        const { data: plainData } = await supabase
            .from('os_chamados')
            .select('*')
            .eq('equipamentos_id', equipamentoId)
            .order('created_at', { ascending: false })
            .limit(10);

        return plainData || [];
    } catch (err) {
        console.warn('Erro ao buscar histórico do equipamento no Supabase:', err);
        return [];
    }
};

export const apiFetchParceiros = async () => {
    try {
        await ensureAuthSession();

        // 1. Tenta a query de join primária
        const { data, error } = await supabase
            .from('parceiros')
            .select('*, localizacoes:parceiros_localizacao(*)')
            .order('nome_principal', { ascending: true });

        if (!error && data && data.length > 0) {
            return data;
        }

        if (error) {
            console.warn('Erro na query de join de parceiros, tentando query sem alias:', error);
        }

        // 2. Tenta a query de join sem alias 'localizacoes:'
        const { data: dataAlt, error: errAlt } = await supabase
            .from('parceiros')
            .select('*, parceiros_localizacao(*)')
            .order('nome_principal', { ascending: true });

        if (!errAlt && dataAlt && dataAlt.length > 0) {
            return dataAlt.map(p => ({
                ...p,
                localizacoes: p.localizacoes || p.parceiros_localizacao || []
            }));
        }

        // 3. Fallback Infalível: Busca parceiros e parceiros_localizacao em paralelo e agrupa em JS
        console.warn('Executando fallback manual de junção para parceiros e localizações...');
        const [parcRes, locRes] = await Promise.all([
            supabase.from('parceiros').select('*').order('nome_principal', { ascending: true }),
            supabase.from('parceiros_localizacao').select('*')
        ]);

        const parceirosList = parcRes.data || [];
        const locsGrouped = {};
        (locRes.data || []).forEach(l => {
            const pId = l.parceiros_id || l.id_parceiros || l.parceiro_id;
            if (pId) {
                if (!locsGrouped[pId]) locsGrouped[pId] = [];
                locsGrouped[pId].push(l);
            }
        });

        return parceirosList.map(p => {
            const pId = p.id_parceiros || p.id;
            return {
                ...p,
                localizacoes: p.localizacoes || locsGrouped[pId] || []
            };
        });
    } catch (err) {
        console.warn('Erro ao buscar parceiros:', err);
    }

    return [];
};

const VALID_OS_COLUMNS = [
    'id_os_chamados', 'numero_os', 'origem', 'parceiros_id', 'parceiros_localizacao_id',
    'equipamentos_id', 'tipo_chamado', 'status_chamado', 'medidor_atendimento',
    'os_equipamento_descricao', 'os_equipamento_serie', 'os_equipamento_acessorios',
    'tipo_os', 'status_os', 'prioridade', 'solicitante_nome', 'solicitante_telefone',
    'data_agendamento', 'descricao_problema', 'laudo_tecnico', 'tecnico_designado_id',
    'valor_servico', 'valor_pecas', 'data_abertura', 'data_fechamento', 'updated_at', 'contratos_id'
];

export const apiAtualizarStatusChamado = async (id, payload) => {
    try {
        await ensureAuthSession();

        const cleanPayload = {};
        for (const k of Object.keys(payload)) {
            if (VALID_OS_COLUMNS.includes(k) && payload[k] !== undefined) {
                cleanPayload[k] = payload[k];
            }
        }

        if (payload.status_chamado === 'concluido' && !cleanPayload.data_fechamento) {
            cleanPayload.data_fechamento = new Date().toISOString();
        }

        if (payload.contador_pb_atendimento !== undefined || payload.contador_cor_atendimento !== undefined) {
            cleanPayload.medidor_atendimento = payload.contador_pb_atendimento ?? payload.contador_cor_atendimento;
        }

        const { error } = await supabase
            .from('os_chamados')
            .update(cleanPayload)
            .eq('id_os_chamados', id);

        if (!error) {
            return { success: true };
        }
        console.error('Erro ao atualizar os_chamados no Supabase:', error);
        throw new Error(error.message || 'Erro ao salvar alteração no Supabase.');
    } catch (err) {
        console.warn('Erro ao atualizar no Supabase:', err);
        throw new Error(err.message || 'Falha ao atualizar no banco de dados Supabase.');
    }
};

/**
 * Módulo de Integração com API Printwayy
 */
export const PRINTWAYY_API_KEY = import.meta.env.VITE_PRINTWAYY_API_KEY || '7E12C7B3-FBEB-42CB-8C75-7E25E99EAACA';

export const apiFetchPrintwayySuppliesBySerial = async (numeroSerie) => {
    if (!numeroSerie) return null;

    try {
        const response = await fetch(`https://api.printwayy.com/v2/printers?serial=${encodeURIComponent(numeroSerie)}`, {
            headers: {
                'Authorization': `Bearer ${PRINTWAYY_API_KEY}`,
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                const printer = data[0];
                return {
                    toner_black: printer.supplies?.find(s => /black|pb|preto|k/i.test(s.color))?.level ?? 100,
                    toner_cyan: printer.supplies?.find(s => /cyan|ciano|c/i.test(s.color))?.level ?? null,
                    toner_magenta: printer.supplies?.find(s => /magenta|m/i.test(s.color))?.level ?? null,
                    toner_yellow: printer.supplies?.find(s => /yellow|amarelo|y/i.test(s.color))?.level ?? null,
                    printwayy_last_sync: new Date().toISOString()
                };
            }
        }
    } catch (err) {
        console.warn('Busca direta Printwayy:', err);
    }

    return null;
};

