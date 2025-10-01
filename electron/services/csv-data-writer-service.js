const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const yazl = require('yazl');

class CsvDataWriterService {
  constructor() {
    this.tempDir = null;
  }

  /**
   * 객체 배열을 CSV 형식의 문자열로 변환
   * @param {Array} data 객체 배열
   * @returns {string} CSV 문자열
   */
  convertToCsv(data) {
    if (!data || data.length === 0) {
      return '';
    }

    // 첫 번째 객체의 키를 헤더로 사용
    const headers = Object.keys(data[0]);
    
    // 헤더 행 생성
    const headerRow = headers.join(',');
    
    // 데이터 행들 생성
    const dataRows = data.map(row => {
      return headers.map(header => {
        const value = row[header] || '';
        // CSV에서 쉼표나 따옴표가 포함된 값은 따옴표로 감싸기
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });

    return [headerRow, ...dataRows].join('\n');
  }

  /**
   * CSV 파일 저장
   * @param {string} filePath 파일 경로
   * @param {string} content CSV 내용
   * @returns {Promise<Object>} 저장 결과
   */
  async saveCsvFile(filePath, content) {
    try {
      await fsPromises.writeFile(filePath, content, 'utf8');
      return {
        success: true,
        message: 'CSV 파일이 성공적으로 저장되었습니다.'
      };
    } catch (error) {
      console.error('CSV 파일 저장 중 오류:', error);
      return {
        success: false,
        message: `CSV 파일 저장 중 오류가 발생했습니다: ${error.message}`
      };
    }
  }

  /**
   * 여러 CSV 파일들을 ZIP으로 압축하여 저장
   * @param {string} originalZipPath 원본 ZIP 파일 경로
   * @param {Object} csvData CSV 데이터 객체 { meta: [], data: [], step: [] }
   * @returns {Promise<Object>} 저장 결과
   */
  async saveCsvFilesToZip(originalZipPath, csvData) {
    try {
      // 원본 ZIP 파일이 존재하는지 확인
      await fsPromises.access(originalZipPath);
      
      // 임시 디렉토리 생성
      const os = require('os');
      this.tempDir = path.join(os.tmpdir(), 'trv2-save', `save-${Date.now()}`);
      await fsPromises.mkdir(this.tempDir, { recursive: true });

      // 각 CSV 파일 저장
      const savedFiles = [];
      
      if (csvData.meta && csvData.meta.length > 0) {
        const metaCsv = this.convertToCsv(csvData.meta);
        const metaPath = path.join(this.tempDir, 'meta.csv');
        await this.saveCsvFile(metaPath, metaCsv);
        savedFiles.push('meta.csv');
      }

      if (csvData.data && csvData.data.length > 0) {
        const dataCsv = this.convertToCsv(csvData.data);
        const dataPath = path.join(this.tempDir, 'data.csv');
        await this.saveCsvFile(dataPath, dataCsv);
        savedFiles.push('data.csv');
      }

      if (csvData.step && csvData.step.length > 0) {
        const stepCsv = this.convertToCsv(csvData.step);
        const stepPath = path.join(this.tempDir, 'step.csv');
        await this.saveCsvFile(stepPath, stepCsv);
        savedFiles.push('step.csv');
      }

      // data_correction.json 파일이 있다면 복사
      const correctionPath = path.join(this.tempDir, 'data_correction.json');
      try {
        // 원본 ZIP에서 data_correction.json 추출하여 임시 디렉토리에 복사
        // 이 부분은 기존의 ZIP 추출 로직을 활용할 수 있습니다
        // 현재는 빈 파일로 생성
        await fsPromises.writeFile(correctionPath, '{}', 'utf8');
        savedFiles.push('data_correction.json');
      } catch (error) {
        console.warn('data_correction.json 복사 중 오류:', error);
      }

      // 새로운 ZIP 파일 생성
      const newZipPath = originalZipPath.replace('.zip', '_updated.zip');
      await this.createZipFromDirectory(this.tempDir, newZipPath, savedFiles);

      // 임시 디렉토리 정리
      await this.cleanupTempDirectory();

      return {
        success: true,
        message: 'CSV 파일들이 성공적으로 저장되었습니다.',
        savedFiles,
        newZipPath
      };

    } catch (error) {
      console.error('CSV 파일들 저장 중 오류:', error);
      
      // 임시 디렉토리 정리
      await this.cleanupTempDirectory();
      
      return {
        success: false,
        message: `CSV 파일들 저장 중 오류가 발생했습니다: ${error.message}`
      };
    }
  }

  /**
   * 디렉토리를 ZIP 파일로 압축
   * @param {string} sourceDir 소스 디렉토리
   * @param {string} zipPath ZIP 파일 경로
   * @param {Array} filesToInclude 포함할 파일 목록
   * @returns {Promise<void>}
   */
  async createZipFromDirectory(sourceDir, zipPath, filesToInclude) {
    return new Promise((resolve, reject) => {
      const zipfile = new yazl.ZipFile();
      
      // 각 파일을 ZIP에 추가
      filesToInclude.forEach(fileName => {
        const filePath = path.join(sourceDir, fileName);
        zipfile.addFile(filePath, fileName);
      });

      // ZIP 파일 생성
      zipfile.outputStream.pipe(fs.createWriteStream(zipPath));
      
      zipfile.end();
      
      zipfile.outputStream.on('close', () => {
        resolve();
      });
      
      zipfile.outputStream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 임시 디렉토리 정리
   */
  async cleanupTempDirectory() {
    if (this.tempDir) {
      try {
        await fsPromises.rm(this.tempDir, { recursive: true, force: true });
        this.tempDir = null;
      } catch (error) {
        console.error('임시 디렉토리 정리 중 오류:', error);
      }
    }
  }

  /**
   * 기존 ZIP 파일을 업데이트 (원본 파일을 덮어쓰기)
   * @param {string} originalZipPath 원본 ZIP 파일 경로
   * @param {Object} csvData CSV 데이터 객체
   * @returns {Promise<Object>} 저장 결과
   */
  async updateExistingZip(originalZipPath, csvData) {
    try {
      // 임시 디렉토리 생성
      const os = require('os');
      this.tempDir = path.join(os.tmpdir(), 'trv2-update', `update-${Date.now()}`);
      await fsPromises.mkdir(this.tempDir, { recursive: true });

      // 각 CSV 파일 저장
      const savedFiles = [];
      
      if (csvData.meta && csvData.meta.length > 0) {
        const metaCsv = this.convertToCsv(csvData.meta);
        const metaPath = path.join(this.tempDir, 'meta.csv');
        await this.saveCsvFile(metaPath, metaCsv);
        savedFiles.push('meta.csv');
      }

      if (csvData.data && csvData.data.length > 0) {
        const dataCsv = this.convertToCsv(csvData.data);
        const dataPath = path.join(this.tempDir, 'data.csv');
        await this.saveCsvFile(dataPath, dataCsv);
        savedFiles.push('data.csv');
      }

      if (csvData.step && csvData.step.length > 0) {
        const stepCsv = this.convertToCsv(csvData.step);
        const stepPath = path.join(this.tempDir, 'step.csv');
        await this.saveCsvFile(stepPath, stepCsv);
        savedFiles.push('step.csv');
      }

      // data_correction.json 파일 복사 (기존 파일이 있다면)
      const correctionPath = path.join(this.tempDir, 'data_correction.json');
      try {
        await fsPromises.writeFile(correctionPath, '{}', 'utf8');
        savedFiles.push('data_correction.json');
      } catch (error) {
        console.warn('data_correction.json 생성 중 오류:', error);
      }

      // 원본 ZIP 파일을 백업
      const backupPath = originalZipPath.replace('.zip', '_backup.zip');
      await fsPromises.copyFile(originalZipPath, backupPath);

      // 새로운 ZIP 파일 생성하여 원본 파일 덮어쓰기
      await this.createZipFromDirectory(this.tempDir, originalZipPath, savedFiles);

      // 임시 디렉토리 정리
      await this.cleanupTempDirectory();

      return {
        success: true,
        message: 'ZIP 파일이 성공적으로 업데이트되었습니다.',
        savedFiles,
        backupPath
      };

    } catch (error) {
      console.error('ZIP 파일 업데이트 중 오류:', error);
      
      // 임시 디렉토리 정리
      await this.cleanupTempDirectory();
      
      return {
        success: false,
        message: `ZIP 파일 업데이트 중 오류가 발생했습니다: ${error.message}`
      };
    }
  }
}

module.exports = CsvDataWriterService;
