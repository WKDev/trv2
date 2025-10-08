const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';

// 개발 환경에서만 디버그 모드 활성화
if (isDev) {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
    });
  } catch (error) {
    console.log('electron-reload not available in production');
  }
}

let mainWindow;

function createWindow() {
  // 메인 윈도우 생성
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1600,
    minHeight: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, '..', 'preload', 'index.js')
    },
    icon: path.join(__dirname, '..', '..', 'app', 'favicon.ico'),
    show: false, // 윈도우가 준비될 때까지 숨김
    titleBarStyle: 'default'
  });

  // 개발 환경에서는 localhost:3000, 프로덕션에서는 빌드된 파일 사용
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '..', '..', 'out', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  // 윈도우가 준비되면 표시
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 개발 환경에서만 DevTools 열기
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // 윈도우가 닫힐 때
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 외부 링크는 기본 브라우저에서 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// 앱이 준비되면 윈도우 생성
app.whenReady().then(async () => {
  createWindow();

  // 앱 시작 시 최근 파일 목록 검증 (백그라운드에서 실행)
  setTimeout(async () => {
    try {
      await fileService.validateAndCleanRecentFiles();
      console.log('앱 시작 시 최근 파일 목록 검증 완료');
    } catch (error) {
      console.error('앱 시작 시 최근 파일 목록 검증 중 오류:', error);
    }
  }, 2000); // 2초 후 실행하여 앱이 완전히 로드된 후 실행

  // macOS에서 독립적으로 동작하도록 설정
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 모든 윈도우가 닫히면 앱 종료 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 앱이 종료되기 전에
app.on('before-quit', () => {
  // 필요한 정리 작업 수행
});

// 보안: 새 윈도우 생성 방지
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    require('electron').shell.openExternal(navigationUrl);
  });
});

// IPC 핸들러들
ipcMain.handle('app-version', () => {
  return app.getVersion();
});

ipcMain.handle('platform', () => {
  return process.platform;
});

// 윈도우 제어
ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// 개발자 도구
ipcMain.handle('open-dev-tools', () => {
  if (mainWindow) {
    mainWindow.webContents.openDevTools();
  }
});

// 파일 시스템 (간단한 구현)
const fs = require('fs').promises;
const { dialog } = require('electron');

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile']
  });
  return result;
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result;
});

ipcMain.handle('save-file', async (event, data, filePath) => {
  try {
    await fs.writeFile(filePath, data);
    return true;
  } catch (error) {
    console.error('Failed to save file:', error);
    return false;
  }
});

// 데이터 저장/로드 (간단한 JSON 파일 기반)
const dataPath = path.join(app.getPath('userData'), 'app-data.json');

ipcMain.handle('save-data', async (event, key, data) => {
  try {
    let appData = {};
    try {
      const existingData = await fs.readFile(dataPath, 'utf8');
      appData = JSON.parse(existingData);
    } catch (error) {
      // 파일이 없으면 새로 생성
    }
    
    appData[key] = data;
    await fs.writeFile(dataPath, JSON.stringify(appData, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save data:', error);
    return false;
  }
});

ipcMain.handle('load-data', async (event, key) => {
  try {
    const data = await fs.readFile(dataPath, 'utf8');
    const appData = JSON.parse(data);
    return appData[key] || null;
  } catch (error) {
    console.error('Failed to load data:', error);
    return null;
  }
});

ipcMain.handle('remove-data', async (event, key) => {
  try {
    let appData = {};
    try {
      const existingData = await fs.readFile(dataPath, 'utf8');
      appData = JSON.parse(existingData);
    } catch (error) {
      return true; // 파일이 없으면 이미 삭제된 것으로 간주
    }
    
    delete appData[key];
    await fs.writeFile(dataPath, JSON.stringify(appData, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to remove data:', error);
    return false;
  }
});

// 앱 설정
ipcMain.handle('get-app-settings', async () => {
  return await ipcMain.invoke('load-data', 'app-settings') || {};
});

ipcMain.handle('set-app-settings', async (event, settings) => {
  return await ipcMain.invoke('save-data', 'app-settings', settings);
});

// 알림
ipcMain.handle('show-notification', async (event, title, body) => {
  const { Notification } = require('electron');
  
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      icon: path.join(__dirname, '..', '..', 'app', 'favicon.ico')
    });
    
    notification.show();
    return true;
  }
  return false;
});

// 다이얼로그
ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

// 파일 처리 서비스들
const FileService = require('../services/file-service');
const ZipValidationService = require('../services/zip-validation-service');
const ZipExtractionService = require('../services/zip-extraction-service');
const DataCorrectionService = require('../services/data-correction-service');
const CsvDataReaderService = require('../services/csv-data-reader-service');
const CsvDataWriterService = require('../services/csv-data-writer-service');
const OptionsService = require('../services/options-service');

// 서비스 인스턴스 생성
const fileService = new FileService();
const zipValidationService = new ZipValidationService();
const zipExtractionService = new ZipExtractionService();
const dataCorrectionService = new DataCorrectionService();
const csvDataReaderService = new CsvDataReaderService();
const csvDataWriterService = new CsvDataWriterService();
const optionsService = new OptionsService();

// ZIP 파일 선택 및 처리
ipcMain.handle('select-zip-file', async () => {
  try {
    return await fileService.selectZipFile();
  } catch (error) {
    console.error('ZIP 파일 선택 중 오류:', error);
    return {
      success: false,
      message: `파일 선택 중 오류가 발생했습니다: ${error.message}`
    };
  }
});

// ZIP 파일 유효성 검사
ipcMain.handle('validate-zip-file', async (event, filePath) => {
  try {
    return await fileService.validateZipFile(filePath);
  } catch (error) {
    console.error('ZIP 파일 검증 중 오류:', error);
    return {
      valid: false,
      message: `파일 검증 중 오류가 발생했습니다: ${error.message}`
    };
  }
});

// ZIP 파일 구조 검증
ipcMain.handle('validate-zip-structure', async (event, filePath) => {
  try {
    return await zipValidationService.validateZipStructure(filePath);
  } catch (error) {
    console.error('ZIP 구조 검증 중 오류:', error);
    return {
      valid: false,
      message: `구조 검증 중 오류가 발생했습니다: ${error.message}`,
      foundFiles: [],
      missingFiles: ['data.csv', 'meta.csv', 'step.csv']
    };
  }
});

// ZIP 파일 압축 해제
ipcMain.handle('extract-zip-file', async (event, zipFilePath) => {
  try {
    // 임시 디렉토리 생성
    const tempDir = await fileService.createTempDirectory();
    
    // ZIP 파일 압축 해제
    const extractResult = await zipExtractionService.extractZipFile(zipFilePath, tempDir);
    
    if (!extractResult.success) {
      await fileService.cleanupTempDirectory();
      return extractResult;
    }

    // 압축 해제된 파일들 검증
    const validationResult = await zipExtractionService.validateExtractedFiles(tempDir);
    
    if (!validationResult.valid) {
      await fileService.cleanupTempDirectory();
      return {
        success: false,
        message: validationResult.message,
        missingFiles: validationResult.missingFiles
      };
    }

    // CSV 파일들 구조 검증
    const csvValidationResult = await zipExtractionService.validateAllCsvFiles(tempDir);
    
    if (!csvValidationResult.valid) {
      await fileService.cleanupTempDirectory();
      return {
        success: false,
        message: csvValidationResult.message,
        errors: csvValidationResult.errors
      };
    }

    // data_raw.csv 백업 생성 (data.csv가 있으면)
    const backupResult = await zipExtractionService.createDataRawBackup(tempDir);
    console.log('data_raw.csv backup result:', backupResult.message);

    // data_correction.json 파일이 없으면 자동으로 생성하여 ZIP에 추가
    const correctionCheck = await dataCorrectionService.checkDataCorrectionFile(zipFilePath);
    let correctionAdded = false;
    
    if (!correctionCheck.hasFile) {
      console.log('data_correction.json 파일이 없어서 자동으로 생성합니다.');
      const addCorrectionResult = await dataCorrectionService.updateZipWithCorrection(zipFilePath);
      correctionAdded = addCorrectionResult.success;
      console.log('data_correction.json 자동 생성 결과:', addCorrectionResult.message);
    }

    // options.json 파일이 없으면 자동으로 생성하여 ZIP에 추가
    const optionsCheck = await optionsService.checkOptionsFile(zipFilePath);
    let optionsAdded = false;
    
    if (!optionsCheck.hasFile) {
      console.log('options.json 파일이 없어서 자동으로 생성합니다.');
      const addOptionsResult = await optionsService.updateZipWithOptions(zipFilePath, null);
      optionsAdded = addOptionsResult.success;
      console.log('options.json 자동 생성 결과:', addOptionsResult.message);
    }

    // data_raw.csv가 없으면 data.csv를 복사하여 ZIP에 추가
    let dataRawAdded = false;
    
    try {
      await zipValidationService.readFileFromZip(zipFilePath, 'data_raw.csv');
      console.log('data_raw.csv 파일이 이미 존재합니다.');
    } catch (error) {
      console.log('data_raw.csv 파일이 없어서 data.csv를 복사하여 생성합니다.');
      const addDataRawResult = await zipExtractionService.addDataRawToZip(zipFilePath);
      dataRawAdded = addDataRawResult.success;
      console.log('data_raw.csv 자동 생성 결과:', addDataRawResult.message);
    }

    return {
      success: true,
      message: 'ZIP 파일이 성공적으로 압축 해제되었습니다.',
      extractPath: tempDir,
      extractedFiles: extractResult.extractedFiles,
      backupCreated: backupResult.hasBackup,
      correctionAdded,
      optionsAdded,
      dataRawAdded,
      foundFilePaths: validationResult.foundFilePaths || {}
    };
  } catch (error) {
    console.error('ZIP 파일 압축 해제 중 오류:', error);
    await fileService.cleanupTempDirectory();
    return {
      success: false,
      message: `압축 해제 중 오류가 발생했습니다: ${error.message}`
    };
  }
});

// data_correction.json 파일 확인 및 추가
ipcMain.handle('check-and-add-correction-file', async (event, zipFilePath) => {
  try {
    // data_correction.json 파일이 있는지 확인
    const checkResult = await dataCorrectionService.checkDataCorrectionFile(zipFilePath);
    
    if (checkResult.hasFile) {
      return {
        success: true,
        message: 'data_correction.json 파일이 이미 존재합니다.',
        hasFile: true
      };
    }

    // data_correction.json 파일 추가
    const addResult = await dataCorrectionService.updateZipWithCorrection(zipFilePath);
    
    return {
      success: addResult.success,
      message: addResult.message,
      hasFile: addResult.success
    };
  } catch (error) {
    console.error('보정 파일 처리 중 오류:', error);
    return {
      success: false,
      message: `보정 파일 처리 중 오류가 발생했습니다: ${error.message}`,
      hasFile: false
    };
  }
});

// data_correction.json 파일 읽기
ipcMain.handle('read-correction-file', async (event, zipFilePath) => {
  try {
    const correctionResult = await dataCorrectionService.readDataCorrectionFile(zipFilePath);
    return correctionResult;
  } catch (error) {
    console.error('보정 파일 읽기 중 오류:', error);
    return {
      success: false,
      message: `보정 파일 읽기 중 오류가 발생했습니다: ${error.message}`,
      data: null
    };
  }
});

// data_correction.json 파일 업데이트
ipcMain.handle('update-correction-file', async (event, zipFilePath, correctionData) => {
  try {
    const updateResult = await dataCorrectionService.updateZipWithCorrectionData(zipFilePath, correctionData);
    return updateResult;
  } catch (error) {
    console.error('보정 파일 업데이트 중 오류:', error);
    return {
      success: false,
      message: `보정 파일 업데이트 중 오류가 발생했습니다: ${error.message}`
    };
  }
});

// options.json 파일 읽기
ipcMain.handle('read-options-file', async (event, zipFilePath) => {
  try {
    const readResult = await optionsService.readOptionsFile(zipFilePath);
    return readResult;
  } catch (error) {
    console.error('options.json 파일 읽기 중 오류:', error);
    return {
      success: false,
      message: `options.json 파일 읽기 중 오류가 발생했습니다: ${error.message}`,
      data: null
    };
  }
});

// options.json 파일 업데이트
ipcMain.handle('update-options-file', async (event, zipFilePath, optionsData) => {
  try {
    const updateResult = await optionsService.updateZipWithOptions(zipFilePath, optionsData);
    return updateResult;
  } catch (error) {
    console.error('options.json 파일 업데이트 중 오류:', error);
    return {
      success: false,
      message: `options.json 파일 업데이트 중 오류가 발생했습니다: ${error.message}`
    };
  }
});

// options.json 파일 빠른 업데이트 (검증 없이)
ipcMain.handle('quick-update-options-file', async (event, zipFilePath, optionsData) => {
  try {
    const updateResult = await optionsService.quickUpdateOptions(zipFilePath, optionsData);
    return updateResult;
  } catch (error) {
    console.error('options.json 파일 빠른 업데이트 중 오류:', error);
    return {
      success: false,
      message: `options.json 파일 빠른 업데이트 중 오류가 발생했습니다: ${error.message}`
    };
  }
});

// 기본 옵션 데이터 가져오기
ipcMain.handle('get-default-options', async (event, section = null) => {
  try {
    if (section) {
      const defaultSection = optionsService.getDefaultSection(section);
      return {
        success: true,
        data: defaultSection
      };
    } else {
      const defaultOptions = optionsService.getDefaultOptions();
      return {
        success: true,
        data: defaultOptions
      };
    }
  } catch (error) {
    console.error('기본 옵션 데이터 가져오기 중 오류:', error);
    return {
      success: false,
      message: `기본 옵션 데이터 가져오기 중 오류가 발생했습니다: ${error.message}`,
      data: null
    };
  }
});

// CSV 파일들 읽기
ipcMain.handle('read-csv-files', async (event, extractPath, foundFilePaths = null) => {
  try {
    const readResult = await csvDataReaderService.readAllCsvFiles(extractPath, foundFilePaths);
    
    if (!readResult.success) {
      return readResult;
    }

    // 데이터 품질 검증
    const qualityCheck = csvDataReaderService.validateDataQuality(readResult.data);
    
    // 프론트엔드용 데이터 포맷팅
    const formattedData = csvDataReaderService.formatDataForFrontend(readResult.data);
    
    return {
      ...formattedData,
      qualityCheck
    };
  } catch (error) {
    console.error('CSV 파일 읽기 중 오류:', error);
    return {
      success: false,
      message: `CSV 파일 읽기 중 오류가 발생했습니다: ${error.message}`,
      data: null
    };
  }
});

// 임시 디렉토리 정리
ipcMain.handle('cleanup-temp-directory', async () => {
  try {
    await fileService.cleanupTempDirectory();
    return {
      success: true,
      message: '임시 디렉토리가 정리되었습니다.'
    };
  } catch (error) {
    console.error('임시 디렉토리 정리 중 오류:', error);
    return {
      success: false,
      message: `임시 디렉토리 정리 중 오류가 발생했습니다: ${error.message}`
    };
  }
});

// 최근 파일 목록 관리
ipcMain.handle('get-recent-files', async () => {
  try {
    return {
      success: true,
      files: fileService.getRecentFiles()
    };
  } catch (error) {
    console.error('최근 파일 목록 가져오기 중 오류:', error);
    return {
      success: false,
      files: [],
      message: `최근 파일 목록을 가져올 수 없습니다: ${error.message}`
    };
  }
});

ipcMain.handle('get-validated-recent-files', async () => {
  try {
    const files = await fileService.getValidatedRecentFiles();
    return {
      success: true,
      files
    };
  } catch (error) {
    console.error('검증된 최근 파일 목록 가져오기 중 오류:', error);
    return {
      success: false,
      files: [],
      message: `검증된 최근 파일 목록을 가져올 수 없습니다: ${error.message}`
    };
  }
});

ipcMain.handle('validate-and-clean-recent-files', async () => {
  try {
    const removedFiles = await fileService.validateAndCleanRecentFiles();
    return {
      success: true,
      removedFiles,
      message: removedFiles.length > 0 
        ? `${removedFiles.length}개의 존재하지 않는 파일이 목록에서 제거되었습니다.`
        : '모든 최근 파일이 유효합니다.'
    };
  } catch (error) {
    console.error('최근 파일 목록 검증 및 정리 중 오류:', error);
    return {
      success: false,
      removedFiles: [],
      message: `최근 파일 목록 검증 중 오류가 발생했습니다: ${error.message}`
    };
  }
});

ipcMain.handle('validate-and-clean-recent-files-with-dialog', async () => {
  try {
    const files = await fileService.validateAndCleanRecentFilesWithDialog(async (missingFiles) => {
      return await ipcMain.invoke('show-missing-files-dialog', missingFiles);
    });
    return {
      success: true,
      files,
      message: '최근 파일 목록이 검증되었습니다.'
    };
  } catch (error) {
    console.error('최근 파일 목록 검증 및 정리 중 오류:', error);
    return {
      success: false,
      files: [],
      message: `최근 파일 목록 검증 중 오류가 발생했습니다: ${error.message}`
    };
  }
});

ipcMain.handle('remove-from-recent-files', async (event, filePath) => {
  try {
    await fileService.removeFromRecentFiles(filePath);
    return {
      success: true,
      message: '파일이 최근 목록에서 제거되었습니다.'
    };
  } catch (error) {
    console.error('최근 파일 목록에서 파일 제거 중 오류:', error);
    return {
      success: false,
      message: `파일 제거 중 오류가 발생했습니다: ${error.message}`
    };
  }
});

ipcMain.handle('clear-recent-files', async () => {
  try {
    await fileService.clearRecentFiles();
    return {
      success: true,
      message: '최근 파일 목록이 초기화되었습니다.'
    };
  } catch (error) {
    console.error('최근 파일 목록 초기화 중 오류:', error);
    return {
      success: false,
      message: `최근 파일 목록 초기화 중 오류가 발생했습니다: ${error.message}`
    };
  }
});

// 최근 파일 목록에서 존재하지 않는 파일들을 사용자에게 확인하고 제거
ipcMain.handle('show-missing-files-dialog', async (event, missingFiles) => {
  try {
    if (missingFiles.length === 0) {
      return {
        success: true,
        shouldRemove: false,
        message: '모든 최근 파일이 유효합니다.'
      };
    }

    const fileNames = missingFiles.map(file => file.name).join('\n');
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['제거', '유지'],
      defaultId: 0,
      cancelId: 1,
      title: '존재하지 않는 파일 발견',
      message: '다음 파일들이 더 이상 존재하지 않습니다:',
      detail: `${fileNames}\n\n이 파일들을 최근 목록에서 제거하시겠습니까?`,
      noLink: true
    });

    return {
      success: true,
      shouldRemove: result.response === 0,
      message: result.response === 0 
        ? '존재하지 않는 파일들이 목록에서 제거되었습니다.'
        : '파일들이 목록에 유지되었습니다.'
    };
  } catch (error) {
    console.error('누락된 파일 dialog 표시 중 오류:', error);
    return {
      success: false,
      shouldRemove: false,
      message: `Dialog 표시 중 오류가 발생했습니다: ${error.message}`
    };
  }
});

// CSV 파일들 저장
ipcMain.handle('save-csv-files', async (event, originalZipPath, csvData) => {
  try {
    return await csvDataWriterService.updateExistingZip(originalZipPath, csvData);
  } catch (error) {
    console.error('CSV 파일 저장 중 오류:', error);
    return {
      success: false,
      message: `CSV 파일 저장 중 오류가 발생했습니다: ${error.message}`
    };
  }
});

// data_raw.csv에서 data.csv로 복원
ipcMain.handle('restore-from-data-raw', async (event, extractPath) => {
  try {
    return await zipExtractionService.restoreFromDataRaw(extractPath);
  } catch (error) {
    console.error('data_raw.csv 복원 중 오류:', error);
    return {
      success: false,
      message: `복원 중 오류가 발생했습니다: ${error.message}`,
      restored: false
    };
  }
});

// data_raw.csv 백업 생성
ipcMain.handle('create-data-raw-backup', async (event, extractPath) => {
  try {
    return await zipExtractionService.createDataRawBackup(extractPath);
  } catch (error) {
    console.error('data_raw.csv 백업 생성 중 오류:', error);
    return {
      success: false,
      message: `백업 생성 중 오류가 발생했습니다: ${error.message}`,
      hasBackup: false
    };
  }
});

// 메뉴 설정 (선택사항)
if (process.platform === 'darwin') {
  const template = [
    {
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
} else {
  // Windows/Linux에서는 메뉴 숨김
  Menu.setApplicationMenu(null);
}
