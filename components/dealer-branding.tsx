'use client'

import React from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Star, MapPin, Package } from 'lucide-react'
import type { DealerProfile } from '@/types/admin'

interface DealerBrandingProps {
  dealer: DealerProfile
  compact?: boolean
  showInventory?: number
  showRating?: boolean
}

export function DealerBranding({
  dealer,
  compact = false,
  showInventory,
  showRating = true,
}: DealerBrandingProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {dealer.logo_url && (
          <div className="relative w-6 h-6 flex-shrink-0">
            <Image
              src={dealer.logo_url}
              alt={dealer.business_name}
              fill
              className="object-contain"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 truncate">{dealer.business_name}</p>
          {showRating && dealer.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star size={12} className="text-yellow-500 fill-yellow-500" />
              <span className="text-xs text-gray-600">{dealer.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        {dealer.status === 'approved' && (
          <Badge className="text-xs" variant="default">
            Verified
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-gradient-to-br from-gray-50 to-white">
      {/* Dealer Banner */}
      {dealer.banner_url && (
        <div className="relative w-full h-32 rounded-lg overflow-hidden">
          <Image
            src={dealer.banner_url}
            alt={`${dealer.business_name} banner`}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Dealer Header */}
      <div className="flex items-start gap-3">
        {dealer.logo_url && (
          <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden border-2 border-white shadow-sm">
            <Image
              src={dealer.logo_url}
              alt={dealer.business_name}
              fill
              className="object-contain bg-white"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-lg text-gray-900">{dealer.business_name}</h3>
            {dealer.status === 'approved' && (
              <Badge className="text-xs" variant="default">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-white rounded-full" />
                  Verified Dealer
                </div>
              </Badge>
            )}
          </div>
          {showRating && dealer.rating > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={`${
                      i < Math.round(dealer.rating)
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-gray-700">
                {dealer.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Dealer Info */}
      {dealer.description && (
        <p className="text-sm text-gray-600 line-clamp-2">{dealer.description}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t">
        {showInventory !== undefined && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm font-semibold text-gray-900">
              <Package size={16} />
              {showInventory}
            </div>
            <p className="text-xs text-gray-600 mt-1">In Stock</p>
          </div>
        )}
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-900">
            {dealer.status === 'approved' ? '✓' : '−'}
          </div>
          <p className="text-xs text-gray-600 mt-1">Verified</p>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-900">24/7</div>
          <p className="text-xs text-gray-600 mt-1">Support</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Show dealer badge on vehicle card
 */
export function DealerBadge({ dealer }: { dealer: DealerProfile }) {
  if (!dealer) return null

  return (
    <div className="absolute top-3 right-3 z-10">
      <Badge
        className="bg-white text-gray-900 hover:bg-gray-100 flex items-center gap-1 shadow-lg"
        variant="outline"
      >
        {dealer.logo_url && (
          <div className="relative w-4 h-4">
            <Image
              src={dealer.logo_url}
              alt={dealer.business_name}
              fill
              className="object-contain"
            />
          </div>
        )}
        <span className="text-xs font-semibold">{dealer.business_name}</span>
      </Badge>
    </div>
  )
}

export default DealerBranding
