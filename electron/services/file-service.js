const { dialog, app } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const yauzl = require('yauzl');
const yazl = require('yazl');
const csv = require('csv-parser');
const { promisify } = require('util');

// yauzl을 Promise로 래핑
const openZip = promisify(yauzl.open);

class FileService {
  constructor() {
    this.recentFiles = [];
    this.tempDir = null;
    this.recentFilesPath = path.join(app.getPath('userData'), 'recent-files.json');
    this.loadRecentFiles();
  }

  /**
   * ZIP 파일 선택 다이얼로그 열기
   * @returns {Promise<Object>} 선택된 파일 정보
   */
  async selectZipFile() {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'ZIP Files', extensions: ['zip'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        title: 'ZIP 파일 선택'
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, message: '파일 선택이 취소되었습니다.' };
      }

      const filePath = result.filePaths[0];
      const fileName = path.basename(filePath);
      
      // 최근 파일 목록에 추가
      await this.addToRecentFiles(fileName, filePath);
      
      return {
        success: true,
        filePath,
        fileName,
        message: '파일이 선택되었습니다.'
      };
    } catch (error) {
      console.error('파일 선택 중 오류:', error);
      return {
        success: false,
        message: `파일 선택 중 오류가 발생했습니다: ${error.message}`
      };
    }
  }

  /**
   * 최근 파일 목록을 파일에서 로드
   */
  async loadRecentFiles() {
    try {
      const data = await fs.readFile(this.recentFilesPath, 'utf8');
      this.recentFiles = JSON.parse(data);
      console.log('최근 파일 목록을 로드했습니다:', this.recentFiles.length, '개 파일');
    } catch (error) {
      // 파일이 없거나 읽기 실패 시 빈 배열로 초기화
      this.recentFiles = [];
      console.log('최근 파일 목록을 로드할 수 없어 빈 목록으로 초기화합니다.');
    }
  }

  /**
   * 최근 파일 목록을 파일에 저장
   */
  async saveRecentFiles() {
    try {
      await fs.writeFile(this.recentFilesPath, JSON.stringify(this.recentFiles, null, 2));
      console.log('최근 파일 목록을 저장했습니다.');
    } catch (error) {
      console.error('최근 파일 목록 저장 중 오류:', error);
    }
  }

  /**
   * 최근 파일 목록에 파일 추가
   * @param {string} fileName 파일명
   * @param {string} filePath 파일 경로
   */
  async addToRecentFiles(fileName, filePath) {
    const fileInfo = {
      name: fileName,
      path: filePath,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now()
    };

    // 중복 제거
    this.recentFiles = this.recentFiles.filter(file => file.path !== filePath);
    
    // 최신 파일을 맨 앞에 추가
    this.recentFiles.unshift(fileInfo);
    
    // 최대 10개까지만 유지
    if (this.recentFiles.length > 10) {
      this.recentFiles = this.recentFiles.slice(0, 10);
    }

    // 파일에 저장
    await this.saveRecentFiles();
  }

  /**
   * 최근 파일 목록 가져오기
   * @returns {Array} 최근 파일 목록
   */
  getRecentFiles() {
    return this.recentFiles;
  }

  /**
   * 최근 파일 목록에서 파일 제거
   * @param {string} filePath 파일 경로
   */
  async removeFromRecentFiles(filePath) {
    this.recentFiles = this.recentFiles.filter(file => file.path !== filePath);
    await this.saveRecentFiles();
  }

  /**
   * 최근 파일 목록 초기화
   */
  async clearRecentFiles() {
    this.recentFiles = [];
    await this.saveRecentFiles();
  }

  /**
   * 파일 존재 여부 검증
   * @param {string} filePath 파일 경로
   * @returns {Promise<boolean>} 파일이 존재하면 true
   */
  async validateFileExists(filePath) {
    try {
      await fs.access(filePath, fs.constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 최근 파일 목록에서 존재하지 않는 파일들을 제거
   * @returns {Promise<Array>} 제거된 파일 목록
   */
  async validateAndCleanRecentFiles() {
    const removedFiles = [];
    const validFiles = [];

    for (const file of this.recentFiles) {
      const exists = await this.validateFileExists(file.path);
      if (exists) {
        validFiles.push(file);
      } else {
        removedFiles.push(file);
      }
    }

    if (removedFiles.length > 0) {
      this.recentFiles = validFiles;
      await this.saveRecentFiles();
      console.log('존재하지 않는 파일들을 최근 목록에서 제거했습니다:', removedFiles.length, '개');
    }

    return removedFiles;
  }

  /**
   * 최근 파일 목록을 검증하고 정리된 목록 반환
   * @returns {Promise<Array>} 검증된 최근 파일 목록
   */
  async getValidatedRecentFiles() {
    await this.validateAndCleanRecentFiles();
    return this.recentFiles;
  }

  /**
   * 최근 파일 목록을 검증하고 사용자에게 확인을 받아 제거
   * @param {Function} showDialog - dialog를 표시하는 함수
   * @returns {Promise<Array>} 검증된 최근 파일 목록
   */
  async validateAndCleanRecentFilesWithDialog(showDialog) {
    const removedFiles = await this.validateAndCleanRecentFiles();
    
    if (removedFiles.length > 0) {
      const dialogResult = await showDialog(removedFiles);
      if (dialogResult.success && dialogResult.shouldRemove) {
        // 이미 제거되었으므로 추가 작업 불필요
        console.log('사용자 확인으로 존재하지 않는 파일들이 제거되었습니다.');
      } else if (dialogResult.success && !dialogResult.shouldRemove) {
        // 사용자가 유지를 선택했으므로 다시 추가
        this.recentFiles = [...this.recentFiles, ...removedFiles];
        await this.saveRecentFiles();
        console.log('사용자 선택으로 파일들이 목록에 유지되었습니다.');
      }
    }
    
    return this.recentFiles;
  }

  /**
   * 임시 디렉토리 생성
   * @returns {Promise<string>} 임시 디렉토리 경로
   */
  async createTempDirectory() {
    try {
      const os = require('os');
      const tempDir = path.join(os.tmpdir(), 'trv2-temp', `extract-${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });
      this.tempDir = tempDir;
      return tempDir;
    } catch (error) {
      console.error('임시 디렉토리 생성 중 오류:', error);
      throw new Error(`임시 디렉토리 생성 실패: ${error.message}`);
    }
  }

  /**
   * 임시 디렉토리 정리
   */
  async cleanupTempDirectory() {
    if (this.tempDir) {
      try {
        await fs.rm(this.tempDir, { recursive: true, force: true });
        this.tempDir = null;
      } catch (error) {
        console.error('임시 디렉토리 정리 중 오류:', error);
      }
    }
  }

  /**
   * 파일이 사용 중인지 확인 (Windows)
   * @param {string} filePath 파일 경로
   * @returns {Promise<boolean>} 사용 중이면 true
   */
  async isFileInUse(filePath) {
    try {
      // Windows에서 파일이 사용 중인지 확인
      if (process.platform === 'win32') {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        try {
          // 파일을 열어서 사용 중인지 확인
          await fs.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
          return false;
        } catch (error) {
          if (error.code === 'EBUSY' || error.code === 'EPERM') {
            return true;
          }
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('파일 사용 상태 확인 중 오류:', error);
      return false;
    }
  }

  /**
   * ZIP 파일 유효성 검사
   * @param {string} filePath ZIP 파일 경로
   * @returns {Promise<Object>} 검사 결과
   */
  async validateZipFile(filePath) {
    try {
      // 파일 존재 확인
      await fs.access(filePath, fs.constants.F_OK);
      
      // 파일 사용 중인지 확인
      const inUse = await this.isFileInUse(filePath);
      if (inUse) {
        return {
          valid: false,
          message: '파일이 다른 프로그램에서 사용 중입니다.'
        };
      }

      // ZIP 파일 열기 시도
      try {
        const zipfile = await openZip(filePath, { lazyEntries: true });
        zipfile.close();
        
        return {
          valid: true,
          message: 'ZIP 파일이 유효합니다.'
        };
      } catch (zipError) {
        return {
          valid: false,
          message: '유효하지 않은 ZIP 파일입니다.'
        };
      }
    } catch (error) {
      console.error('ZIP 파일 검증 중 오류:', error);
      return {
        valid: false,
        message: `파일 검증 중 오류가 발생했습니다: ${error.message}`
      };
    }
  }
}

module.exports = FileService;
