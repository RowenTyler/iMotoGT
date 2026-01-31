import { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/ui/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Database, Clock, Users, Mail, Settings } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy | iMoto GT',
  description: 'Learn how iMoto GT collects, uses, and protects your personal data in compliance with GDPR.',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Privacy Policy</h1>
          <p className="mt-2 text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="space-y-6">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Introduction
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none text-muted-foreground">
              <p>
                iMoto GT (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your privacy and personal data. 
                This Privacy Policy explains how we collect, use, store, and protect your information when you use our 
                vehicle marketplace platform.
              </p>
              <p>
                We comply with the General Data Protection Regulation (GDPR) and the Protection of Personal Information 
                Act (POPIA) in South Africa. This policy applies to all users of our website and services.
              </p>
            </CardContent>
          </Card>

          {/* Data We Collect */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Data We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <div>
                <h4 className="font-medium text-foreground">Account Information</h4>
                <p className="text-sm">
                  When you create an account, we collect your email address, name, and optional profile information 
                  such as your phone number and location.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground">Vehicle Listings</h4>
                <p className="text-sm">
                  When you list a vehicle, we collect details about the vehicle including make, model, year, price, 
                  images, and contact preferences.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground">Usage Data</h4>
                <p className="text-sm">
                  We collect information about how you interact with our platform, including pages visited, 
                  searches performed, and vehicles saved to your favorites.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground">Technical Data</h4>
                <p className="text-sm">
                  We automatically collect certain technical information including your IP address, browser type, 
                  device information, and cookies necessary for the platform to function.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Your Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                How We Use Your Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <div>
                <h4 className="font-medium text-foreground">Service Delivery</h4>
                <p className="text-sm">
                  To provide and maintain our vehicle marketplace platform, process your listings, and enable 
                  communication between buyers and sellers.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground">Account Management</h4>
                <p className="text-sm">
                  To manage your account, authenticate your identity, and provide customer support when needed.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground">Platform Improvement</h4>
                <p className="text-sm">
                  To analyze usage patterns and improve our platform&apos;s functionality, performance, and user experience.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground">Legal Basis</h4>
                <p className="text-sm">
                  We process your data based on: (1) your consent, (2) contractual necessity to provide our services, 
                  (3) our legitimate interests in operating the platform, and (4) legal obligations.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Data Retention */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Data Retention
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p className="text-sm">
                We retain your personal data only for as long as necessary to fulfill the purposes for which it was 
                collected, including:
              </p>
              <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
                <li>Account data: Until you delete your account or request deletion</li>
                <li>Vehicle listings: Until the listing is removed or sold</li>
                <li>Transaction records: 7 years for legal and tax compliance</li>
                <li>Technical logs: 90 days for security and debugging purposes</li>
              </ul>
            </CardContent>
          </Card>

          {/* Third-Party Processors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Third-Party Data Processors
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p className="text-sm mb-3">
                We work with trusted third-party service providers who process data on our behalf:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li><strong>Supabase</strong> - Database hosting and authentication services (EU/US)</li>
                <li><strong>Vercel</strong> - Website hosting and content delivery (Global)</li>
              </ul>
              <p className="mt-3 text-sm">
                All third-party processors are bound by data processing agreements that ensure GDPR compliance 
                and appropriate data protection measures.
              </p>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Your Rights Under GDPR
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p className="text-sm mb-3">
                Under GDPR and POPIA, you have the following rights regarding your personal data:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li><strong>Right to Access</strong> - Request a copy of your personal data</li>
                <li><strong>Right to Rectification</strong> - Correct inaccurate or incomplete data</li>
                <li><strong>Right to Erasure</strong> - Request deletion of your personal data</li>
                <li><strong>Right to Restriction</strong> - Limit how we process your data</li>
                <li><strong>Right to Data Portability</strong> - Receive your data in a portable format</li>
                <li><strong>Right to Object</strong> - Object to processing based on legitimate interests</li>
                <li><strong>Right to Withdraw Consent</strong> - Withdraw consent at any time</li>
              </ul>
              <p className="mt-3 text-sm">
                To exercise any of these rights, please contact us using the details below.
              </p>
            </CardContent>
          </Card>

          {/* Cookies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Cookies and Local Storage
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p className="text-sm mb-3">
                We use cookies and local storage to ensure our platform functions correctly:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li><strong>Strictly Necessary</strong> - Authentication, session management, and essential caching for performance</li>
                <li><strong>Functional</strong> - Remembering your preferences and settings</li>
                <li><strong>Analytics</strong> - Understanding how users interact with our platform (when consented)</li>
                <li><strong>Marketing</strong> - Displaying relevant content (when consented)</li>
              </ul>
              <p className="mt-3 text-sm">
                You can manage your cookie preferences at any time through the cookie settings in the menu.
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p className="text-sm">
                If you have any questions about this Privacy Policy or wish to exercise your data rights, 
                please contact us:
              </p>
              <div className="mt-3 text-sm">
                <p><strong>Email:</strong> privacy@imotogt.com</p>
                <p><strong>Data Protection Officer:</strong> dpo@imotogt.com</p>
              </div>
              <p className="mt-3 text-sm">
                You also have the right to lodge a complaint with your local data protection authority if you 
                believe your rights have been violated.
              </p>
            </CardContent>
          </Card>

          {/* Back Link */}
          <div className="pt-4">
            <Link 
              href="/"
              className="text-primary hover:text-primary/80 underline underline-offset-2"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
