import { createServerClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    // ✅ AWAIT is mandatory because createServerClient is now async
    const supabase = await createServerClient()

    try {
      // Exchange the OAuth code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Auth callback error:", error)
        return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_callback_error`)
      }

      if (data.user) {
        // Check if user profile exists in "users" table
        const { data: existingProfile, error: fetchError } = await supabase
          .from("users")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle()

        // Only create profile if it doesn't exist
        if (!existingProfile && !fetchError) {
          const { error: profileError } = await supabase
            .from("users")
            .insert({
              id: data.user.id,
              email: data.user.email!,
              first_name: data.user.user_metadata?.first_name || data.user.user_metadata?.name?.split(' ')[0] || "",
              last_name: data.user.user_metadata?.last_name || data.user.user_metadata?.name?.split(' ')[1] || "",
              login_method: data.user.app_metadata?.provider || "oauth",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })

          if (profileError) {
            // Log but don't block login – profile can be created later
            console.error("Failed to create user profile:", profileError)
          } else {
            console.log("✅ User profile created for OAuth user:", data.user.id)
          }
        } else {
          console.log("✅ User profile already exists:", data.user.id)
        }
      }

      // Successful login – redirect to dashboard
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
    } catch (err) {
      console.error("Unexpected error in auth callback:", err)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=unexpected`)
    }
  }

  // No code – redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/login`)
}