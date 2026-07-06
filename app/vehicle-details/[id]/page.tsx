import { createClient } from "@/utils/supabase/server"
import type { Metadata } from "next"
import VehicleDetailsClientPage from "./client-page"

export const dynamic = "force-dynamic"

const FALLBACK_OG_IMAGE = "https://imotogt.co.za/imoto-icon-metadate-image.png"

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const canonical = `https://imotogt.co.za/vehicle-details/${id}`

  try {
    const supabase = await createClient()
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select(
        "make, model, variant, year, price, mileage, transmission, fuel, city, province, images, is_deleted"
      )
      .eq("id", id)
      .maybeSingle()

    if (!vehicle || vehicle.is_deleted) {
      return { alternates: { canonical } }
    }

    const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}${
      vehicle.variant ? ` ${vehicle.variant}` : ""
    }`
    const priceFormatted = vehicle.price
      ? `R ${Number(vehicle.price).toLocaleString("en-ZA")}`
      : "Price on request"
    const description = [
      priceFormatted,
      vehicle.mileage
        ? `${Number(vehicle.mileage).toLocaleString("en-ZA")} km`
        : null,
      vehicle.transmission,
      vehicle.fuel,
      [vehicle.city, vehicle.province].filter(Boolean).join(", "),
    ]
      .filter(Boolean)
      .join(" · ")

    const firstImage = Array.isArray(vehicle.images)
      ? vehicle.images.find(
          (img: unknown): img is string =>
            typeof img === "string" && img.startsWith("http")
        )
      : null
    const ogImage = firstImage || FALLBACK_OG_IMAGE

    return {
      title: `${title} - ${priceFormatted} | iMoto GT`,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        type: "website",
        url: canonical,
        images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
      },
    }
  } catch (err) {
    console.error("[vehicle-details] generateMetadata error:", err)
    return { alternates: { canonical } }
  }
}

export default function VehicleDetailsPage({
  params,
}: {
  params: { id: string }
}) {
  return <VehicleDetailsClientPage params={params} />
}