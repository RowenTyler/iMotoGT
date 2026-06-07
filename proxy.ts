import { type NextRequest, NextResponse } from "next/server"
import { createMiddlewareClient } from "@/utils/supabase/middleware"

export async function proxy(request: NextRequest) {
  // Create a Supabase client configured to use cookies
  const { supabase, response } = await createMiddlewareClient(request)

  // Refresh session if expired - required for Server Components
  await supabase.auth.getUser()

  return response
}

// Ensure middleware runs on all routes except static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}