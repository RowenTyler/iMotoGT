import { NextResponse } from "next/server"
import { syncUserToEditors } from "@/lib/userSync"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.user) {
      return NextResponse.json({ success: false, error: "User object is required" }, { status: 400 })
    }

    console.log("[v0] API sync-user endpoint called for:", body.user.email)

    const result = await syncUserToEditors(body.user)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error in sync-user API route:", error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
