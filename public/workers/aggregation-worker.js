// 집계 작업을 위한 Web Worker
self.onmessage = function(e) {
  const { type, data, settings } = e.data;
  
  try {
    switch (type) {
      case 'AGGREGATE_DATA':
        const result = aggregateData(data, settings);
        self.postMessage({
          type: 'AGGREGATION_COMPLETE',
          data: result,
          success: true
        });
        break;
        
      case 'VALIDATE_SETTINGS':
        const validation = validateAggregationSettings(settings);
        self.postMessage({
          type: 'VALIDATION_COMPLETE',
          data: validation,
          success: true
        });
        break;
        
      default:
        self.postMessage({
          type: 'ERROR',
          message: 'Unknown message type',
          success: false
        });
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      message: error.message,
      success: false
    });
  }
};

// 집계 설정 검증
function validateAggregationSettings(settings) {
  const errors = [];
  
  if (!settings.interval || settings.interval <= 0.1) {
    errors.push('집계 간격은 0.1보다 커야 합니다.');
  }
  
  if (!['median', 'mean', 'ema'].includes(settings.method)) {
    errors.push('유효하지 않은 집계 방법입니다.');
  }
  
  if (settings.method === 'ema' && (!settings.emaSpan || settings.emaSpan < 1)) {
    errors.push('EMA span은 1 이상이어야 합니다.');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// 메인 집계 함수 (성능 최적화)
function aggregateData(data, settings) {
  if (!data || data.length === 0) {
    return [];
  }
  
  const { interval, method, emaSpan } = settings;
  const result = [];
  const numericColumns = ['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2', 'Ang3'];
  
  // Travelled 열을 기준으로 거리 구간별로 집계
  const maxTravelled = Math.max(...data.map(row => parseFloat(row.Travelled) || 0));
  const numIntervals = Math.ceil(maxTravelled / interval);
  
  // 진행률 계산을 위한 변수
  let processedIntervals = 0;
  const progressUpdateInterval = Math.max(1, Math.floor(numIntervals / 20)); // 5% 단위로 업데이트
  
  // 데이터를 미리 정렬하여 성능 향상
  const sortedData = [...data].sort((a, b) => {
    const travelledA = parseFloat(a.Travelled) || 0;
    const travelledB = parseFloat(b.Travelled) || 0;
    return travelledA - travelledB;
  });
  
  // 구간별로 데이터를 미리 그룹화
  const intervalGroups = new Map();
  sortedData.forEach(row => {
    const travelled = parseFloat(row.Travelled) || 0;
    const intervalIndex = Math.floor(travelled / interval);
    
    if (!intervalGroups.has(intervalIndex)) {
      intervalGroups.set(intervalIndex, []);
    }
    intervalGroups.get(intervalIndex).push(row);
  });
  
  // 각 구간별로 집계 수행
  for (let i = 0; i < numIntervals; i++) {
    const chunk = intervalGroups.get(i) || [];
    
    if (chunk.length === 0) {
      processedIntervals++;
      continue;
    }
    
    const startDistance = i * interval;
    const endDistance = (i + 1) * interval;
    const aggregatedRow = {};
    
    // 각 컬럼에 대해 집계 수행
    Object.keys(data[0]).forEach(key => {
      if (numericColumns.includes(key)) {
        const values = chunk.map(row => parseFloat(row[key]) || 0);
        if (values.length > 0) {
          switch (method) {
            case 'median':
              aggregatedRow[key] = calculateMedian(values);
              break;
            case 'mean':
              aggregatedRow[key] = calculateMean(values);
              break;
            case 'ema':
              aggregatedRow[key] = calculateEMA(values, emaSpan || 5);
              break;
          }
        } else {
          aggregatedRow[key] = 0;
        }
      } else if (key === 'Travelled') {
        // Travelled는 구간의 중간값으로 설정
        aggregatedRow[key] = (startDistance + endDistance) / 2;
      } else {
        // 숫자가 아닌 컬럼은 첫 번째 값 사용
        aggregatedRow[key] = chunk[0][key];
      }
    });
    
    result.push(aggregatedRow);
    processedIntervals++;
    
    // 진행률 업데이트 (5% 단위로)
    if (processedIntervals % progressUpdateInterval === 0) {
      const progress = Math.round((processedIntervals / numIntervals) * 100);
      self.postMessage({
        type: 'PROGRESS_UPDATE',
        progress: progress,
        processed: processedIntervals,
        total: numIntervals
      });
    }
  }
  
  return result;
}

// 중간값 계산
function calculateMedian(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// 평균값 계산
function calculateMean(values) {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

// EMA 계산
function calculateEMA(values, span) {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  
  const alpha = 2 / (span + 1);
  let ema = values[0];
  
  for (let i = 1; i < values.length; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema;
  }
  
  return ema;
}
