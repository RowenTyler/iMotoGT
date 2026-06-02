import UpgradeClientPage from "./client-page"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Upgrade Your Plan - iMoto GT",
  alternates: {
    canonical: 'https://imoto-gt.co.za/upgrade',
  },
}

export default function UpgradePage() {
  return <UpgradeClientPage />
}
