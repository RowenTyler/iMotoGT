import LoginClientPage from "./client-page"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Login - iMoto GT",
  alternates: {
    canonical: 'https://imoto-gt.co.za/login',
  },
}

export const dynamic = 'force-dynamic'

export default function LoginPageRoute() {
  return <LoginClientPage />
}
