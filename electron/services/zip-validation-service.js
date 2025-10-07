const fs = require('fs').promises;
const yauzl = require('yauzl');
const { promisify } = require('util');

// yauzl을 Promise로 래핑
const openZip = promisify(yauzl.open);

class ZipValidationService {
  constructor() {
    this.requiredFiles = ['data.csv', 'meta.csv', 'step.csv'];
  }

  /**
   * ZIP 파일 내부 구조 검증
   * @param {string} filePath ZIP 파일 경로
   * @returns {Promise<Object>} 검증 결과
   */
  async validateZipStructure(filePath) {
    try {
      const zipfile = await openZip(filePath, { lazyEntries: true });
      
      return new Promise((resolve, reject) => {
        const foundFiles = new Set();
        const foundFilePaths = new Map(); // 실제 경로 저장
        let entryCount = 0;
        let hasError = false;

        zipfile.on('entry', (entry) => {
          entryCount++;
          const fileName = entry.fileName;
          
          // 디렉토리가 아닌 파일만 확인
          if (!fileName.endsWith('/')) {
            // 파일명만 추출 (경로 제거)
            const baseFileName = fileName.split('/').pop();
            
            // CSV 파일 확인 (루트 또는 하위 폴더에 있는 파일 모두 확인)
            if (this.requiredFiles.includes(baseFileName)) {
              foundFiles.add(baseFileName);
              foundFilePaths.set(baseFileName, fileName);
            }
          }
          
          // 다음 엔트리 읽기
          zipfile.readEntry();
        });

        zipfile.on('end', () => {
          zipfile.close();
          
          if (hasError) {
            resolve({
              valid: false,
              message: 'ZIP 파일을 읽는 중 오류가 발생했습니다.',
              foundFiles: Array.from(foundFiles),
              foundFilePaths: Object.fromEntries(foundFilePaths),
              missingFiles: this.requiredFiles.filter(file => !foundFiles.has(file))
            });
            return;
          }

          // 필수 파일들이 모두 있는지 확인
          const missingFiles = this.requiredFiles.filter(file => !foundFiles.has(file));
          
          if (missingFiles.length > 0) {
            resolve({
              valid: false,
              message: `필수 파일이 누락되었습니다: ${missingFiles.join(', ')}`,
              foundFiles: Array.from(foundFiles),
              foundFilePaths: Object.fromEntries(foundFilePaths),
              missingFiles
            });
          } else {
            resolve({
              valid: true,
              message: 'ZIP 파일 구조가 유효합니다.',
              foundFiles: Array.from(foundFiles),
              foundFilePaths: Object.fromEntries(foundFilePaths),
              missingFiles: []
            });
          }
        });

        zipfile.on('error', (error) => {
          hasError = true;
          zipfile.close();
          reject(error);
        });

        // 첫 번째 엔트리 읽기 시작
        zipfile.readEntry();
      });
    } catch (error) {
      console.error('ZIP 구조 검증 중 오류:', error);
      return {
        valid: false,
        message: `ZIP 파일 검증 중 오류가 발생했습니다: ${error.message}`,
        foundFiles: [],
        foundFilePaths: {},
        missingFiles: this.requiredFiles
      };
    }
  }

  /**
   * ZIP 파일 내부에 data_correction.json 파일이 있는지 확인
   * @param {string} filePath ZIP 파일 경로
   * @returns {Promise<Object>} 확인 결과
   */
  async checkDataCorrectionFile(filePath) {
    try {
      const zipfile = await openZip(filePath, { lazyEntries: true });
      
      return new Promise((resolve, reject) => {
        let hasDataCorrection = false;
        let hasError = false;

        zipfile.on('entry', (entry) => {
          const fileName = entry.fileName;
          
          if (fileName === 'data_correction.json') {
            hasDataCorrection = true;
          }
          
          // 다음 엔트리 읽기
          zipfile.readEntry();
        });

        zipfile.on('end', () => {
          zipfile.close();
          
          if (hasError) {
            resolve({
              hasFile: false,
              message: 'ZIP 파일을 읽는 중 오류가 발생했습니다.'
            });
            return;
          }

          resolve({
            hasFile: hasDataCorrection,
            message: hasDataCorrection ? 'data_correction.json 파일이 존재합니다.' : 'data_correction.json 파일이 없습니다.'
          });
        });

        zipfile.on('error', (error) => {
          hasError = true;
          zipfile.close();
          reject(error);
        });

        // 첫 번째 엔트리 읽기 시작
        zipfile.readEntry();
      });
    } catch (error) {
      console.error('data_correction.json 파일 확인 중 오류:', error);
      return {
        hasFile: false,
        message: `파일 확인 중 오류가 발생했습니다: ${error.message}`
      };
    }
  }

  /**
   * ZIP 파일의 전체 파일 목록 가져오기
   * @param {string} filePath ZIP 파일 경로
   * @returns {Promise<Array>} 파일 목록
   */
  async getZipFileList(filePath) {
    try {
      const zipfile = await openZip(filePath, { lazyEntries: true });
      
      return new Promise((resolve, reject) => {
        const fileList = [];
        let hasError = false;

        zipfile.on('entry', (entry) => {
          fileList.push({
            name: entry.fileName,
            size: entry.uncompressedSize,
            compressedSize: entry.compressedSize,
            isDirectory: entry.fileName.endsWith('/')
          });
          
          // 다음 엔트리 읽기
          zipfile.readEntry();
        });

        zipfile.on('end', () => {
          zipfile.close();
          
          if (hasError) {
            resolve([]);
            return;
          }

          resolve(fileList);
        });

        zipfile.on('error', (error) => {
          hasError = true;
          zipfile.close();
          reject(error);
        });

        // 첫 번째 엔트리 읽기 시작
        zipfile.readEntry();
      });
    } catch (error) {
      console.error('ZIP 파일 목록 가져오기 중 오류:', error);
      return [];
    }
  }

  /**
   * ZIP 파일의 특정 파일 내용 읽기
   * @param {string} filePath ZIP 파일 경로
   * @param {string} targetFileName 읽을 파일명
   * @returns {Promise<Buffer>} 파일 내용
   */
  async readFileFromZip(filePath, targetFileName) {
    try {
      const zipfile = await openZip(filePath, { lazyEntries: true });
      
      return new Promise((resolve, reject) => {
        let found = false;
        let hasError = false;

        zipfile.on('entry', (entry) => {
          if (entry.fileName === targetFileName) {
            found = true;
            
            // 파일 읽기
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                hasError = true;
                zipfile.close();
                reject(err);
                return;
              }

              const chunks = [];
              readStream.on('data', (chunk) => {
                chunks.push(chunk);
              });

              readStream.on('end', () => {
                zipfile.close();
                resolve(Buffer.concat(chunks));
              });

              readStream.on('error', (err) => {
                hasError = true;
                zipfile.close();
                reject(err);
              });
            });
          } else {
            // 다음 엔트리 읽기
            zipfile.readEntry();
          }
        });

        zipfile.on('end', () => {
          if (!found && !hasError) {
            zipfile.close();
            reject(new Error(`파일을 찾을 수 없습니다: ${targetFileName}`));
          }
        });

        zipfile.on('error', (error) => {
          hasError = true;
          zipfile.close();
          reject(error);
        });

        // 첫 번째 엔트리 읽기 시작
        zipfile.readEntry();
      });
    } catch (error) {
      console.error('ZIP 파일에서 파일 읽기 중 오류:', error);
      throw error;
    }
  }
}

module.exports = ZipValidationService;
