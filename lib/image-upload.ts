import { supabase } from "./supabase"

export async function uploadVehicleImage(
  base64DataUrl: string,
  vehicleId: string,
  index: number
): Promise<string | null> {
  try {
    // Convert base64 to blob
    const response = await fetch(base64DataUrl)
    const blob = await response.blob()
    
    const fileName = `${vehicleId}/image-${index}-${Date.now()}.jpg`
    
    const { data, error } = await supabase.storage
      .from('vehicle-images')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (error) {
      console.error('Image upload error:', error)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('vehicle-images')
      .getPublicUrl(data.path)

    return publicUrl
  } catch (error) {
    console.error('Image upload exception:', error)
    return null
  }
}

export async function uploadAllVehicleImages(
  base64Images: string[],
  vehicleId: string
): Promise<string[]> {
  const uploads = await Promise.all(
    base64Images.map((img, i) => uploadVehicleImage(img, vehicleId, i))
  )
  return uploads.filter(Boolean) as string[]
}
