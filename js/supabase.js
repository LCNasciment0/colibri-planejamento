// SUPABASE_URL e SUPABASE_ANON_KEY vêm de js/config.js (carregado antes no index.html)
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
