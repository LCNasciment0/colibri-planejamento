const SUPABASE_URL = 'https://fghtzpukyqlhqmchommv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnaHR6cHVreXFsaHFtY2hvbW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NjIxODYsImV4cCI6MjA5NjQzODE4Nn0.9cWgY_-VQCWapTfZIprxFukf_fp6oJk3DIzTqsSeAns';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
