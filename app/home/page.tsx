import CarMarketplace from "@/components/car-marketplace"
import PlatformStats from "@/components/platform-stats"
import { Facebook, Instagram, Twitter } from "lucide-react"

export default function HomePage() {
  return (
    <>
      <CarMarketplace />
      <PlatformStats />
      <footer className="bg-[#3E5641] dark:bg-[#1F2B20] py-8 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4 text-[#FF6700] dark:text-[#FF7D33]">imoto</h3>
              <p className="text-sm text-gray-300">The simplest way to buy or sell your car in South Africa.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-200">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <a href="/" className="text-sm text-gray-300 hover:text-[#FF7D33] text-left">Buy a Car</a>
                </li>
                <li>
                  <a href="/upload-vehicle" className="text-sm text-gray-300 hover:text-[#FF7D33] text-left">Sell a Car</a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-300 hover:text-[#FF7D33]">Value My Car</a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-300 hover:text-[#FF7D33]">Car Finance</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-200">About Us</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-sm text-gray-300 hover:text-[#FF7D33]">Our Story</a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-300 hover:text-[#FF7D33]">Careers</a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-300 hover:text-[#FF7D33]">Press</a>
                </li>
                <li>
                  <a href="#" className="text-sm text-[#FF7D33]">Contact Us</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-200">Connect With Us</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-300 hover:text-[#FF7D33]"><Facebook className="w-6 h-6" /></a>
                <a href="#" className="text-gray-300 hover:text-[#FF7D33]"><Instagram className="w-6 h-6" /></a>
                <a href="#" className="text-gray-300 hover:text-[#FF7D33]"><Twitter className="w-6 h-6" /></a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-[#576B55]/50 dark:border-[#2A352A]/50 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} imoto. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  )
}
