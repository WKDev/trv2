// Analysis Worker for Straightness and Planarity calculations
// This worker handles heavy computational tasks to prevent UI blocking

// 직진도 계산 함수 (Level3, Level4의 구간별 표준편차)
function calculateStraightness(data, interval = 1.0, analysisCorrection) {
  if (!data || data.length === 0) {
    return []
  }

  const result = []
  
  // 데이터를 Travelled 값으로 정렬
  const sortedData = [...data].sort((a, b) => {
    const travelledA = parseFloat(a.Travelled) || 0
    const travelledB = parseFloat(b.Travelled) || 0
    return travelledA - travelledB
  })

  // 최소 Travelled 값부터 시작
  const minTravelled = parseFloat(sortedData[0].Travelled) || 0
  const maxTravelled = parseFloat(sortedData[sortedData.length - 1].Travelled) || 0
  
  console.log('📊 직진도 계산 시작:', {
    dataLength: data.length,
    interval,
    minTravelled,
    maxTravelled,
    totalRange: maxTravelled - minTravelled
  })

  // 구간별로 데이터를 그룹화
  let currentIntervalStart = minTravelled
  
  while (currentIntervalStart < maxTravelled) {
    const currentIntervalEnd = currentIntervalStart + interval
    
    // 현재 구간에 속하는 데이터 필터링
    const intervalData = sortedData.filter(row => {
      const travelled = parseFloat(row.Travelled) || 0
      return travelled >= currentIntervalStart && travelled < currentIntervalEnd
    })
    
    if (intervalData.length > 0) {
      // Level3과 Level4의 표준편차 계산
      const level3Values = intervalData.map(d => parseFloat(d.Level3) || 0)
      const level4Values = intervalData.map(d => parseFloat(d.Level4) || 0)
      
      // 표준편차 계산 함수
      const calculateStdDev = (values) => {
        if (values.length <= 1) return 0
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
        const stdDev = Math.sqrt(variance)
        return stdDev
      }
      
      let level3StdDev = calculateStdDev(level3Values)
      let level4StdDev = calculateStdDev(level4Values)
      
      // 분석용 Scale & Offset 적용
      if (analysisCorrection) {
        const scale = analysisCorrection.Scaler || 1.0
        const offset = analysisCorrection.offset || 0.0
        
        level3StdDev = level3StdDev * scale + offset
        level4StdDev = level4StdDev * scale + offset
      }
      
      // 구간의 중간 지점을 Travelled로 사용
      const intervalMid = (currentIntervalStart + currentIntervalEnd) / 2
      
      // 구간의 첫 번째 데이터의 Index 사용 (원본 데이터의 Index 보존)
      const intervalIndex = intervalData[0]?.Index || result.length + 1
      
      result.push({
        id: result.length + 1,
        selected: true,
        Index: intervalIndex,
        Travelled: intervalMid,
        Level3: level3StdDev,
        Level4: level4StdDev,
      })
    }
    
    // 다음 구간으로 이동
    currentIntervalStart += interval
  }

  console.log('📊 직진도 계산 완료:', {
    totalIntervals: result.length
  })

  return result
}

// 평면성 계산 함수 (4점 평면 계산)
function calculatePlanarity(data, interval = 3.0, aggregationMethod = 'median', emaSpan = 5, analysisCorrection) {
  if (!data || data.length === 0) {
    return []
  }

  const result = []
  
  // 데이터를 Travelled 값으로 정렬
  const sortedData = [...data].sort((a, b) => {
    const travelledA = parseFloat(a.Travelled) || 0
    const travelledB = parseFloat(b.Travelled) || 0
    return travelledA - travelledB
  })

  // 최소 Travelled 값부터 시작
  const minTravelled = parseFloat(sortedData[0].Travelled) || 0
  const maxTravelled = parseFloat(sortedData[sortedData.length - 1].Travelled) || 0
  
  console.log('📊 평면성 계산 시작:', {
    dataLength: data.length,
    interval,
    aggregationMethod,
    minTravelled,
    maxTravelled,
    totalRange: maxTravelled - minTravelled
  })

  // 집계 함수들
  const aggregateFunctions = {
    median: (values) => {
      if (values.length === 0) return 0
      const sorted = [...values].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    },
    mean: (values) => {
      if (values.length === 0) return 0
      return values.reduce((sum, val) => sum + val, 0) / values.length
    },
    ema: (values, span = 5) => {
      if (values.length === 0) return 0
      if (values.length === 1) return values[0]
      
      const alpha = 2 / (span + 1)
      let ema = values[0]
      for (let i = 1; i < values.length; i++) {
        ema = alpha * values[i] + (1 - alpha) * ema
      }
      return ema
    }
  }

  // 구간별로 데이터를 그룹화하고 집계
  const aggregatedData = []
  let currentIntervalStart = minTravelled
  
  while (currentIntervalStart < maxTravelled) {
    const currentIntervalEnd = currentIntervalStart + interval
    
    // 현재 구간에 속하는 데이터 필터링
    const intervalData = sortedData.filter(row => {
      const travelled = parseFloat(row.Travelled) || 0
      return travelled >= currentIntervalStart && travelled < currentIntervalEnd
    })
    
    if (intervalData.length > 0) {
      // Level1과 Level2 값들을 추출
      const level1Values = intervalData.map(d => parseFloat(d.Level1) || 0)
      const level2Values = intervalData.map(d => parseFloat(d.Level2) || 0)
      
      // 집계 방법에 따라 대표값 계산
      const aggregateFunc = aggregateFunctions[aggregationMethod] || aggregateFunctions.median
      const level1Aggregated = aggregationMethod === 'ema' ? aggregateFunc(level1Values, emaSpan) : aggregateFunc(level1Values)
      const level2Aggregated = aggregationMethod === 'ema' ? aggregateFunc(level2Values, emaSpan) : aggregateFunc(level2Values)
      
      // 구간의 중간 지점을 Travelled로 사용
      const intervalMid = (currentIntervalStart + currentIntervalEnd) / 2
      
      // 구간의 첫 번째 데이터의 Index 사용
      const intervalIndex = intervalData[0]?.Index || aggregatedData.length + 1
      
      aggregatedData.push({
        Index: intervalIndex,
        Travelled: intervalMid,
        Level1: level1Aggregated,
        Level2: level2Aggregated,
      })
    }
    
    // 다음 구간으로 이동
    currentIntervalStart += interval
  }

  // 평면성 계산 (4점 평면 계산)
  for (let i = 1; i < aggregatedData.length; i++) {
    const current = aggregatedData[i]
    const previous = aggregatedData[i - 1]
    
    // 4개 점의 좌표 (750은 윤거/2, 1500은 휠베이스/2)
    const FLH = [1500, 750, current.Level2]  // 현재 구간의 Level2
    const FRH = [1500, -750, current.Level1] // 현재 구간의 Level1
    const RLH = [-1500, 750, previous.Level2] // 직전 구간의 Level2
    const RRH = [-1500, -750, previous.Level1] // 직전 구간의 Level1
    
    // 4개 평면 계산 (각각 3개 점으로 평면을 만들고 나머지 1개 점과의 거리 계산)
    const distances = []
    
    // FLH, FRH, RLH로 평면을 만들고 RRH와의 거리
    const plane1 = planeFrom3Points(FRH, RLH, RRH)
    const dist1 = zAxisDistance(plane1, FLH)
    distances.push(Math.abs(dist1))
    
    // FRH, RLH, RRH로 평면을 만들고 FLH와의 거리
    const plane2 = planeFrom3Points(FLH, RLH, RRH)
    const dist2 = zAxisDistance(plane2, FRH)
    distances.push(Math.abs(dist2))
    
    // FLH, FRH, RRH로 평면을 만들고 RLH와의 거리
    const plane3 = planeFrom3Points(FLH, FRH, RRH)
    const dist3 = zAxisDistance(plane3, RLH)
    distances.push(Math.abs(dist3))
    
    // FLH, FRH, RLH로 평면을 만들고 RRH와의 거리
    const plane4 = planeFrom3Points(FLH, FRH, RLH)
    const dist4 = zAxisDistance(plane4, RRH)
    distances.push(Math.abs(dist4))
    
    // 최대 거리가 평면성 결과
    const planarity = Math.max(...distances)
    
    // 분석용 Scale & Offset 적용
    let finalPlanarity = planarity
    if (analysisCorrection) {
      const scale = analysisCorrection.Scaler || 1.0
      const offset = analysisCorrection.offset || 0.0
      finalPlanarity = finalPlanarity * scale + offset
    }
    
    result.push({
      id: i,
      selected: true,
      Index: current.Index,
      Travelled: current.Travelled,
      Level1: current.Level1,
      Level2: current.Level2,
      FLH_ref: FLH[2],
      FLH: FLH[2],
      FRH_ref: FRH[2],
      FRH: FRH[2],
      RLH_ref: RLH[2],
      RLH: RLH[2],
      RRH_ref: RRH[2],
      RRH: RRH[2],
      PL: finalPlanarity
    })
  }

  console.log('📊 평면성 계산 완료:', {
    totalIntervals: result.length
  })

  return result
}

// 3개 점으로부터 평면식 ax+by+cz+d=0을 구하는 함수
function planeFrom3Points(p1, p2, p3) {
  // 두 벡터 생성
  const v1 = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]]
  const v2 = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]]
  
  // 외적으로 법선 벡터 구하기
  const normal = [
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0]
  ]
  
  // 법선 벡터의 크기 계산
  const magnitude = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2])
  
  // 법선 벡터 정규화
  if (magnitude > 1e-12) {
    normal[0] /= magnitude
    normal[1] /= magnitude
    normal[2] /= magnitude
  }
  
  // d = -(ax0 + by0 + cz0)
  const d = -(normal[0] * p1[0] + normal[1] * p1[1] + normal[2] * p1[2])
  
  return [normal[0], normal[1], normal[2], d]
}

// 평면과 한 점 간의 z축 방향 거리 계산
function zAxisDistance(plane, point) {
  const [a, b, c, d] = plane
  const [x, y, z] = point
  
  if (Math.abs(c) < 1e-12) {
    return 0 // c가 0에 가까우면 거리 0으로 처리
  }
  
  const z_plane = -(a * x + b * y + d) / c
  return z - z_plane
}

// Worker 메시지 처리
self.onmessage = function(e) {
  const { type, data, settings, analysisCorrection } = e.data
  
  try {
    switch (type) {
      case 'CALCULATE_STRAIGHTNESS':
        console.log('🔄 Worker: 직진도 계산 시작')
        
        // 진행률 업데이트
        self.postMessage({
          type: 'PROGRESS_UPDATE',
          progress: {
            progress: 0,
            processed: 0,
            total: 1,
            message: '직진도 계산 중...'
          }
        })
        
        const straightnessResult = calculateStraightness(data, settings.interval, analysisCorrection)
        
        // 완료 메시지
        self.postMessage({
          type: 'STRAIGHTNESS_COMPLETE',
          data: straightnessResult,
          success: true
        })
        break
        
      case 'CALCULATE_PLANARITY':
        console.log('🔄 Worker: 평면성 계산 시작')
        
        // 진행률 업데이트
        self.postMessage({
          type: 'PROGRESS_UPDATE',
          progress: {
            progress: 0,
            processed: 0,
            total: 1,
            message: '평면성 계산 중...'
          }
        })
        
        const planarityResult = calculatePlanarity(data, settings.interval, settings.aggregationMethod, settings.emaSpan, analysisCorrection)
        
        // 완료 메시지
        self.postMessage({
          type: 'PLANARITY_COMPLETE',
          data: planarityResult,
          success: true
        })
        break
        
      default:
        self.postMessage({
          type: 'ERROR',
          message: `Unknown calculation type: ${type}`
        })
    }
  } catch (error) {
    console.error('Worker 계산 오류:', error)
    self.postMessage({
      type: 'ERROR',
      message: error.message || 'Unknown calculation error'
    })
  }
}

// Worker 초기화 완료 메시지
self.postMessage({
  type: 'WORKER_READY',
  message: 'Analysis worker initialized successfully'
})
