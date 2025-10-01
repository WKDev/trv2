// Electron 렌더러 프로세스용 JavaScript
// 이 파일은 Next.js 앱과 함께 사용되며, Electron 특화 기능을 제공합니다.

class ElectronRenderer {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.electronAPI;
    this.init();
  }

  init() {
    if (!this.isElectron) {
      console.warn('Electron API not available. Running in web mode.');
      return;
    }

    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.initializeApp();
  }

  // 이벤트 리스너 설정
  setupEventListeners() {
    // 윈도우 리사이즈 이벤트
    window.addEventListener('resize', this.handleWindowResize.bind(this));
    
    // 페이지 언로드 이벤트
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    
    // 키보드 단축키
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    // 메뉴 액션 이벤트
    if (window.electronAPI.onMenuAction) {
      window.electronAPI.onMenuAction(this.handleMenuAction.bind(this));
    }
  }

  // 키보드 단축키 설정
  setupKeyboardShortcuts() {
    // Ctrl/Cmd + R: 새로고침
    // Ctrl/Cmd + Shift + I: 개발자 도구
    // F11: 전체화면 토글
    // Ctrl/Cmd + W: 윈도우 닫기 (선택사항)
  }

  // 앱 초기화
  async initializeApp() {
    try {
      // 앱 버전 정보 가져오기
      const version = await window.electronAPI.getAppVersion();
      console.log(`TRv2 Electron App v${version}`);
      
      // 플랫폼 정보 가져오기
      const platform = await window.electronAPI.getPlatform();
      document.body.classList.add(`platform-${platform}`);
      
      // 앱 설정 로드
      await this.loadAppSettings();
      
      // 초기화 완료 이벤트 발생
      this.dispatchEvent('electron-ready', { version, platform });
      
    } catch (error) {
      console.error('Failed to initialize Electron app:', error);
    }
  }

  // 윈도우 리사이즈 핸들러
  handleWindowResize() {
    // 윈도우 크기 변경 시 필요한 작업 수행
    this.dispatchEvent('window-resize', {
      width: window.innerWidth,
      height: window.innerHeight
    });
  }

  // 페이지 언로드 핸들러
  handleBeforeUnload(event) {
    // 저장되지 않은 데이터가 있는지 확인
    const hasUnsavedChanges = this.checkUnsavedChanges();
    
    if (hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = '저장되지 않은 변경사항이 있습니다. 정말로 나가시겠습니까?';
    }
  }

  // 키보드 이벤트 핸들러
  handleKeyDown(event) {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    
    // Ctrl/Cmd + R: 새로고침
    if (isCtrlOrCmd && event.key === 'r') {
      event.preventDefault();
      this.reloadApp();
    }
    
    // Ctrl/Cmd + Shift + I: 개발자 도구
    if (isCtrlOrCmd && event.shiftKey && event.key === 'I') {
      event.preventDefault();
      this.toggleDevTools();
    }
    
    // F11: 전체화면 토글
    if (event.key === 'F11') {
      event.preventDefault();
      this.toggleFullscreen();
    }
  }

  // 메뉴 액션 핸들러
  handleMenuAction(event, action) {
    switch (action) {
      case 'reload':
        this.reloadApp();
        break;
      case 'toggleDevTools':
        this.toggleDevTools();
        break;
      case 'minimize':
        this.minimizeWindow();
        break;
      case 'maximize':
        this.maximizeWindow();
        break;
      case 'close':
        this.closeWindow();
        break;
      default:
        console.log('Unknown menu action:', action);
    }
  }

  // 앱 새로고침
  reloadApp() {
    if (this.isElectron) {
      window.location.reload();
    }
  }

  // 개발자 도구 토글
  async toggleDevTools() {
    if (this.isElectron && window.electronAPI.openDevTools) {
      await window.electronAPI.openDevTools();
    }
  }

  // 전체화면 토글
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  // 윈도우 최소화
  async minimizeWindow() {
    if (this.isElectron && window.electronAPI.minimizeWindow) {
      await window.electronAPI.minimizeWindow();
    }
  }

  // 윈도우 최대화
  async maximizeWindow() {
    if (this.isElectron && window.electronAPI.maximizeWindow) {
      await window.electronAPI.maximizeWindow();
    }
  }

  // 윈도우 닫기
  async closeWindow() {
    if (this.isElectron && window.electronAPI.closeWindow) {
      await window.electronAPI.closeWindow();
    }
  }

  // 파일 선택
  async selectFile(options = {}) {
    if (this.isElectron && window.electronAPI.showOpenDialog) {
      return await window.electronAPI.showOpenDialog({
        properties: ['openFile'],
        ...options
      });
    }
    return null;
  }

  // ZIP 파일 선택 및 처리
  async selectAndProcessZipFile() {
    if (!this.isElectron || !window.electronAPI.selectZipFile) {
      throw new Error('ZIP 파일 처리가 지원되지 않습니다.');
    }

    try {
      // 1. ZIP 파일 선택
      const selectResult = await window.electronAPI.selectZipFile();
      if (!selectResult.success) {
        throw new Error(selectResult.message);
      }

      // 2. ZIP 파일 유효성 검사
      const validationResult = await window.electronAPI.validateZipFile(selectResult.filePath);
      if (!validationResult.valid) {
        throw new Error(validationResult.message);
      }

      // 3. ZIP 파일 구조 검증
      const structureResult = await window.electronAPI.validateZipStructure(selectResult.filePath);
      if (!structureResult.valid) {
        throw new Error(structureResult.message);
      }

      // 4. ZIP 파일 압축 해제
      const extractResult = await window.electronAPI.extractZipFile(selectResult.filePath);
      if (!extractResult.success) {
        throw new Error(extractResult.message);
      }

      // 5. data_correction.json 파일 확인 및 추가
      const correctionResult = await window.electronAPI.checkAndAddCorrectionFile(selectResult.filePath);
      if (!correctionResult.success) {
        console.warn('보정 파일 처리 중 오류:', correctionResult.message);
      }

      // 6. CSV 파일들 읽기
      const csvResult = await window.electronAPI.readCsvFiles(extractResult.extractPath);
      if (!csvResult.success) {
        throw new Error(csvResult.message);
      }

      // 7. 임시 디렉토리 정리
      await window.electronAPI.cleanupTempDirectory();

      return {
        success: true,
        fileName: selectResult.fileName,
        filePath: selectResult.filePath,
        data: csvResult.data,
        qualityCheck: csvResult.qualityCheck,
        message: 'ZIP 파일이 성공적으로 처리되었습니다.'
      };

    } catch (error) {
      console.error('ZIP 파일 처리 중 오류:', error);
      
      // 오류 발생 시 임시 디렉토리 정리
      try {
        await window.electronAPI.cleanupTempDirectory();
      } catch (cleanupError) {
        console.error('임시 디렉토리 정리 중 오류:', cleanupError);
      }

      throw error;
    }
  }

  // 최근 파일 목록 가져오기
  async getRecentFiles() {
    if (this.isElectron && window.electronAPI.getRecentFiles) {
      return await window.electronAPI.getRecentFiles();
    }
    return { success: false, files: [] };
  }

  // 최근 파일 목록 초기화
  async clearRecentFiles() {
    if (this.isElectron && window.electronAPI.clearRecentFiles) {
      return await window.electronAPI.clearRecentFiles();
    }
    return { success: false };
  }

  // 디렉토리 선택
  async selectDirectory(options = {}) {
    if (this.isElectron && window.electronAPI.showOpenDialog) {
      return await window.electronAPI.showOpenDialog({
        properties: ['openDirectory'],
        ...options
      });
    }
    return null;
  }

  // 파일 저장
  async saveFile(data, filename, options = {}) {
    if (this.isElectron && window.electronAPI.showSaveDialog) {
      const result = await window.electronAPI.showSaveDialog({
        defaultPath: filename,
        ...options
      });
      
      if (!result.canceled) {
        return await window.electronAPI.saveFile(data, result.filePath);
      }
    }
    return false;
  }

  // 데이터 저장
  async saveData(key, data) {
    if (this.isElectron && window.electronAPI.saveData) {
      return await window.electronAPI.saveData(key, data);
    }
    return false;
  }

  // 데이터 로드
  async loadData(key) {
    if (this.isElectron && window.electronAPI.loadData) {
      return await window.electronAPI.loadData(key);
    }
    return null;
  }

  // 데이터 삭제
  async removeData(key) {
    if (this.isElectron && window.electronAPI.removeData) {
      return await window.electronAPI.removeData(key);
    }
    return false;
  }

  // 앱 설정 로드
  async loadAppSettings() {
    const settings = await this.loadData('app-settings');
    if (settings) {
      this.applyAppSettings(settings);
    }
  }

  // 앱 설정 적용
  applyAppSettings(settings) {
    // 테마 설정
    if (settings.theme) {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
    
    // 기타 설정들...
    this.dispatchEvent('settings-loaded', settings);
  }

  // 저장되지 않은 변경사항 확인
  checkUnsavedChanges() {
    // 실제 구현에서는 앱의 상태를 확인
    return false;
  }

  // 알림 표시
  async showNotification(title, body) {
    if (this.isElectron && window.electronAPI.showNotification) {
      return await window.electronAPI.showNotification(title, body);
    }
  }

  // 메시지 박스 표시
  async showMessageBox(options) {
    if (this.isElectron && window.electronAPI.showMessageBox) {
      return await window.electronAPI.showMessageBox(options);
    }
    return null;
  }

  // 커스텀 이벤트 발생
  dispatchEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  }

  // 이벤트 리스너 등록
  addEventListener(eventName, callback) {
    window.addEventListener(eventName, callback);
  }

  // 이벤트 리스너 제거
  removeEventListener(eventName, callback) {
    window.removeEventListener(eventName, callback);
  }
}

// 전역 인스턴스 생성
window.electronRenderer = new ElectronRenderer();

// React/Next.js와의 통합을 위한 헬퍼 함수들
window.electronHelpers = {
  // 파일 선택 헬퍼
  selectFile: (options) => window.electronRenderer.selectFile(options),
  
  // ZIP 파일 처리 헬퍼
  selectAndProcessZipFile: () => window.electronRenderer.selectAndProcessZipFile(),
  
  // 최근 파일 관리 헬퍼
  getRecentFiles: () => window.electronRenderer.getRecentFiles(),
  clearRecentFiles: () => window.electronRenderer.clearRecentFiles(),
  
  // 파일 저장 헬퍼
  saveFile: (data, filename, options) => window.electronRenderer.saveFile(data, filename, options),
  
  // 데이터 저장/로드 헬퍼
  saveData: (key, data) => window.electronRenderer.saveData(key, data),
  loadData: (key) => window.electronRenderer.loadData(key),
  
  // 알림 헬퍼
  showNotification: (title, body) => window.electronRenderer.showNotification(title, body),
  
  // 메시지 박스 헬퍼
  showMessageBox: (options) => window.electronRenderer.showMessageBox(options),
  
  // 이벤트 리스너 헬퍼
  on: (event, callback) => window.electronRenderer.addEventListener(event, callback),
  off: (event, callback) => window.electronRenderer.removeEventListener(event, callback)
};

// 개발 환경에서만 사용할 수 있는 디버그 함수들
if (process.env.NODE_ENV === 'development' && window.electronDev) {
  window.electronDev.log('Renderer process initialized');
}

