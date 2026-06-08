async function login(email, senha) {
  const { data, error } = await db.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
  return data;
}

async function logout() {
  const { error } = await db.auth.signOut();
  if (error) throw error;
}

async function getSession() {
  const { data } = await db.auth.getSession();
  return data.session;
}

async function getUser() {
  const { data } = await db.auth.getUser();
  return data.user;
}

function onAuthChange(callback) {
  return db.auth.onAuthStateChange((_evento, session) => callback(session));
}

function gerarInitials(nomeCompleto) {
  return nomeCompleto
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || nomeCompleto[0].toUpperCase();
}

async function fazerCadastro(nome, email, senha) {
  const { data, error } = await db.auth.signUp({ email, password: senha });
  if (error) throw error;

  const userId = data.user?.id;
  if (!userId) throw new Error('Usuário não criado corretamente.');

  const { error: erroProfessora } = await db.from('professoras').insert({
    id: userId,
    nome: nome.trim(),
    initials: gerarInitials(nome),
  });
  if (erroProfessora) throw erroProfessora;
}

async function buscarProfessora(userId) {
  const { data, error } = await db
    .from('professoras')
    .select('*, turmas(*)')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}
