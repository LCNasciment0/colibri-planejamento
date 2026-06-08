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

async function buscarProfessora(userId) {
  const { data, error } = await db
    .from('professoras')
    .select('*, turmas(*)')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}
