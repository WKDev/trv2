const fs = require('fs').promises;
const path = require('path');
const yauzl = require('yauzl');
const yazl = require('yazl');
const { promisify } = require('util');

// yauzl을 Promise로 래핑
const openZip = promisify(yauzl.open);

class OptionsService {
  constructor() {
    this.verbose = process.env.NODE_ENV === 'development'; // 개발 환경에서만 상세 로그 출력
    this.defaultOptions = {
      prep: {
        outlierRemoval: {
          // 적용 모드 설정 (bulk: 일괄 적용, individual: 개별 적용)
          applyMode: 'bulk',
          // 일괄 적용 시 사용할 기본 설정
          bulkSettings: {
            useIQR: true,
            iqrMultiplier: 1.5,
            useZScore: true,
            zScoreThreshold: 3.0
          },
          // 개별 컬럼별 설정
          Level1: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 },
          Level2: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 },
          Level3: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 },
          Level4: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 },
          Level5: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 },
          Level6: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 },
          Encoder3: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 },
          Ang1: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 },
          Ang2: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 },
          Ang3: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 }
        },
        scaleOffset: {
          Level1: { Scaler: 1, offset: 0 },
          Level2: { Scaler: 1, offset: 0 },
          Level3: { Scaler: 1, offset: 0 },
          Level4: { Scaler: 1, offset: 0 },
          Level5: { Scaler: 1, offset: 0 },
          Level6: { Scaler: 1, offset: 0 },
          Encoder3: { Scaler: 1, offset: 0 },
          Ang1: { Scaler: 1, offset: 0 },
          Ang2: { Scaler: 1, offset: 0 },
          Ang3: { Scaler: 1, offset: 0 }
        },
        aggregation: {
          interval: 1.0,
          method: 'mean',
          emaSpan: 5
        }
      }
    };
  }

  /**
   * ZIP 파일에서 options.json 파일 확인
   * @param {string} zipFilePath ZIP 파일 경로
   * @returns {Promise<Object>} 확인 결과
   */
  async checkOptionsFile(zipFilePath) {
    try {
      const zipfile = await openZip(zipFilePath, { lazyEntries: true });
      
      return new Promise((resolve, reject) => {
        let hasOptionsFile = false;
        let hasError = false;

        zipfile.on('entry', (entry) => {
          if (entry.fileName === 'options.json') {
            hasOptionsFile = true;
            zipfile.close();
            resolve({
              hasFile: true,
              message: 'options.json 파일이 존재합니다.'
            });
          } else {
            zipfile.readEntry();
          }
        });

        zipfile.on('end', () => {
          if (!hasOptionsFile && !hasError) {
            zipfile.close();
            resolve({
              hasFile: false,
              message: 'options.json 파일이 없습니다.'
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
      console.error('options.json 파일 확인 중 오류:', error);
      return {
        hasFile: false,
        message: 'options.json 파일 확인 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * ZIP 파일에서 options.json 파일 읽기
   * @param {string} zipFilePath ZIP 파일 경로
   * @returns {Promise<Object>} 읽기 결과
   */
  async readOptionsFile(zipFilePath) {
    try {
      const zipfile = await openZip(zipFilePath, { lazyEntries: true });
      
      return new Promise((resolve, reject) => {
        let optionsData = null;
        let hasError = false;

        zipfile.on('entry', (entry) => {
          if (entry.fileName === 'options.json') {
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                hasError = true;
                zipfile.close();
                reject(err);
                return;
              }

              let data = '';
              readStream.on('data', (chunk) => {
                data += chunk.toString();
              });

              readStream.on('end', () => {
                try {
                  const rawOptionsData = JSON.parse(data);
                  console.log('📖 options.json 파일 읽기 성공');
                  
                  // 데이터 검증 및 기본값 보완
                  const validatedOptionsData = this.validateAndCompleteOptions(rawOptionsData);
                  
                  zipfile.close();
                  resolve({
                    success: true,
                    message: 'options.json 파일을 성공적으로 읽고 검증했습니다.',
                    data: validatedOptionsData
                  });
                } catch (parseError) {
                  console.error('❌ options.json 파일 파싱 오류:', parseError);
                  hasError = true;
                  zipfile.close();
                  resolve({
                    success: false,
                    message: 'options.json 파일 파싱 중 오류가 발생했습니다.',
                    data: null
                  });
                }
              });

              readStream.on('error', (streamError) => {
                hasError = true;
                zipfile.close();
                reject(streamError);
              });
            });
          } else {
            zipfile.readEntry();
          }
        });

        zipfile.on('end', () => {
          if (!optionsData && !hasError) {
            zipfile.close();
            resolve({
              success: false,
              message: 'options.json 파일을 찾을 수 없습니다.',
              data: null
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
      console.error('options.json 파일 읽기 중 오류:', error);
      return {
        success: false,
        message: 'options.json 파일 읽기 중 오류가 발생했습니다.',
        data: null
      };
    }
  }

  /**
   * ZIP 파일에 options.json 파일 추가/업데이트
   * @param {string} zipFilePath ZIP 파일 경로
   * @param {Object} optionsData 옵션 데이터
   * @returns {Promise<Object>} 결과
   */
  async updateZipWithOptions(zipFilePath, optionsData = null) {
    try {
      let optionsToSave;
      if (optionsData) {
        // 업데이트 시에는 검증하지 않고 그대로 사용 (검증은 파일 읽기 시에만)
        optionsToSave = optionsData;
        if (this.verbose) console.log('🔧 options.json 업데이트 - 데이터 저장 중...');
      } else {
        if (this.verbose) console.log('🔧 options.json 업데이트 - 기본값 사용');
        optionsToSave = this.defaultOptions;
      }
      
      const optionsJsonString = JSON.stringify(optionsToSave, null, 2);
      if (this.verbose) console.log('💾 options.json 저장 준비 완료');
      
      // 임시 디렉토리 생성
      const tempDir = path.join(__dirname, '..', '..', 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      
      const tempZipPath = path.join(tempDir, `temp_${Date.now()}.zip`);
      
      // 기존 ZIP 파일을 읽어서 새 ZIP 파일로 복사하면서 options.json 추가/업데이트
      const zipfile = await openZip(zipFilePath, { lazyEntries: true });
      
      return new Promise((resolve, reject) => {
        const zipfile2 = new yazl.ZipFile();
        const outputStream = require('fs').createWriteStream(tempZipPath);
        zipfile2.outputStream.pipe(outputStream);
        
        let hasOptionsFile = false;
        let hasError = false;
        
        zipfile.on('entry', (entry) => {
          if (entry.fileName === 'options.json') {
            // options.json 파일이 있으면 새 데이터로 교체
            hasOptionsFile = true;
            zipfile2.addBuffer(Buffer.from(optionsJsonString, 'utf8'), 'options.json');
            zipfile.readEntry();
          } else {
            // 다른 파일들은 그대로 복사
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                hasError = true;
                zipfile.close();
                zipfile2.end();
                reject(err);
                return;
              }
              
              zipfile2.addReadStream(readStream, entry.fileName);
              readStream.on('end', () => {
                zipfile.readEntry();
              });
              readStream.on('error', (streamError) => {
                hasError = true;
                zipfile.close();
                zipfile2.end();
                reject(streamError);
              });
            });
          }
        });
        
        zipfile.on('end', () => {
          if (!hasOptionsFile && !hasError) {
            // options.json 파일이 없으면 새로 추가
            zipfile2.addBuffer(Buffer.from(optionsJsonString, 'utf8'), 'options.json');
          }
          
          zipfile.close();
          zipfile2.end();
        });
        
        zipfile.on('error', (error) => {
          hasError = true;
          zipfile.close();
          zipfile2.end();
          reject(error);
        });
        
        // yazl ZipFile이 완료되면 파일 교체
        zipfile2.outputStream.on('finish', async () => {
          try {
            // 파일이 완전히 쓰여졌는지 확인
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 원본 파일을 임시 파일로 교체
            await fs.rename(tempZipPath, zipFilePath);
            
            resolve({
              success: true,
              message: 'options.json 파일이 성공적으로 추가/업데이트되었습니다.'
            });
          } catch (renameError) {
            reject(renameError);
          }
        });
        
        zipfile.readEntry();
      });
    } catch (error) {
      console.error('options.json 파일 추가/업데이트 중 오류:', error);
      return {
        success: false,
        message: 'options.json 파일 추가/업데이트 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 기본 옵션 데이터 반환
   * @returns {Object} 기본 옵션 데이터
   */
  getDefaultOptions() {
    return JSON.parse(JSON.stringify(this.defaultOptions));
  }

  /**
   * options.json 데이터 검증 및 기본값 보완
   * @param {Object} optionsData 기존 options.json 데이터
   * @returns {Object} 검증 및 보완된 options 데이터
   */
  validateAndCompleteOptions(optionsData) {
    if (this.verbose) console.log('🔍 options.json 데이터 검증 시작...');
    
    if (!optionsData || typeof optionsData !== 'object') {
      if (this.verbose) console.log('⚠️ options.json 데이터가 없거나 유효하지 않음. 기본값 사용');
      return this.getDefaultOptions();
    }

    let hasChanges = false;
    let addedFields = []; // 추가된 필드들을 추적
    const result = JSON.parse(JSON.stringify(optionsData));

    // prep 섹션 검증
    if (!result.prep || typeof result.prep !== 'object') {
      if (this.verbose) console.log('📝 prep 섹션이 없음. 기본값 추가');
      result.prep = this.defaultOptions.prep;
      hasChanges = true;
      addedFields.push('prep');
    } else {
      // outlierRemoval 섹션 검증
      if (!result.prep.outlierRemoval || typeof result.prep.outlierRemoval !== 'object') {
        if (this.verbose) console.log('📝 outlierRemoval 섹션이 없음. 기본값 추가');
        result.prep.outlierRemoval = this.defaultOptions.prep.outlierRemoval;
        hasChanges = true;
        addedFields.push('prep.outlierRemoval');
      } else {
        // applyMode 검증
        if (!result.prep.outlierRemoval.applyMode || 
            !['bulk', 'individual'].includes(result.prep.outlierRemoval.applyMode)) {
          if (this.verbose) console.log('📝 applyMode가 없거나 유효하지 않음. 기본값 "bulk" 추가');
          result.prep.outlierRemoval.applyMode = this.defaultOptions.prep.outlierRemoval.applyMode;
          hasChanges = true;
          addedFields.push('prep.outlierRemoval.applyMode');
        }

        // bulkSettings 검증
        if (!result.prep.outlierRemoval.bulkSettings || 
            typeof result.prep.outlierRemoval.bulkSettings !== 'object') {
          if (this.verbose) console.log('📝 bulkSettings가 없음. 기본값 추가');
          result.prep.outlierRemoval.bulkSettings = this.defaultOptions.prep.outlierRemoval.bulkSettings;
          hasChanges = true;
          addedFields.push('prep.outlierRemoval.bulkSettings');
        } else {
          // bulkSettings 내부 필드 검증
          const bulkDefaults = this.defaultOptions.prep.outlierRemoval.bulkSettings;
          Object.keys(bulkDefaults).forEach(key => {
            if (!(key in result.prep.outlierRemoval.bulkSettings)) {
              if (this.verbose) console.log(`📝 bulkSettings.${key}가 없음. 기본값 추가`);
              result.prep.outlierRemoval.bulkSettings[key] = bulkDefaults[key];
              hasChanges = true;
              addedFields.push(`prep.outlierRemoval.bulkSettings.${key}`);
            }
          });
        }

        // 개별 컬럼 설정 검증
        const columnDefaults = this.defaultOptions.prep.outlierRemoval;
        const requiredColumns = ['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2', 'Ang3'];
        
        requiredColumns.forEach(column => {
          if (!result.prep.outlierRemoval[column] || 
              typeof result.prep.outlierRemoval[column] !== 'object') {
            if (this.verbose) console.log(`📝 ${column} 컬럼 설정이 없음. 기본값 추가`);
            result.prep.outlierRemoval[column] = columnDefaults[column];
            hasChanges = true;
            addedFields.push(`prep.outlierRemoval.${column}`);
          } else {
            // 각 컬럼의 필수 필드 검증
            const columnDefaults = this.defaultOptions.prep.outlierRemoval[column];
            Object.keys(columnDefaults).forEach(key => {
              if (!(key in result.prep.outlierRemoval[column])) {
                if (this.verbose) console.log(`📝 ${column}.${key}가 없음. 기본값 추가`);
                result.prep.outlierRemoval[column][key] = columnDefaults[key];
                hasChanges = true;
                addedFields.push(`prep.outlierRemoval.${column}.${key}`);
              }
            });
          }
        });
      }

      // scaleOffset 섹션 검증
      if (!result.prep.scaleOffset || typeof result.prep.scaleOffset !== 'object') {
        if (this.verbose) console.log('📝 scaleOffset 섹션이 없음. 기본값 추가');
        result.prep.scaleOffset = this.defaultOptions.prep.scaleOffset;
        hasChanges = true;
        addedFields.push('prep.scaleOffset');
      } else {
        // scaleOffset 개별 컬럼 설정 검증
        const requiredColumns = ['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2', 'Ang3'];
        
        requiredColumns.forEach(column => {
          if (!result.prep.scaleOffset[column] || 
              typeof result.prep.scaleOffset[column] !== 'object') {
            if (this.verbose) console.log(`📝 scaleOffset.${column} 설정이 없음. 기본값 추가`);
            result.prep.scaleOffset[column] = this.defaultOptions.prep.scaleOffset[column];
            hasChanges = true;
            addedFields.push(`prep.scaleOffset.${column}`);
          } else {
            // 각 컬럼의 필수 필드 검증
            const columnDefaults = this.defaultOptions.prep.scaleOffset[column];
            Object.keys(columnDefaults).forEach(key => {
              if (!(key in result.prep.scaleOffset[column])) {
                if (this.verbose) console.log(`📝 scaleOffset.${column}.${key}가 없음. 기본값 추가`);
                result.prep.scaleOffset[column][key] = columnDefaults[key];
                hasChanges = true;
                addedFields.push(`prep.scaleOffset.${column}.${key}`);
              }
            });
          }
        });
      }

      // aggregation 섹션 검증
      if (!result.prep.aggregation || typeof result.prep.aggregation !== 'object') {
        if (this.verbose) console.log('📝 aggregation 섹션이 없음. 기본값 추가');
        result.prep.aggregation = this.defaultOptions.prep.aggregation;
        hasChanges = true;
        addedFields.push('prep.aggregation');
      } else {
        // aggregation 필수 필드 검증
        const aggDefaults = this.defaultOptions.prep.aggregation;
        Object.keys(aggDefaults).forEach(key => {
          if (!(key in result.prep.aggregation)) {
            if (this.verbose) console.log(`📝 aggregation.${key}가 없음. 기본값 추가`);
            result.prep.aggregation[key] = aggDefaults[key];
            hasChanges = true;
            addedFields.push(`prep.aggregation.${key}`);
          }
        });
      }
    }

    // 요약된 로그 출력
    if (hasChanges) {
      if (this.verbose) {
        console.log('✅ options.json 데이터 검증 완료. 일부 기본값이 추가되었습니다.');
        console.log(`📋 추가된 필드: ${addedFields.join(', ')}`);
      } else {
        console.log(`✅ options.json 검증 완료 (${addedFields.length}개 필드 추가)`);
      }
    } else {
      if (this.verbose) {
        console.log('✅ options.json 데이터 검증 완료. 모든 필수 필드가 존재합니다.');
      }
      // 변경사항이 없을 때는 로그를 출력하지 않음
    }

    return result;
  }

  /**
   * 특정 섹션의 기본값 반환
   * @param {string} section 섹션명 (예: 'prep.outlierRemoval')
   * @returns {Object} 해당 섹션의 기본값
   */
  getDefaultSection(section) {
    const keys = section.split('.');
    let current = this.defaultOptions;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return null;
      }
    }
    
    return JSON.parse(JSON.stringify(current));
  }
}

module.exports = OptionsService;
