"use client"

import { useState, useEffect } from "react"

/**
 * Returns a debounced version of `value` that only updates
 * after `delay` ms of inactivity. Used for search inputs.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState("")
 * const debouncedSearchTerm = useDebounce(searchTerm, 250)
 *
 * useEffect(() => {
 *   // This will only run 250ms after the user stops typing
 *   if (debouncedSearchTerm) {
 *     fetchResults(debouncedSearchTerm)
 *   }
 * }, [debouncedSearchTerm])
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clean up the timer if value changes before delay expires
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}