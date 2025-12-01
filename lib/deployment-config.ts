/**
 * Deployment configuration and environment validation
 */

interface DeploymentConfig {
  supabase: {
    url: string
    anonKey: string
    serviceRoleKey?: string
  }
  app: {
    url: string
    environment: "development" | "staging" | "production"
  }
  features: {
    realTimeUpdates: boolean
    socialAuth: boolean
    imageUpload: boolean
  }
}

function validateEnvironmentVariable(name: string, value: string | undefined, fallback?: string): string {
  if (!value && !fallback) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value || fallback!
}

export const deploymentConfig: DeploymentConfig = {
  supabase: {
    url: validateEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "https://mwzrrrnmtyiyrwdqhcqb.supabase.co",
    ),
    anonKey: validateEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13enJycm5tdHlpeXJ3ZHFoY3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2Njk5ODcsImV4cCI6MjA3ODI0NTk4N30.wvie8EDvjfuRUhpNyrrTpv_vA7lbZDkrsz-yll2znPE",
    ),
    serviceRoleKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13enJycm5tdHlpeXJ3ZHFoY3FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjY2OTk4NywiZXhwIjoyMDc4MjQ1OTg3fQ.1ukV6V_tIpT0eg_UNo4WrLSBr_xPLhmlCI72b5HXApQ",
  },
  app: {
    url:
      process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000",
    environment: (process.env.NODE_ENV as any) || "development",
  },
  features: {
    realTimeUpdates: process.env.NEXT_PUBLIC_ENABLE_REALTIME !== "false",
    socialAuth: process.env.NEXT_PUBLIC_ENABLE_SOCIAL_AUTH !== "false",
    imageUpload: process.env.NEXT_PUBLIC_ENABLE_IMAGE_UPLOAD !== "false",
  },
}

export function validateDeploymentConfig() {
  const errors: string[] = []

  // Validate Supabase configuration
  try {
    new URL(deploymentConfig.supabase.url)
  } catch {
    errors.push("Invalid NEXT_PUBLIC_SUPABASE_URL")
  }

  if (deploymentConfig.supabase.anonKey.length < 32) {
    errors.push("Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  // Validate app URL in production
  if (deploymentConfig.app.environment === "production") {
    try {
      const url = new URL(deploymentConfig.app.url)
      if (url.protocol !== "https:") {
        errors.push("Production app URL must use HTTPS")
      }
    } catch {
      errors.push("Invalid app URL configuration")
    }
  }

  if (errors.length > 0) {
    throw new Error(`Deployment configuration errors:\n${errors.join("\n")}`)
  }

  return true
}

// Validate configuration on import (server-side only)
if (typeof window === "undefined") {
  try {
    validateDeploymentConfig()
    console.log("✅ Deployment configuration validated successfully")
  } catch (error) {
    console.error("❌ Deployment configuration validation failed:", error)
    if (deploymentConfig.app.environment === "production") {
      process.exit(1)
    }
  }
}
