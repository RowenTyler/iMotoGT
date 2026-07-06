"use client"

import { useRouter } from "next/navigation"
import LoginPage from "@/components/login-page"
import type { UserProfile } from "@/types/user"

export default function LoginClientPage() {
  const router = useRouter()

  const handleLoginSuccess = (userData: UserProfile) => {
    router.push("/dashboard")
  }

  const handleSignUpSuccess = (userData: UserProfile) => {
    router.push("/dashboard?signup=true")
  }

  const handleCancel = () => {
    router.push("/home")
  }

  return (
    <LoginPage
      onLoginSuccess={handleLoginSuccess}
      onSignUpSuccess={handleSignUpSuccess}
      onCancel={handleCancel}
      loginContext="default"
    />
  )
}