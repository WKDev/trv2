import { useRef, useCallback } from 'react'

/**
 * 디바운싱 유틸리티 함수
 * @param func 디바운싱할 함수
 * @param delay 지연 시간 (밀리초)
 * @returns 디바운싱된 함수
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}

/**
 * React에서 사용할 수 있는 디바운싱 훅
 * @param callback 디바운싱할 콜백 함수
 * @param delay 지연 시간 (밀리초)
 * @returns 디바운싱된 콜백 함수
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay])
}
