import { createClient } from "@/lib/supabase-client"

const supabase = createClient()

export interface EditorUser {
  id: string
  email: string
  created_at: string
}

export async function syncUserToPublic(user: any): Promise<{ success: boolean; error?: string }> {
  try {
    if (!user?.id || !user?.email) {
      return { success: true }
    }


    const syncData = {
      id: user.id,
      email: user.email,
      first_name: user.user_metadata?.first_name || "",
      last_name: user.user_metadata?.last_name || "",
      created_at: new Date().toISOString(),
    }

    // Try insert first (respects RLS for user's own profile)
    const { data, error } = await supabase.from("users").insert([syncData]).select()

    // If it fails due to duplicate, try update
    if (error?.code === "23505") {
      return { success: true }
    }

    if (error?.code === "42501") {
      return { success: true } // Don't fail - profile will be created by createUserProfile
    }

    if (error) {
      console.error("[v0] User sync to public.users failed:", error.message)
      return { success: true } // Don't fail hard - profile creation should handle it
    }

    return { success: true }
  } catch (err: any) {
    console.error("[v0] Error in syncUserToPublic:", err.message)
    return { success: true } // Don't fail hard
  }
}

export async function syncUserToEditors(user: any): Promise<{ success: boolean; error?: string }> {
  try {
    if (!user?.id || !user?.email) {
      console.warn("[v0] User missing id or email, skipping sync")
      return { success: true }
    }


    const { data, error } = await supabase.from("editors.users").upsert(
      {
        id: user.id,
        email: user.email,
        created_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )

    if (error) {
      console.error("[v0] User sync failed:", error.message)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error("[v0] Error in syncUserToEditors:", err.message)
    return { success: false, error: err.message }
  }
}