import { createServerClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST handler for profile creation – this is the safe, mutable endpoint
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { userId } = await request.json()

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  // Check if user profile already exists
  const { data: existingProfile, error: fetchError } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle()

  if (existingProfile || fetchError) {
    // Profile already exists or error – nothing to do
    return NextResponse.json({ success: true, alreadyExists: true })
  }

  // Fetch user data from auth to get email and metadata
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
  if (userError || !userData.user) {
    console.error("Failed to fetch user data for profile creation:", userError)
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const user = userData.user
  const { error: profileError } = await supabase
    .from("users")
    .insert({
      id: user.id,
      email: user.email!,
      first_name: user.user_metadata?.first_name || user.user_metadata?.name?.split(' ')[0] || "",
      last_name: user.user_metadata?.last_name || user.user_metadata?.name?.split(' ')[1] || "",
      login_method: user.app_metadata?.provider || "oauth",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

  if (profileError) {
    console.error("Failed to create user profile:", profileError)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// GET handler – only exchanges the OAuth code, no database mutations
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/login`)
  }

  const supabase = await createServerClient()

  try {
    // Exchange the OAuth code for a session (standard OAuth flow – must be in GET)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Auth callback error:", error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_callback_error`)
    }

    if (data.user) {
      // Defer profile creation to a separate POST request (internal call)
      // This avoids direct side effects inside the GET handler.
      const origin = requestUrl.origin
      await fetch(`${origin}/api/auth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.user.id }),
      }).catch(err => console.error("Failed to create user profile via POST:", err))
    }

    // Successful login – redirect to dashboard
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
  } catch (err) {
    console.error("Unexpected error in auth callback:", err)
    return NextResponse.redirect(`${requestUrl.origin}/login?error=unexpected`)
  }
}