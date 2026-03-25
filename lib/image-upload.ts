/**
 * lib/image-upload.ts
 * 
 * Handles uploading images to Supabase Storage buckets.
 * - Vehicle images → vehicle-storage bucket
 * - Profile pictures → profile-picture bucket
 * 
 * Always falls back to returning the original base64 if upload fails,
 * so no listing or profile is ever broken by a failed upload.
 */

import { supabase } from "./supabase"

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a base64 data URI to a Blob for uploading to Supabase Storage.
 */
function base64ToBlob(base64: string): { blob: Blob; mimeType: string } {
  const [header, data] = base64.split(",")
  const mimeType = header.match(/:(.*?);/)?.[1] || "image/jpeg"
  const byteCharacters = atob(data)
  const byteArray = new Uint8Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i)
  }
  return {
    blob: new Blob([byteArray], { type: mimeType }),
    mimeType,
  }
}

/**
 * Get the file extension from a MIME type.
 */
function getExtension(mimeType: string): string {
  if (mimeType.includes("webp")) return "webp"
  if (mimeType.includes("png")) return "png"
  return "jpg"
}

// ─── Vehicle Images ───────────────────────────────────────────────────────────

/**
 * Upload a single vehicle image to the vehicle-storage bucket.
 * 
 * - If the image is already a URL (not base64), it is returned as-is.
 * - If the upload fails, returns null so the caller can fall back to base64.
 * 
 * Storage path: vehicle-storage/{folderId}/{index}-{timestamp}.{ext}
 */
export async function uploadVehicleImage(
  image: string,
  folderId: string,
  imageIndex: number
): Promise<string | null> {
  // Already a Supabase Storage URL or external URL — no upload needed
  if (!image.startsWith("data:")) {
    return image
  }

  try {
    const { blob, mimeType } = base64ToBlob(image)
    const extension = getExtension(mimeType)
    const fileName = `${folderId}/${imageIndex}-${Date.now()}.${extension}`

    const { data, error } = await supabase.storage
      .from("vehicle-storage")
      .upload(fileName, blob, {
        contentType: mimeType,
        upsert: false,
        cacheControl: "31536000", // Cache for 1 year — images don't change
      })

    if (error) {
      console.error(
        `[ImageUpload] ❌ Failed to upload image ${imageIndex}:`,
        error.message
      )
      return null
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("vehicle-storage").getPublicUrl(data.path)

    console.log(`[ImageUpload] ✅ Image ${imageIndex} → ${publicUrl}`)
    return publicUrl
  } catch (err) {
    console.error(`[ImageUpload] ❌ Exception uploading image ${imageIndex}:`, err)
    return null
  }
}

/**
 * Upload all images for a vehicle to the vehicle-storage bucket.
 * 
 * - Images already stored as URLs are kept unchanged.
 * - Base64 images are uploaded; if any fail they fall back to base64
 *   so the listing always works even if storage is unavailable.
 * 
 * @param images  Array of base64 strings or existing URLs
 * @param folderId  Unique folder name (use vehicle ID or temp ID)
 * @returns Array of public URLs (or base64 fallbacks for failed uploads)
 */
export async function uploadVehicleImages(
  images: string[],
  folderId: string
): Promise<string[]> {
  if (!images || images.length === 0) return []

  const base64Count = images.filter((img) => img.startsWith("data:")).length
  console.log(
    `[ImageUpload] Uploading ${base64Count} new images to vehicle-storage...`
  )

  const results = await Promise.allSettled(
    images.map((img, index) => uploadVehicleImage(img, folderId, index))
  )

  let uploadedCount = 0
  let fallbackCount = 0

  const finalUrls: string[] = results.map((result, index) => {
    if (result.status === "fulfilled" && result.value !== null) {
      // Only count as uploaded if it was base64 that we converted to a URL
      if (images[index].startsWith("data:")) uploadedCount++
      return result.value
    } else {
      // Upload failed — fall back to original base64 so listing still works
      console.warn(
        `[ImageUpload] ⚠️ Falling back to base64 for image ${index}`
      )
      fallbackCount++
      return images[index]
    }
  })

  console.log(
    `[ImageUpload] ✅ Done — ${uploadedCount} uploaded to storage, ${fallbackCount} kept as base64`
  )

  return finalUrls
}

// ─── Profile Pictures ─────────────────────────────────────────────────────────

/**
 * Upload a profile picture to the profile-picture bucket.
 * 
 * - If the image is already a URL, it is returned as-is.
 * - Uses upsert so the user's profile pic is always replaced (not duplicated).
 * - Falls back to returning the original base64 if upload fails.
 * 
 * Storage path: profile-picture/{userId}/profile-{timestamp}.{ext}
 */
export async function uploadProfilePicture(
  image: string,
  userId: string
): Promise<string> {
  // Already a URL — return as-is
  if (!image.startsWith("data:")) {
    return image
  }

  try {
    const { blob, mimeType } = base64ToBlob(image)
    const extension = getExtension(mimeType)
    const fileName = `${userId}/profile-${Date.now()}.${extension}`

    const { data, error } = await supabase.storage
      .from("profile-picture")
      .upload(fileName, blob, {
        contentType: mimeType,
        upsert: true, // Replace existing profile picture
        cacheControl: "3600", // Cache for 1 hour — profile pics change more often
      })

    if (error) {
      console.error("[ImageUpload] ❌ Failed to upload profile picture:", error.message)
      // Fall back to base64 so profile still saves
      return image
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("profile-picture").getPublicUrl(data.path)

    console.log(`[ImageUpload] ✅ Profile picture → ${publicUrl}`)
    return publicUrl
  } catch (err) {
    console.error("[ImageUpload] ❌ Exception uploading profile picture:", err)
    // Fall back to base64
    return image
  }
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

/**
 * Delete all images for a vehicle from the vehicle-storage bucket.
 * Called when a vehicle listing is permanently deleted.
 * Fires-and-forgets — does not block the delete operation.
 */
export async function deleteVehicleImages(vehicleId: string): Promise<void> {
  try {
    // List all files in the vehicle's folder
    const { data, error } = await supabase.storage
      .from("vehicle-storage")
      .list(vehicleId)

    if (error || !data || data.length === 0) {
      // No files found — nothing to delete
      return
    }

    const filePaths = data.map((file) => `${vehicleId}/${file.name}`)

    const { error: deleteError } = await supabase.storage
      .from("vehicle-storage")
      .remove(filePaths)

    if (deleteError) {
      console.error(
        "[ImageUpload] ❌ Failed to delete vehicle images:",
        deleteError.message
      )
    } else {
      console.log(
        `[ImageUpload] ✅ Deleted ${filePaths.length} images for vehicle ${vehicleId}`
      )
    }
  } catch (err) {
    console.error("[ImageUpload] ❌ Exception deleting vehicle images:", err)
  }
}