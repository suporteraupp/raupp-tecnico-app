import { supabase, setToken, setUser } from './client';

const USER_EMAIL_MAP_KEY = 'raupp_tech_user_map';

// Diretório inicial sincronizado da tabela `profiles` do banco (para funcionar mesmo com RLS bloqueando leitura anônima antes do 1º login)
const INITIAL_PROFILES_DIRECTORY = [
  { usuario: 't.moreira', nome_completo: 'Tiago Moreira', email_recuperacao: 'tiago@rauppsolucoes.com.br' },
  { usuario: 'a.severo', nome_completo: 'Anderson Luiz Estanislau Severo', email_recuperacao: 'a.severo.rgt@gmail.com' },
  { usuario: 'Kayke.José', nome_completo: 'Kayke José Evangelista Dos Santos', email_recuperacao: 'Kaykeevangelista0@gmail.com' },
  { usuario: 'Kelvin.Ribeiro', nome_completo: 'Kelvin.Ribeiro', email_recuperacao: 'tecnico@raupp.com.br' },
  { usuario: 'kayke', nome_completo: 'kayke', email_recuperacao: 'kayke@raupp.com.br' },
  { usuario: 'Tiago', nome_completo: 'Tiago', email_recuperacao: 'tiago@raupp.com.br' },
  { usuario: 'Kayketeste', nome_completo: 'Kayketeste', email_recuperacao: 'kayketeste@raupp.com.br' },
  { usuario: 'kayke.jose', nome_completo: 'Kayke.José', email_recuperacao: 'kayke.jose@raupp.com.br' }
];

const normalizeUsername = (input) => {
  return (input || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const formatEmail = (input) => {
  const clean = (input || '').trim();
  if (!clean) return '';
  if (clean.includes('@')) return clean.toLowerCase();
  const normalized = normalizeUsername(clean);
  return `${normalized}@rauppsolucoes.com.br`;
};

const buildSeedUserEmailMap = () => {
  const seedMap = {};
  INITIAL_PROFILES_DIRECTORY.forEach((p) => {
    const email = (p.email_recuperacao || '').trim().toLowerCase();
    if (!email) return;
    [p.usuario, p.nome_completo].forEach((alias) => {
      if (!alias) return;
      const rawKey = alias.trim().toLowerCase();
      const normKey = normalizeUsername(alias);
      if (rawKey && !seedMap[rawKey]) seedMap[rawKey] = email;
      if (normKey && !seedMap[normKey]) seedMap[normKey] = email;
    });
  });
  return seedMap;
};

const getLocalUserEmailMap = () => {
  const seedMap = buildSeedUserEmailMap();
  try {
    const raw = localStorage.getItem(USER_EMAIL_MAP_KEY);
    const storedMap = raw ? JSON.parse(raw) : {};
    return { ...seedMap, ...storedMap };
  } catch {
    return seedMap;
  }
};

const saveLocalUserEmailMapping = (aliasesInput, email) => {
  if (!email) return;
  try {
    const map = getLocalUserEmailMap();
    const cleanEmail = email.trim().toLowerCase();
    const emailPrefix = cleanEmail.split('@')[0];

    const aliases = Array.isArray(aliasesInput) ? aliasesInput : [aliasesInput];
    if (emailPrefix) aliases.push(emailPrefix);

    aliases.forEach((alias) => {
      if (!alias || typeof alias !== 'string') return;
      const rawKey = alias.trim().toLowerCase();
      const normKey = normalizeUsername(alias);

      if (rawKey && !rawKey.includes('@')) map[rawKey] = cleanEmail;
      if (normKey && !normKey.includes('@')) map[normKey] = cleanEmail;

      const tokens = normKey.split(/[\s._-]+/).filter(Boolean);
      if (tokens.length > 0) {
        const firstToken = tokens[0];
        if (firstToken.length >= 3 && !map[firstToken]) {
          map[firstToken] = cleanEmail;
        }
        // Gera automaticamente o formato inicial.sobrenome (ex: "Tiago Moreira" -> "t.moreira")
        if (tokens.length >= 2) {
          const lastToken = tokens[tokens.length - 1];
          const secondToken = tokens[1];
          const initLast = `${firstToken[0]}.${lastToken}`;
          const initSecond = `${firstToken[0]}.${secondToken}`;
          const fullDot = `${firstToken}.${lastToken}`;
          map[initLast] = cleanEmail;
          map[initSecond] = cleanEmail;
          map[fullDot] = cleanEmail;
        }
      }
    });

    localStorage.setItem(USER_EMAIL_MAP_KEY, JSON.stringify(map));
  } catch {
    // Ignora falha de escrita no localStorage
  }
};

/**
 * Sincroniza o perfil do usuário autenticado e o diretório de técnicos da tabela `profiles`
 * para que o login por nome de usuário funcione imediatamente após qualquer sessão ativa.
 */
export const syncUserProfileCache = async () => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const authUser = sessionData?.session?.user;
    if (!authUser?.email) return null;

    const meta = authUser.user_metadata || {};
    const metaUsername =
      meta.usuario || meta.username || meta.user_name || meta.login || '';
    const metaFullName =
      meta.nome_completo || meta.full_name || meta.nome || meta.name || '';
    const emailPrefix = authUser.email.split('@')[0] || 'tecnico';

    let profileUsername = metaUsername || emailPrefix;
    let profileDisplayName = metaFullName || metaUsername || emailPrefix;

    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id_profiles, usuario, nome_completo, email_recuperacao')
      .limit(100);

    if (Array.isArray(allProfiles)) {
      allProfiles.forEach((p) => {
        const pEmail = (p.email_recuperacao || '').trim().toLowerCase();
        if (pEmail && pEmail.includes('@')) {
          saveLocalUserEmailMapping([p.usuario, p.nome_completo], pEmail);
        }
      });
    }

    const ownProfile = Array.isArray(allProfiles)
      ? allProfiles.find(
          (p) =>
            String(p.id_profiles) === String(authUser.id) ||
            (p.email_recuperacao &&
              p.email_recuperacao.trim().toLowerCase() === authUser.email.toLowerCase())
        )
      : null;

    if (ownProfile) {
      profileUsername = ownProfile.usuario || profileUsername;
      profileDisplayName = ownProfile.nome_completo || ownProfile.usuario || profileDisplayName;

      if (!ownProfile.email_recuperacao || !ownProfile.usuario) {
        await supabase
          .from('profiles')
          .update({
            usuario: ownProfile.usuario || normalizeUsername(profileUsername),
            email_recuperacao: authUser.email,
            updated_at: new Date().toISOString()
          })
          .eq('id_profiles', ownProfile.id_profiles);
      }
    } else {
      await supabase.from('profiles').upsert({
        id_profiles: authUser.id,
        nome_completo: profileDisplayName,
        usuario: normalizeUsername(profileUsername),
        email_recuperacao: authUser.email,
        role: 'tecnico',
        updated_at: new Date().toISOString()
      });
    }

    saveLocalUserEmailMapping(
      [profileUsername, profileDisplayName, metaUsername, metaFullName, emailPrefix],
      authUser.email
    );

    const updatedUserObj = {
      id: authUser.id,
      usuario: profileUsername,
      nome: profileDisplayName || 'Técnico',
      email: authUser.email
    };
    setUser(updatedUserObj);
    return updatedUserObj;
  } catch {
    return null;
  }
};

/**
 * Resolve uma lista de possíveis e-mails a partir de um nome de usuário ou e-mail digitado.
 * Permite login tanto pelo e-mail completo quanto pelo nome de usuário.
 */
const resolveCandidateEmails = async (identifier) => {
  const clean = (identifier || '').trim();
  if (!clean) return { emails: [], resolvedFromDirectory: false };

  const candidates = new Set();

  // 1. Se digitou um e-mail completo (contém @), tenta ele diretamente
  if (clean.includes('@')) {
    candidates.add(clean.toLowerCase());
    return { emails: Array.from(candidates), resolvedFromDirectory: true };
  }

  const lowerUser = clean.toLowerCase();
  const normUser = normalizeUsername(clean);

  // 2. Consulta o mapa local de usuários já autenticados/cadastrados no dispositivo (prioridade máxima)
  const localMap = getLocalUserEmailMap();
  if (localMap[lowerUser]) candidates.add(localMap[lowerUser]);
  if (localMap[normUser]) candidates.add(localMap[normUser]);

  if (candidates.size > 0) {
    return { emails: Array.from(candidates), resolvedFromDirectory: true };
  }

  // 3. Tenta consultar diretamente na tabela `profiles` (caso RLS permita leitura)
  try {
    const { data: profilesByUser } = await supabase
      .from('profiles')
      .select('usuario, nome_completo, email_recuperacao')
      .or(`usuario.ilike.*${clean}*,usuario.ilike.*${normUser}*,nome_completo.ilike.*${clean}*`)
      .limit(5);

    if (Array.isArray(profilesByUser)) {
      profilesByUser.forEach((p) => {
        const emailRec = (p.email_recuperacao || '').trim().toLowerCase();
        if (emailRec && emailRec.includes('@')) {
          candidates.add(emailRec);
        }
      });
    }
  } catch {
    // Caso RLS bloqueie SELECT anônimo na tabela profiles
  }

  // 4. Tenta resolver via RPC (apenas se ainda não encontrou e se a RPC não retornou 404 nesta sessão)
  if (candidates.size === 0 && sessionStorage.getItem('raupp_rpc_username_missing') !== '1') {
    try {
      const { data: rpcEmail, error: rpcError } = await supabase.rpc('get_email_by_username', {
        p_username: clean
      });
      if (rpcError && (rpcError.code === 'PGRST202' || /404|not found|could not find/i.test(rpcError.message || ''))) {
        sessionStorage.setItem('raupp_rpc_username_missing', '1');
      } else if (typeof rpcEmail === 'string' && rpcEmail.includes('@')) {
        candidates.add(rpcEmail.trim().toLowerCase());
      }
    } catch {
      sessionStorage.setItem('raupp_rpc_username_missing', '1');
    }
  }

  if (candidates.size > 0) {
    return { emails: Array.from(candidates), resolvedFromDirectory: true };
  }

  // 5. Fallback corporativo padrão (@raupp.com.br)
  candidates.add(formatEmail(clean));
  return { emails: Array.from(candidates).filter(Boolean), resolvedFromDirectory: false };
};

export const apiLogin = async (identificador, password) => {
  const cleanIdentificador = (identificador || '').trim();
  const cleanPassword = (password || '').trim();

  if (!cleanIdentificador || !cleanPassword) {
    throw new Error('Preencha o usuário ou e-mail e a senha.');
  }

  const { emails: candidateEmails, resolvedFromDirectory } = await resolveCandidateEmails(cleanIdentificador);
  let authData = null;
  let lastError = null;

  for (const emailToTry of candidateEmails) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToTry,
      password: cleanPassword
    });

    if (!error && data?.session) {
      authData = data;
      lastError = null;
      break;
    }

    lastError = error;
    if (error?.message && /email not confirmed|too many requests|rate limit/i.test(error.message)) {
      break;
    }
  }

  if (lastError || !authData?.session) {
    const rawMsg = lastError?.message || '';
    let translatedMsg = 'Usuário/E-mail ou senha incorretos.';

    if (!cleanIdentificador.includes('@') && !resolvedFromDirectory) {
      translatedMsg =
        'Usuário ainda não vinculado neste navegador. Faça login 1 vez usando seu E-MAIL completo (após o 1º acesso, o login só pelo nome de usuário ficará salvo automaticamente).';
    } else if (/invalid login credentials|invalid email or password/i.test(rawMsg)) {
      translatedMsg = 'Credenciais incorretas! Verifique seu usuário/e-mail e senha.';
    } else if (/email not confirmed/i.test(rawMsg)) {
      translatedMsg = 'Seu e-mail ainda não foi confirmado no Supabase Auth. Verifique a caixa de entrada ou desative "Confirm email" no painel.';
    } else if (/user not found/i.test(rawMsg)) {
      translatedMsg = 'Usuário não encontrado no Supabase Auth.';
    } else if (/too many requests|rate limit/i.test(rawMsg)) {
      translatedMsg = 'Muitas tentativas malsucedidas. Aguarde alguns instantes.';
    } else if (rawMsg) {
      translatedMsg = `Erro na autenticação: ${rawMsg}`;
    }

    const authErr = new Error(translatedMsg);
    authErr.isAuthError = true;
    authErr.rawMessage = rawMsg;
    throw authErr;
  }

  // Busca dados complementares no perfil (se disponível) e sincroniza todo o diretório
  const authUser = authData.user;
  const metaUsername = authUser.user_metadata?.usuario || authUser.user_metadata?.nome || '';
  const emailPrefix = authUser.email?.split('@')[0] || 'tecnico';
  const typedUsername = !cleanIdentificador.includes('@') ? cleanIdentificador : '';

  const syncedUser = await syncUserProfileCache();

  const profileUsername = syncedUser?.usuario || typedUsername || metaUsername || emailPrefix;
  const profileDisplayName = syncedUser?.nome || metaUsername || typedUsername || emailPrefix;

  saveLocalUserEmailMapping(
    [profileUsername, profileDisplayName, typedUsername, metaUsername, emailPrefix],
    authUser.email
  );

  const userObj = {
    id: authUser.id,
    usuario: profileUsername,
    nome: profileDisplayName || 'Técnico',
    email: authUser.email
  };

  setToken(authData.session.access_token);
  setUser(userObj);
  return { token: authData.session.access_token, user: userObj };
};

export const apiSignUp = async (usuario, password, emailOpcional = '') => {
  const rawUsuario = (usuario || '').trim();
  const rawEmail = (emailOpcional || '').trim();
  const cleanPassword = (password || '').trim();

  if (!rawUsuario && !rawEmail) {
    throw new Error('Preencha o usuário ou e-mail e a senha para criar a conta.');
  }

  if (!cleanPassword) {
    throw new Error('Preencha a senha para criar a conta.');
  }

  if (cleanPassword.length < 6) {
    throw new Error('A senha deve possuir no mínimo 6 caracteres.');
  }

  // Determina o nome de usuário (sem @) e o e-mail real de autenticação
  let cleanUsername = rawUsuario;
  let loginEmail = '';

  if (rawEmail) {
    loginEmail = formatEmail(rawEmail);
    if (!cleanUsername) {
      cleanUsername = loginEmail.split('@')[0];
    } else if (cleanUsername.includes('@')) {
      cleanUsername = cleanUsername.split('@')[0];
    }
  } else if (rawUsuario.includes('@')) {
    loginEmail = rawUsuario.toLowerCase();
    cleanUsername = rawUsuario.split('@')[0];
  } else {
    loginEmail = formatEmail(rawUsuario);
  }

  const normalizedUser = normalizeUsername(cleanUsername);

  const { data, error } = await supabase.auth.signUp({
    email: loginEmail,
    password: cleanPassword,
    options: {
      data: {
        nome: cleanUsername,
        usuario: normalizedUser
      }
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

  // Registra o vínculo local imediatamente para permitir login por usuário ou por e-mail
  saveLocalUserEmailMapping(cleanUsername, loginEmail);

  if (user?.id) {
    try {
      await supabase.from('profiles').upsert({
        id_profiles: user.id,
        nome_completo: cleanUsername,
        usuario: normalizedUser,
        email_recuperacao: loginEmail,
        role: 'tecnico',
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Tabela profiles opcional:', err);
    }
  }

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
      // Ignora falha do autologin se precisar de confirmação por email
    }
  }

  if (session && user) {
    const userObj = {
      id: user.id,
      usuario: normalizedUser,
      nome: cleanUsername || user.user_metadata?.nome || user.email?.split('@')[0] || 'Técnico',
      email: user.email
    };
    setToken(session.access_token);
    setUser(userObj);
    return { token: session.access_token, user: userObj, isNew: true };
  }

  return {
    success: true,
    needConfirmation: true,
    message: 'Conta criada no Supabase! Você já pode entrar usando seu usuário ou seu e-mail.'
  };
};
