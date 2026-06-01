
import { Suspense } from "react"
import ResultsPage from "@/components/results-page"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Browse Vehicles - iMoto GT",
  description: "Search and filter thousands of vehicles for sale across South Africa.",
  alternates: {
    canonical: 'https://imoto-gt.co.za/results',
  },
}

export const dynamic = 'force-dynamic'


export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResultsPage />
    </Suspense>
  )
}
