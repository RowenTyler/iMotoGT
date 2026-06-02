import { createServerClient as createServerClientSSR } from "@supabase/ssr"
import type { Database } from "@/types/supabase"
import { cookies } from "next/headers"
import { getSupabaseConfig } from "@/lib/supabase-config"

export function createServerClient() {
  const cookieStore = cookies()
  const { url, anonKey } = getSupabaseConfig()

  return createServerClientSSR<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  )
}
