import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

function initializeClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase configuration missing for analytics route")
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  })
}

async function safeIncrementViews(
  supabase: ReturnType<typeof createClient>,
  table: string,
  recordId?: string | null,
) {
  if (!recordId) return

  try {
    const { data, error } = await supabase.from(table).select("views").eq("id", recordId).single()
    if (error || !data || typeof data.views !== "number") {
      return
    }

    await supabase.from(table).update({ views: data.views + 1 }).eq("id", recordId)
  } catch {
    // Ignore update failures to keep analytics event recording stable.
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { eventType, targetTable, targetId, metadata, userId } = body

    if (!eventType) {
      return NextResponse.json({ error: "Missing eventType" }, { status: 400 })
    }

    const supabase = initializeClient()

    const { error: eventError } = await supabase.from("analytics_events").insert([
      {
        user_id: userId || null,
        event_type: eventType,
        entity_type: targetTable || null,
        entity_id: targetId || null,
        metadata: metadata ?? null,
        created_at: new Date().toISOString(),
      },
    ])

    if (eventError) {
      console.error("[Analytics] Failed to insert event:", eventError)
    }

    if (eventType === "blog_view") {
      await safeIncrementViews(supabase, "blogs", targetId)
    }

    if (eventType === "review_view") {
      await safeIncrementViews(supabase, "reviews", targetId)
    }

    if (eventType === "vehicle_view") {
      await safeIncrementViews(supabase, "vehicles", targetId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Analytics] Unexpected error:", error)
    return NextResponse.json({ error: "Failed to record analytics event" }, { status: 500 })
  }
}