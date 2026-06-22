const SUPABASE_URL = 'https://ubkxmrhyijkbepynrtdt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVia3htcmh5aWprYmVweW5ydGR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjg4NjgsImV4cCI6MjA5NzcwNDg2OH0.gcKTjmQh1YAVEW4co5hOTpfoQaA7oLanw5uB_cBef0M';

let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    });
  }
  return supabaseClient;
}
