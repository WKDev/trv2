const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { createReadStream } = require('fs');

class CsvDataReaderService {
  constructor() {
    this.requiredFiles = ['data.csv', 'meta.csv', 'step.csv'];
  }

  /**
   * CSV 파일을 파싱하여 객체 배열로 변환
   * @param {string} filePath CSV 파일 경로
   * @returns {Promise<Array>} 파싱된 데이터 배열
   */
  async parseCsvFile(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          results.push(data);
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * 모든 필수 CSV 파일들을 읽어서 통합 데이터 객체 생성
   * @param {string} extractPath 압축 해제된 디렉토리 경로
   * @returns {Promise<Object>} 통합된 데이터 객체
   */
  async readAllCsvFiles(extractPath) {
    try {
      const data = {
        data: null,
        meta: null,
        step: null,
        summary: {
          dataRows: 0,
          metaRows: 0,
          stepRows: 0,
          totalFiles: 0,
          successFiles: 0,
          errorFiles: []
        }
      };

      // 각 CSV 파일 읽기
      for (const fileName of this.requiredFiles) {
        const filePath = path.join(extractPath, fileName);
        
        try {
          const csvData = await this.parseCsvFile(filePath);
          const fileType = fileName.replace('.csv', '');
          
          data[fileType] = csvData;
          data.summary[`${fileType}Rows`] = csvData.length;
          data.summary.successFiles++;
          
        } catch (error) {
          console.error(`${fileName} 읽기 중 오류:`, error);
          data.summary.errorFiles.push({
            file: fileName,
            error: error.message
          });
        }
        
        data.summary.totalFiles++;
      }

      return {
        success: true,
        data,
        message: `${data.summary.successFiles}/${data.summary.totalFiles} 파일이 성공적으로 읽혔습니다.`
      };
    } catch (error) {
      console.error('CSV 파일들 읽기 중 오류:', error);
      return {
        success: false,
        data: null,
        message: `CSV 파일 읽기 중 오류가 발생했습니다: ${error.message}`
      };
    }
  }

  /**
   * 데이터 파일의 기본 정보 추출
   * @param {Array} dataRows 데이터 행 배열
   * @returns {Object} 데이터 기본 정보
   */
  extractDataInfo(dataRows) {
    if (!dataRows || dataRows.length === 0) {
      return {
        rowCount: 0,
        columnCount: 0,
        columns: [],
        hasData: false
      };
    }

    const firstRow = dataRows[0];
    const columns = Object.keys(firstRow);
    
    return {
      rowCount: dataRows.length,
      columnCount: columns.length,
      columns,
      hasData: true,
      sampleData: dataRows.slice(0, 5) // 처음 5행 샘플
    };
  }

  /**
   * 메타데이터 파일의 정보 추출
   * @param {Array} metaRows 메타데이터 행 배열
   * @returns {Object} 메타데이터 정보
   */
  extractMetaInfo(metaRows) {
    if (!metaRows || metaRows.length === 0) {
      return {
        rowCount: 0,
        hasData: false,
        metadata: {}
      };
    }

    // 메타데이터를 키-값 쌍으로 변환
    const metadata = {};
    metaRows.forEach(row => {
      const keys = Object.keys(row);
      if (keys.length >= 2) {
        const key = row[keys[0]];
        const value = row[keys[1]];
        if (key && value) {
          metadata[key] = value;
        }
      }
    });

    return {
      rowCount: metaRows.length,
      hasData: true,
      metadata
    };
  }

  /**
   * 스텝 파일의 정보 추출
   * @param {Array} stepRows 스텝 행 배열
   * @returns {Object} 스텝 정보
   */
  extractStepInfo(stepRows) {
    if (!stepRows || stepRows.length === 0) {
      return {
        rowCount: 0,
        hasData: false,
        steps: []
      };
    }

    return {
      rowCount: stepRows.length,
      hasData: true,
      steps: stepRows
    };
  }

  /**
   * 모든 데이터의 요약 정보 생성
   * @param {Object} allData 모든 CSV 데이터
   * @returns {Object} 요약 정보
   */
  generateDataSummary(allData) {
    const summary = {
      files: {
        data: this.extractDataInfo(allData.data),
        meta: this.extractMetaInfo(allData.meta),
        step: this.extractStepInfo(allData.step)
      },
      overall: {
        totalRows: (allData.data?.length || 0) + (allData.meta?.length || 0) + (allData.step?.length || 0),
        successFiles: allData.summary.successFiles,
        totalFiles: allData.summary.totalFiles,
        hasErrors: allData.summary.errorFiles.length > 0,
        errors: allData.summary.errorFiles
      }
    };

    return summary;
  }

  /**
   * 데이터를 프론트엔드에서 사용할 수 있는 형태로 변환
   * @param {Object} allData 모든 CSV 데이터
   * @returns {Object} 프론트엔드용 데이터
   */
  formatDataForFrontend(allData) {
    const summary = this.generateDataSummary(allData);
    
    return {
      success: true,
      data: {
        raw: allData,
        summary,
        timestamp: new Date().toISOString(),
        version: '1.0'
      },
      message: '데이터가 성공적으로 로드되었습니다.'
    };
  }

  /**
   * 특정 컬럼의 데이터만 추출
   * @param {Array} dataRows 데이터 행 배열
   * @param {Array} columns 추출할 컬럼명 배열
   * @returns {Array} 추출된 데이터
   */
  extractColumns(dataRows, columns) {
    if (!dataRows || !columns || columns.length === 0) {
      return [];
    }

    return dataRows.map(row => {
      const extracted = {};
      columns.forEach(column => {
        if (row.hasOwnProperty(column)) {
          extracted[column] = row[column];
        }
      });
      return extracted;
    });
  }

  /**
   * 데이터 검증 및 품질 체크
   * @param {Object} allData 모든 CSV 데이터
   * @returns {Object} 검증 결과
   */
  validateDataQuality(allData) {
    const issues = [];
    const warnings = [];

    // 데이터 파일 검증
    if (allData.data && allData.data.length > 0) {
      const dataInfo = this.extractDataInfo(allData.data);
      
      if (dataInfo.rowCount === 0) {
        issues.push('데이터 파일이 비어있습니다.');
      }
      
      if (dataInfo.columnCount === 0) {
        issues.push('데이터 파일에 컬럼이 없습니다.');
      }
      
      // 숫자 데이터 검증
      const numericColumns = dataInfo.columns.filter(col => {
        return allData.data.some(row => {
          const value = row[col];
          return value && !isNaN(parseFloat(value)) && isFinite(value);
        });
      });
      
      if (numericColumns.length === 0) {
        warnings.push('데이터 파일에 숫자 데이터가 없습니다.');
      }
    } else {
      issues.push('데이터 파일을 읽을 수 없습니다.');
    }

    // 메타데이터 검증
    if (!allData.meta || allData.meta.length === 0) {
      warnings.push('메타데이터 파일이 없습니다.');
    }

    // 스텝 파일 검증
    if (!allData.step || allData.step.length === 0) {
      warnings.push('스텝 파일이 없습니다.');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      hasIssues: issues.length > 0,
      hasWarnings: warnings.length > 0
    };
  }
}

module.exports = CsvDataReaderService;
