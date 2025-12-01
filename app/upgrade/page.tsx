"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/ui/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check } from "lucide-react"
import { useUser } from "@/components/UserContext"

export default function UpgradePage() {
  const router = useRouter()
  const { user } = useUser()
  const [selectedTier, setSelectedTier] = useState<string | null>(null)

  const tiers = [
    {
      id: "free",
      name: "Free",
      price: "ZAR 0",
      period: "/ month",
      description: "Perfect to get started",
      features: [
        "3 free vehicle listings",
        "Up to 30 days advertising per listed vehicle",
        "Basic metrics on 1 vehicle (views & saves)",
      ],
      color: "bg-gray-50",
      borderColor: "border-gray-200",
      buttonVariant: "outline",
      current: true,
    },
    {
      id: "go",
      name: "GO",
      price: "ZAR TBD",
      period: "/ month",
      description: "For active sellers",
      features: [
        "10 vehicle listings",
        "Up to 30 days advertising per listed vehicle",
        "Basic metrics on 5 vehicles",
        "2 sponsored vehicle posts for 1 week",
      ],
      color: "bg-blue-50",
      borderColor: "border-blue-200",
      buttonVariant: "default",
      current: false,
    },
    {
      id: "plus",
      name: "Plus",
      price: "ZAR TBD",
      period: "/ month",
      description: "For power sellers",
      features: [
        "20 vehicle listings",
        "Up to 90 days advertising per listed vehicle",
        "Metrics on 10 vehicles (including top/most listed vehicles)",
        "5 sponsored vehicle posts for 2 weeks",
      ],
      color: "bg-orange-50",
      borderColor: "border-orange-200",
      buttonVariant: "default",
      current: false,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      description: "For dealers & agencies",
      features: [
        "Vehicle listings determined by enterprise package",
        "Up to 30 days advertising per listed vehicle",
        "Comprehensive metrics (views, saves, performance analytics, trending vehicles)",
        "Agents/sales reps dealer accounts",
      ],
      color: "bg-gradient-to-br from-purple-50 to-indigo-50",
      borderColor: "border-purple-200",
      buttonVariant: "default",
      current: false,
    },
  ]

  const handleUpgradeClick = (tierId: string) => {
    setSelectedTier(tierId)
    if (tierId === "enterprise") {
      window.location.href =
        "mailto:sales@imoto.com?subject=Enterprise%20Plan%20Inquiry&body=Hello,%20I%20am%20interested%20in%20the%20Enterprise%20plan."
    } else {
      // Placeholder for future payment integration
      console.log(`Selected tier: ${tierId}`)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Header
        user={user}
        onLoginClick={() => {}}
        onDashboardClick={() => router.push("/dashboard")}
        onGoHome={() => router.push("/home")}
        onShowAllCars={() => router.push("/results")}
        onGoToSellPage={() => router.push("/upload-vehicle")}
      />

      <main className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Upgrade Your Plan</h1>
            <p className="text-xl text-gray-600">Choose the perfect plan for your needs</p>
          </div>

          {/* Tier Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {tiers.map((tier) => (
              <Card
                key={tier.id}
                className={`rounded-2xl overflow-hidden transition-all hover:shadow-lg ${tier.color} ${tier.borderColor} border-2`}
              >
                <div className="p-6 h-full flex flex-col">
                  {/* Tier Header */}
                  <div className="mb-6">
                    {tier.current && (
                      <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                        CURRENT PLAN
                      </span>
                    )}
                    <h2 className="text-2xl font-bold mb-2">{tier.name}</h2>
                    <p className="text-sm text-gray-600 mb-4">{tier.description}</p>
                    <div className="mb-4">
                      <span className="text-3xl font-bold">{tier.price}</span>
                      <span className="text-sm text-gray-600"> {tier.period}</span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="flex-grow mb-6">
                    <ul className="space-y-3">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-[#FF6700] flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => handleUpgradeClick(tier.id)}
                    variant={tier.current ? "outline" : "default"}
                    className={`w-full ${
                      tier.current
                        ? "text-gray-700 border-gray-300 hover:bg-gray-100"
                        : "bg-[#FF6700] hover:bg-[#FF7D33] text-white"
                    }`}
                  >
                    {tier.current ? "Current Plan" : "Upgrade to " + tier.name}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* FAQ or Additional Info Section */}
          <div className="bg-gray-50 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Questions about plans?</h3>
            <p className="text-gray-600 mb-6">
              Contact our sales team to learn more about what each plan offers and find the best option for your
              business.
            </p>
            <Button
              onClick={() => (window.location.href = "mailto:support@imoto.com?subject=Plan%20Inquiry")}
              className="bg-[#FF6700] hover:bg-[#FF7D33] text-white"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
