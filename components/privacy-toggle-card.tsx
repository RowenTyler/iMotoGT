import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Info, Lock, LockOpen } from "lucide-react"

interface PrivacyToggleCardProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  className?: string
}

export function PrivacyToggleCard({ enabled, onToggle, className }: PrivacyToggleCardProps) {
  return (
    <Card className={cn("rounded-3xl p-6 border-[#9FA791]/20 dark:border-[#4A4D45]/20", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2 text-[#3E5641] dark:text-white">
            Contact Privacy Settings
          </h3>
          <p className="text-sm text-[#6F7F69] dark:text-gray-400 mb-4">
            {enabled 
              ? "Only logged-in users can view your contact information"
              : "Anyone can view and contact you publicly"
            }
          </p>
          {/* Visual indicator */}
          <div className={`flex items-center gap-2 text-sm font-medium ${
            enabled ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"
          }`}>
            {enabled ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Only logged-in users can contact you</span>
              </>
            ) : (
              <>
                <LockOpen className="w-4 h-4" />
                <span>Users can view and contact you</span>
              </>
            )}
          </div>
        </div>
        
        {/* Toggle Switch */}
        <button
          type="button"
          onClick={() => onToggle(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-[#FF6700] dark:bg-[#FF7D33]" : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`} />
        </button>
      </div>
      
      {/* Info Tooltip */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 dark:text-blue-200">
            {enabled 
              ? "Users must log in to see your email and phone number. This helps reduce spam and unwanted contact."
              : "Your email and phone number will be visible to all visitors. You may receive more inquiries, but also more spam."
            }
          </p>
        </div>
      </div>
    </Card>
  )
}
