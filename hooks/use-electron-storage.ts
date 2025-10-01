"use client"

import { useState, useEffect, useRef } from "react"

// TODO: Electron IPC 타입 정의
// Electron 메인 프로세스와 통신하기 위한 타입을 정의합니다.
// 예시:
// interface ElectronAPI {
//   getSetting: (key: string) => Promise<any>
//   setSetting: (key: string, value: any) => Promise<void>
// }
// declare global {
//   interface Window {
//     electronAPI?: ElectronAPI
//   }
// }

interface UseElectronStorageOptions<T> {
  key: string
  defaultValue: T
  debounceMs?: number
}

/**
 * Electron 렌더러 프로세스와 통신하여 설정값을 저장/불러오는 Hook
 *
 * 현재는 웹 개발 환경이므로 localStorage를 fallback으로 사용합니다.
 * Electron 환경에서는 window.electronAPI를 통해 메인 프로세스와 통신합니다.
 *
 * @param key - 저장할 설정의 고유 키
 * @param defaultValue - 설정이 없을 때 사용할 기본값
 * @param debounceMs - 저장 시 디바운스 지연 시간 (기본값: 100ms)
 */
export function useElectronStorage<T>({
  key,
  defaultValue,
  debounceMs = 100,
}: UseElectronStorageOptions<T>): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(defaultValue)
  const [isInitialized, setIsInitialized] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  // 초기 로드: Electron 또는 localStorage에서 값을 불러옵니다
  useEffect(() => {
    const loadValue = async () => {
      try {
        // TODO: Electron 환경 체크 및 IPC 통신
        // if (window.electronAPI) {
        //   const storedValue = await window.electronAPI.getSetting(key)
        //   if (storedValue !== undefined && storedValue !== null) {
        //     setValue(storedValue)
        //   }
        // } else {
        //   // Fallback to localStorage for web development
        //   const storedValue = localStorage.getItem(key)
        //   if (storedValue !== null) {
        //     setValue(JSON.parse(storedValue))
        //   }
        // }

        // 현재는 웹 개발 환경이므로 localStorage 사용
        const storedValue = localStorage.getItem(key)
        if (storedValue !== null) {
          setValue(JSON.parse(storedValue))
        }
      } catch (error) {
        console.error(`[useElectronStorage] Failed to load value for key "${key}":`, error)
      } finally {
        setIsInitialized(true)
      }
    }

    loadValue()
  }, [key])

  // 값 변경 시 저장 (디바운스 적용)
  useEffect(() => {
    if (!isInitialized) return

    // 이전 타이머 취소
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // 디바운스 타이머 설정
    timeoutRef.current = setTimeout(async () => {
      try {
        // TODO: Electron 환경 체크 및 IPC 통신
        // if (window.electronAPI) {
        //   await window.electronAPI.setSetting(key, value)
        // } else {
        //   // Fallback to localStorage for web development
        //   localStorage.setItem(key, JSON.stringify(value))
        // }

        // 현재는 웹 개발 환경이므로 localStorage 사용
        localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        console.error(`[useElectronStorage] Failed to save value for key "${key}":`, error)
      }
    }, debounceMs)

    // 클린업: 컴포넌트 언마운트 시 타이머 취소
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, key, debounceMs, isInitialized])

  return [value, setValue]
}
