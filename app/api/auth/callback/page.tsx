"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log("🔄 Processing auth callback...")
        
        // Get the session from the URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          console.log("✅ Tokens found in URL, setting session...")
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            console.error("❌ Error setting session:", error)
            router.push('/login?error=session_error')
            return
          }

          if (data.user) {
            console.log("✅ Session established for:", data.user.email)
            
            // Check if profile exists, create if not
            const { data: existingProfile } = await supabase
              .from("users")
              .select("id")
              .eq("id", data.user.id)
              .single()

            if (!existingProfile) {
              console.log("📝 Creating user profile...")
              
              await supabase.from("users").insert({
                id: data.user.id,
                email: data.user.email!,
                first_name: data.user.user_metadata?.given_name || data.user.user_metadata?.first_name || "",
                last_name: data.user.user_metadata?.family_name || data.user.user_metadata?.last_name || "",
                profile_pic: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || "",
                login_method: data.user.app_metadata?.provider || "google",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              
              console.log("✅ Profile created")
            }

            // Redirect to dashboard
            console.log("🔄 Redirecting to dashboard...")
            router.push('/dashboard')
          }
        } else {
          console.log("⚠️ No tokens in URL, checking existing session...")
          
          // Check if there's already a valid session
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session) {
            console.log("✅ Existing session found, redirecting to dashboard")
            router.push('/dashboard')
          } else {
            console.log("⚠️ No session found, redirecting to login")
            router.push('/login')
          }
        }
      } catch (error) {
        console.error("❌ Auth callback error:", error)
        router.push('/login?error=callback_error')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6700] mx-auto mb-4"></div>
        <p className="text-[#3E5641] dark:text-white">Completing sign in...</p>
      </div>
    </div>
  )
}
