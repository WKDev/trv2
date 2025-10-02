const fs = require('fs').promises;
const path = require('path');
const yauzl = require('yauzl');
const { promisify } = require('util');

// yauzl을 Promise로 래핑
const openZip = promisify(yauzl.open);

class ZipExtractionService {
  constructor() {
    this.requiredFiles = ['data.csv', 'meta.csv', 'step.csv'];
  }

  /**
   * ZIP 파일을 임시 디렉토리에 압축 해제
   * @param {string} zipFilePath ZIP 파일 경로
   * @param {string} extractPath 압축 해제할 디렉토리 경로
   * @returns {Promise<Object>} 압축 해제 결과
   */
  async extractZipFile(zipFilePath, extractPath) {
    try {
      // 압축 해제 디렉토리 생성
      await fs.mkdir(extractPath, { recursive: true });

      const zipfile = await openZip(zipFilePath, { lazyEntries: true });
      
      return new Promise((resolve, reject) => {
        const extractedFiles = [];
        let hasError = false;

        zipfile.on('entry', (entry) => {
          const fileName = entry.fileName;
          
          // 디렉토리는 건너뛰기
          if (fileName.endsWith('/')) {
            zipfile.readEntry();
            return;
          }

          // 파일 압축 해제
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              hasError = true;
              zipfile.close();
              reject(err);
              return;
            }

            const outputPath = path.join(extractPath, fileName);
            
            // 디렉토리 생성 (필요한 경우)
            const dirPath = path.dirname(outputPath);
            fs.mkdir(dirPath, { recursive: true }).then(() => {
              const writeStream = require('fs').createWriteStream(outputPath);
              
              readStream.pipe(writeStream);
              
              writeStream.on('close', () => {
                extractedFiles.push({
                  name: fileName,
                  path: outputPath,
                  size: entry.uncompressedSize
                });
                zipfile.readEntry();
              });
              
              writeStream.on('error', (err) => {
                hasError = true;
                zipfile.close();
                reject(err);
              });
            }).catch(err => {
              hasError = true;
              zipfile.close();
              reject(err);
            });
          });
        });

        zipfile.on('end', () => {
          zipfile.close();
          
          if (hasError) {
            resolve({
              success: false,
              message: 'ZIP 파일 압축 해제 중 오류가 발생했습니다.',
              extractedFiles: []
            });
            return;
          }

          resolve({
            success: true,
            message: 'ZIP 파일이 성공적으로 압축 해제되었습니다.',
            extractedFiles,
            extractPath
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
      console.error('ZIP 파일 압축 해제 중 오류:', error);
      return {
        success: false,
        message: `ZIP 파일 압축 해제 중 오류가 발생했습니다: ${error.message}`,
        extractedFiles: []
      };
    }
  }

  /**
   * 압축 해제된 파일들 중 필수 CSV 파일들이 있는지 확인
   * @param {string} extractPath 압축 해제된 디렉토리 경로
   * @returns {Promise<Object>} 검증 결과
   */
  async validateExtractedFiles(extractPath) {
    try {
      const foundFiles = [];
      const missingFiles = [];

      for (const requiredFile of this.requiredFiles) {
        const filePath = path.join(extractPath, requiredFile);
        
        try {
          await fs.access(filePath, fs.constants.F_OK);
          foundFiles.push(requiredFile);
        } catch (error) {
          missingFiles.push(requiredFile);
        }
      }

      if (missingFiles.length > 0) {
        return {
          valid: false,
          message: `필수 파일이 누락되었습니다: ${missingFiles.join(', ')}`,
          foundFiles,
          missingFiles
        };
      }

      return {
        valid: true,
        message: '모든 필수 파일이 존재합니다.',
        foundFiles,
        missingFiles: []
      };
    } catch (error) {
      console.error('압축 해제된 파일 검증 중 오류:', error);
      return {
        valid: false,
        message: `파일 검증 중 오류가 발생했습니다: ${error.message}`,
        foundFiles: [],
        missingFiles: this.requiredFiles
      };
    }
  }

  /**
   * CSV 파일의 기본 구조 검증
   * @param {string} filePath CSV 파일 경로
   * @returns {Promise<Object>} 검증 결과
   */
  async validateCsvFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      
      // 파일 크기 확인 (0바이트가 아닌지)
      if (stats.size === 0) {
        return {
          valid: false,
          message: 'CSV 파일이 비어있습니다.',
          size: stats.size
        };
      }

      // 파일 읽기 시도
      const content = await fs.readFile(filePath, 'utf8');
      
      // 최소한의 CSV 구조 확인 (쉼표가 있는지)
      if (!content.includes(',')) {
        return {
          valid: false,
          message: '유효하지 않은 CSV 파일 형식입니다.',
          size: stats.size
        };
      }

      // 줄 수 확인
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      
      return {
        valid: true,
        message: 'CSV 파일이 유효합니다.',
        size: stats.size,
        lineCount: lines.length
      };
    } catch (error) {
      console.error('CSV 파일 검증 중 오류:', error);
      return {
        valid: false,
        message: `CSV 파일 검증 중 오류가 발생했습니다: ${error.message}`,
        size: 0
      };
    }
  }

  /**
   * 모든 필수 CSV 파일들의 구조 검증
   * @param {string} extractPath 압축 해제된 디렉토리 경로
   * @returns {Promise<Object>} 검증 결과
   */
  async validateAllCsvFiles(extractPath) {
    try {
      const validationResults = {};
      let allValid = true;
      const errors = [];

      for (const requiredFile of this.requiredFiles) {
        const filePath = path.join(extractPath, requiredFile);
        const result = await this.validateCsvFile(filePath);
        
        validationResults[requiredFile] = result;
        
        if (!result.valid) {
          allValid = false;
          errors.push(`${requiredFile}: ${result.message}`);
        }
      }

      return {
        valid: allValid,
        message: allValid ? '모든 CSV 파일이 유효합니다.' : '일부 CSV 파일에 문제가 있습니다.',
        results: validationResults,
        errors
      };
    } catch (error) {
      console.error('CSV 파일들 검증 중 오류:', error);
      return {
        valid: false,
        message: `CSV 파일 검증 중 오류가 발생했습니다: ${error.message}`,
        results: {},
        errors: [error.message]
      };
    }
  }

  /**
   * data.csv를 data_raw.csv로 백업
   * @param {string} extractPath 압축 해제된 디렉토리 경로
   * @returns {Promise<Object>} 백업 결과
   */
  async createDataRawBackup(extractPath) {
    try {
      const dataCsvPath = path.join(extractPath, 'data.csv');
      const dataRawCsvPath = path.join(extractPath, 'data_raw.csv');
      
      // data.csv 파일이 존재하는지 확인
      try {
        await fs.access(dataCsvPath, fs.constants.F_OK);
      } catch (error) {
        return {
          success: false,
          message: 'data.csv 파일을 찾을 수 없습니다.',
          hasBackup: false
        };
      }
      
      // data_raw.csv가 이미 존재하는지 확인
      try {
        await fs.access(dataRawCsvPath, fs.constants.F_OK);
        return {
          success: true,
          message: 'data_raw.csv 백업 파일이 이미 존재합니다.',
          hasBackup: true
        };
      } catch (error) {
        // data_raw.csv가 없으면 data.csv를 복사하여 생성
        await fs.copyFile(dataCsvPath, dataRawCsvPath);
        return {
          success: true,
          message: 'data_raw.csv 백업 파일이 생성되었습니다.',
          hasBackup: true
        };
      }
    } catch (error) {
      console.error('data_raw.csv 백업 생성 중 오류:', error);
      return {
        success: false,
        message: `백업 생성 중 오류가 발생했습니다: ${error.message}`,
        hasBackup: false
      };
    }
  }

  /**
   * data_raw.csv를 data.csv로 복원
   * @param {string} extractPath 압축 해제된 디렉토리 경로
   * @returns {Promise<Object>} 복원 결과
   */
  async restoreFromDataRaw(extractPath) {
    try {
      const dataCsvPath = path.join(extractPath, 'data.csv');
      const dataRawCsvPath = path.join(extractPath, 'data_raw.csv');
      
      // data_raw.csv 파일이 존재하는지 확인
      try {
        await fs.access(dataRawCsvPath, fs.constants.F_OK);
      } catch (error) {
        return {
          success: false,
          message: 'data_raw.csv 백업 파일을 찾을 수 없습니다.',
          restored: false
        };
      }
      
      // data_raw.csv를 data.csv로 복사
      await fs.copyFile(dataRawCsvPath, dataCsvPath);
      
      return {
        success: true,
        message: 'data_raw.csv에서 data.csv로 복원되었습니다.',
        restored: true
      };
    } catch (error) {
      console.error('data_raw.csv에서 복원 중 오류:', error);
      return {
        success: false,
        message: `복원 중 오류가 발생했습니다: ${error.message}`,
        restored: false
      };
    }
  }

  /**
   * ZIP 파일에 data_raw.csv 파일 추가 (data.csv를 복사)
   * @param {string} zipFilePath ZIP 파일 경로
   * @returns {Promise<Object>} 추가 결과
   */
  async addDataRawToZip(zipFilePath) {
    try {
      const yazl = require('yazl');
      const tempDir = require('os').tmpdir();
      const tempZipPath = path.join(tempDir, `temp_data_raw_${Date.now()}.zip`);
      
      // ZIP 파일에서 data.csv 읽기
      const zipfile = await openZip(zipFilePath, { lazyEntries: true });
      
      return new Promise((resolve, reject) => {
        let dataCsvBuffer = null;
        let hasError = false;

        zipfile.on('entry', (entry) => {
          if (entry.fileName === 'data.csv') {
            // data.csv 파일 읽기
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
                dataCsvBuffer = Buffer.concat(chunks);
                zipfile.readEntry();
              });

              readStream.on('error', (err) => {
                hasError = true;
                zipfile.close();
                reject(err);
              });
            });
          } else {
            zipfile.readEntry();
          }
        });

        zipfile.on('end', async () => {
          zipfile.close();
          
          if (hasError) {
            resolve({
              success: false,
              message: 'data.csv 파일을 읽는 중 오류가 발생했습니다.'
            });
            return;
          }

          if (!dataCsvBuffer) {
            resolve({
              success: false,
              message: 'data.csv 파일을 찾을 수 없습니다.'
            });
            return;
          }

          try {
            // 기존 ZIP 파일의 모든 파일을 새 ZIP에 복사하면서 data_raw.csv 추가
            const newZip = new yazl.ZipFile();
            const originalZipfile = await openZip(zipFilePath, { lazyEntries: true });
            
            originalZipfile.on('entry', (entry) => {
              if (entry.fileName === 'data_raw.csv') {
                // data_raw.csv가 이미 있으면 건너뛰기
                originalZipfile.readEntry();
                return;
              }
              
              // 다른 파일들은 새 ZIP에 추가
              originalZipfile.openReadStream(entry, (err, readStream) => {
                if (err) {
                  originalZipfile.readEntry();
                  return;
                }

                const chunks = [];
                readStream.on('data', (chunk) => {
                  chunks.push(chunk);
                });

                readStream.on('end', () => {
                  const buffer = Buffer.concat(chunks);
                  newZip.addBuffer(buffer, entry.fileName);
                  originalZipfile.readEntry();
                });

                readStream.on('error', () => {
                  originalZipfile.readEntry();
                });
              });
            });

            originalZipfile.on('end', () => {
              // data_raw.csv 추가
              newZip.addBuffer(dataCsvBuffer, 'data_raw.csv');
              
              // 새 ZIP 파일 완성
              newZip.end();
              
              // 파일 저장
              const writeStream = require('fs').createWriteStream(tempZipPath);
              newZip.outputStream.pipe(writeStream);
              
              writeStream.on('close', async () => {
                try {
                  // 원본 파일을 새 파일로 교체
                  await fs.copyFile(tempZipPath, zipFilePath);
                  await fs.unlink(tempZipPath);
                  
                  resolve({
                    success: true,
                    message: 'data_raw.csv 파일이 성공적으로 추가되었습니다.'
                  });
                } catch (error) {
                  resolve({
                    success: false,
                    message: `파일 저장 중 오류가 발생했습니다: ${error.message}`
                  });
                }
              });
              
              writeStream.on('error', (err) => {
                resolve({
                  success: false,
                  message: `파일 저장 중 오류가 발생했습니다: ${err.message}`
                });
              });
            });

            originalZipfile.on('error', (error) => {
              resolve({
                success: false,
                message: `ZIP 파일 처리 중 오류가 발생했습니다: ${error.message}`
              });
            });

            originalZipfile.readEntry();
          } catch (error) {
            resolve({
              success: false,
              message: `data_raw.csv 추가 중 오류가 발생했습니다: ${error.message}`
            });
          }
        });

        zipfile.on('error', (error) => {
          hasError = true;
          zipfile.close();
          reject(error);
        });

        zipfile.readEntry();
      });
    } catch (error) {
      console.error('data_raw.csv 추가 중 오류:', error);
      return {
        success: false,
        message: `data_raw.csv 추가 중 오류가 발생했습니다: ${error.message}`
      };
    }
  }

  /**
   * 압축 해제된 디렉토리 정리
   * @param {string} extractPath 정리할 디렉토리 경로
   */
  async cleanupExtractedFiles(extractPath) {
    try {
      await fs.rm(extractPath, { recursive: true, force: true });
    } catch (error) {
      console.error('압축 해제된 파일 정리 중 오류:', error);
    }
  }
}

module.exports = ZipExtractionService;
