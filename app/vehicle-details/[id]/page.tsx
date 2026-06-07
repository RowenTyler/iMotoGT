import VehicleDetailsClientPage from "./client-page"
import type { Metadata } from 'next'

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  // Optionally fetch vehicle to get make/model for title
  // For now a safe default:
  return {
    alternates: {
      canonical: `https://imotogt.co.za/vehicle-details/${params.id}`,
    },
  }
}

export default function VehicleDetailsPage({ params }: { params: { id: string } }) {
  return <VehicleDetailsClientPage params={params} />
}
