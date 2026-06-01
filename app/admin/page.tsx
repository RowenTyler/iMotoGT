'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSuperAdminCheck } from '@/hooks/use-admin'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, BarChart3, BookOpen, Users, Building2, Settings } from 'lucide-react'

export default function AdminDashboard() {
  const router = useRouter()
  const { isSuperAdmin, isLoading } = useSuperAdminCheck()
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      router.push('/403')
    }
  }, [isSuperAdmin, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!isSuperAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Platform control center and analytics</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 size={16} />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="blog" className="flex items-center gap-2">
              <BookOpen size={16} />
              <span className="hidden sm:inline">Blog</span>
            </TabsTrigger>
            <TabsTrigger value="dealers" className="flex items-center gap-2">
              <Building2 size={16} />
              <span className="hidden sm:inline">Dealers</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users size={16} />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings size={16} />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Analytics Overview */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="p-6 space-y-2">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold">0</p>
                <p className="text-xs text-gray-500">Fetching data...</p>
              </Card>
              <Card className="p-6 space-y-2">
                <p className="text-sm font-medium text-gray-600">Active Vehicles</p>
                <p className="text-3xl font-bold">0</p>
                <p className="text-xs text-gray-500">Fetching data...</p>
              </Card>
              <Card className="p-6 space-y-2">
                <p className="text-sm font-medium text-gray-600">Published Blogs</p>
                <p className="text-3xl font-bold">0</p>
                <p className="text-xs text-gray-500">Fetching data...</p>
              </Card>
              <Card className="p-6 space-y-2">
                <p className="text-sm font-medium text-gray-600">Approved Dealers</p>
                <p className="text-3xl font-bold">0</p>
                <p className="text-xs text-gray-500">Fetching data...</p>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Platform Metrics</h3>
              <div className="space-y-4">
                <div className="text-center text-gray-500 py-8">
                  <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Analytics dashboard coming soon</p>
                  <p className="text-sm">Real-time charts and metrics will be displayed here</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Blog Management */}
          <TabsContent value="blog" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Blog Management</h2>
              <Button onClick={() => router.push('/admin/blog/new')}>
                Create Blog Post
              </Button>
            </div>

            <Card className="p-6">
              <div className="space-y-4">
                <div className="text-center text-gray-500 py-8">
                  <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Blog management interface</p>
                  <p className="text-sm">Manage all blog posts, categories, and content</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Dealer Management */}
          <TabsContent value="dealers" className="space-y-6">
            <h2 className="text-xl font-semibold">Dealer Management</h2>

            <Card className="p-6">
              <div className="space-y-4">
                <div className="text-center text-gray-500 py-8">
                  <Building2 size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Dealer approval center</p>
                  <p className="text-sm">Review and manage dealer applications and profiles</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* User Management */}
          <TabsContent value="users" className="space-y-6">
            <h2 className="text-xl font-semibold">User Management</h2>

            <Card className="p-6">
              <div className="space-y-4">
                <div className="text-center text-gray-500 py-8">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p>User management interface</p>
                  <p className="text-sm">Manage user accounts, roles, and permissions</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-xl font-semibold">Platform Settings</h2>

            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">Coming Soon</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Platform configuration and advanced settings will be available here
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
