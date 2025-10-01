"use client"

import { useState, useEffect, useRef } from "react"

interface UseLocalStorageOptions<T> {
  key: string
  defaultValue: T
  debounceMs?: number
}

/**
 * Custom hook for localStorage with debouncing
 * @param key - localStorage key
 * @param defaultValue - default value if localStorage is empty
 * @param debounceMs - debounce delay in milliseconds (default: 100ms)
 */
export function useLocalStorage<T>({ key, defaultValue, debounceMs = 100 }: UseLocalStorageOptions<T>) {
  // Initialize state with value from localStorage or default
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return defaultValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : defaultValue
    } catch (error) {
      console.warn(`Error loading localStorage key "${key}":`, error)
      return defaultValue
    }
  })

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Save to localStorage with debouncing
  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout to save after debounce delay
    timeoutRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        console.warn(`Error saving localStorage key "${key}":`, error)
      }
    }, debounceMs)

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [key, value, debounceMs])

  return [value, setValue] as const
}
