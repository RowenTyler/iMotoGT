'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function AccessDenied() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-red-100 rounded-full p-6">
            <AlertCircle size={48} className="text-red-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">403</h1>
          <h2 className="text-2xl font-semibold text-gray-800">Access Denied</h2>
          <p className="text-gray-600">
            You don't have permission to access this resource. This page is restricted to authorized administrators only.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            variant="default"
            size="lg"
            onClick={() => router.push('/')}
            className="w-full"
          >
            Go to Homepage
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => router.back()}
            className="w-full"
          >
            Go Back
          </Button>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            If you believe you should have access, please contact support.
          </p>
        </div>
      </div>
    </div>
  )
}
