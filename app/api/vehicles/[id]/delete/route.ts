import { createServerClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Deletion audit trail interface
interface DeletionAudit {
  vehicle_id: string
  user_id: string
  deletion_reason?: string
  ip_address?: string
  user_agent?: string
  timestamp: string
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const startTime = Date.now()
  const vehicleId = params.id

  try {
    console.log(`[v0] Starting soft delete for vehicle: ${vehicleId}`)

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("[v0] Failed to parse request body:", parseError)
      return NextResponse.json({
        error: "Invalid request body",
        details: "Request body must be valid JSON"
      }, { status: 400 })
    }

    const { reason } = body
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)


    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await createServerClient().auth.getUser()

    if (authError || !user) {
      console.error("[v0] Authentication failed:", authError)
      return NextResponse.json({
        error: "Unauthorized",
        details: "You must be logged in to delete vehicles"
      }, { status: 401 })
    }

    // Verify ownership and get vehicle details for audit
    const { data: vehicle, error: fetchError } = await createServerClient()
      .from("vehicles")
      .select("user_id, make, model, year, created_at")
      .eq("id", vehicleId)
      .eq("is_deleted", false) // Only allow deletion of non-deleted vehicles
      .single()

    if (fetchError) {
      console.error("[v0] Vehicle fetch error:", fetchError)
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({
          error: "Vehicle not found",
          details: "The vehicle does not exist or may have already been deleted"
        }, { status: 404 })
      }
      return NextResponse.json({
        error: "Database error",
        details: "Failed to fetch vehicle information"
      }, { status: 500 })
    }

    if (!vehicle) {
      return NextResponse.json({
        error: "Vehicle not found",
        details: "The vehicle does not exist or may have already been deleted"
      }, { status: 404 })
    }

    if (vehicle.user_id !== user.id) {
      console.warn(`[v0] Unauthorized deletion attempt: User ${user.id} trying to delete vehicle ${vehicleId} owned by ${vehicle.user_id}`)
      return NextResponse.json({
        error: "Unauthorized",
        details: "You can only delete your own vehicles"
      }, { status: 403 })
    }

    // Prepare soft delete data
    const now = new Date().toISOString()
    const updates: Record<string, any> = {
      is_deleted: true,
      deleted_at: now,
      updated_at: now,
    }

    if (reason && typeof reason === 'string' && reason.trim().length > 0) {
      updates.deletion_reason = reason.trim().substring(0, 500) // Limit reason length
    }

    // Perform soft delete operation with retry logic
    let deleteAttempts = 0
    const maxDeleteRetries = 3
    let deleteError: any = null

    while (deleteAttempts < maxDeleteRetries) {
      try {
        const { error: dbError } = await supabaseAdmin
          .from("vehicles")
          .update(updates)
          .eq("id", vehicleId)
          .eq("is_deleted", false) // Ensure we only soft delete if not already deleted

        if (dbError) {
          deleteError = dbError
          deleteAttempts++

          if (deleteAttempts < maxDeleteRetries) {
            const delay = Math.pow(2, deleteAttempts - 1) * 1000
            console.log(`[v0] Delete attempt ${deleteAttempts} failed, retrying in ${delay}ms:`, dbError)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
        } else {
          deleteError = null
          break
        }
      } catch (unexpectedError) {
        deleteError = unexpectedError
        deleteAttempts++

        if (deleteAttempts < maxDeleteRetries) {
          const delay = Math.pow(2, deleteAttempts - 1) * 1000
          console.log(`[v0] Unexpected delete error ${deleteAttempts}, retrying in ${delay}ms:`, unexpectedError)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    if (deleteError) {
      console.error("[v0] Failed to delete vehicle after retries:", deleteError)
      return NextResponse.json({
        error: "Failed to delete vehicle",
        details: "The deletion operation failed after multiple attempts. Please try again."
      }, { status: 500 })
    }

    // Create audit log entry
    const auditData: DeletionAudit = {
      vehicle_id: vehicleId,
      user_id: user.id,
      deletion_reason: updates.deletion_reason,
      ip_address: clientIp,
      user_agent: userAgent,
      timestamp: now,
    }

    // Try to create audit log (non-blocking)
    try {
      const { error: auditError } = await supabaseAdmin
        .from("vehicle_deletion_audit")
        .insert([auditData])

      if (auditError) {
        console.warn("[v0] Failed to create audit log entry:", auditError)
      } else {
        console.log("[v0] Audit log created successfully")
      }
    } catch (auditError) {
      console.warn("[v0] Exception creating audit log:", auditError)
    }

    const duration = Date.now() - startTime
    console.log(`[v0] Vehicle soft deleted successfully: ${vehicleId} (${vehicle.make} ${vehicle.model}) by ${user.email} in ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: "Vehicle deleted successfully",
      data: {
        vehicleId,
        deletedAt: now,
        reason: updates.deletion_reason
      }
    })

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[v0] Server error during vehicle deletion (${vehicleId}) after ${duration}ms:`, error)

    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development'

    return NextResponse.json({
      error: "Server error",
      details: isDevelopment ? error?.message || "Unknown error" : "An unexpected error occurred"
    }, { status: 500 })
  }
}
