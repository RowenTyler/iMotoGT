'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSuperAdminCheck } from '@/hooks/use-admin'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  approveDealerApplication,
  rejectDealerApplication,
  suspendDealer,
  restoreDealer,
} from '@/lib/admin-service'
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import type { DealerApplication, DealerProfile } from '@/types/admin'

export default function DealerApprovalCenter() {
  const router = useRouter()
  const { isSuperAdmin, isLoading } = useSuperAdminCheck()

  const [applications, setApplications] = useState<DealerApplication[]>([])
  const [dealers, setDealers] = useState<DealerProfile[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedApp, setSelectedApp] = useState<DealerApplication | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectDialog, setShowRejectDialog] = useState(false)

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      router.push('/403')
    }
  }, [isSuperAdmin, isLoading, router])

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData()
    }
  }, [isSuperAdmin])

  const fetchData = async () => {
    try {
      setIsLoadingData(true)
      // Fetch applications and dealers
      // In a real app, these would be API calls
      setApplications([])
      setDealers([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleApprove = async (app: DealerApplication) => {
    setIsApproving(true)
    try {
      const result = await approveDealerApplication(app.id, app.business_name, app.owner_id)

      if (result.success) {
        setApplications(applications.filter((a) => a.id !== app.id))
        setSelectedApp(null)
      } else {
        setError(result.error || 'Failed to approve application')
      }
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!selectedApp) return

    setIsApproving(true)
    try {
      const result = await rejectDealerApplication(selectedApp.id, rejectionReason)

      if (result.success) {
        setApplications(applications.filter((a) => a.id !== selectedApp.id))
        setShowRejectDialog(false)
        setRejectionReason('')
        setSelectedApp(null)
      } else {
        setError(result.error || 'Failed to reject application')
      }
    } finally {
      setIsApproving(false)
    }
  }

  const handleSuspend = async (dealerId: string) => {
    try {
      const result = await suspendDealer(dealerId)

      if (result.success) {
        await fetchData()
      } else {
        setError(result.error || 'Failed to suspend dealer')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleRestore = async (dealerId: string) => {
    try {
      const result = await restoreDealer(dealerId)

      if (result.success) {
        await fetchData()
      } else {
        setError(result.error || 'Failed to restore dealer')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  if (!isLoading && !isSuperAdmin) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="gap-2"
              >
                <ArrowLeft size={16} />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dealer Management</h1>
                <p className="text-sm text-gray-600">Review and manage dealer applications</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="applications">
              Pending Applications ({applications.filter((a) => a.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved Dealers ({dealers.filter((d) => d.status === 'approved').length})
            </TabsTrigger>
            <TabsTrigger value="suspended">
              Suspended ({dealers.filter((d) => d.status === 'suspended').length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Applications */}
          <TabsContent value="applications" className="space-y-4">
            {isLoadingData ? (
              <Card className="p-8 text-center">
                <Loader2 className="mx-auto animate-spin mb-2" />
                <p className="text-gray-600">Loading applications...</p>
              </Card>
            ) : applications.filter((a) => a.status === 'pending').length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle className="mx-auto mb-2 text-green-600" size={32} />
                <p className="text-gray-600">No pending applications</p>
              </Card>
            ) : (
              applications
                .filter((a) => a.status === 'pending')
                .map((app) => (
                  <Card key={app.id} className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold">{app.business_name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Applied: {new Date(app.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">Pending Review</Badge>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleApprove(app)}
                        disabled={isApproving}
                        className="gap-2"
                      >
                        <CheckCircle size={16} />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setSelectedApp(app)
                          setShowRejectDialog(true)
                        }}
                        disabled={isApproving}
                        className="gap-2"
                      >
                        <XCircle size={16} />
                        Reject
                      </Button>
                    </div>
                  </Card>
                ))
            )}
          </TabsContent>

          {/* Approved Dealers */}
          <TabsContent value="approved" className="space-y-4">
            {isLoadingData ? (
              <Card className="p-8 text-center">
                <Loader2 className="mx-auto animate-spin mb-2" />
                <p className="text-gray-600">Loading dealers...</p>
              </Card>
            ) : dealers.filter((d) => d.status === 'approved').length === 0 ? (
              <Card className="p-8 text-center">
                <AlertCircle className="mx-auto mb-2 text-gray-400" size={32} />
                <p className="text-gray-600">No approved dealers</p>
              </Card>
            ) : (
              dealers
                .filter((d) => d.status === 'approved')
                .map((dealer) => (
                  <Card key={dealer.id} className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold">{dealer.business_name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Approved: {new Date(dealer.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Verified</Badge>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleSuspend(dealer.id)}
                      >
                        Suspend
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => router.push(`/admin/dealers/${dealer.id}`)}>
                        View Details
                      </Button>
                    </div>
                  </Card>
                ))
            )}
          </TabsContent>

          {/* Suspended Dealers */}
          <TabsContent value="suspended" className="space-y-4">
            {isLoadingData ? (
              <Card className="p-8 text-center">
                <Loader2 className="mx-auto animate-spin mb-2" />
                <p className="text-gray-600">Loading dealers...</p>
              </Card>
            ) : dealers.filter((d) => d.status === 'suspended').length === 0 ? (
              <Card className="p-8 text-center">
                <AlertCircle className="mx-auto mb-2 text-gray-400" size={32} />
                <p className="text-gray-600">No suspended dealers</p>
              </Card>
            ) : (
              dealers
                .filter((d) => d.status === 'suspended')
                .map((dealer) => (
                  <Card key={dealer.id} className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold">{dealer.business_name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Suspended: {new Date(dealer.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="destructive">Suspended</Badge>
                    </div>

                    <div className="flex gap-3">
                      <Button size="sm" onClick={() => handleRestore(dealer.id)}>
                        Restore
                      </Button>
                    </div>
                  </Card>
                ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {selectedApp?.business_name}'s application
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isApproving || !rejectionReason.trim()}
            >
              {isApproving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
