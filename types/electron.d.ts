// Electron API 타입 정의
declare global {
  interface Window {
    electronAPI?: {
      // 앱 정보
      getAppVersion: () => Promise<string>
      getPlatform: () => Promise<string>
      
      // 파일 시스템 관련
      selectFile: () => Promise<any>
      selectDirectory: () => Promise<any>
      saveFile: (data: any, filename: string) => Promise<any>
      
      // 윈도우 제어
      minimizeWindow: () => Promise<void>
      maximizeWindow: () => Promise<void>
      closeWindow: () => Promise<void>
      
      // 데이터 저장/로드
      saveData: (key: string, data: any) => Promise<void>
      loadData: (key: string) => Promise<any>
      removeData: (key: string) => Promise<void>
      
      // 이벤트 리스너
      onMenuAction: (callback: (event: any, ...args: any[]) => void) => void
      onWindowResize: (callback: (event: any, ...args: any[]) => void) => void
      removeAllListeners: (channel: string) => void
      
      // 개발 도구
      openDevTools: () => Promise<void>
      
      // 앱 설정
      getAppSettings: () => Promise<any>
      setAppSettings: (settings: any) => Promise<void>
      
      // 알림
      showNotification: (title: string, body: string) => Promise<void>
      
      // 다이얼로그
      showMessageBox: (options: any) => Promise<any>
      showOpenDialog: (options: any) => Promise<any>
      showSaveDialog: (options: any) => Promise<any>
      
      // ZIP 파일 처리
      selectZipFile: () => Promise<{success: boolean, filePath?: string, fileName?: string, message: string}>
      validateZipFile: (filePath: string) => Promise<{valid: boolean, message: string}>
      validateZipStructure: (filePath: string) => Promise<{valid: boolean, message: string}>
      extractZipFile: (zipFilePath: string) => Promise<{success: boolean, extractPath?: string, message: string}>
      checkAndAddCorrectionFile: (zipFilePath: string) => Promise<{success: boolean, message: string}>
      readCorrectionFile: (zipFilePath: string) => Promise<{success: boolean, data?: any, message: string}>
      updateCorrectionFile: (zipFilePath: string, correctionData: any) => Promise<{success: boolean, message: string}>
      readCsvFiles: (extractPath: string) => Promise<{success: boolean, data?: any, qualityCheck?: any, message: string}>
      cleanupTempDirectory: () => Promise<void>
      
      // 최근 파일 관리
      getRecentFiles: () => Promise<{success: boolean, files?: any[], message: string}>
      clearRecentFiles: () => Promise<{success: boolean, message: string}>
      
      // CSV 파일 저장
      saveCsvFiles: (originalZipPath: string, csvData: {meta?: any[], data?: any[], step?: any[]}) => Promise<{success: boolean, message: string, savedFiles?: string[], backupPath?: string}>
    }
  }
}

export {}

