import { createClient } from "@supabase/supabase-js"

const emails = [
  "rowenrichardson@gmail.com",
  "richardson.rowen@gmail.com",
  "tyler.rowend@gmail.com",
]

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.")
  process.exit(1)
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

async function ensureSuperAdmin(email) {
  console.log(`Checking ${email}`)
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id,email")
    .eq("email", email)
    .single()

  if (userError) {
    console.error(`Failed to fetch user ${email}:`, userError.message)
    return
  }

  if (!user) {
    console.warn(`No user record found for ${email}`)
    return
  }

  const { data: existingRole, error: roleError } = await supabase
    .from("admin_roles")
    .select("id,role")
    .eq("user_id", user.id)
    .single()

  if (roleError && roleError.code !== "PGRST116") {
    console.error(`Failed to query admin_roles for ${email}:`, roleError.message)
    return
  }

  if (!existingRole) {
    const { error: insertError } = await supabase.from("admin_roles").insert([
      {
        user_id: user.id,
        role: "SUPER_ADMIN",
        created_at: new Date().toISOString(),
      },
    ])

    if (insertError) {
      console.error(`Failed to create admin_roles for ${email}:`, insertError.message)
      return
    }

    console.log(`Created SUPER_ADMIN role for ${email}`)
  } else if (existingRole.role !== "SUPER_ADMIN") {
    const { error: updateError } = await supabase
      .from("admin_roles")
      .update({ role: "SUPER_ADMIN" })
      .eq("user_id", user.id)

    if (updateError) {
      console.error(`Failed to update admin_roles for ${email}:`, updateError.message)
      return
    }

    console.log(`Upgraded ${email} to SUPER_ADMIN`)  
  } else {
    console.log(`${email} already has SUPER_ADMIN access`)  
  }

  const { error: auditError } = await supabase.from("admin_audit_log").insert([
    {
      user_id: user.id,
      action: "GRANT_SUPER_ADMIN",
      target_table: "admin_roles",
      target_id: user.id,
      metadata: { email },
      created_at: new Date().toISOString(),
    },
  ])

  if (auditError) {
    console.error(`Failed to record audit log for ${email}:`, auditError.message)
  }
}

async function run() {
  for (const email of emails) {
    await ensureSuperAdmin(email)
  }
  console.log("Done")
}

run().catch((error) => {
  console.error("Unexpected error:", error)
  process.exit(1)
})
