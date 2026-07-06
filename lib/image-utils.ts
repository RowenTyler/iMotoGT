// lib/image-utils.ts
// Compress images before uploading to storage

/**
 * Compress a single image to reduce file size before Supabase Storage upload.
 * Uses WebP format for better compression than JPEG.
 */
export async function compressImage(
  base64Image: string,
  maxWidth: number = 1200,
  quality: number = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()

    img.onload = () => {
      const canvas = document.createElement("canvas")
      let width = img.width
      let height = img.height

      // Scale down if wider than maxWidth
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, width, height)

      // Try WebP first (much better compression), fall back to JPEG
      const webpResult = canvas.toDataURL("image/webp", quality)
      
      // If WebP is not supported (returns image/png), use JPEG
      if (webpResult.startsWith("data:image/webp")) {
        resolve(webpResult)
      } else {
        resolve(canvas.toDataURL("image/jpeg", quality))
      }
    }

    img.onerror = () => {
      // If compression fails, return original
      console.warn("[ImageUtils] Compression failed, using original")
      resolve(base64Image)
    }

    img.src = base64Image
  })
}

/**
 * Compress multiple images in parallel.
 * Used in the upload-vehicle form before images are sent to storage.
 */
export async function compressImages(images: string[]): Promise<string[]> {
  if (!images || images.length === 0) return []
  
  
  const compressed = await Promise.all(
    images.map((img) => {
      // Skip if already a URL (already uploaded to storage)
      if (!img.startsWith("data:")) return Promise.resolve(img)
      return compressImage(img, 1200, 0.75)
    })
  )

  // Log size reduction
  const originalSize = images.reduce((sum, img) => sum + img.length, 0)
  const compressedSize = compressed.reduce((sum, img) => sum + img.length, 0)
  const reduction = Math.round((1 - compressedSize / originalSize) * 100)
  console.log(
    `[ImageUtils] ✅ Compressed ${images.length} images — ${reduction}% size reduction`
  )

  return compressed
}
