import { type NextRequest, NextResponse } from "next/server"
import { vehicleService } from "@/lib/vehicle-service"
import { supabase } from "@/lib/supabase"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🔍 GET /api/vehicles/[id] - Fetching vehicle:", params.id)

    const vehicle = await vehicleService.getVehicleById(params.id)

    if (!vehicle) {
      console.log("❌ Vehicle not found")
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    console.log("✅ Vehicle fetched successfully")
    return NextResponse.json(vehicle)
  } catch (error: any) {
    console.error("❌ GET /api/vehicles/[id] error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch vehicle" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("📝 PUT /api/vehicles/[id] - Updating vehicle:", params.id)

    // Get the current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      console.error("❌ No valid session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    console.log("👤 User ID:", userId)

    const body = await request.json()
    console.log("📝 Request body:", body)

    const updatedVehicle = await vehicleService.updateVehicle(params.id, body, userId)

    console.log("✅ Vehicle updated successfully")
    return NextResponse.json(updatedVehicle)
  } catch (error: any) {
    console.error("❌ PUT /api/vehicles/[id] error:", error)
    return NextResponse.json({ error: error.message || "Failed to update vehicle" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🗑️ DELETE /api/vehicles/[id] - Deleting vehicle:", params.id)

    // Get the current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      console.error("❌ No valid session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    console.log("👤 User ID:", userId)

    // Get the deletion reason from request body
    const body = await request.json().catch(() => ({}))
    const reason = body.reason

    console.log("📝 Deletion reason:", reason)

    // Verify ownership - query without deleted_at filter
    const { data: existingVehicle, error: fetchError } = await supabase
      .from("vehicles")
      .select("user_id,deleted_at,is_deleted")
      .eq("id", params.id)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        console.error("❌ Vehicle not found:", params.id)
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
      }
      console.error("❌ Database error fetching vehicle:", fetchError)
      return NextResponse.json({ error: `Database error: ${fetchError.message}` }, { status: 500 })
    }

    if (!existingVehicle) {
      console.error("❌ Vehicle not found:", params.id)
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    if (existingVehicle.user_id !== userId) {
      console.error("❌ User does not own this vehicle")
      return NextResponse.json({ error: "Unauthorized: You don't own this vehicle" }, { status: 403 })
    }

    if (existingVehicle.is_deleted || existingVehicle.deleted_at) {
      console.warn("⚠️ Vehicle already deleted:", params.id)
      return NextResponse.json({ success: true, message: "Vehicle already deleted" })
    }

    const now = new Date().toISOString()

    // Soft delete by setting is_deleted and deleted_at
    const updates: Record<string, any> = {
      is_deleted: true,
      deleted_at: now,
      status: 'inactive', // Use 'inactive' to match DB constraint
      updated_at: now,
    }
    if (reason) {
      updates.deletion_reason = reason
    }

    const { error: updateError } = await supabase
      .from("vehicles")
      .update(updates)
      .eq("id", params.id)
      .eq("is_deleted", false)

    if (updateError) {
      console.error("❌ Error soft-deleting vehicle:", updateError)
      return NextResponse.json({ error: `Failed to delete vehicle: ${updateError.message}` }, { status: 500 })
    }

    console.log("✅ Vehicle soft-deleted successfully")
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("❌ DELETE /api/vehicles/[id] error:", error)
    return NextResponse.json({ error: error.message || "Failed to delete vehicle" }, { status: 500 })
  }
}
