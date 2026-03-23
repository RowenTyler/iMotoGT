// lib/image-utils.ts

/**
 * Compress image to reduce size before uploading
 */
export async function compressImage(
  file: File,
  maxWidth: number = 800,
  quality: number = 0.72
): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("Canvas context not available"))
          return
        }

        const img = document.createElement("img")

        img.onload = () => {
          try {
            const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
            canvas.width = img.width * ratio
            canvas.height = img.height * ratio

            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const reader = new FileReader()
                  reader.onload = () => resolve(reader.result as string)
                  reader.onerror = () => reject(new Error("Failed to read compressed image"))
                  reader.readAsDataURL(blob)
                } else {
                  reject(new Error("Failed to compress image"))
                }
              },
              "image/jpeg",
              quality,
            )
          } catch (error) {
            reject(new Error(`Image processing failed: ${error instanceof Error ? error.message : "Unknown error"}`))
          }
        }

        img.onerror = () => reject(new Error("Failed to load image"))
        img.src = URL.createObjectURL(file)
      } catch (error) {
        reject(new Error(`Image compression setup failed: ${error instanceof Error ? error.message : "Unknown error"}`))
      }
    })
}
