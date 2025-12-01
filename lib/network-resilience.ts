/**
 * Network Resilience Utilities
 * Provides retry logic with exponential backoff for handling network failures
 */

interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
}

/**
 * Wraps fetch requests with exponential backoff retry logic
 * Retries on network errors, timeouts, and specific HTTP status codes
 */
export async function fetchWithRetry(url: string, options: RequestInit & RetryOptions = {}): Promise<Response> {
  const {
    maxRetries = DEFAULT_RETRY_OPTIONS.maxRetries,
    initialDelay = DEFAULT_RETRY_OPTIONS.initialDelay,
    maxDelay = DEFAULT_RETRY_OPTIONS.maxDelay,
    ...fetchOptions
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= (maxRetries || 3); attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Don't retry on 4xx errors (except 408, 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
        return response
      }

      // Retry on 5xx errors, 408 (timeout), 429 (rate limit)
      if (response.status >= 500 || response.status === 408 || response.status === 429) {
        if (attempt < (maxRetries || 3)) {
          const delay = Math.min(initialDelay! * Math.pow(2, attempt), maxDelay!)
          console.warn(`[Network] Retrying request to ${url} after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
      }

      return response
    } catch (error) {
      lastError = error as Error

      // Check if it's a network error or abort
      if (
        error instanceof TypeError &&
        (error.message.includes("Failed to fetch") || error.message.includes("aborted"))
      ) {
        if (attempt < (maxRetries || 3)) {
          const delay = Math.min(initialDelay! * Math.pow(2, attempt), maxDelay!)
          console.warn(
            `[Network] Network error, retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries}): ${error.message}`,
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
      }

      if (attempt === (maxRetries || 3)) {
        throw error
      }
    }
  }

  throw lastError || new Error("Failed to fetch after maximum retries")
}

/**
 * Checks if the browser is currently online
 */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine
}

/**
 * Wraps async operations with network status checking
 */
export async function withNetworkCheck<T>(operation: () => Promise<T>): Promise<T> {
  if (!isOnline()) {
    throw new Error("Network connection unavailable. Please check your internet connection.")
  }

  return operation()
}
