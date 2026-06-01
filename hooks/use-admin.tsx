/**
 * Admin access hooks
 * Provides role checking and permission verification hooks
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isUserSuperAdmin, isUserAdmin, getUserRole, userHasPermission } from '@/lib/admin-service'
import type { UserRole } from '@/types/admin'

/**
 * Hook to check if user is super admin
 */
export function useSuperAdminCheck() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setIsSuperAdmin(false)
          setIsLoading(false)
          return
        }

        const result = await isUserSuperAdmin(user.id)
        setIsSuperAdmin(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check admin status')
        setIsSuperAdmin(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkSuperAdmin()
  }, [])

  return { isSuperAdmin, isLoading, error }
}

/**
 * Hook to check if user is any admin (Super Admin or Admin)
 */
export function useAdminCheck() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setIsAdmin(false)
          setIsLoading(false)
          return
        }

        const result = await isUserAdmin(user.id)
        setIsAdmin(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check admin status')
        setIsAdmin(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAdmin()
  }, [])

  return { isAdmin, isLoading, error }
}

/**
 * Hook to get user's role
 */
export function useUserRole() {
  const [role, setRole] = useState<UserRole>('USER')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setRole('USER')
          setIsLoading(false)
          return
        }

        const result = await getUserRole(user.id)
        setRole(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user role')
        setRole('USER')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRole()
  }, [])

  return { role, isLoading, error }
}

/**
 * Hook to check if user has a specific permission
 */
export function usePermission(permission: string) {
  const [hasPermission, setHasPermission] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setHasPermission(false)
          setIsLoading(false)
          return
        }

        const result = await userHasPermission(user.id, permission as any)
        setHasPermission(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check permission')
        setHasPermission(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkPermission()
  }, [permission])

  return { hasPermission, isLoading, error }
}

/**
 * HOC to protect routes with super admin access
 */
export function withSuperAdminProtection<P extends object>(
  Component: React.ComponentType<P>
) {
  return function ProtectedComponent(props: P) {
    const router = useRouter()
    const { isSuperAdmin, isLoading } = useSuperAdminCheck()

    useEffect(() => {
      if (!isLoading && !isSuperAdmin) {
        router.push('/403')
      }
    }, [isSuperAdmin, isLoading, router])

    if (isLoading) {
      return <div className="flex items-center justify-center min-h-screen">Loading...</div>
    }

    if (!isSuperAdmin) {
      return null
    }

    return <Component {...props} />
  }
}

/**
 * HOC to protect routes with admin access
 */
export function withAdminProtection<P extends object>(
  Component: React.ComponentType<P>
) {
  return function ProtectedComponent(props: P) {
    const router = useRouter()
    const { isAdmin, isLoading } = useAdminCheck()

    useEffect(() => {
      if (!isLoading && !isAdmin) {
        router.push('/403')
      }
    }, [isAdmin, isLoading, router])

    if (isLoading) {
      return <div className="flex items-center justify-center min-h-screen">Loading...</div>
    }

    if (!isAdmin) {
      return null
    }

    return <Component {...props} />
  }
}
