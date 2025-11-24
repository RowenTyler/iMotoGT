"use client"

import {
  Card,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, User, Heart, Inbox, Package } from "lucide-react"

export default function Dashboard({
  profile = {},
  savedCars = [],
  totalListings = 0,
  maxFreeListings = 0,
  freeListingsRemaining = 0,
  isLoading = false,
}: {
  profile: any
  savedCars: any[]
  totalListings: number
  maxFreeListings: number
  freeListingsRemaining: number
  isLoading: boolean
}) {
  const userName = profile?.first_name ? profile.first_name : "Guest"

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      {/* Page Title */}
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Two column layout */}
      <div className="grid grid-cols-12 gap-6">

        {/* LEFT COLUMN: PROFILE CARD */}
        <div className="col-span-12 md:col-span-3">
          <Card className="rounded-3xl p-6 flex flex-col items-center text-center min-h-0">
            <div className="p-4 bg-[#FFF8E0] rounded-full mb-4">
              <User className="h-12 w-12 text-[#FF6700]" />
            </div>

            <h2 className="text-xl font-semibold">{userName}</h2>
            <p className="text-sm text-gray-500 mb-4">
              Manage your vehicles, saved cars and profile
            </p>

            <Button className="bg-[#FF6700] hover:bg-[#e65c00] w-full mt-auto">
              Edit Profile
            </Button>
          </Card>
        </div>

        {/* RIGHT SIDE GRID — AUTO SIZING FIX APPLIED */}
        <div className="col-span-12 md:col-span-9 grid grid-rows-[auto_auto] gap-6 min-h-0">

          {/* TOP ROW: SAVED CARS + INBOX */}
          <div className="grid grid-cols-12 md:grid-cols-9 gap-6 auto-rows-auto min-h-0">

            {/* SAVED CARS */}
            <Card className="col-span-12 md:col-span-6 rounded-3xl overflow-hidden w-full h-auto min-h-0 relative">
              <div className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{ backgroundImage: "url('/images/cars-bg.jpg')" }}
              />

              <div className="relative p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold">Saved Cars</h3>
                  <Heart className="h-5 w-5 text-[#FF6700]" />
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  View your saved vehicles
                </p>

                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-[#FF6700]" />
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="mt-auto border-[#FF6700] text-[#FF6700] hover:bg-[#FFF8E0]"
                  >
                    View Saved Cars ({savedCars.length})
                  </Button>
                )}
              </div>
            </Card>

            {/* INBOX */}
            <Card className="col-span-12 md:col-span-3 rounded-3xl p-6 flex flex-col w-full h-auto min-h-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold">Inbox</h3>
                <Inbox className="h-5 w-5 text-[#FF6700]" />
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Offers, enquiries and alerts
              </p>

              <Button
                variant="outline"
                className="mt-auto border-[#FF6700] text-[#FF6700] hover:bg-[#FFF8E0]"
              >
                Open Inbox
              </Button>
            </Card>

          </div>

          {/* BOTTOM ROW: SUBSCRIPTION CARD FIXED */}
          <Card className="col-span-12 md:col-span-3 rounded-3xl w-full h-auto min-h-0 flex flex-col">
            <div className="px-4 py-3 border-b flex-shrink-0">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Subscription</h3>
                <Package className="h-5 w-5 text-[#FF6700]" />
              </div>
            </div>

            <div className="p-4 flex-grow flex flex-col gap-3 min-h-0">

              {/* Free Plan */}
              <div className="bg-gray-50 rounded-xl p-3 flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-medium">Free Plan</h4>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>Vehicle Listings</span>
                  <span className="font-medium">
                    {totalListings}/{maxFreeListings} Used
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-[#FF6700] h-2 rounded-full"
                    style={{ width: `${(totalListings / maxFreeListings) * 100}%` }}
                  />
                </div>

                <p className="text-xs text-gray-500 mt-1">
                  {freeListingsRemaining} free listings remaining
                </p>
              </div>

              {/* Premium */}
              <div className="border border-dashed border-gray-300 rounded-xl p-3 flex-1 flex flex-col min-h-0">
                <h4 className="font-medium mb-1">Premium Plans</h4>
                <p className="text-xs text-gray-500 leading-tight mb-2">
                  Unlock unlimited listings and premium features
                </p>

                <Button
                  variant="outline"
                  className="w-full h-8 text-xs text-[#FF6700] border-[#FF6700] hover:bg-[#FFF8E0] mt-auto"
                >
                  Coming Soon
                </Button>
              </div>

            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}
