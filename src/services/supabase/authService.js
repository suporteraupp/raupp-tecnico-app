import { supabase, setToken, setUser } from './client';

const USER_EMAIL_MAP_KEY = 'raupp_tech_user_map';

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
  return `${normalized}@raupp.com.br`;
};

const getLocalUserEmailMap = () => {
  try {
    const raw = localStorage.getItem(USER_EMAIL_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveLocalUserEmailMapping = (username, email) => {
  if (!email) return;
  try {
    const map = getLocalUserEmailMap();
    const cleanEmail = email.trim().toLowerCase();
    const emailPrefix = cleanEmail.split('@')[0];

    if (emailPrefix) {
      map[emailPrefix] = cleanEmail;
      map[normalizeUsername(emailPrefix)] = cleanEmail;
    }

    if (username) {
      const rawKey = username.trim().toLowerCase();
      const normKey = normalizeUsername(username);
      if (rawKey && !rawKey.includes('@')) map[rawKey] = cleanEmail;
      if (normKey && !normKey.includes('@')) map[normKey] = cleanEmail;
    }

    localStorage.setItem(USER_EMAIL_MAP_KEY, JSON.stringify(map));
  } catch {
    // Ignora falha de escrita no localStorage
  }
};

/**
 * Resolve uma lista de possíveis e-mails a partir de um nome de usuário ou e-mail digitado.
 * Permite login tanto pelo e-mail completo quanto pelo nome de usuário.
 */
const resolveCandidateEmails = async (identifier) => {
  const clean = (identifier || '').trim();
  if (!clean) return [];

  const candidates = new Set();

  // 1. Se digitou um e-mail completo (contém @), tenta ele em primeiro lugar
  if (clean.includes('@')) {
    candidates.add(clean.toLowerCase());
    return Array.from(candidates);
  }

  const lowerUser = clean.toLowerCase();
  const normUser = normalizeUsername(clean);

  // 2. Tenta resolver via RPC (se existir função security definer) ou diretamente na tabela `profiles`
  try {
    const { data: rpcEmail } = await supabase.rpc('get_email_by_username', {
      p_username: clean
    });
    if (typeof rpcEmail === 'string' && rpcEmail.includes('@')) {
      candidates.add(rpcEmail.trim().toLowerCase());
    }
  } catch {
    // RPC opcional
  }

  try {
    const { data: profilesByUser } = await supabase
      .from('profiles')
      .select('*')
      .or(`usuario.ilike.${clean},usuario.ilike.${normUser},nome_completo.ilike.${clean}`)
      .limit(5);

    if (Array.isArray(profilesByUser)) {
      profilesByUser.forEach((p) => {
        const emailRec = (p.email_recuperacao || p.email || '').trim().toLowerCase();
        if (emailRec && emailRec.includes('@')) {
          candidates.add(emailRec);
        }
      });
    }
  } catch {
    // Caso RLS bloqueie SELECT anônimo na tabela profiles, segue para os próximos métodos
  }

  // 3. Consulta o mapa local de usuários já autenticados/cadastrados no dispositivo
  const localMap = getLocalUserEmailMap();
  if (localMap[lowerUser]) candidates.add(localMap[lowerUser]);
  if (localMap[normUser]) candidates.add(localMap[normUser]);

  // 4. Fallbacks corporativos (@raupp.com.br)
  candidates.add(formatEmail(clean));
  if (clean.includes(' ')) {
    candidates.add(`${normUser.replace(/\s+/g, '.')}@raupp.com.br`);
    candidates.add(`${normUser.replace(/\s+/g, '')}@raupp.com.br`);
  }

  return Array.from(candidates).filter(Boolean);
};

export const apiLogin = async (identificador, password) => {
  const cleanIdentificador = (identificador || '').trim();
  const cleanPassword = (password || '').trim();

  if (!cleanIdentificador || !cleanPassword) {
    throw new Error('Preencha o usuário ou e-mail e a senha.');
  }

  const candidateEmails = await resolveCandidateEmails(cleanIdentificador);
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
    // Se falhar por rate limit ou e-mail não confirmado, interrompe imediatamente
    if (error?.message && /email not confirmed|too many requests|rate limit/i.test(error.message)) {
      break;
    }
  }

  if (lastError || !authData?.session) {
    const rawMsg = lastError?.message || '';
    let translatedMsg = 'Usuário/E-mail ou senha incorretos.';

    if (/invalid login credentials|invalid email or password/i.test(rawMsg)) {
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

  // Busca dados complementares no perfil (se disponível) e sincroniza caso ainda não exista
  const authUser = authData.user;
  const metaUsername = authUser.user_metadata?.usuario || authUser.user_metadata?.nome || '';
  const emailPrefix = authUser.email?.split('@')[0] || 'tecnico';
  const typedUsername = !cleanIdentificador.includes('@') ? cleanIdentificador : '';

  let profileUsername = typedUsername || metaUsername || emailPrefix;
  let profileDisplayName = metaUsername || typedUsername || emailPrefix;

  try {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('usuario, nome_completo, email_recuperacao')
      .eq('id_profiles', authUser.id)
      .maybeSingle();

    if (profileRow) {
      profileUsername = profileRow.usuario || profileUsername;
      profileDisplayName = profileRow.nome_completo || profileRow.usuario || profileDisplayName;
    } else {
      // Garante que o perfil exista na tabela profiles com usuario e email_recuperacao vinculados
      await supabase.from('profiles').upsert({
        id_profiles: authUser.id,
        nome_completo: profileDisplayName,
        usuario: normalizeUsername(profileUsername),
        email_recuperacao: authUser.email,
        role: 'tecnico',
        updated_at: new Date().toISOString()
      });
    }
  } catch {
    // Tabela profiles opcional ou restrita
  }

  saveLocalUserEmailMapping(profileUsername, authUser.email);
  if (typedUsername) {
    saveLocalUserEmailMapping(typedUsername, authUser.email);
  }

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
