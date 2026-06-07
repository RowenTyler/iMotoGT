// components/email-verification-banner.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Mail, RefreshCw, X } from 'lucide-react';

interface EmailVerificationBannerProps {
  isEmailVerified: boolean;
  userEmail?: string;
}

export default function EmailVerificationBanner({ isEmailVerified, userEmail }: EmailVerificationBannerProps) {
  const [visible, setVisible] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredRef = useRef(false);
  const supabase = createClient();

  // Clear timeout helper
  const clearReminderTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Handle dismiss
  const handleDismiss = () => {
    clearReminderTimeout();
    setVisible(false);
  };

  // Handle resend
  const handleResend = async () => {
    if (!userEmail) return;
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      });
      if (error) throw error;
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err) {
      console.error('Failed to resend verification email:', err);
      alert('Failed to resend verification email. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  // Manage timer based on verification status and visibility
  useEffect(() => {
    // If email is already verified, ensure banner is hidden and clear any pending timer
    if (isEmailVerified) {
      clearReminderTimeout();
      setVisible(false);
      hasTriggeredRef.current = false;
      return;
    }

    // If email is not verified, but we haven't started the timer yet and banner is not visible
    if (!hasTriggeredRef.current && !visible && userEmail) {
      hasTriggeredRef.current = true;
      clearReminderTimeout(); // Clear any existing just in case
      timeoutRef.current = setTimeout(() => {
        setVisible(true);
      }, 5 * 60 * 1000); // 5 minutes
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      clearReminderTimeout();
    };
  }, [isEmailVerified, userEmail, visible]);

  // If banner is not visible, render nothing
  if (!visible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <div className="bg-white dark:bg-[#2A352A] border-l-8 border-[#FF6700] rounded-3xl shadow-lg p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Mail className="h-5 w-5 text-[#FF6700] flex-shrink-0" />
          <div className="text-gray-800 dark:text-gray-200 text-sm">
            <span className="font-medium">Please verify your email</span>
            <span className="ml-1">
              — we sent a link to <strong className="font-medium">{userEmail}</strong>.
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {resendSuccess && (
            <span className="text-xs text-green-600 dark:text-green-400 self-center mr-1">
              Sent!
            </span>
          )}
          <button
            onClick={handleResend}
            disabled={isResending}
            className="px-3 py-1 text-sm font-medium text-[#FF6700] border border-[#FF6700] rounded-full hover:bg-orange-50 dark:hover:bg-[#FF6700]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {isResending ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Sending...
              </>
            ) : (
              <>Resend</>
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}