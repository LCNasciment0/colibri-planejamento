// Substitua pelos valores do seu projeto Supabase (Settings > API)
const SUPABASE_URL = 'SUBSTITUIR_PELA_URL_DO_PROJETO';
const SUPABASE_ANON_KEY = 'SUBSTITUIR_PELA_CHAVE_ANONIMA';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
