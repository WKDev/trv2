const { contextBridge, ipcRenderer } = require('electron');

// 보안을 위해 contextBridge를 사용하여 렌더러 프로세스에 안전한 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // 앱 정보
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  getPlatform: () => ipcRenderer.invoke('platform'),
  
  // 파일 시스템 관련 (필요한 경우)
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  saveFile: (data, filename) => ipcRenderer.invoke('save-file', data, filename),
  
  // 윈도우 제어
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // 데이터 저장/로드 (로컬 스토리지 대신)
  saveData: (key, data) => ipcRenderer.invoke('save-data', key, data),
  loadData: (key) => ipcRenderer.invoke('load-data', key),
  removeData: (key) => ipcRenderer.invoke('remove-data', key),
  
  // 이벤트 리스너
  onMenuAction: (callback) => ipcRenderer.on('menu-action', callback),
  onWindowResize: (callback) => ipcRenderer.on('window-resize', callback),
  
  // 이벤트 리스너 제거
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // 개발 도구 (개발 환경에서만)
  openDevTools: () => ipcRenderer.invoke('open-dev-tools'),
  
  // 앱 설정
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  setAppSettings: (settings) => ipcRenderer.invoke('set-app-settings', settings),
  
  // 알림
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
  
  // 다이얼로그
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  
  // ZIP 파일 처리
  selectZipFile: () => ipcRenderer.invoke('select-zip-file'),
  validateZipFile: (filePath) => ipcRenderer.invoke('validate-zip-file', filePath),
  validateZipStructure: (filePath) => ipcRenderer.invoke('validate-zip-structure', filePath),
  extractZipFile: (zipFilePath) => ipcRenderer.invoke('extract-zip-file', zipFilePath),
  checkAndAddCorrectionFile: (zipFilePath) => ipcRenderer.invoke('check-and-add-correction-file', zipFilePath),
  readCorrectionFile: (zipFilePath) => ipcRenderer.invoke('read-correction-file', zipFilePath),
  updateCorrectionFile: (zipFilePath, correctionData) => ipcRenderer.invoke('update-correction-file', zipFilePath, correctionData),
  readCsvFiles: (extractPath) => ipcRenderer.invoke('read-csv-files', extractPath),
  cleanupTempDirectory: () => ipcRenderer.invoke('cleanup-temp-directory'),
  
  // 최근 파일 관리
  getRecentFiles: () => ipcRenderer.invoke('get-recent-files'),
  clearRecentFiles: () => ipcRenderer.invoke('clear-recent-files'),
  
  // CSV 파일 저장
  saveCsvFiles: (originalZipPath, csvData) => ipcRenderer.invoke('save-csv-files', originalZipPath, csvData),
  
  // data_raw.csv 관련 API
  restoreFromDataRaw: (extractPath) => ipcRenderer.invoke('restore-from-data-raw', extractPath),
  createDataRawBackup: (extractPath) => ipcRenderer.invoke('create-data-raw-backup', extractPath)
});

// 개발 환경에서만 콘솔 로그 활성화
if (process.env.NODE_ENV === 'development') {
  contextBridge.exposeInMainWorld('electronDev', {
    log: (...args) => console.log('[Electron Dev]', ...args),
    error: (...args) => console.error('[Electron Dev]', ...args),
    warn: (...args) => console.warn('[Electron Dev]', ...args)
  });
}

// 페이지 로드 완료 후 실행
window.addEventListener('DOMContentLoaded', () => {
  // Electron 환경임을 알리는 클래스 추가
  document.body.classList.add('electron-app');
  
  // 플랫폼별 클래스 추가
  ipcRenderer.invoke('platform').then(platform => {
    document.body.classList.add(`platform-${platform}`);
  });
  
  // 앱 버전 정보 추가 (개발자 도구에서 확인 가능)
  ipcRenderer.invoke('app-version').then(version => {
    console.log(`TRv2 Electron App v${version}`);
    console.log('Electron API loaded successfully:', Object.keys(window.electronAPI || {}));
  });
});

// Electron API 로드 확인을 위한 전역 변수
window.electronAPILoaded = true;
console.log('Preload script loaded, Electron API exposed:', Object.keys(window.electronAPI || {}));

// 보안: Node.js API 직접 접근 방지
delete window.require;
delete window.exports;
delete window.module;

