import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, subject, message } = body

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Name, email and message are required" }, { status: 400 })
    }

    const { error } = await supabase.from("contact_messages").insert([{
      user_id: session.user.id,
      name: name.trim(),
      email: email.trim(),
      subject: subject?.trim() || null,
      message: message.trim(),
    }])

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[Contact] Error:", err)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}