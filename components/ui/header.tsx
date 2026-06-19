"use client"

import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { X, User, Shield } from "lucide-react"
import { useUser } from "@/components/UserContext"
import { useMobile } from "@/hooks/use-mobile"
import Image from "next/image"

const FluidGlass = ({ mode, lensProps }: { mode: string; lensProps: any }) => (
  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent backdrop-blur-sm" />
)

interface HeaderProps {
  user?: any
  onLoginClick?: () => void
  onDashboardClick?: () => void
  onGoHome?: () => void
  onShowAllCars?: () => void
  onGoToSellPage?: () => void
  onSignOut?: () => void
  transparent?: boolean
}

export function Header({
  user: propUser,
  onLoginClick,
  onDashboardClick,
  onGoHome,
  onShowAllCars,
  onGoToSellPage,
  onSignOut,
  transparent = true,
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { user: contextUser, authUser, isEmailVerified, logout } = useUser()
  const isMobile = useMobile()
  const lastScrollY = useRef(0)

  useEffect(() => {
    if (isMobile) return

    const handleScroll = () => {
      const scrollY = window.scrollY
      const scrollThreshold = 50
      const direction = scrollY > lastScrollY.current ? 'down' : 'up'

      // Collapse on scroll down past threshold
      if (direction === 'down' && scrollY > scrollThreshold && !isHeaderCollapsed) {
        setIsHeaderCollapsed(true)
      }
      // Expand on scroll up, regardless of threshold, but only if currently collapsed
      else if (direction === 'up' && isHeaderCollapsed) {
        setIsHeaderCollapsed(false)
      }

      lastScrollY.current = scrollY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [isMobile, isHeaderCollapsed])

  const handleExpandHeader = () => {
    setIsHeaderCollapsed(false)
  }

  const currentUser = contextUser || propUser
  const isLoggedIn = !!authUser

  console.log("🔍 Header - Current User:", {
    hasContextUser: !!contextUser,
    hasPropUser: !!propUser,
    firstName: currentUser?.firstName,
    lastName: currentUser?.lastName,
    email: currentUser?.email,
    isLoggedIn,
  })

  const navItems = [
    { name: "Browse", key: "browse" },
    { name: "Sell", key: "sell" },
    { name: "About", key: "about" },
  ]

  const rightNavItems = [
    { name: "Services", key: "services" },
    { name: "Contact", key: "contact" },
  ]

  const handleNavigation = (key: string) => {
    setIsMobileMenuOpen(false)

    switch (key) {
      case "browse":
        router.push("/results")
        break
      case "sell":
        handleSellClick()
        break
      case "about":
        router.push("/about")
        break
      case "services":
        router.push("/services")
        break
      case "contact":
        router.push("/contact")
        break
      case "privacy":
        router.push("/privacy")
        break
      case "cookie-settings":
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('open-cookie-preferences'))
        }
        break
      case "home":
        router.push("/home")
        break
      case "login":
        if (onLoginClick) {
          onLoginClick()
        } else {
          router.push("/login")
        }
        break
      case "dashboard":
        if (onDashboardClick) {
          onDashboardClick()
        } else {
          router.push("/dashboard")
        }
        break
      default:
        break
    }
  }

  const handleSellClick = () => {
    if (onGoToSellPage) {
      onGoToSellPage()
    } else {
      if (isLoggedIn) {
        router.push("/upload-vehicle")
      } else {
        router.push("/login?next=/upload-vehicle")
      }
    }
  }

  const handleUserButtonClick = () => {
    if (!isLoggedIn) {
      if (onLoginClick) {
        onLoginClick()
      } else {
        router.push("/login")
      }
      return
    }

    const currentPath = pathname || ""

    if (currentPath === "/dashboard") {
      console.log("📍 Navigating from dashboard to results")
      router.push("/results")
    } else if (currentPath === "/home" || currentPath === "/results" || currentPath === "/") {
      console.log("📍 Navigating from home/results to dashboard")
      router.push("/dashboard")
    } else {
      console.log("📍 Navigating to dashboard (default)")
      router.push("/dashboard")
    }
  }

  const handleSignOut = async () => {
    try {
      setIsMobileMenuOpen(false)
      if (onSignOut) {
        await onSignOut()
      } else {
        await logout()
      }
    } catch (error) {
      console.error("Header: Error during sign out:", error)
    }
  }

  const displayName = currentUser?.firstName || authUser?.email?.split("@")[0] || "User"

  console.log("🎯 Header - Display Name:", displayName)

  // ----- MOBILE VERSION (with white background and black text) -----
  if (isMobile) {
    return (
      <>
        {/* Custom image as burger menu button - enlarged to 48x48 */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="fixed top-4 right-4 z-50 cursor-pointer"
          aria-label="Open menu"
        >
          <Image
            src="/imoto-icon.png"
            alt="Menu"
            width={90}
            height={90}
            className="object-contain"
            priority
          />
        </button>

        {/* Full-screen mobile menu overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[100]">
            <div className="relative bg-white h-full shadow-xl">
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                  <Image
                    src="/imoto-icon-new.png"
                    alt="MOTO GT Logo"
                    width={160}
                    height={48}
                    className="object-contain"
                    style={{ filter: "none" }}
                    priority
                  />
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-black hover:bg-gray-100 rounded-full p-2"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 flex flex-col justify-center items-center space-y-8">
                  {[...navItems, ...rightNavItems].map((item) => (
                    <button
                      key={item.name}
                      onClick={() => handleNavigation(item.key)}
                      className="text-black text-2xl font-medium hover:text-orange-500 transition-colors"
                    >
                      {item.name}
                    </button>
                  ))}

                  {isLoggedIn ? (
                    <div className="pt-4 flex flex-col items-center space-y-4 text-center">
                      <button
                        onClick={() => handleNavigation("dashboard")}
                        className="text-black text-xl hover:text-orange-500 transition-colors"
                      >
                        Dashboard
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="text-red-600 text-xl hover:text-red-500 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <div className="pt-4">
                      <button
                        className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full text-lg"
                        onClick={() => handleNavigation("login")}
                      >
                        Login
                      </button>
                    </div>
                  )}

                  {/* Privacy & Cookie Settings */}
                  <div className="pt-8 border-t border-gray-200 flex flex-col items-center space-y-4 text-center">
                    <button
                      onClick={() => handleNavigation("privacy")}
                      className="text-gray-600 text-sm hover:text-orange-500 transition-colors flex items-center justify-center gap-2"
                    >
                      <Shield size={14} />
                      Privacy Policy
                    </button>
                    <button
                      onClick={() => handleNavigation("cookie-settings")}
                      className="text-gray-600 text-sm hover:text-orange-500 transition-colors"
                    >
                      Cookie Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // ----- DESKTOP VERSION (unchanged) -----
  return (
    <>
      {/* Small logo to expand header when collapsed */}
      <div
        className={`fixed top-4 right-4 z-50 cursor-pointer transition-all duration-500 ease-in-out ${
          isHeaderCollapsed
            ? "opacity-100 scale-100 translate-x-0"
            : "opacity-0 scale-75 translate-x-full pointer-events-none"
        }`}
        onClick={handleExpandHeader}
      >
        <Image
          src="/imoto-icon.png"
          alt="IMOTO GT Logo"
          width={100}
          height={30}
          className="object-contain"
          priority
        />
      </div>

      {/* Main header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 p-4 transition-all duration-500 ease-in-out ${
          isHeaderCollapsed ? "opacity-0 translate-x-full pointer-events-none" : "opacity-100 translate-x-0"
        }`}
      >
        <nav className="mx-auto max-w-4xl w-[95%] flex items-center justify-between">
          <div className="hidden md:flex items-center bg-black/20 border border-white/50 backdrop-blur-sm rounded-full px-10 h-14">
            <div className="flex items-center justify-evenly w-full gap-8">
              <button
                onClick={() => handleNavigation("browse")}
                className="text-white hover:text-orange-500 transition-colors font-medium"
              >
                Browse
              </button>
              <button
                onClick={() => handleNavigation("sell")}
                className="text-white hover:text-orange-500 transition-colors font-medium"
              >
                Sell
              </button>
              <button
                onClick={() => handleNavigation("about")}
                className="text-white hover:text-orange-500 transition-colors font-medium"
              >
                About
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center flex-grow">
            <div className="flex items-center cursor-pointer" onClick={() => handleNavigation("home")}>
              <Image
                src="/imoto-icon-new.png"
                alt="MOTO GT Logo"
                width={280}
                height={84}
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="hidden md:flex items-center bg-black/20 border border-white/50 backdrop-blur-sm rounded-l-[100px] rounded-r-[100px] px-8 h-14">
            <div className="flex items-center justify-evenly w-full gap-6">
              <button
                onClick={() => handleNavigation("services")}
                className="text-white hover:text-orange-500 transition-colors font-medium"
              >
                Services
              </button>
              <button
                onClick={() => handleNavigation("contact")}
                className="text-white hover:text-orange-500 transition-colors font-medium"
              >
                Contact
              </button>
              {isLoggedIn ? (
                <button
                  onClick={handleUserButtonClick}
                  className="flex items-center space-x-2 text-white hover:text-orange-500 transition-colors font-medium"
                >
                  {currentUser?.profilePic ? (
                    <Image
                      src={currentUser.profilePic || "/placeholder.svg"}
                      alt="Profile"
                      width={32}
                      height={32}
                      className="rounded-full object-cover border-2 border-white"
                      style={{ aspectRatio: "1/1" }}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <span>{displayName}</span>
                </button>
              ) : (
                <button
                  onClick={() => handleNavigation("login")}
                  className="bg-orange-500 text-white px-6 py-2 rounded-full hover:bg-orange-600 transition-colors font-medium"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </nav>
      </header>
    </>
  )
}