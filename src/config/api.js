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

// Dados Mock de Fallback (Demonstração / Offline)
const INITIAL_MOCK_CHAMADOS = [
    {
        id_os_chamados: 'OS-1001',
        status_chamado: 'aberto',
        prioridade: 'Alta',
        solicitante_nome: 'Carlos Silva',
        solicitante_telefone: '(51) 99887-6655',
        descricao_problema: 'Impressora apresentando atolamento constante no disco alimentador e mensagem de erro E-04 no painel.',
        parceiro: {
            nome_principal: 'Cartório Raupp & Associados',
            end_logradouro: 'Av. Protásio Alves',
            end_numero: '1234',
            end_bairro: 'Petrópolis',
            end_cidade: 'Porto Alegre - RS'
        },
        equipamento: {
            tipo_equipamento: 'Multifuncional Laser',
            numero_serie: 'MX-4589201',
            marca: { nome_marca: 'Kyocera' },
            modelo: { nome_modelo: 'ECOSYS M3655idn' }
        }
    },
    {
        id_os_chamados: 'OS-1002',
        status_chamado: 'em_atendimento',
        prioridade: 'Urgente',
        solicitante_nome: 'Mariana Costa',
        solicitante_telefone: '(51) 98765-4321',
        descricao_problema: 'Troca de toner preto e substituição da unidade de fusão desgastada.',
        laudo_tecnico: 'Equipamento aberto. Limpeza interna efetuada. Fusor novo em processo de instalação.',
        parceiro: {
            nome_principal: 'Hospital Central Raupp',
            end_logradouro: 'Rua dos Andradas',
            end_numero: '500',
            end_bairro: 'Centro Histórico',
            end_cidade: 'Porto Alegre - RS'
        },
        equipamento: {
            tipo_equipamento: 'Impressora Corporativa',
            numero_serie: 'EP-998124',
            marca: { nome_marca: 'Epson' },
            modelo: { nome_modelo: 'WorkForce Pro WF-C579R' }
        }
    },
    {
        id_os_chamados: 'OS-1003',
        status_chamado: 'concluido',
        prioridade: 'Normal',
        solicitante_nome: 'Roberto Almeida',
        solicitante_telefone: '(51) 99112-2334',
        descricao_problema: 'Manutenção preventiva semestral e calibração de cores.',
        laudo_tecnico: 'Manutenção preventiva realizada com sucesso. Teste de impressão OK. Coletada assinatura do cliente.',
        parceiro: {
            nome_principal: 'Escritório de Advocacia Silva',
            end_logradouro: 'Rua Fernando Machado',
            end_numero: '300',
            end_bairro: 'Centro',
            end_cidade: 'Porto Alegre - RS'
        },
        equipamento: {
            tipo_equipamento: 'Multifuncional Colorida',
            numero_serie: 'RIC-332190',
            marca: { nome_marca: 'Ricoh' },
            modelo: { nome_modelo: 'IM C3000' }
        }
    }
];

const getMockChamados = () => {
    try {
        const stored = localStorage.getItem('raupp_mock_chamados');
        if (!stored) {
            localStorage.setItem('raupp_mock_chamados', JSON.stringify(INITIAL_MOCK_CHAMADOS));
            return INITIAL_MOCK_CHAMADOS;
        }
        return JSON.parse(stored);
    } catch {
        return INITIAL_MOCK_CHAMADOS;
    }
};

const saveMockChamados = (list) => {
    localStorage.setItem('raupp_mock_chamados', JSON.stringify(list));
};

const ensureAuthSession = async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            // Tenta autenticar silenciosamente com conta padrão caso configurada
            await supabase.auth.signInWithPassword({
                email: 'tecnico@raupp.com.br',
                password: 'Password123!'
            }).catch(() => {
                // Ignora falha de autenticação automática silenciosa
            });
        }
    } catch (e) {
        console.warn('Erro ao assegurar sessão Supabase:', e);
    }
};

export const apiLogin = async (usuario, password, forceDemo = false) => {
    if (forceDemo) {
        const mockUser = { id: 'tech-01', nome: usuario || 'Técnico Raupp', usuario: usuario || 'tecnico', isDemo: true };
        setToken('demo-token-mock');
        setUser(mockUser);
        return { token: 'demo-token-mock', user: mockUser, isDemo: true };
    }

    const cleanUsuario = (usuario || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanUsuario || !cleanPassword) {
        throw new Error('Preencha o usuário/e-mail e a senha.');
    }

    const loginEmail = cleanUsuario.includes('@') ? cleanUsuario : `${cleanUsuario}@raupp.com.br`;

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
            translatedMsg = 'Seu e-mail ainda não foi confirmado no Supabase Auth.';
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

    const loginEmail = cleanUsuario.includes('@') ? cleanUsuario : `${cleanUsuario}@raupp.com.br`;

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

    if (data?.session) {
        const userObj = {
            id: data.user.id,
            nome: cleanUsuario || data.user.user_metadata?.nome || data.user.email?.split('@')[0] || 'Técnico',
            email: data.user.email
        };
        setToken(data.session.access_token);
        setUser(userObj);
        return { token: data.session.access_token, user: userObj, isNew: true };
    }

    return { success: true, needConfirmation: true, message: 'Conta criada! Se a confirmação de e-mail estiver ativa no Supabase, verifique sua caixa de entrada.' };
};

export const apiFetchChamados = async () => {
    const token = getToken();
    if (token === 'demo-token-mock') {
        return getMockChamados();
    }

    try {
        await ensureAuthSession();

        const { data, error } = await supabase
            .from('os_chamados')
            .select('*, parceiro:parceiros!parceiros_id(*), parceiro_localizacao:parceiros_localizacao!parceiros_localizacao_id(*), equipamento:equipamentos!equipamentos_id(*)');

        if (!error && data) {
            return data;
        }

        if (error) {
            console.warn('Supabase join error, tentando select simples:', error);
        }

        // Fallback simples sem relacionamentos
        const { data: plainData, error: plainError } = await supabase
            .from('os_chamados')
            .select('*');

        if (!plainError && plainData) {
            return plainData;
        }

        if (plainError) {
            console.error('Erro ao buscar os_chamados no Supabase:', plainError);
        }
    } catch (err) {
        console.warn('Erro ao buscar chamados no Supabase:', err);
    }

    return [];
};

export const apiFetchHistoricoEquipamento = async (equipamentoId) => {
    if (!equipamentoId) return [];

    const token = getToken();
    if (token === 'demo-token-mock') {
        const mockChamados = getMockChamados();
        return mockChamados.filter(c => c.equipamento?.numero_serie || c.equipamentos_id === equipamentoId);
    }

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

        if (error) {
            console.warn('Erro ao buscar histórico por equipamentos_id, tentando query alternativa:', error);
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
    const token = getToken();
    if (token === 'demo-token-mock') {
        return [
            {
                id_parceiros: 'p1',
                nome_principal: 'Cartório Raupp & Associados',
                nome_secundario: 'Cartório Raupp',
                doc_principal: '12.345.678/0001-90',
                end_logradouro: 'Av. Protásio Alves',
                end_numero: '1234',
                end_bairro: 'Petrópolis',
                end_cidade: 'Porto Alegre',
                end_uf: 'RS',
                contato1_nome: 'Carlos Silva',
                contato1_fone: '(51) 99887-6655'
            },
            {
                id_parceiros: 'p2',
                nome_principal: 'Hospital Central Raupp',
                nome_secundario: 'Hospital Central',
                doc_principal: '98.765.432/0001-10',
                end_logradouro: 'Rua dos Andradas',
                end_numero: '500',
                end_bairro: 'Centro Histórico',
                end_cidade: 'Porto Alegre',
                end_uf: 'RS',
                contato1_nome: 'Mariana Costa',
                contato1_fone: '(51) 98765-4321'
            }
        ];
    }

    try {
        await ensureAuthSession();

        const { data, error } = await supabase
            .from('parceiros')
            .select('*, localizacoes:parceiros_localizacao(*)')
            .order('nome_principal', { ascending: true });

        if (!error && data) {
            return data;
        }

        if (error) {
            console.error('Erro ao buscar parceiros no Supabase:', error);
        }
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
    const token = getToken();
    if (token === 'demo-token-mock') {
        const list = getMockChamados();
        const updatedList = list.map(item => {
            if (item.id_os_chamados === id) {
                return { ...item, ...payload };
            }
            return item;
        });
        saveMockChamados(updatedList);
        return { success: true, isDemo: true };
    }

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
