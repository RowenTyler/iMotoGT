"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"  // ← cookie‑based client
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { UserProfile } from "@/types/user"

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void
  onSignUpSuccess: (user: UserProfile) => void
  onCancel: () => void
  loginContext?: string
}

export default function LoginPage({
  onLoginSuccess,
  onSignUpSuccess,
  onCancel,
}: LoginPageProps) {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Build UserProfile from user metadata
      const userProfile: UserProfile = {
        id: data.user.id,
        email: data.user.email || "",
        firstName: data.user.user_metadata?.first_name || "",
        lastName: data.user.user_metadata?.last_name || "",
        profilePic: data.user.user_metadata?.avatar_url || "",
      }
      onLoginSuccess(userProfile)
    }
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const userProfile: UserProfile = {
        id: data.user.id,
        email: data.user.email || "",
        firstName,
        lastName,
        profilePic: "",
      }
      onSignUpSuccess(userProfile)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md p-8 rounded-3xl">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 text-center font-medium rounded-full transition ${
              isLogin
                ? "bg-[#FF6700] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 text-center font-medium rounded-full transition ${
              !isLogin
                ? "bg-[#FF6700] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={isLogin ? handleLogin : handleSignUp} className="space-y-4">
          {!isLogin && (
            <>
              <Input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </>
          )}

          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {!isLogin && (
            <Input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF6700] hover:bg-[#FF6700]/90 text-white"
          >
            {loading ? "Processing..." : isLogin ? "Login" : "Sign Up"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full"
          >
            Cancel
          </Button>
        </form>
      </Card>
    </div>
  )
}