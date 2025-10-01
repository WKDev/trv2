const fs = require('fs').promises;
const path = require('path');
const yauzl = require('yauzl');
const yazl = require('yazl');
const { promisify } = require('util');

// yauzl을 Promise로 래핑
const openZip = promisify(yauzl.open);

class DataCorrectionService {
  constructor() {
    this.defaultCorrectionData = {
      "preprocessing": {
        "Level1": {
          "Scaler": 1.0,
          "offset": 0.0
        },
        "Level2": {
          "Scaler": 1.0,
          "offset": 0.0
        },
        "Level3": {
          "Scaler": 1.0,
          "offset": 0.0
        },
        "Level4": {
          "Scaler": 1.0,
          "offset": 0.0
        },
        "Level5": {
          "Scaler": 1.0,
          "offset": 0.0
        },
        "Level6": {
          "Scaler": 1.0,
          "offset": 0.0
        },
        "Encoder3": {
          "Scaler": 1.0,
          "offset": 0.0
        },
        "Ang1": {
          "Scaler": 1.0,
          "offset": 0.0
        },
        "Ang2": {
          "Scaler": 1.0,
          "offset": 0.0
        },
        "Ang3": {
          "Scaler": 1.0,
          "offset": 0.0
        }
      },
      "analysis": {
        "level_deviation": {
          "Scaler": 1.0,
          "offset": 0.0
        },
        "cross_level": {
          "Scaler": 1.0,
          "offset": 0.0
        },
        "planarity": {
          "Scaler": 1.0,
          "offset": 0.0
        },
        "longitudinal_level_irregularity": {
          "Scaler": 1.0,
          "offset": 0.0
        },
        "guard_rail_clearance": {
          "Scaler": 1.0,
          "offset": 0.0
        },
        "joint_step": {
          "Scaler": 1.0,
          "offset": 0.0
        },
        "straightness_of_alignment": {
          "Scaler": 1.0,
          "offset": 0.0
        }
      }
    };
  }

  /**
   * ZIP 파일에 data_correction.json 파일이 있는지 확인
   * @param {string} zipFilePath ZIP 파일 경로
   * @returns {Promise<Object>} 확인 결과
   */
  async checkDataCorrectionFile(zipFilePath) {
    try {
      const zipfile = await openZip(zipFilePath, { lazyEntries: true });
      
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
   * ZIP 파일에 data_correction.json 파일 추가
   * @param {string} zipFilePath 원본 ZIP 파일 경로
   * @param {string} outputPath 새로운 ZIP 파일 저장 경로
   * @param {Object} correctionData 추가할 보정 데이터 (선택사항)
   * @returns {Promise<Object>} 처리 결과
   */
  async addDataCorrectionToZip(zipFilePath, outputPath, correctionData = null) {
    try {
      const dataToAdd = correctionData || this.defaultCorrectionData;
      const jsonString = JSON.stringify(dataToAdd, null, 2);
      
      // 기존 ZIP 파일의 모든 파일을 새 ZIP에 복사하면서 data_correction.json 추가
      const zipfile = await openZip(zipFilePath, { lazyEntries: true });
      
      return new Promise((resolve, reject) => {
        const zip = new yazl.ZipFile();
        const files = [];
        let hasError = false;

        // 기존 파일들 수집
        zipfile.on('entry', (entry) => {
          files.push(entry);
          zipfile.readEntry();
        });

        zipfile.on('end', () => {
          zipfile.close();
          
          if (hasError) {
            resolve({
              success: false,
              message: 'ZIP 파일을 읽는 중 오류가 발생했습니다.'
            });
            return;
          }

          // 기존 파일들을 새 ZIP에 추가
          this.addFilesToZip(zip, zipFilePath, files).then(() => {
            // data_correction.json 추가
            zip.addBuffer(Buffer.from(jsonString, 'utf8'), 'data_correction.json');
            
            // ZIP 파일 완성
            zip.end();
            
            // 파일 저장
            const writeStream = require('fs').createWriteStream(outputPath);
            zip.outputStream.pipe(writeStream);
            
            writeStream.on('close', () => {
              resolve({
                success: true,
                message: 'data_correction.json 파일이 추가되었습니다.',
                outputPath
              });
            });
            
            writeStream.on('error', (err) => {
              resolve({
                success: false,
                message: `파일 저장 중 오류가 발생했습니다: ${err.message}`
              });
            });
          }).catch(err => {
            resolve({
              success: false,
              message: `ZIP 파일 처리 중 오류가 발생했습니다: ${err.message}`
            });
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
      console.error('data_correction.json 파일 추가 중 오류:', error);
      return {
        success: false,
        message: `파일 추가 중 오류가 발생했습니다: ${error.message}`
      };
    }
  }

  /**
   * 기존 파일들을 새 ZIP에 추가하는 헬퍼 함수
   * @param {yazl.ZipFile} zip 새 ZIP 파일 객체
   * @param {string} zipFilePath 원본 ZIP 파일 경로
   * @param {Array} files 추가할 파일 목록
   * @returns {Promise<void>}
   */
  async addFilesToZip(zip, zipFilePath, files) {
    return new Promise((resolve, reject) => {
      let processedCount = 0;
      let hasError = false;

      if (files.length === 0) {
        resolve();
        return;
      }

      files.forEach(entry => {
        if (hasError) return;

        // data_correction.json은 건너뛰기 (새로 추가할 예정)
        if (entry.fileName === 'data_correction.json') {
          processedCount++;
          if (processedCount === files.length) {
            resolve();
          }
          return;
        }

        // 파일 읽기
        const zipfile = require('yauzl').open(zipFilePath, { lazyEntries: true }, (err, zipfile) => {
          if (err) {
            hasError = true;
            reject(err);
            return;
          }

          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              hasError = true;
              reject(err);
              return;
            }

            const chunks = [];
            readStream.on('data', (chunk) => {
              chunks.push(chunk);
            });

            readStream.on('end', () => {
              const buffer = Buffer.concat(chunks);
              zip.addBuffer(buffer, entry.fileName);
              
              processedCount++;
              if (processedCount === files.length) {
                resolve();
              }
            });

            readStream.on('error', (err) => {
              hasError = true;
              reject(err);
            });
          });
        });
      });
    });
  }

  /**
   * ZIP 파일을 업데이트 (data_correction.json 추가 또는 업데이트)
   * @param {string} zipFilePath 원본 ZIP 파일 경로
   * @param {Object} correctionData 보정 데이터
   * @returns {Promise<Object>} 처리 결과
   */
  async updateZipWithCorrection(zipFilePath, correctionData = null) {
    try {
      // 임시 파일 경로 생성
      const tempDir = require('os').tmpdir();
      const tempZipPath = path.join(tempDir, `temp_${Date.now()}.zip`);
      
      // data_correction.json 추가
      const result = await this.addDataCorrectionToZip(zipFilePath, tempZipPath, correctionData);
      
      if (!result.success) {
        return result;
      }

      // 원본 파일을 임시 파일로 교체
      await fs.copyFile(tempZipPath, zipFilePath);
      
      // 임시 파일 삭제
      await fs.unlink(tempZipPath);
      
      return {
        success: true,
        message: 'ZIP 파일이 성공적으로 업데이트되었습니다.',
        originalPath: zipFilePath
      };
    } catch (error) {
      console.error('ZIP 파일 업데이트 중 오류:', error);
      return {
        success: false,
        message: `ZIP 파일 업데이트 중 오류가 발생했습니다: ${error.message}`
      };
    }
  }

  /**
   * 기본 보정 데이터 가져오기
   * @returns {Object} 기본 보정 데이터
   */
  getDefaultCorrectionData() {
    return JSON.parse(JSON.stringify(this.defaultCorrectionData));
  }

  /**
   * 보정 데이터 유효성 검사
   * @param {Object} correctionData 검사할 보정 데이터
   * @returns {Object} 검사 결과
   */
  validateCorrectionData(correctionData) {
    try {
      if (!correctionData || typeof correctionData !== 'object') {
        return {
          valid: false,
          message: '보정 데이터가 유효하지 않습니다.'
        };
      }

      // 필수 섹션 확인
      if (!correctionData.preprocessing || !correctionData.analysis) {
        return {
          valid: false,
          message: 'preprocessing 또는 analysis 섹션이 누락되었습니다.'
        };
      }

      // 기본 구조 확인
      const defaultData = this.defaultCorrectionData;
      
      for (const section in defaultData) {
        if (!correctionData[section]) {
          return {
            valid: false,
            message: `${section} 섹션이 누락되었습니다.`
          };
        }

        for (const key in defaultData[section]) {
          if (!correctionData[section][key]) {
            return {
              valid: false,
              message: `${section}.${key} 항목이 누락되었습니다.`
            };
          }

          if (typeof correctionData[section][key].Scaler !== 'number' || 
              typeof correctionData[section][key].offset !== 'number') {
            return {
              valid: false,
              message: `${section}.${key}의 Scaler 또는 offset이 유효하지 않습니다.`
            };
          }
        }
      }

      return {
        valid: true,
        message: '보정 데이터가 유효합니다.'
      };
    } catch (error) {
      return {
        valid: false,
        message: `보정 데이터 검증 중 오류가 발생했습니다: ${error.message}`
      };
    }
  }
}

module.exports = DataCorrectionService;
