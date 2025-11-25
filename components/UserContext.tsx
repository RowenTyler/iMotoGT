"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { authService, type AuthUser } from "@/lib/auth"
import { vehicleService } from "@/lib/vehicle-service"
import type { UserProfile } from "@/types/user"
import type { Vehicle } from "@/types/vehicle"
import type { VehicleFormData } from "@/types/vehicle"

interface UserContextType {
  user: UserProfile | null
  authUser: AuthUser | null
  isEmailVerified: boolean
  listedVehicles: Vehicle[]
  savedVehicles: Set<string>
  isLoading: boolean
  setUser: (user: UserProfile | null) => void
  logout: () => Promise<void>
  forceLogoutAll: () => Promise<void>
  addListedVehicle: (vehicle: VehicleFormData) => Promise<void>
  updateListedVehicle: (vehicleId: string, vehicleData: Partial<VehicleFormData>) => Promise<void>
  deleteListedVehicle: (vehicleId: string) => Promise<void>
  toggleSaveVehicle: (vehicle: Vehicle) => Promise<void>
  refreshVehicles: () => Promise<void>
  refreshUserProfile: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [listedVehicles, setListedVehicles] = useState<Vehicle[]>([])
  const [savedVehicles, setSavedVehicles] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // NEW: Function to load saved vehicles from database
  const loadSavedVehicles = useCallback(async () => {
    if (!user?.id) {
      console.log("⚠️ No user ID, skipping saved vehicles load")
      return
    }

    try {
      console.log("🔄 Loading saved vehicles for user:", user.id)
      const savedVehiclesList = await vehicleService.getSavedVehicles(user.id)
      const savedVehicleIds = new Set(savedVehiclesList.map(vehicle => vehicle.id))
      setSavedVehicles(savedVehicleIds)
      console.log(`✅ Loaded ${savedVehicleIds.size} saved vehicles`)
    } catch (error) {
      console.error("❌ Error loading saved vehicles:", error)
      setSavedVehicles(new Set())
    }
  }, [user?.id])

  const refreshUserProfile = useCallback(async () => {
  if (!authUser) {
    console.log("⚠️ No auth user, skipping profile refresh");
    return;
  }

  try {
    console.log("🔄 Refreshing user profile for:", authUser.id);
    const profile = await authService.getUserProfile(authUser.id);

    if (profile) {
      console.log("✅ Profile refreshed:", profile.firstName, profile.lastName);
      setUser(profile); // This should update with the NEW data
    } else {
      console.warn("⚠️ No profile found during refresh");
    }
  } catch (error) {
    console.error("❌ Error refreshing user profile:", error);
    }
  }, [authUser]);

  const refreshVehicles = useCallback(async () => {
    if (!user) {
      console.log("⚠️ No user, skipping vehicle refresh")
      return
    }

    try {
      console.log("🔄 Refreshing vehicles for user:", user.id)
      const vehicles = await vehicleService.getUserVehicles(user.id)
      console.log(`✅ Loaded ${vehicles.length} vehicles`)
      setListedVehicles(vehicles)
    } catch (error) {
      console.error("❌ Error refreshing vehicles:", error)
      setListedVehicles([])
    }
  }, [user])

  useEffect(() => {
    console.log("🔄 UserProvider initializing")
    let mounted = true

    async function initUser() {
      try {
        console.log("🔍 Fetching current user and verification status...")
        const currentUser = await authService.getCurrentUser()

        if (!mounted) return

        if (currentUser) {
          console.log("✅ User authenticated:", currentUser.email)
          console.log("📧 Email confirmed at:", currentUser.email_confirmed_at)

          const verified = !!currentUser.email_confirmed_at
          console.log("🔐 Email verification status:", verified)

          setAuthUser(currentUser)
          setIsEmailVerified(verified)

          const profile = await authService.getUserProfile(currentUser.id)

          if (!profile) {
            console.log("⚠️ No profile found, will be created on first need")
          }

          if (!mounted) return

          if (profile) {
            console.log("✅ Profile loaded:", {
              id: profile.id,
              email: profile.email,
              firstName: profile.firstName,
              lastName: profile.lastName,
              verified: verified,
            })
            setUser(profile)
            const vehicles = await vehicleService.getUserVehicles(currentUser.id)
            if (mounted) {
              setListedVehicles(vehicles)
            }
            // NEW: Load saved vehicles when user logs in
            if (mounted) {
              await loadSavedVehicles()
            }
          } else {
            console.log("⚠️ Using fallback profile")
            setUser({
              id: currentUser.id,
              email: currentUser.email!,
              firstName: "",
              lastName: "",
              loginMethod: "email",
            })
          }
        } else {
          console.log("⚠️ No authenticated user")
          setAuthUser(null)
          setIsEmailVerified(false)
        }
      } catch (error) {
        console.error("❌ Error initializing user:", error)
      } finally {
        if (mounted) {
          console.log("✅ UserProvider initialization complete")
          setIsLoading(false)
        }
      }
    }

    initUser()

    const unsubscribe = authService.onAuthStateChange(async (newAuthUser) => {
      if (!mounted) return

      if (newAuthUser) {
        console.log("🔄 Auth state changed - user signed in:", newAuthUser.email)
        console.log("📧 Email confirmed at:", newAuthUser.email_confirmed_at)

        const verified = !!newAuthUser.email_confirmed_at
        console.log("🔐 Email verification status on auth change:", verified)

        setAuthUser(newAuthUser)
        setIsEmailVerified(verified)

        const profile = await authService.getUserProfile(newAuthUser.id)

        if (!profile) {
          console.log("⚠️ No profile found on auth change")
        }

        if (!mounted) return

        if (profile) {
          console.log("✅ Profile loaded on auth change:", {
            id: profile.id,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            verified: verified,
          })
          setUser(profile)
          const vehicles = await vehicleService.getUserVehicles(newAuthUser.id)
          if (mounted) {
            setListedVehicles(vehicles)
          }
          // NEW: Load saved vehicles on auth state change
          if (mounted) {
            await loadSavedVehicles()
          }
        } else {
          console.log("⚠️ Using fallback profile on auth change")
          setUser({
            id: newAuthUser.id,
            email: newAuthUser.email!,
            firstName: "",
            lastName: "",
            loginMethod: "email",
          })
        }
      } else {
        console.log("🔄 Auth state changed - user signed out")
        setAuthUser(null)
        setIsEmailVerified(false)
        setUser(null)
        setListedVehicles([])
        setSavedVehicles(new Set())
      }
      setIsLoading(false)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [loadSavedVehicles]) // NEW: Added dependency

  // NEW: Load saved vehicles when user changes
  useEffect(() => {
    if (user?.id) {
      loadSavedVehicles()
    } else {
      setSavedVehicles(new Set())
    }
  }, [user?.id, loadSavedVehicles])

  const logout = async () => {
    try {
      console.log("👋 Logging out user")
      await authService.signOut()
      setAuthUser(null)
      setIsEmailVerified(false)
      setUser(null)
      setListedVehicles([])
      setSavedVehicles(new Set())
      router.push("/home")
    } catch (error) {
      console.error("❌ Error logging out:", error)
    }
  }

  const forceLogoutAll = async () => {
    try {
      console.log("🚨 Force logging out all users")
      sessionStorage.setItem("force_logout_all", "true")
      await authService.signOut()
      setAuthUser(null)
      setIsEmailVerified(false)
      setUser(null)
      setListedVehicles([])
      setSavedVehicles(new Set())
      window.location.href = "/home"
    } catch (error) {
      console.error("❌ Error in forceLogoutAll:", error)
      window.location.href = "/home"
    }
  }

  const addListedVehicle = async (vehicleData: VehicleFormData) => {
    if (!user) {
      console.error("❌ Cannot add vehicle: No user logged in")
      throw new Error("User not authenticated")
    }

    if (!isEmailVerified) {
      console.error("❌ Cannot add vehicle: Email not verified")
      console.error("🔍 Debug - authUser:", authUser)
      console.error("🔍 Debug - email_confirmed_at:", authUser?.email_confirmed_at)
      throw new Error("Email not verified")
    }

    try {
      console.log("➕ Adding new vehicle")
      const newVehicle = await vehicleService.createVehicle(vehicleData, user.id)
      setListedVehicles((prev) => [newVehicle, ...(Array.isArray(prev) ? prev : [])])
      console.log("✅ Vehicle added successfully")
    } catch (error) {
      console.error("❌ Error adding vehicle:", error)
      throw error
    }
  }

  const updateListedVehicle = async (vehicleId: string, vehicleData: Partial<VehicleFormData>) => {
    if (!user) {
      console.error("❌ Cannot update vehicle: No user logged in")
      throw new Error("User not authenticated")
    }

    if (!isEmailVerified) {
      console.error("❌ Cannot update vehicle: Email not verified")
      throw new Error("Email not verified")
    }

    try {
      console.log("📝 Updating vehicle:", vehicleId)
      const updatedVehicle = await vehicleService.updateVehicle(vehicleId, vehicleData, user.id)

      setListedVehicles((prev) => {
        const prevArray = Array.isArray(prev) ? prev : []
        return prevArray.map((v) => (v.id === vehicleId ? updatedVehicle : v))
      })

      console.log("✅ Vehicle updated successfully")
      await refreshVehicles()
    } catch (error) {
      console.error("❌ Error updating vehicle:", error)
      throw error
    }
  }

  const deleteListedVehicle = async (vehicleId: string) => {
    if (!user) {
      console.error("❌ Cannot delete vehicle: No user logged in")
      throw new Error("User not authenticated")
    }

    try {
      console.log("🗑️ Deleting vehicle from context:", vehicleId)

      setListedVehicles((prev) => {
        const prevArray = Array.isArray(prev) ? prev : []
        return prevArray.filter((v) => v.id !== vehicleId)
      })

      const success = await vehicleService.deleteVehicle(vehicleId, user.id)

      if (!success) {
        console.error("❌ Failed to delete vehicle")
        await refreshVehicles()
        throw new Error("Failed to delete vehicle")
      }

      console.log("✅ Vehicle deleted successfully from database")
      await refreshVehicles()
    } catch (error) {
      console.error("❌ Error deleting vehicle:", error)
      await refreshVehicles()
      throw error
    }
  }

  // UPDATED: toggleSaveVehicle now persists to database
  const toggleSaveVehicle = async (vehicle: Vehicle) => {
    if (!user?.id) {
      console.error("❌ Cannot save vehicle: No user logged in")
      alert("Please log in to save vehicles")
      return
    }

    const isCurrentlySaved = savedVehicles.has(vehicle.id)

    try {
      if (isCurrentlySaved) {
        console.log("❌ Unsaving vehicle from database:", vehicle.id)
        const success = await vehicleService.unsaveVehicle(user.id, vehicle.id)
        if (success) {
          setSavedVehicles(prev => {
            const newSet = new Set(prev)
            newSet.delete(vehicle.id)
            return newSet
          })
          console.log("✅ Vehicle unsaved successfully")
        } else {
          console.error("❌ Failed to unsave vehicle from database")
          alert("Failed to unsave vehicle. Please try again.")
        }
      } else {
        console.log("💾 Saving vehicle to database:", vehicle.id)
        const success = await vehicleService.saveVehicle(user.id, vehicle.id)
        if (success) {
          setSavedVehicles(prev => {
            const newSet = new Set(prev)
            newSet.add(vehicle.id)
            return newSet
          })
          console.log("✅ Vehicle saved successfully")
        } else {
          console.error("❌ Failed to save vehicle to database")
          alert("Failed to save vehicle. Please try again.")
        }
      }
    } catch (error) {
      console.error("❌ Error toggling save vehicle:", error)
      alert("Failed to save vehicle. Please try again.")
    }
  }

  const value: UserContextType = {
    user,
    authUser,
    isEmailVerified,
    listedVehicles: Array.isArray(listedVehicles) ? listedVehicles : [],
    savedVehicles,
    isLoading,
    setUser,
    logout,
    forceLogoutAll,
    addListedVehicle,
    updateListedVehicle,
    deleteListedVehicle,
    toggleSaveVehicle,
    refreshVehicles,
    refreshUserProfile,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
