const FALLBACK_SUPABASE_URL = "https://mwzrrrnmtyiyrwdqhcqb.supabase.co"
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13enJycm5tdHlpeXJ3ZHFoY3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2Njk5ODcsImV4cCI6MjA3ODI0NTk4N30.wvie8EDvjfuRUhpNyrrTpv_vA7lbZDkrsz-yll2znPE"

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase config. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the dev server.",
    )
  }

  return { url, anonKey }
}
