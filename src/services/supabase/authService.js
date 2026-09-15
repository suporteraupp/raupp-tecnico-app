import { supabase, setToken, setUser } from './client';

const formatEmail = (input) => {
  const clean = (input || '').trim();
  if (!clean) return '';
  if (clean.includes('@')) return clean.toLowerCase();
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
    message: 'Conta criada no Supabase! Se a opção de confirmação de e-mail estiver ativa, verifique sua caixa de entrada.'
  };
};
