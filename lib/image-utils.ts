// lib/image-utils.ts

/**
 * Compress image to reduce size before uploading
 */
export async function compressImage(
  base64Image: string, 
  maxWidth: number = 1200,
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height
      
      // Calculate new dimensions
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      ctx!.drawImage(img, 0, 0, width, height)
      
      // Compress as JPEG
      const compressed = canvas.toDataURL('image/jpeg', quality)
      resolve(compressed)
    }
    
    img.src = base64Image
  })
}

/**
 * Compress multiple images
 */
export async function compressImages(images: string[]): Promise<string[]> {
  console.log(`🖼️ Compressing ${images.length} images...`)
  const compressed = await Promise.all(
    images.map(img => compressImage(img, 1200, 0.7))
  )
  console.log(`✅ Compressed ${compressed.length} images`)
  return compressed
}
