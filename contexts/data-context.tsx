"use client"

import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, ReactNode } from 'react'
import { useAggregationWorker } from '@/hooks/use-aggregation-worker'
import { useAnalysisWorker } from '@/hooks/use-analysis-worker'
  // 모든 컬럼에 대해 한 번에 이상치 감지 및 대체하는 함수
  const detectAndReplaceOutliersForAllColumns = (data: any[], columns: string[], columnSettings: Record<string, {useIQR: boolean, iqrMultiplier: number, useZScore: boolean, zScoreThreshold: number}>, applyMode: 'individual' | 'bulk', bulkSettings?: {useIQR: boolean, iqrMultiplier: number, useZScore: boolean, zScoreThreshold: number}) => {
    if (data.length === 0) return data
    
    let processedData = [...data]
    let totalOutliers = 0
    
    // 각 컬럼별로 이상치 감지 및 대체
    columns.forEach(column => {
      let settings
      
      if (applyMode === 'bulk' && bulkSettings) {
        // 일괄 적용 모드: 모든 컬럼에 동일한 설정 사용 (UI의 일괄 적용 폼 요소 상태)
        settings = bulkSettings
        console.log(`🔧 [일괄 적용] ${column}: IQR=${bulkSettings.useIQR}(${bulkSettings.iqrMultiplier}), Z-score=${bulkSettings.useZScore}(${bulkSettings.zScoreThreshold})`)
      } else {
        // 개별 적용 모드: 각 컬럼의 개별 설정 사용 (UI의 개별 적용 폼 요소 상태)
        settings = columnSettings[column]
        if (!settings) {
          console.log(`⚠️ ${column} 컬럼 설정이 없음 - 건너뜀`)
          return // 설정이 없으면 건너뜀
        }
        console.log(`🔧 [개별 적용] ${column}: IQR=${settings.useIQR}(${settings.iqrMultiplier}), Z-score=${settings.useZScore}(${settings.zScoreThreshold})`)
      }
      
      const beforeData = [...processedData]
      processedData = detectAndReplaceOutliersSimple(processedData, column, settings)
      
      // 실제로 변경된 값의 개수 계산
      let changedCount = 0
      for (let i = 0; i < processedData.length; i++) {
        if (beforeData[i][column] !== processedData[i][column]) {
          changedCount++
        }
      }
      
      if (changedCount > 0) {
        console.log(`✅ 이상치 처리 완료 - ${column}: ${changedCount}개 값 대체`)
        totalOutliers += changedCount
      } else {
        console.log(`ℹ️ ${column}: 이상치 없음 (변경된 값 0개)`)
      }
    })
    
    console.log(`전체 이상치 처리 완료 - 총 ${totalOutliers}개 이상치 대체`)
    return processedData
  }

  // 간단하고 안정적인 이상치 처리 함수
  const detectAndReplaceOutliersSimple = (data: any[], column: string, settings: {useIQR: boolean, iqrMultiplier: number, useZScore: boolean, zScoreThreshold: number}) => {
    const values = data.map(row => row[column]).filter(val => val !== undefined && val !== null && !isNaN(val))
    if (values.length === 0) return data

    let processedData = [...data]
    console.log(`\n=== ${column} 컬럼 이상치 처리 시작 ===`)
    
    // 1차: IQR 기반 이상치 감지 및 대체
    if (settings.useIQR) {
      console.log(`1차 IQR 처리 시작 (배수: ${settings.iqrMultiplier})`)
      processedData = detectAndReplaceOutliersByIQR(processedData, column, settings.iqrMultiplier)
    } else {
      console.log(`IQR 처리 건너뜀`)
    }
    
    // 2차: Z-score 기반 이상치 감지 및 대체 (IQR 처리된 데이터에 대해)
    if (settings.useZScore) {
      console.log(`2차 Z-score 처리 시작 (임계값: ${settings.zScoreThreshold})`)
      processedData = detectAndReplaceOutliersByZScore(processedData, column, settings.zScoreThreshold)
    } else {
      console.log(`Z-score 처리 건너뜀`)
    }
    
    console.log(`=== ${column} 컬럼 이상치 처리 완료 ===\n`)
    return processedData
  }

  // IQR 기반 이상치 감지 및 대체 함수
  const detectAndReplaceOutliersByIQR = (data: any[], column: string, iqrMultiplier: number) => {
    // 숫자로 변환된 값들만 추출
    const numericValues = data.map(row => parseFloat(row[column])).filter(val => !isNaN(val))
    if (numericValues.length === 0) return data

    // IQR 계산
    const sortedValues = [...numericValues].sort((a, b) => a - b)
    const q1Index = Math.floor(sortedValues.length * 0.25)
    const q3Index = Math.floor(sortedValues.length * 0.75)
    const q1 = sortedValues[q1Index]
    const q3 = sortedValues[q3Index]
    const iqr = q3 - q1
    
    const lowerBound = q1 - (iqr * iqrMultiplier)
    const upperBound = q3 + (iqr * iqrMultiplier)
    
    console.log(`${column} 컬럼 IQR 경계: ${lowerBound.toFixed(3)} ~ ${upperBound.toFixed(3)}`)
    
    // IQR 이상치 인덱스 찾기 - 숫자로 변환해서 비교
    const outlierIndices: number[] = []
    data.forEach((row, index) => {
      const val = parseFloat(row[column])
      if (!isNaN(val)) {
        if (val < lowerBound || val > upperBound) {
          outlierIndices.push(index)
        }
      }
    })
    
    if (outlierIndices.length > 0) {
      console.log(`${column} 컬럼 IQR 이상치 감지: ${outlierIndices.length}개`)
      return replaceOutliersWithInterpolation(data, column, outlierIndices)
    }
    
    return data
  }

  // Z-score 기반 이상치 감지 및 대체 함수
  const detectAndReplaceOutliersByZScore = (data: any[], column: string, zScoreThreshold: number) => {
    // 숫자로 변환된 값들만 추출
    const numericValues = data.map(row => parseFloat(row[column])).filter(val => !isNaN(val))
    if (numericValues.length === 0) {
      console.log(`${column} 컬럼 Z-score: 유효한 값이 없음`)
      return data
    }

    const mean = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length
    const variance = numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericValues.length
    const std = Math.sqrt(variance)
    
    console.log(`${column} 컬럼 Z-score 통계: 평균=${mean.toFixed(3)}, 표준편차=${std.toFixed(3)}`)
    
    if (std === 0) {
      console.log(`${column} 컬럼 Z-score: 표준편차가 0이므로 처리 건너뜀`)
      return data
    }
    
    // Z-score 이상치 인덱스 찾기 - 숫자로 변환해서 비교
    const outlierIndices: number[] = []
    data.forEach((row, index) => {
      const val = parseFloat(row[column])
      if (!isNaN(val)) {
        const zScore = Math.abs((val - mean) / std)
        if (zScore > zScoreThreshold) {
          outlierIndices.push(index)
        }
      }
    })
    
    console.log(`${column} 컬럼 Z-score 이상치 감지: ${outlierIndices.length}개 (임계값: ${zScoreThreshold})`)
    
    if (outlierIndices.length > 0) {
      return replaceOutliersWithInterpolation(data, column, outlierIndices)
    }
    
    return data
  }

  // 이상치를 전후 값으로 대체하는 함수
  const replaceOutliersWithInterpolation = (data: any[], column: string, outlierIndices: number[]) => {
    if (outlierIndices.length === 0) return data

    const newData = [...data]
    const outlierSet = new Set(outlierIndices) // 이상치 인덱스 집합
    
    // 모든 이상치를 한 번에 처리
    outlierIndices.forEach(outlierIndex => {
      if (outlierIndex < 0 || outlierIndex >= newData.length) return
      
      // 앞쪽에서 유효한 값 찾기 (이상치가 아닌 원본 값)
      let prevValidIndex = -1
      for (let i = outlierIndex - 1; i >= 0; i--) {
        if (!outlierSet.has(i) && newData[i] && newData[i][column] !== undefined && newData[i][column] !== null && !isNaN(parseFloat(newData[i][column]))) {
          prevValidIndex = i
          break
        }
      }
      
      // 뒤쪽에서 유효한 값 찾기 (이상치가 아닌 원본 값)
      let nextValidIndex = -1
      for (let i = outlierIndex + 1; i < newData.length; i++) {
        if (!outlierSet.has(i) && newData[i] && newData[i][column] !== undefined && newData[i][column] !== null && !isNaN(parseFloat(newData[i][column]))) {
          nextValidIndex = i
          break
        }
      }
      
      let replacementValue = newData[outlierIndex][column] // 기본값은 원래 값
      
      if (prevValidIndex !== -1 && nextValidIndex !== -1) {
        // 전후로 값이 있으면 평균 사용 (더 안정적)
        const prevValue = parseFloat(newData[prevValidIndex][column])
        const nextValue = parseFloat(newData[nextValidIndex][column])
        replacementValue = (prevValue + nextValue) / 2
        
        // console.log(`${column}[${outlierIndex}]: ${newData[outlierIndex][column]} → ${replacementValue} (앞: ${prevValue}, 뒤: ${nextValue})`)
      } else if (prevValidIndex !== -1) {
        // 앞에만 값이 있으면 앞의 값으로 대체
        replacementValue = parseFloat(newData[prevValidIndex][column])
        console.log(`${column}[${outlierIndex}]: ${newData[outlierIndex][column]} → ${replacementValue} (앞의 값 사용)`)
      } else if (nextValidIndex !== -1) {
        // 뒤에만 값이 있으면 뒤의 값으로 대체
        replacementValue = parseFloat(newData[nextValidIndex][column])
        console.log(`${column}[${outlierIndex}]: ${newData[outlierIndex][column]} → ${replacementValue} (뒤의 값 사용)`)
      } else {
        // 양쪽 모두 없으면 열의 중앙값 사용
        const validValues = data.map(row => parseFloat(row[column])).filter(val => !isNaN(val))
        if (validValues.length > 0) {
          validValues.sort((a, b) => a - b)
          replacementValue = validValues[Math.floor(validValues.length / 2)]
          console.log(`${column}[${outlierIndex}]: ${newData[outlierIndex][column]} → ${replacementValue} (중앙값 사용)`)
        }
      }
      
      // 값 대체
      newData[outlierIndex] = {
        ...newData[outlierIndex],
        [column]: replacementValue
      }
    })
    
    return newData
  }

interface ProcessedData {
  success: boolean
  fileName: string
  filePath: string
  data: any
  qualityCheck: any
  message: string
}

interface Metadata {
  time: string
  testername: string
  line: string
  recording_type: string
  recording_interval: string
  wheel_diameter: string
  enc_ppr: string
  device_type: string
  level_sensor: string
  encoder_sensor: string
}

interface CorrectionData {
  preprocessing: {
    [key: string]: {
      Scaler: number
      offset: number
    }
  }
  analysis: {
    [key: string]: {
      Scaler: number
      offset: number
    }
  }
}

interface DataContextType {
  // 데이터 상태
  processedData: ProcessedData | null
  metadata: Metadata
  correctionData: CorrectionData | null
  isProcessing: boolean
  
  // STA offset 관련
  staOffset: number // meta.csv의 STA 값을 float으로 변환한 값
  useStaOffset: boolean // STA offset 사용 여부
  
  // 단계별 데이터 상태
  rawData: any[]
  originalRawData: any[] // 원본 데이터 백업
  correctedData: any[]
  outlierRemovedData: any[] // 이상치 제거된 데이터
  aggregatedData: any[]
  levelDeviationData: any[] // 수준 이상 계산 결과 데이터
  crossLevelData: any[] // 고저차 계산 결과 데이터
  stepData: any[] // 이음새 단차 계산 결과 데이터
  longitudinalLevelIrregularityData: any[] // 평탄성 계산 결과 데이터
  straightnessData: any[] // 직진도 계산 결과 데이터
  guideRailClearanceData: any[] // 안내레일 내측거리 계산 결과 데이터
  selectedRows: Set<number>
  correctedSelectedRows: Set<number>
  outlierRemovedSelectedRows: Set<number>
  aggregatedSelectedRows: Set<number>
  hasModifications: boolean // 수정 여부 추적
  
  // 이상치 제거 설정
  outlierRemovalSettings: Record<string, {
    useIQR: boolean
    iqrMultiplier: number
    useZScore: boolean
    zScoreThreshold: number
  }>
  
  // 탭 변경 감지를 위한 상태
  applyModeChanged: boolean
  
  // 집계 탭 진입/이탈 감지를 위한 상태
  aggregationTabEntered: boolean
  
  // 분석 탭 진입/이탈 감지를 위한 상태
  analysisTabEntered: boolean
  
  // 현재 적용 모드와 일괄 설정
  currentApplyMode: 'individual' | 'bulk'
  bulkSettings: {
    useIQR: boolean
    iqrMultiplier: number
    useZScore: boolean
    zScoreThreshold: number
  }
  
  // 집계 설정
  aggregationSettings: {
    interval: number
    method: 'median' | 'mean' | 'ema'
    emaSpan: number
  }
  
  // Web Worker 집계 상태
  isAggregating: boolean
  aggregationProgress: any
  aggregationError: string | null
  
  // Web Worker 분석 상태
  isAnalysisProcessing: boolean
  analysisProgress: any
  analysisError: string | null
  
  // 평탄성 집계 설정
  longitudinalLevelIrregularitySettings: {
    interval: number
  }
  
  // 직진도 집계 설정
  straightnessSettings: {
    interval: number
  }
  
  // 평면성 집계 설정
  planaritySettings: {
    interval: number
    aggregationMethod: 'median' | 'mean' | 'ema'
    emaSpan: number
  }
  
  // 평면성 계산 결과 데이터
  planarityData: any[]
  
  // 직진도 집계 설정 업데이트 함수
  updateStraightnessSettings: (settings: Partial<{ interval: number }>) => void
  
  // 평면성 집계 설정 업데이트 함수
  updatePlanaritySettings: (settings: Partial<{ interval: number; aggregationMethod: 'median' | 'mean' | 'ema'; emaSpan: number }>) => void
  
  // 평면성 데이터 설정 함수
  setPlanarityData: (data: any[]) => void
  
  // 데이터 액션
  setProcessedData: (data: ProcessedData | null) => void
  setMetadata: (metadata: Metadata) => void
  setCorrectionData: (correctionData: CorrectionData | null) => void
  updateMetadata: (field: string, value: string) => void
  updateCorrectionData: (section: 'preprocessing' | 'analysis', key: string, field: 'Scaler' | 'offset', value: number) => void
  setIsProcessing: (processing: boolean) => void
  
  // STA offset 액션
  setStaOffset: (offset: number) => void
  setUseStaOffset: (use: boolean) => void
  applyStaOffsetToData: (data: any[]) => any[]
  removeStaOffsetFromData: (data: any[]) => any[]
  
  // 단계별 데이터 액션
  setRawData: React.Dispatch<React.SetStateAction<any[]>>
  setCorrectedData: React.Dispatch<React.SetStateAction<any[]>>
  setOutlierRemovedData: React.Dispatch<React.SetStateAction<any[]>>
  setAggregatedData: React.Dispatch<React.SetStateAction<any[]>>
  setLevelDeviationData: React.Dispatch<React.SetStateAction<any[]>>
  setCrossLevelData: React.Dispatch<React.SetStateAction<any[]>>
  setStepData: React.Dispatch<React.SetStateAction<any[]>>
  setLongitudinalLevelIrregularityData: React.Dispatch<React.SetStateAction<any[]>>
  setGuideRailClearanceData: React.Dispatch<React.SetStateAction<any[]>>
  setSelectedRows: (rows: Set<number>) => void
  setCorrectedSelectedRows: (rows: Set<number>) => void
  setOutlierRemovedSelectedRows: (rows: Set<number>) => void
  setAggregatedSelectedRows: (rows: Set<number>) => void
  resetToRawData: () => void
  resetToOriginalData: () => void // 완전 원본 복원
  resetToFileOpenTime: () => Promise<void> // 파일 열기 시점으로 복원
  resetToFileRecordTime: () => Promise<void> // 파일 기록 시점으로 복원
  undoLastModification: () => void // 마지막 수정 되돌리기
  transferSelectedDataToAggregation: () => void // 선택된 데이터를 집계 탭으로 전달
  transferSelectedDataToCorrection: () => void // 선택된 데이터를 Scale & Offset 탭으로 전달
  applyCorrections: () => void
  updateOutlierRemovalSettings: (column: string, settings: Partial<{useIQR: boolean, iqrMultiplier: number, useZScore: boolean, zScoreThreshold: number}>) => void
  applyAggregation: (aggregationType: string, outlierRemoval: boolean) => void
  
  // 탭 변경 관련 함수
  setApplyModeChanged: (changed: boolean) => void
  triggerOutlierReprocessing: () => void
  setCurrentApplyMode: (mode: 'individual' | 'bulk') => void
  setBulkSettings: (settings: {useIQR: boolean, iqrMultiplier: number, useZScore: boolean, zScoreThreshold: number}) => void
  setAggregationTabEntered: (entered: boolean) => void
  setAnalysisTabEntered: (entered: boolean) => void
  
  // 데이터 접근 헬퍼
  getDataCsv: () => any[]
  getStepCsv: () => any[]
  getMetaCsv: () => any[]
  hasData: () => boolean
  getCorrectionValue: (section: 'preprocessing' | 'analysis', key: string, field: 'Scaler' | 'offset') => number
  
  // 집계 설정 업데이트
  updateAggregationSettings: (settings: Partial<{interval: number, method: 'median' | 'mean' | 'ema', emaSpan: number}>) => void
  
  // 평탄성 집계 설정 업데이트
  updateLongitudinalLevelIrregularitySettings: (settings: Partial<{interval: number}>) => void
  
  // 기본값 복원 함수들
  resetOutlierSettingsToDefault: () => Promise<void>
  resetScaleOffsetSettingsToDefault: () => Promise<void>
  resetAggregationSettingsToDefault: () => Promise<void>
  
  // 수동 저장 함수
  saveAllSettingsToFile: () => Promise<{success: boolean, message: string}>
  
  // 분석 데이터 전송 함수
  sendAnalysisDataToMain: () => Promise<{success: boolean, message: string}>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

const defaultMetadata: Metadata = {
  time: "",
  testername: "",
  line: "",
  recording_type: "",
  recording_interval: "",
  wheel_diameter: "",
  enc_ppr: "",
  device_type: "",
  level_sensor: "",
  encoder_sensor: "",
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null)
  const [metadata, setMetadata] = useState<Metadata>(defaultMetadata)
  const [correctionData, setCorrectionData] = useState<CorrectionData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Web Worker 훅 사용
  const { aggregateData, validateSettings, isProcessing: isAggregating, progress, error } = useAggregationWorker()
  const { calculateStraightness: workerCalculateStraightness, calculatePlanarity: workerCalculatePlanarity, isProcessing: isAnalysisProcessing, progress: analysisProgress, error: analysisError } = useAnalysisWorker()
  
  // STA offset 관련 상태
  const [staOffset, setStaOffset] = useState<number>(0)
  const [useStaOffset, setUseStaOffset] = useState<boolean>(false)
  
  // 단계별 데이터 상태
  const [rawData, setRawData] = useState<any[]>([])
  const [originalRawData, setOriginalRawData] = useState<any[]>([])
  const [correctedData, setCorrectedData] = useState<any[]>([])
  const [outlierRemovedData, setOutlierRemovedData] = useState<any[]>([])
  const [aggregatedData, setAggregatedData] = useState<any[]>([])
  const [levelDeviationData, setLevelDeviationData] = useState<any[]>([])
  const [crossLevelData, setCrossLevelData] = useState<any[]>([])
  const [stepData, setStepData] = useState<any[]>([])
  const [longitudinalLevelIrregularityData, setLongitudinalLevelIrregularityData] = useState<any[]>([])
  const [straightnessData, setStraightnessData] = useState<any[]>([])
  const [guideRailClearanceData, setGuideRailClearanceData] = useState<any[]>([])
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [correctedSelectedRows, setCorrectedSelectedRows] = useState<Set<number>>(new Set())
  const [outlierRemovedSelectedRows, setOutlierRemovedSelectedRows] = useState<Set<number>>(new Set())
  const [aggregatedSelectedRows, setAggregatedSelectedRows] = useState<Set<number>>(new Set())
  const [hasModifications, setHasModifications] = useState(false)
  const [modificationHistory, setModificationHistory] = useState<any[]>([]) // 수정 히스토리
  const [applyModeChanged, setApplyModeChanged] = useState(false) // 탭 변경 감지
  const [aggregationTabEntered, setAggregationTabEntered] = useState(false) // 집계 탭 진입 감지
  const [analysisTabEntered, setAnalysisTabEntered] = useState(false) // 분석 탭 진입 감지
  const [currentApplyMode, setCurrentApplyMode] = useState<'individual' | 'bulk'>('individual')
  const [bulkSettings, setBulkSettings] = useState({
    useIQR: true,
    iqrMultiplier: 1.5,
    useZScore: true,
    zScoreThreshold: 3.0
  })
  
  // 집계 설정 상태
  const [aggregationSettings, setAggregationSettings] = useState({
    interval: 1.0,
    method: 'mean' as 'median' | 'mean' | 'ema',
    emaSpan: 5
  })
  
  // 평탄성 집계 설정 상태
  const [longitudinalLevelIrregularitySettings, setLongitudinalLevelIrregularitySettings] = useState({
    interval: 1.0
  })
  
  // 직진도 집계 설정 상태
  const [straightnessSettings, setStraightnessSettings] = useState({
    interval: 1.0
  })
  
  // 평면성 집계 설정 상태
  const [planaritySettings, setPlanaritySettings] = useState({
    interval: 3.0,
    aggregationMethod: 'median' as 'median' | 'mean' | 'ema',
    emaSpan: 5
  })
  
  // 평면성 계산 결과 데이터 상태
  const [planarityData, setPlanarityData] = useState<any[]>([])
  
  // 이상치 제거 설정 - 컬럼별 설정
  const [outlierRemovalSettings, setOutlierRemovalSettings] = useState<Record<string, {
    useIQR: boolean
    iqrMultiplier: number
    useZScore: boolean
    zScoreThreshold: number
  }>>({
    Level1: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 },
    Level2: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 },
    Level3: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 },
    Level4: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 },
    Level5: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 },
    Level6: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 },
    Encoder3: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 },
    Ang1: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 },
    Ang2: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 },
    Ang3: { useIQR: true, iqrMultiplier: 1.5, useZScore: true, zScoreThreshold: 3 },
  })

  const updateMetadata = (field: string, value: string) => {
    setMetadata((prev) => ({ ...prev, [field]: value }))
  }

  // 연속적인 업데이트 방지를 위한 ref
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef<string>('')

  const updateCorrectionData = (section: 'preprocessing' | 'analysis', key: string, field: 'Scaler' | 'offset', value: number) => {
    const updateKey = `${section}.${key}.${field}`
    const updateValue = `${value}`
    
    // 동일한 값에 대한 연속 업데이트 방지
    if (lastUpdateRef.current === `${updateKey}:${updateValue}`) {
      console.log(`🔧 보정값 변경 건너뜀 (동일한 값): ${key}.${field} = ${value}`)
      return
    }
    
    console.log(`🔧 보정값 변경: ${key}.${field} = ${value}`)
    
    // 이전 업데이트 타이머 취소
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }
    
    // 짧은 지연 후 업데이트 (연속 업데이트 방지)
    updateTimeoutRef.current = setTimeout(() => {
      setCorrectionData((prev) => {
        if (!prev) {
          // correctionData가 없으면 기본값으로 초기화
          const defaultCorrectionData: CorrectionData = {
            preprocessing: {
              Level1: { Scaler: 1, offset: 0 },
              Level2: { Scaler: 1, offset: 0 },
              Level3: { Scaler: 1, offset: 0 },
              Level4: { Scaler: 1, offset: 0 },
              Level5: { Scaler: 1, offset: 0 },
              Level6: { Scaler: 1, offset: 0 },
              Encoder3: { Scaler: 1, offset: 0 },
              Ang1: { Scaler: 1, offset: 0 },
              Ang2: { Scaler: 1, offset: 0 },
              Ang3: { Scaler: 1, offset: 0 },
            },
            analysis: {}
          }
          const newData = {
            ...defaultCorrectionData,
            [section]: {
              ...defaultCorrectionData[section],
              [key]: {
                ...defaultCorrectionData[section][key],
                [field]: value
              }
            }
          }
          
          // options.json 업데이트는 메모리에서만
          updateOptionsInMemory()
          lastUpdateRef.current = `${updateKey}:${updateValue}`
          return newData
        }
        
        const newCorrectionData = {
          ...prev,
          [section]: {
            ...prev[section],
            [key]: {
              ...prev[section][key],
              [field]: value
            }
          }
        }
        
        // 자동 저장 제거 - 수동 저장 버튼 사용
        
        // 보정값이 변경되면 useMemo가 자동으로 재계산함 (중복 계산 제거)
        console.log('✅ 보정값 업데이트 완료, 차트 재계산 예정')
        lastUpdateRef.current = `${updateKey}:${updateValue}`
        
        return newCorrectionData
      })
    }, 50) // 50ms 지연으로 연속 업데이트 방지
  }

  const getDataCsv = () => {
    return processedData?.data?.raw?.data || []
  }

  const getStepCsv = () => {
    return processedData?.data?.raw?.step || []
  }

  const getMetaCsv = () => {
    return processedData?.data?.raw?.meta || []
  }

  const hasData = () => {
    return processedData !== null && processedData.success
  }

  const getCorrectionValue = (section: 'preprocessing' | 'analysis', key: string, field: 'Scaler' | 'offset'): number => {
    if (!correctionData || !correctionData[section] || !correctionData[section][key]) {
      // 모든 센서에 대한 기본값 반환
      if (section === 'preprocessing') {
        return field === 'Scaler' ? 1 : 0
      }
      return 0
    }
    return correctionData[section][key][field]
  }

  // 커스텀 setRawData 함수 - 수정 상태 추적
  const handleSetRawData = (newData: any[] | ((prev: any[]) => any[])) => {
    setRawData((prevData) => {
      const updatedData = typeof newData === 'function' ? newData(prevData) : newData
      
      // 데이터가 변경되었는지 확인
      const hasChanged = JSON.stringify(prevData) !== JSON.stringify(updatedData)
      if (hasChanged) {
        // 수정 전 상태를 히스토리에 저장
        setModificationHistory(prev => [...prev, [...prevData]])
        setHasModifications(true)
      }
      
      return updatedData
    })
    // useEffect에서 자동으로 보정 탭으로 전달됨
  }

  // 커스텀 setSelectedRows 함수 - 선택된 행 변경
  const handleSetSelectedRows = (newSelectedRows: Set<number> | ((prev: Set<number>) => Set<number>)) => {
    setSelectedRows((prevSelectedRows) => {
      const updatedSelectedRows = typeof newSelectedRows === 'function' ? newSelectedRows(prevSelectedRows) : newSelectedRows
      return updatedSelectedRows
    })
    // useEffect에서 자동으로 보정 탭으로 전달됨
  }

  // 단계별 데이터 액션들
  const resetToRawData = () => {
    // 수정된 데이터를 원본으로 되돌리기 (되돌리기 기능)
    setRawData([...originalRawData])
    setHasModifications(false)
    setModificationHistory([])
  }

  const resetToOriginalData = () => {
    // 완전 원본 데이터로 복원
    const originalData = getDataCsv()
    setRawData([...originalData])
    setOriginalRawData([...originalData])
    setCorrectedData([])
    setAggregatedData([])
    setHasModifications(false)
    setModificationHistory([])
    // 기본적으로 모든 데이터 선택
    const allIndices = new Set<number>(originalData.map((_: any, index: number) => index))
    setSelectedRows(allIndices)
    setCorrectedSelectedRows(new Set())
    setAggregatedSelectedRows(new Set())
  }

  const resetToFileOpenTime = async () => {
    // 파일 열기 시점으로 복원 (originalRawData 사용)
    setRawData([...originalRawData])
    setHasModifications(false)
    setModificationHistory([])
  }

  const resetToFileRecordTime = async () => {
    // 파일 기록 시점으로 복원 (data_raw.csv에서 복원)
    try {
      if (processedData?.filePath && typeof window !== 'undefined' && window.electronAPI) {
        // 현재 압축 해제된 경로를 찾아야 함 (임시 디렉토리)
        // 실제로는 압축 해제된 경로를 저장해두어야 함
        console.log('data_raw.csv에서 복원 시도...')
        // TODO: 압축 해제된 경로를 저장하고 사용해야 함
        // const result = await (window.electronAPI as any).restoreFromDataRaw(extractPath)
        // if (result.success) {
        //   // 복원된 데이터를 다시 로드
        //   const reloadResult = await window.electronAPI.readCsvFiles(extractPath)
        //   if (reloadResult.success) {
        //     const newData = reloadResult.data.raw.data
        //     setRawData([...newData])
        //     setOriginalRawData([...newData])
        //     setHasModifications(false)
        //     setModificationHistory([])
        //   }
        // }
      }
    } catch (error) {
      console.error('파일 기록 시점 복원 중 오류:', error)
    }
  }

  const undoLastModification = () => {
    if (modificationHistory.length > 0) {
      const lastState = modificationHistory[modificationHistory.length - 1]
      setRawData([...lastState])
      setModificationHistory(prev => prev.slice(0, -1))
      setHasModifications(modificationHistory.length > 1)
    }
  }


  const transferSelectedDataToAggregation = () => {
    // 선택된 데이터를 집계 탭으로 전달
    const selectedData = outlierRemovedData.filter((_, index) => outlierRemovedSelectedRows.has(index))
    setAggregatedData(selectedData)
    // 집계 탭에서도 모든 데이터가 선택되도록 설정
    const allIndices = new Set<number>(selectedData.map((_, index) => index))
    setAggregatedSelectedRows(allIndices)
  }

  const transferSelectedDataToCorrection = () => {
    // 선택된 데이터를 Scale & Offset 탭으로 전달
    const selectedData = aggregatedData.filter((_, index) => aggregatedSelectedRows.has(index))
    setCorrectedData(selectedData)
    // Scale & Offset 탭에서도 모든 데이터가 선택되도록 설정
    const allIndices = new Set<number>(selectedData.map((_, index) => index))
    setCorrectedSelectedRows(allIndices)
  }


  // 데이터가 로드될 때 rawData 초기화 및 options.json 로딩
  useEffect(() => {
    if (hasData()) {
      const originalData = getDataCsv()
      
      // Travelled 기준으로 오름차순 정렬
      const sortedData = [...originalData].sort((a, b) => {
        const travelledA = parseFloat(a.Travelled) || 0
        const travelledB = parseFloat(b.Travelled) || 0
        return travelledA - travelledB
      })
      
      setRawData(sortedData)
      setOriginalRawData([...sortedData]) // 정렬된 데이터를 원본으로 백업
      
      // 전처리 단계별 데이터 초기화
      setAggregatedData([])
      setCorrectedSelectedRows(new Set())
      setAggregatedSelectedRows(new Set())
      setHasModifications(false)
      setModificationHistory([])
      
      // stepData 초기화
      const stepCsvData = getStepCsv()
      console.log('🔍 DataContext stepData 초기화:', {
        stepCsvDataLength: stepCsvData?.length || 0,
        stepCsvDataSample: stepCsvData?.slice(0, 2)
      })
      if (stepCsvData && stepCsvData.length > 0) {
        setStepData(stepCsvData)
      } else {
        setStepData([])
      }
      
      // options.json에서 설정값 로딩
      loadOptionsFromFile()
      
      // correctionData가 없으면 기본값으로 초기화
      if (!correctionData) {
        console.log('🔧 correctionData가 없음 - 기본값으로 초기화')
        initializeDefaultSettings()
      }
      
      // 기본적으로 모든 데이터 선택 (즉시 실행)
      const allIndices = new Set<number>(sortedData.map((_: any, index: number) => index))
      setSelectedRows(allIndices)
      // 선택된 행이 설정되면 handleSetSelectedRows에서 자동으로 보정 탭으로 전달됨
      
      console.log('🚀 파일 로드 완료 - 자동 전처리 시작 예정')
    }
  }, [processedData?.fileName, processedData?.filePath]) // processedData의 고유 식별자로 변경

  // options.json에서 설정값 로딩
  const loadOptionsFromFile = async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI && processedData?.filePath) {
        const result = await window.electronAPI.readOptionsFile(processedData.filePath)
        
        if (result.success && result.data) {
          const options = result.data
          
          // 이상치 처리 설정 로딩
          if (options.prep?.outlierRemoval) {
            setOutlierRemovalSettings(options.prep.outlierRemoval)
          }
          
          // Scale & Offset 설정 로딩
          if (options.prep?.scaleOffset) {
            const correctionData: CorrectionData = {
              preprocessing: options.prep.scaleOffset,
              analysis: {}
            }
            setCorrectionData(correctionData)
          }
          
          // 집계 설정 로딩
          if (options.prep?.aggregation) {
            setAggregationSettings(options.prep.aggregation)
          }
          
          console.log('options.json에서 설정값을 성공적으로 로딩했습니다.')
        } else {
          console.log('options.json 파일이 없거나 읽기 실패, 기본값 사용')
          // 기본값으로 초기화
          initializeDefaultSettings()
        }
      } else {
        // 웹 환경이거나 Electron API가 없는 경우 기본값 사용
        initializeDefaultSettings()
      }
    } catch (error) {
      console.error('options.json 로딩 중 오류:', error)
      // 오류 발생 시 기본값으로 초기화
      initializeDefaultSettings()
    }
  }

  // 기본 설정값 초기화
  const initializeDefaultSettings = () => {
    // 기본 보정값 초기화 (Level5, Level6 포함)
    const defaultCorrectionData: CorrectionData = {
      preprocessing: {
        Level1: { Scaler: 1, offset: 0 },
        Level2: { Scaler: 1, offset: 0 },
        Level3: { Scaler: 1, offset: 0 },
        Level4: { Scaler: 1, offset: 0 },
        Level5: { Scaler: 1, offset: 0 },
        Level6: { Scaler: 1, offset: 0 },
        Encoder3: { Scaler: 1, offset: 0 },
        Ang1: { Scaler: 1, offset: 0 },
        Ang2: { Scaler: 1, offset: 0 },
        Ang3: { Scaler: 1, offset: 0 },
      },
      analysis: {}
    }
    setCorrectionData(defaultCorrectionData)
  }

  // 업데이트 취소를 위한 ref
  const updateAbortControllerRef = useRef<AbortController | null>(null)
  
  // 메모리에서 options.json 관리
  const [memoryOptions, setMemoryOptions] = useState<any>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // 가상 계산을 위한 ref (실제 데이터 변경 없이 계산만)
  const virtualCorrectedDataRef = useRef<any[]>([])
  const isVirtualCalculationRef = useRef<boolean>(false)

  // options.json 파일 업데이트 (취소 가능한 버전)
  const updateOptionsFile = async (correctionData?: CorrectionData | null, outlierSettings?: Record<string, any>) => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI && processedData?.filePath) {
        // 이전 업데이트가 진행 중이면 취소
        if (updateAbortControllerRef.current) {
          updateAbortControllerRef.current.abort()
        }

        // 새로운 AbortController 생성
        updateAbortControllerRef.current = new AbortController()

        // 현재 설정값들을 가져와서 options.json 구조로 구성
        const currentCorrectionData = correctionData || correctionData
        const currentOutlierSettings = outlierSettings || outlierRemovalSettings
        
        const optionsData = {
          prep: {
            outlierRemoval: currentOutlierSettings,
            scaleOffset: currentCorrectionData?.preprocessing || {},
            aggregation: aggregationSettings
          }
        }
        
        const result = await window.electronAPI.updateOptionsFile(processedData.filePath, optionsData)
        
        // 취소되었는지 확인
        if (updateAbortControllerRef.current?.signal.aborted) {
          console.log('options.json 업데이트가 취소되었습니다.')
          return
        }
        
        if (result.success) {
          console.log('options.json 파일이 성공적으로 업데이트되었습니다.')
        } else {
          console.error('options.json 파일 업데이트 실패:', result.message)
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('options.json 업데이트가 취소되었습니다.')
      } else {
        console.error('options.json 업데이트 중 오류:', error)
      }
    } finally {
      updateAbortControllerRef.current = null
    }
  }

  // 메모리에서만 options.json 업데이트 (빠른 변경에 최적화)
  const updateOptionsInMemory = () => {
    // 현재 설정값들을 메모리에만 저장
    const currentOptions = {
      prep: {
        outlierRemoval: outlierRemovalSettings,
        scaleOffset: correctionData?.preprocessing || {},
        aggregation: aggregationSettings
      }
    }
    
    setMemoryOptions(currentOptions)
    
    // 이전 저장 타이머 취소
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // 1초 후에 실제 파일 저장 (사용자가 입력을 멈춘 후)
    saveTimeoutRef.current = setTimeout(() => {
      saveOptionsToFile(currentOptions)
    }, 1000)
  }

  // 실제 파일에 저장 (빠른 업데이트 사용)
  const saveOptionsToFile = async (optionsData: any) => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI && processedData?.filePath) {
        console.log('💾 options.json을 실제 파일에 저장 중...')
        // 빠른 업데이트 API 사용 (검증 없이)
        const result = await window.electronAPI.quickUpdateOptionsFile(processedData.filePath, optionsData)
        
        if (result.success) {
          console.log('✅ options.json 파일 저장 완료')
        } else {
          console.error('❌ options.json 파일 저장 실패:', result.message)
        }
      }
    } catch (error) {
      console.error('❌ options.json 파일 저장 중 오류:', error)
    }
  }

  // 가상 계산 함수 (실제 데이터 변경 없이 계산만)
  const calculateVirtualCorrection = (data: any[], correctionData: CorrectionData, changedKey?: string) => {
    if (!correctionData?.preprocessing) return data
    
    // 변경된 컬럼만 계산 (성능 최적화)
    if (changedKey && correctionData.preprocessing[changedKey]) {
      return data.map(row => {
        const newRow = { ...row }
        if (newRow[changedKey] !== undefined) {
          const correction = correctionData.preprocessing[changedKey]
          newRow[changedKey] = (newRow[changedKey] * correction.Scaler) + correction.offset
        }
        return newRow
      })
    }
    
    // 전체 계산 (초기 로드 시에만)
    return data.map(row => {
      const newRow = { ...row }
      Object.keys(correctionData.preprocessing).forEach(correctionKey => {
        const correction = correctionData.preprocessing[correctionKey]
        if (newRow[correctionKey] !== undefined) {
          newRow[correctionKey] = (newRow[correctionKey] * correction.Scaler) + correction.offset
        }
      })
      return newRow
    })
  }

  // 수동 저장 함수 (저장 버튼 클릭 시)
  const saveAllSettingsToFile = async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI && processedData?.filePath) {
        console.log('💾 모든 설정을 파일에 저장 중...')
        
        const optionsData = {
          prep: {
            outlierRemoval: outlierRemovalSettings,
            scaleOffset: correctionData?.preprocessing || {},
            aggregation: aggregationSettings
          }
        }
        
        const result = await window.electronAPI.quickUpdateOptionsFile(processedData.filePath, optionsData)
        
        if (result.success) {
          console.log('✅ 모든 설정이 성공적으로 저장되었습니다.')
          return { success: true, message: '설정이 성공적으로 저장되었습니다.' }
        } else {
          console.error('❌ 설정 저장 실패:', result.message)
          return { success: false, message: result.message }
        }
      }
      return { success: false, message: '저장할 수 없습니다.' }
    } catch (error) {
      console.error('❌ 설정 저장 중 오류:', error)
      return { success: false, message: '저장 중 오류가 발생했습니다.' }
    }
  }

  // 분석 데이터를 electron 메인 프로세스로 전송하는 함수
  const sendAnalysisDataToMain = async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        console.log('📤 분석 데이터를 메인 프로세스로 전송 중...')
        
        // 모든 분석 데이터를 수집
        const analysisData = {
          timestamp: new Date().toISOString(),
          metadata: metadata,
          correctionData: correctionData,
          // 전처리 데이터
          rawData: rawData,
          outlierRemovedData: outlierRemovedData,
          aggregatedData: aggregatedData,
          correctedData: correctedData,
          // 분석 결과 데이터
          levelDeviationData: levelDeviationData,
          crossLevelData: crossLevelData,
          stepData: stepData,
          longitudinalLevelIrregularityData: longitudinalLevelIrregularityData,
          straightnessData: straightnessData,
          guideRailClearanceData: guideRailClearanceData,
          // 설정 데이터
          outlierRemovalSettings: outlierRemovalSettings,
          aggregationSettings: aggregationSettings,
          longitudinalLevelIrregularitySettings: longitudinalLevelIrregularitySettings,
          straightnessSettings: straightnessSettings,
          // STA offset 정보
          staOffset: staOffset,
          useStaOffset: useStaOffset,
          // 선택된 행 정보
          selectedRows: Array.from(selectedRows),
          correctedSelectedRows: Array.from(correctedSelectedRows),
          outlierRemovedSelectedRows: Array.from(outlierRemovedSelectedRows),
          aggregatedSelectedRows: Array.from(aggregatedSelectedRows)
        }
        
        const result = await window.electronAPI.sendAnalysisData(analysisData)
        
        if (result.success) {
          console.log('✅ 분석 데이터가 성공적으로 메인 프로세스로 전송되었습니다.')
          return { success: true, message: '분석 데이터가 성공적으로 전송되었습니다.' }
        } else {
          console.error('❌ 분석 데이터 전송 실패:', result.message)
          return { success: false, message: result.message }
        }
      }
      return { success: false, message: '전송할 수 없습니다.' }
    } catch (error) {
      console.error('❌ 분석 데이터 전송 중 오류:', error)
      return { success: false, message: '전송 중 오류가 발생했습니다.' }
    }
  }

  // 기본값으로 복원하는 함수들
  const resetOutlierSettingsToDefault = async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getDefaultOptions('prep.outlierRemoval')
        
        if (result.success && result.data) {
          setOutlierRemovalSettings(result.data)
          await updateOptionsFile(null, result.data)
          console.log('이상치 처리 설정이 기본값으로 복원되었습니다.')
        }
      }
    } catch (error) {
      console.error('이상치 처리 설정 복원 중 오류:', error)
    }
  }

  const resetScaleOffsetSettingsToDefault = async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getDefaultOptions('prep.scaleOffset')
        
        if (result.success && result.data) {
          const defaultCorrectionData: CorrectionData = {
            preprocessing: result.data,
            analysis: {}
          }
          setCorrectionData(defaultCorrectionData)
          await updateOptionsFile(defaultCorrectionData)
          console.log('Scale & Offset 설정이 기본값으로 복원되었습니다.')
        }
      }
    } catch (error) {
      console.error('Scale & Offset 설정 복원 중 오류:', error)
    }
  }

  const updateAggregationSettings = (settings: Partial<{interval: number, method: 'median' | 'mean' | 'ema', emaSpan: number}>) => {
    setAggregationSettings(prev => {
      const newSettings = {
        ...prev,
        ...settings
      }
      
      // 자동 저장 제거 - 수동 저장 버튼 사용
      return newSettings
    })
  }

  const updateLongitudinalLevelIrregularitySettings = (settings: Partial<{interval: number}>) => {
    setLongitudinalLevelIrregularitySettings(prev => {
      const newSettings = {
        ...prev,
        ...settings
      }
      
      console.log('평탄성 집계 설정 업데이트:', newSettings)
      return newSettings
    })
  }

  const resetAggregationSettingsToDefault = async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getDefaultOptions('prep.aggregation')
        
        if (result.success && result.data) {
          setAggregationSettings(result.data)
          await updateOptionsFile()
          console.log('집계 설정이 기본값으로 복원되었습니다.')
        }
      }
    } catch (error) {
      console.error('집계 설정 복원 중 오류:', error)
    }
  }

  // STA offset 관련 함수들
  const applyStaOffsetToData = (data: any[]): any[] => {
    if (!useStaOffset || staOffset === 0) {
      return data
    }
    
    return data.map(row => ({
      ...row,
      Travelled: parseFloat(row.Travelled) + staOffset
    }))
  }

  const removeStaOffsetFromData = (data: any[]): any[] => {
    if (!useStaOffset || staOffset === 0) {
      return data
    }
    
    return data.map(row => ({
      ...row,
      Travelled: parseFloat(row.Travelled) - staOffset
    }))
  }

  // 메타데이터의 STA 값이 변경될 때 STA offset 자동 업데이트
  useEffect(() => {
    if (metadata.line && metadata.line.trim() !== '') {
      const staValue = parseFloat(metadata.line)
      if (!isNaN(staValue)) {
        setStaOffset(staValue)
        setUseStaOffset(true)
        console.log('STA offset 자동 설정:', staValue)
      }
    }
  }, [metadata.line])

  // 증분 계산을 위한 이전 보정 데이터 추적
  const prevCorrectionDataRef = useRef<CorrectionData | null>(null)
  const prevOutlierRemovedDataRef = useRef<any[]>([])
  const correctedDataCacheRef = useRef<any[]>([])

  // 증분 계산 함수
  const calculateIncrementalCorrection = useCallback((data: any[], correctionData: CorrectionData, prevCorrectionData: CorrectionData | null) => {
    if (!correctionData?.preprocessing || data.length === 0) {
      return []
    }

    // 이전 보정 데이터가 없으면 전체 계산
    if (!prevCorrectionData?.preprocessing) {
      console.log('🔄 전체 보정 데이터 계산 (초기 로드)')
      return data.map((row, index) => {
        const newRow = { ...row } // 모든 원본 데이터를 복사 (Index, Travelled 등 포함)
        // Index와 Travelled는 보정하지 않고 원본 값 유지
        newRow.Index = parseInt(row.Index) || index + 1
        newRow.Travelled = parseFloat(row.Travelled) || 0
        
        Object.keys(correctionData.preprocessing).forEach(key => {
          const correction = correctionData.preprocessing[key]
          if (newRow[key] !== undefined && key !== 'Index' && key !== 'Travelled') {
            newRow[key] = (newRow[key] * correction.Scaler) + correction.offset
          }
        })
        return newRow
      })
    }

    // 변경된 컬럼 찾기
    const changedColumns: string[] = []
    Object.keys(correctionData.preprocessing).forEach(key => {
      const current = correctionData.preprocessing[key]
      const previous = prevCorrectionData.preprocessing[key]
      if (!previous || 
          current.Scaler !== previous.Scaler || 
          current.offset !== previous.offset) {
        changedColumns.push(key)
      }
    })

    // 변경된 컬럼이 없으면 캐시된 데이터 반환
    if (changedColumns.length === 0) {
      console.log('✅ 보정 데이터 변경 없음, 캐시 사용')
      return correctedDataCacheRef.current
    }

    console.log(`🔄 증분 보정 데이터 계산: ${changedColumns.join(', ')} 컬럼만 재계산`)
    
    // 캐시된 데이터를 기반으로 변경된 컬럼만 재계산
    return correctedDataCacheRef.current.map((row: any, index: number) => {
      const newRow = { ...row }
      // 원본 데이터에서 메타데이터(Index, Travelled 등) 업데이트
      if (data[index]) {
        newRow.Index = parseInt(data[index].Index) || index + 1
        newRow.Travelled = parseFloat(data[index].Travelled) || 0
      }
      changedColumns.forEach(key => {
        // 원본 데이터에서 해당 컬럼 값을 가져와서 새로운 보정값 적용
        const originalValue = data[index]?.[key]
        if (originalValue !== undefined) {
          const correction = correctionData.preprocessing[key]
          newRow[key] = (originalValue * correction.Scaler) + correction.offset
        }
      })
      return newRow
    })
  }, [])

  // useMemo를 사용해서 보정된 데이터를 메모이제이션 (증분 계산 적용)
  const memoizedCorrectedData = useMemo(() => {
    console.log('🔄 memoizedCorrectedData 재계산 시작...', {
      hasCorrectionData: !!correctionData?.preprocessing,
      aggregatedDataLength: aggregatedData.length,
      correctionDataKeys: correctionData?.preprocessing ? Object.keys(correctionData.preprocessing) : []
    })
    
    // memoizedCorrectedData에서 받은 aggregatedData 상세 출력
    console.log('📊 memoizedCorrectedData - 입력 aggregatedData:', {
      length: aggregatedData.length,
      isEmpty: aggregatedData.length === 0,
      fullData: aggregatedData,
      firstRow: aggregatedData[0],
      lastRow: aggregatedData[aggregatedData.length - 1],
      columns: aggregatedData.length > 0 ? Object.keys(aggregatedData[0]) : [],
      timestamp: new Date().toISOString()
    })
    
    // aggregatedData가 비어있으면 빈 배열 반환
    if (aggregatedData.length === 0) {
      console.log('❌ aggregatedData가 비어있음 - 빈 배열 반환')
      return []
    }
    
    // correctionData가 없으면 aggregatedData를 그대로 반환 (보정 없음)
    if (!correctionData?.preprocessing) {
      console.log('⚠️ correctionData가 없음 - aggregatedData를 그대로 반환 (보정 없음)')
      console.log('✅ memoizedCorrectedData (보정 없음) 계산 완료:', {
        resultLength: aggregatedData.length,
        sample: aggregatedData.slice(0, 2)
      })
      return [...aggregatedData]
    }
    
    console.log('🔄 보정 데이터 재계산 중...', {
      correctionData: correctionData.preprocessing,
      aggregatedDataLength: aggregatedData.length,
      prevCorrectionData: prevCorrectionDataRef.current?.preprocessing
    })
    
    // 증분 계산 수행
    const result = calculateIncrementalCorrection(
      aggregatedData, 
      correctionData, 
      prevCorrectionDataRef.current
    )
    
    // 캐시 업데이트
    correctedDataCacheRef.current = result
    prevCorrectionDataRef.current = correctionData
    prevOutlierRemovedDataRef.current = aggregatedData
    
    console.log('✅ memoizedCorrectedData 계산 완료:', {
      resultLength: result.length,
      sample: result.slice(0, 2)
    })
    
    return result
  }, [correctionData, aggregatedData, calculateIncrementalCorrection])

  // 메모이제이션된 데이터가 변경될 때만 correctedData 업데이트 (correctionData가 있을 때만)
  useEffect(() => {
    console.log('🔄 memoizedCorrectedData useEffect 실행:', {
      memoizedCorrectedDataLength: memoizedCorrectedData.length,
      aggregatedDataLength: aggregatedData.length,
      hasMemoizedData: memoizedCorrectedData.length > 0,
      hasAggregatedData: aggregatedData.length > 0,
      hasCorrectionData: !!correctionData?.preprocessing
    })
    
    // memoizedCorrectedData가 있으면 보정 적용 (correctionData가 있든 없든)
    if (memoizedCorrectedData.length > 0) {
      console.log('📊 보정된 데이터 업데이트:', {
        length: memoizedCorrectedData.length,
        sample: memoizedCorrectedData.slice(0, 3),
        hasCorrectionData: !!correctionData?.preprocessing
      })
      setCorrectedData(memoizedCorrectedData)
      // 보정 탭에서도 모든 데이터가 선택되도록 설정
      const allIndices = new Set<number>(memoizedCorrectedData.map((_, index) => index))
      setCorrectedSelectedRows(allIndices)
      console.log('✅ 보정된 데이터 설정 완료:', {
        correctedDataLength: memoizedCorrectedData.length,
        selectedRowsCount: allIndices.size
      })
    }
  }, [memoizedCorrectedData, correctionData])

  // selectedRows, rawData, 또는 이상치 처리 설정이 변경될 때 자동으로 이상치 제거 및 대체 적용
  useEffect(() => {
    if (rawData.length > 0) {
      console.log('🔄 이상치 처리 재실행 트리거:', {
        rawDataLength: rawData.length,
        selectedRowsSize: selectedRows.size,
        currentApplyMode,
        bulkSettings,
        outlierRemovalSettingsKeys: Object.keys(outlierRemovalSettings)
      })
      
      // 선택된 행이 있으면 해당 행만, 없으면 모든 데이터를 가져와서 이상치 제거 적용
      const dataToProcess = selectedRows.size > 0 
        ? rawData.filter((_, index) => selectedRows.has(index))
        : rawData
      
      // 자동으로 이상치 감지 및 대체 적용
      let processedData = [...dataToProcess]
      const targetColumns = ['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2', 'Ang3']
      
      // 모든 컬럼에 대해 한 번에 이상치 감지 및 대체 적용
      processedData = detectAndReplaceOutliersForAllColumns(
        processedData, 
        targetColumns, 
        outlierRemovalSettings,
        currentApplyMode,
        bulkSettings
      )
      
      // 처리 완료 후 전체 데이터 콘솔 출력
      console.log('\n=== 이상치 처리 완료 - 전체 데이터 ===')
      console.log(`원본 데이터 개수: ${dataToProcess.length}`)
      console.log(`처리 후 데이터 개수: ${processedData.length}`)
      console.log('처리된 데이터 샘플 (처음 5개):', processedData.slice(0, 5))
      console.log('처리된 데이터 샘플 (마지막 5개):', processedData.slice(-5))
      console.log('=== 이상치 처리 완료 ===\n')
      
      setOutlierRemovedData(processedData)
      // 이상치 제거 탭에서도 모든 데이터가 선택되도록 설정
      const allIndices = new Set<number>(processedData.map((_, index) => index))
      setOutlierRemovedSelectedRows(allIndices)
    }
  }, [selectedRows, rawData, outlierRemovalSettings, currentApplyMode, bulkSettings])

  // 탭 변경 시 이상치 재처리
  useEffect(() => {
    if (applyModeChanged && rawData.length > 0) {
      console.log('탭 변경 감지 - 이상치 재처리 시작')
      
      // 선택된 행이 있으면 해당 행만, 없으면 모든 데이터를 가져와서 이상치 제거 적용
      const dataToProcess = selectedRows.size > 0 
        ? rawData.filter((_, index) => selectedRows.has(index))
        : rawData
      
      // 자동으로 이상치 감지 및 대체 적용
      let processedData = [...dataToProcess]
      const targetColumns = ['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2', 'Ang3']
      
      // 모든 컬럼에 대해 한 번에 이상치 감지 및 대체 적용
      processedData = detectAndReplaceOutliersForAllColumns(
        processedData, 
        targetColumns, 
        outlierRemovalSettings,
        currentApplyMode,
        bulkSettings
      )
      
      console.log('탭 변경에 의한 이상치 재처리 완료')
      
      setOutlierRemovedData(processedData)
      // 이상치 제거 탭에서도 모든 데이터가 선택되도록 설정
      const allIndices = new Set<number>(processedData.map((_, index) => index))
      setOutlierRemovedSelectedRows(allIndices)
      
      // 재처리 완료 후 플래그 리셋
      setApplyModeChanged(false)
    }
  }, [applyModeChanged, rawData, selectedRows, outlierRemovalSettings, currentApplyMode, bulkSettings])

  // 일괄 설정과 개별 설정은 독립적으로 관리됨
  // 동기화 로직 제거 - 각각의 UI 폼 요소 상태에 따라 처리

  // Web Worker를 사용한 집계 수행 함수
  const performWebWorkerAggregation = useCallback(async (data: any[], settings: {interval: number, method: 'median' | 'mean' | 'ema', emaSpan: number}) => {
    try {
      console.log('🔄 Web Worker 집계 작업 시작:', {
        inputDataLength: data.length,
        settings: settings,
        inputDataSample: data.slice(0, 2)
      })
      
      if (data.length === 0) {
        console.log('❌ 집계할 데이터가 없음')
        return
      }
      
      // 설정 검증
      const validation = await validateSettings(settings)
      if (!validation.isValid) {
        console.error('집계 설정 오류:', validation.errors)
        return
      }

      // Web Worker를 사용한 집계 수행
      const result = await aggregateData(data, settings)
      if (result.success) {
        console.log('✅ Web Worker 집계 완료 - aggregatedData 설정:', {
          resultDataLength: result.data.length,
          sample: result.data.slice(0, 3)
        })
        setAggregatedData(result.data)
        
        // 집계된 데이터가 변경되면 모든 행을 선택하도록 설정
        const allAggregatedIndices = new Set<number>(result.data.map((_, index) => index))
        setAggregatedSelectedRows(allAggregatedIndices)
        console.log('✅ 집계된 데이터 선택 행 설정 완료:', allAggregatedIndices.size)
      } else {
        console.error('❌ Web Worker 집계 실패:', result.error)
      }
    } catch (error) {
      console.error('❌ Web Worker 집계 중 오류 발생:', error)
    }
  }, [aggregateData, validateSettings, setAggregatedData, setAggregatedSelectedRows])

  // outlierRemovedData가 변경될 때 자동으로 집계 수행
  useEffect(() => {
    console.log('🔄 outlierRemovedData useEffect 실행:', {
      outlierRemovedDataLength: outlierRemovedData.length,
      aggregationTabEntered,
      currentAggregatedDataLength: aggregatedData.length
    })
    
    if (outlierRemovedData.length > 0) {
      // 선택된 행이 있으면 해당 행만, 없으면 모든 데이터를 사용
      const dataToProcess = outlierRemovedSelectedRows.size > 0 
        ? outlierRemovedData.filter((_, index) => outlierRemovedSelectedRows.has(index))
        : outlierRemovedData
      
      console.log('📊 outlierRemovedData 변경 - 자동 집계 수행:', {
        dataToProcessLength: dataToProcess.length,
        aggregationTabEntered,
        currentAggregatedDataLength: aggregatedData.length
      })
      
      // 집계 탭에 진입했을 때 또는 분석 탭에 진입했을 때 집계 작업 수행
      if (aggregationTabEntered || analysisTabEntered) {
        console.log('✅ 집계/분석 탭 진입 - Web Worker 자동 집계 수행')
        performWebWorkerAggregation(dataToProcess, aggregationSettings)
      } else {
        // 탭에 진입하지 않았으면 기존 aggregatedData 유지
        console.log('✅ 탭 미진입 - aggregatedData 유지 (기존 데이터 보존)')
        const allIndices = new Set<number>(dataToProcess.map((_, index) => index))
        setAggregatedSelectedRows(allIndices)
      }
    }
  }, [outlierRemovedData, outlierRemovedSelectedRows, aggregationTabEntered, analysisTabEntered, performWebWorkerAggregation, aggregationSettings])

  // aggregatedData가 변경될 때 자동으로 Scale & Offset 탭으로 전달
  useEffect(() => {
    console.log('🔄 aggregatedData useEffect 실행:', {
      aggregatedDataLength: aggregatedData.length,
      hasCorrectionData: !!correctionData?.preprocessing,
      aggregatedDataSample: aggregatedData.slice(0, 2)
    })
    
    // aggregatedData 상세 정보 출력
    console.log('📊 aggregatedData 상세 정보:', {
      length: aggregatedData.length,
      isEmpty: aggregatedData.length === 0,
      fullData: aggregatedData,
      firstRow: aggregatedData[0],
      lastRow: aggregatedData[aggregatedData.length - 1],
      columns: aggregatedData.length > 0 ? Object.keys(aggregatedData[0]) : [],
      timestamp: new Date().toISOString()
    })
    
    if (aggregatedData.length > 0) {
      console.log('🔄 aggregatedData 변경 감지 - correctedData 업데이트:', {
        aggregatedDataLength: aggregatedData.length,
        hasCorrectionData: !!correctionData?.preprocessing
      })
      
      // memoizedCorrectedData에서 처리되므로 여기서는 로그만 출력
      console.log('✅ aggregatedData 변경 - memoizedCorrectedData에서 처리 예정')
    } else {
      console.log('📊 aggregatedData가 비어있음 - correctedData 초기화')
      setCorrectedData([])
      setCorrectedSelectedRows(new Set())
    }
  }, [aggregatedData, correctionData])


  // 자동 저장 제거 - 수동 저장 버튼 사용

  const applyCorrections = () => {
    if (!correctionData || !correctionData.preprocessing) return
    
    const corrected = rawData.map(row => {
      const newRow = { ...row }
      Object.keys(correctionData.preprocessing).forEach(key => {
        const correction = correctionData.preprocessing[key]
        if (newRow[key] !== undefined) {
          newRow[key] = (newRow[key] * correction.Scaler) + correction.offset
        }
      })
      return newRow
    })
    
    setCorrectedData(corrected)
  }

  // IQR 기반 이상치 제거 함수
  const removeOutliersIQR = (data: any[], column: string, multiplier: number = 1.5) => {
    const values = data.map(row => row[column]).filter(val => val !== undefined && val !== null && !isNaN(val))
    if (values.length === 0) return data

    values.sort((a, b) => a - b)
    const q1Index = Math.floor(values.length * 0.25)
    const q3Index = Math.floor(values.length * 0.75)
    const q1 = values[q1Index]
    const q3 = values[q3Index]
    const iqr = q3 - q1
    
    const lowerBound = q1 - (iqr * multiplier)
    const upperBound = q3 + (iqr * multiplier)
    
    return data.filter(row => {
      const val = row[column]
      return val >= lowerBound && val <= upperBound
    })
  }

  // Z-score 기반 이상치 제거 함수
  const removeOutliersZScore = (data: any[], column: string, threshold: number = 3) => {
    const values = data.map(row => row[column]).filter(val => val !== undefined && val !== null && !isNaN(val))
    if (values.length === 0) return data

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)
    
    if (stdDev === 0) return data
    
    return data.filter(row => {
      const val = row[column]
      const zScore = Math.abs((val - mean) / stdDev)
      return zScore <= threshold
    })
  }

  const updateOutlierRemovalSettings = (column: string, settings: Partial<{useIQR: boolean, iqrMultiplier: number, useZScore: boolean, zScoreThreshold: number}>) => {
    setOutlierRemovalSettings(prev => {
      const newSettings = {
        ...prev,
        [column]: {
          ...prev[column],
          ...settings
        }
      }
      
      // 자동 저장 제거 - 수동 저장 버튼 사용
      console.log(`이상치 설정 업데이트 - ${column}:`, settings)
      
      return newSettings
    })
  }

  // 수준 이상 계산 함수
  const calculateLevelDeviation = useCallback((data: any[], analysisCorrection?: { Scaler: number, offset: number }) => {
    if (!data || data.length === 0) {
      return []
    }

    return data.map((row: any, index: number) => {
      const level2 = parseFloat(row.Level2) || 0;
      const level5 = parseFloat(row.Level5) || 0;
      const level6 = parseFloat(row.Level6) || 0;
      const level1 = parseFloat(row.Level1) || 0;

      // 기본 수준 이상 계산
      let leftValue = level6 - level2;  // Level6 - Level2
      let rightValue = level5 - level1; // Level5 - Level1

      // 분석용 Scale & Offset 적용
      if (analysisCorrection) {
        const scale = analysisCorrection.Scaler || 1.0;
        const offset = analysisCorrection.offset || 0.0;
        
        leftValue = leftValue * scale + offset;
        rightValue = rightValue * scale + offset;
      }

      return {
        id: index + 1,
        selected: true,
        Index: row.Index !== undefined && row.Index !== null ? parseInt(row.Index) : index + 1,
        Travelled: parseFloat(row.Travelled) || 0,
        Left: leftValue,
        Right: rightValue,
      };
    });
  }, []);

  // 고저차 계산 함수
  const calculateCrossLevel = useCallback((data: any[], analysisCorrection?: { Scaler: number, offset: number }) => {
    if (!data || data.length === 0) {
      return []
    }

    return data.map((row: any, index: number) => {
      const level2 = parseFloat(row.Level2) || 0;
      const level1 = parseFloat(row.Level1) || 0;

      // 고저차 계산: Left는 Level2, Right는 Level1
      let leftValue = level2;
      let rightValue = level1;

      // 분석용 Scale & Offset 적용
      if (analysisCorrection) {
        const scale = analysisCorrection.Scaler || 1.0;
        const offset = analysisCorrection.offset || 0.0;
        
        leftValue = leftValue * scale + offset;
        rightValue = rightValue * scale + offset;
      }

      return {
        id: index + 1,
        selected: true,
        Index: row.Index !== undefined && row.Index !== null ? parseInt(row.Index) : index + 1,
        Travelled: parseFloat(row.Travelled) || 0,
        Left: leftValue,
        Right: rightValue,
      };
    });
  }, []);

  // 안내레일 내측거리 계산 함수
  const calculateGuideRailClearance = useCallback((data: any[], analysisCorrection?: { Scaler: number, offset: number }) => {
    if (!data || data.length === 0) {
      return []
    }

    return data.map((row: any, index: number) => {
      const level3 = parseFloat(row.Level3) || 0;
      const level4 = parseFloat(row.Level4) || 0;
      const encoder3 = parseFloat(row.Encoder3) || 0;

      // 안내레일 내측거리 계산: GC = Level3 + Level4 + Encoder3
      let gidValue = level3 + level4 + encoder3;

      // 분석용 Scale & Offset 적용
      if (analysisCorrection) {
        const scale = analysisCorrection.Scaler || 1.0;
        const offset = analysisCorrection.offset || 0.0;
        
        gidValue = gidValue * scale + offset;
      }

      return {
        id: index + 1,
        selected: true,
        Index: row.Index !== undefined && row.Index !== null ? parseInt(row.Index) : index + 1,
        Travelled: parseFloat(row.Travelled) || 0,
        Level3: level3,
        Level4: level4,
        Encoder3: encoder3,
        GC: gidValue,
      };
    });
  }, []);

  // 이음새 단차 계산 함수
  const calculateStep = useCallback((data: any[], analysisCorrection?: { Scaler: number, offset: number }) => {
    if (!data || data.length === 0) {
      return []
    }

    return data.map((row: any, index: number) => {
      const level2 = parseFloat(row.Level2) || 0;
      const level1 = parseFloat(row.Level1) || 0;

      // 이음새 단차 계산: Left는 Level2, Right는 Level1
      let leftValue = level2;
      let rightValue = level1;

      // 분석용 Scale & Offset 적용
      if (analysisCorrection) {
        const scale = analysisCorrection.Scaler || 1.0;
        const offset = analysisCorrection.offset || 0.0;
        
        leftValue = leftValue * scale + offset;
        rightValue = rightValue * scale + offset;
      }

      return {
        id: index + 1,
        selected: true,
        Index: row.Index !== undefined && row.Index !== null ? parseInt(row.Index) : index + 1,
        Travelled: parseFloat(row.Travelled) || 0,
        Left: leftValue,
        Right: rightValue,
      };
    });
  }, []);

  // 평탄성 계산 함수 (Web Worker 사용)
  const calculateLongitudinalLevelIrregularity = useCallback(async (data: any[], interval: number = 1.0, analysisCorrection?: { Scaler: number, offset: number }) => {
    if (!data || data.length === 0) {
      return []
    }

    console.log('📊 평탄성 계산 시작 (Web Worker):', {
      dataLength: data.length,
      interval,
      hasAnalysisCorrection: !!analysisCorrection
    })

    try {
      const result = await workerCalculatePlanarity(data, { interval }, analysisCorrection)
      
      if (result.success) {
        console.log('📊 평탄성 계산 완료 (Web Worker):', {
          totalIntervals: result.data.length,
          result: result.data.slice(0, 3)
        })
        return result.data
      } else {
        console.error('❌ 평탄성 계산 실패:', result.error)
        return []
      }
    } catch (error) {
      console.error('❌ 평탄성 계산 중 오류:', error)
      return []
    }
  }, [workerCalculatePlanarity]);

  // 직진도 계산 함수 (Web Worker 사용)
  const calculateStraightness = useCallback(async (data: any[], interval: number = 1.0, analysisCorrection?: { Scaler: number, offset: number }) => {
    if (!data || data.length === 0) {
      return []
    }

    console.log('📊 직진도 계산 시작 (Web Worker):', {
      dataLength: data.length,
      interval,
      hasAnalysisCorrection: !!analysisCorrection
    })

    try {
      const result = await workerCalculateStraightness(data, { interval }, analysisCorrection)
      
      if (result.success) {
        console.log('📊 직진도 계산 완료 (Web Worker):', {
          totalIntervals: result.data.length,
          result: result.data.slice(0, 3)
        })
        return result.data
      } else {
        console.error('❌ 직진도 계산 실패:', result.error)
        return []
      }
    } catch (error) {
      console.error('❌ 직진도 계산 중 오류:', error)
      return []
    }
  }, [workerCalculateStraightness]);

  const applyAggregation = (aggregationType: string, outlierRemoval: boolean) => {
    let dataToProcess = correctedData.length > 0 ? correctedData : rawData
    
    if (outlierRemoval) {
      // 간단한 IQR 기반 outlier 제거
      dataToProcess = dataToProcess.filter((row, index) => {
        // 여기서는 간단히 모든 데이터를 유지하도록 구현
        // 실제로는 각 컬럼별로 IQR 계산하여 outlier 제거
        return true
      })
    }
    
    // 집계 로직 (여기서는 간단히 평균 계산)
    if (aggregationType === 'average') {
      // 실제로는 더 복잡한 집계 로직이 필요
      setAggregatedData(dataToProcess)
    } else {
      setAggregatedData(dataToProcess)
    }
  }

  // correctedData가 변경될 때 수준 이상 데이터 자동 계산
  useEffect(() => {
    console.log('🔄 수준 이상 데이터 계산 useEffect 실행:', {
      correctedDataLength: correctedData.length,
      hasAnalysisCorrection: !!correctionData?.analysis?.['level-deviation']
    })
    
    if (correctedData.length > 0) {
      const analysisCorrection = correctionData?.analysis?.['level-deviation'] as any;
      const calculatedData = calculateLevelDeviation(correctedData, analysisCorrection);
      
      console.log('📊 수준 이상 데이터 계산 완료:', {
        inputLength: correctedData.length,
        outputLength: calculatedData.length,
        hasAnalysisCorrection: !!analysisCorrection,
        sample: calculatedData.slice(0, 2)
      });
      
      setLevelDeviationData(calculatedData);
    } else {
      console.log('📊 correctedData가 비어있음 - 수준 이상 데이터 초기화');
      setLevelDeviationData([]);
    }
  }, [correctedData, correctionData, calculateLevelDeviation])

  // correctedData가 변경될 때 고저차 데이터 자동 계산
  useEffect(() => {
    console.log('🔄 고저차 데이터 계산 useEffect 실행:', {
      correctedDataLength: correctedData.length,
      hasAnalysisCorrection: !!correctionData?.analysis?.['cross-level']
    })
    
    if (correctedData.length > 0) {
      const analysisCorrection = correctionData?.analysis?.['cross-level'] as any;
      const calculatedData = calculateCrossLevel(correctedData, analysisCorrection);
      
      console.log('📊 고저차 데이터 계산 완료:', {
        inputLength: correctedData.length,
        outputLength: calculatedData.length,
        hasAnalysisCorrection: !!analysisCorrection,
        sample: calculatedData.slice(0, 2)
      });
      
      setCrossLevelData(calculatedData);
    } else {
      console.log('📊 correctedData가 비어있음 - 고저차 데이터 초기화');
      setCrossLevelData([]);
    }
  }, [correctedData, correctionData, calculateCrossLevel])

  // correctedData가 변경될 때 안내레일 내측거리 데이터 자동 계산
  useEffect(() => {
    console.log('🔄 안내레일 내측거리 데이터 계산 useEffect 실행:', {
      correctedDataLength: correctedData.length,
      hasAnalysisCorrection: !!correctionData?.analysis?.['guiderail-clearance']
    })
    
    if (correctedData.length > 0) {
      const analysisCorrection = correctionData?.analysis?.['guiderail-clearance'] as any;
      const calculatedData = calculateGuideRailClearance(correctedData, analysisCorrection);
      
      console.log('📊 안내레일 내측거리 데이터 계산 완료:', {
        inputLength: correctedData.length,
        outputLength: calculatedData.length,
        hasAnalysisCorrection: !!analysisCorrection,
        sample: calculatedData.slice(0, 2)
      });
      
      setGuideRailClearanceData(calculatedData);
    } else {
      console.log('📊 correctedData가 비어있음 - 안내레일 내측거리 데이터 초기화');
      setGuideRailClearanceData([]);
    }
  }, [correctedData, correctionData, calculateGuideRailClearance])

  // correctedData가 변경될 때 이음새 단차 데이터 자동 계산
  useEffect(() => {
    console.log('🔄 이음새 단차 데이터 계산 useEffect 실행:', {
      correctedDataLength: correctedData.length,
      hasAnalysisCorrection: !!correctionData?.analysis?.['step']
    })
    
    if (correctedData.length > 0) {
      const analysisCorrection = correctionData?.analysis?.['step'] as any;
      const calculatedData = calculateStep(correctedData, analysisCorrection);
      
      console.log('📊 이음새 단차 데이터 계산 완료:', {
        inputLength: correctedData.length,
        outputLength: calculatedData.length,
        hasAnalysisCorrection: !!analysisCorrection,
        sample: calculatedData.slice(0, 2)
      });
      
      setStepData(calculatedData);
    } else {
      console.log('📊 correctedData가 비어있음 - 이음새 단차 데이터 초기화');
      setStepData([]);
    }
  }, [correctedData, correctionData, calculateStep])

  // 분석 탭 진입 시 자동 전처리 수행
  useEffect(() => {
    console.log('🔄 분석 탭 자동 전처리 useEffect 실행:', {
      analysisTabEntered,
      hasRawData: rawData.length > 0,
      hasOutlierRemovedData: outlierRemovedData.length > 0,
      hasAggregatedData: aggregatedData.length > 0,
      hasCorrectedData: correctedData.length > 0
    })
    
    if (analysisTabEntered && rawData.length > 0) {
      // 전처리 상태 확인
      const needsOutlierProcessing = outlierRemovedData.length === 0
      const needsAggregation = aggregatedData.length === 0
      const needsCorrection = correctedData.length === 0
      
      console.log('📊 전처리 상태 확인:', {
        needsOutlierProcessing,
        needsAggregation,
        needsCorrection
      })
      
      // 필요한 전처리 단계가 있으면 자동으로 수행
      if (needsOutlierProcessing || needsAggregation || needsCorrection) {
        console.log('🚀 자동 전처리 시작')
        
        // 1. 이상치 처리 (이미 useEffect에서 자동으로 수행됨)
        if (needsOutlierProcessing) {
          console.log('✅ 이상치 처리 자동 수행 (이미 진행 중)')
        }
        
        // 2. 집계 처리 - Web Worker 집계 함수 호출
        if (needsAggregation && outlierRemovedData.length > 0) {
          console.log('✅ 집계 처리 자동 수행 - Web Worker 집계 함수 호출')
          performWebWorkerAggregation(outlierRemovedData, aggregationSettings)
        }
        
        // 3. Scale & Offset 처리 (aggregatedData가 있으면 자동으로 보정 수행)
        if (needsCorrection && aggregatedData.length > 0) {
          console.log('✅ Scale & Offset 처리 자동 수행 (memoizedCorrectedData에서 처리)')
        }
      } else {
        console.log('✅ 모든 전처리 단계 완료됨')
      }
    }
  }, [analysisTabEntered, rawData, outlierRemovedData, aggregatedData, correctedData, performWebWorkerAggregation, aggregationSettings])

  // 분석 탭에서 전처리 데이터 변경 모니터링 및 자동 재계산
  useEffect(() => {
    if (analysisTabEntered) {
      console.log('🔄 분석 탭 전처리 데이터 모니터링:', {
        outlierRemovedDataLength: outlierRemovedData.length,
        aggregatedDataLength: aggregatedData.length,
        correctedDataLength: correctedData.length,
        timestamp: new Date().toISOString()
      })
      
      // 전처리 데이터가 업데이트되면 자동으로 분석 결과 재계산
      // (각 분석 함수의 useEffect에서 이미 자동으로 처리됨)
      console.log('✅ 분석 탭에서 전처리 데이터 변경 감지 - 자동 재계산 진행 중')
    }
  }, [analysisTabEntered, outlierRemovedData, aggregatedData, correctedData])

  // outlierRemovedData가 변경될 때 평탄성 데이터 자동 계산
  // 평탄성은 전처리 단계의 outlierRemovedData를 사용 (집계하지 않음)
  useEffect(() => {
    console.log('🔄 평탄성 데이터 계산 useEffect 실행:', {
      outlierRemovedDataLength: outlierRemovedData.length,
      hasAnalysisCorrection: !!correctionData?.analysis?.['longitudinal-level-irregularity'],
      interval: longitudinalLevelIrregularitySettings.interval
    })
    
    if (outlierRemovedData.length > 0) {
      // outlierRemovedData에 전처리용 Scale & Offset 적용
      let dataWithPreprocessingCorrection = outlierRemovedData;
      if (correctionData?.preprocessing) {
        dataWithPreprocessingCorrection = outlierRemovedData.map(row => {
          const newRow = { ...row };
          Object.keys(correctionData.preprocessing).forEach(key => {
            const correction = correctionData.preprocessing[key];
            if (newRow[key] !== undefined && key !== 'Index' && key !== 'Travelled') {
              newRow[key] = (newRow[key] * correction.Scaler) + correction.offset;
            }
          });
          return newRow;
        });
      }
      
      const analysisCorrection = correctionData?.analysis?.['longitudinal-level-irregularity'] as any;
      
      // Web Worker를 사용한 비동기 계산
      calculateLongitudinalLevelIrregularity(
        dataWithPreprocessingCorrection, 
        longitudinalLevelIrregularitySettings.interval, 
        analysisCorrection
      ).then((calculatedData) => {
        console.log('📊 평탄성 데이터 계산 완료:', {
          inputLength: outlierRemovedData.length,
          outputLength: calculatedData.length,
          interval: longitudinalLevelIrregularitySettings.interval,
          hasAnalysisCorrection: !!analysisCorrection,
          hasPreprocessingCorrection: !!correctionData?.preprocessing,
          sample: calculatedData.slice(0, 2)
        });
        
        setLongitudinalLevelIrregularityData(calculatedData);
      }).catch((error) => {
        console.error('❌ 평탄성 데이터 계산 실패:', error);
        setLongitudinalLevelIrregularityData([]);
      });
    } else {
      console.log('📊 outlierRemovedData가 비어있음 - 평탄성 데이터 초기화');
      setLongitudinalLevelIrregularityData([]);
    }
  }, [outlierRemovedData, correctionData, longitudinalLevelIrregularitySettings, calculateLongitudinalLevelIrregularity])

  // outlierRemovedData가 변경될 때 직진도 데이터 자동 계산
  // 직진도는 전처리 단계의 outlierRemovedData를 사용 (집계하지 않음)
  useEffect(() => {
    console.log('🔄 직진도 데이터 계산 useEffect 실행:', {
      outlierRemovedDataLength: outlierRemovedData.length,
      hasAnalysisCorrection: !!correctionData?.analysis?.straightness,
      interval: straightnessSettings.interval
    })
    
    if (outlierRemovedData.length > 0) {
      // outlierRemovedData에 전처리용 Scale & Offset 적용
      let dataWithPreprocessingCorrection = outlierRemovedData;
      if (correctionData?.preprocessing) {
        dataWithPreprocessingCorrection = outlierRemovedData.map(row => {
          const newRow = { ...row };
          Object.keys(correctionData.preprocessing).forEach(key => {
            const correction = correctionData.preprocessing[key];
            if (newRow[key] !== undefined && key !== 'Index' && key !== 'Travelled') {
              newRow[key] = (newRow[key] * correction.Scaler) + correction.offset;
            }
          });
          return newRow;
        });
      }
      
      const analysisCorrection = correctionData?.analysis?.straightness as any;
      
      // Web Worker를 사용한 비동기 계산
      calculateStraightness(
        dataWithPreprocessingCorrection, 
        straightnessSettings.interval, 
        analysisCorrection
      ).then((calculatedData) => {
        console.log('📊 직진도 데이터 계산 완료:', {
          inputLength: outlierRemovedData.length,
          outputLength: calculatedData.length,
          interval: straightnessSettings.interval,
          hasAnalysisCorrection: !!analysisCorrection,
          hasPreprocessingCorrection: !!correctionData?.preprocessing,
          sample: calculatedData.slice(0, 2)
        });
        
        setStraightnessData(calculatedData);
      }).catch((error) => {
        console.error('❌ 직진도 데이터 계산 실패:', error);
        setStraightnessData([]);
      });
    } else {
      console.log('📊 outlierRemovedData가 비어있음 - 직진도 데이터 초기화');
      setStraightnessData([]);
    }
  }, [outlierRemovedData, correctionData, straightnessSettings, calculateStraightness])

  // 탭 변경 시 이상치 재처리 트리거
  const triggerOutlierReprocessing = () => {
    console.log('🚀 이상치 재처리 트리거 실행')
    setApplyModeChanged(true)
  }

  const value: DataContextType = {
    processedData,
    metadata,
    correctionData,
    isProcessing,
    
    // STA offset 관련
    staOffset,
    useStaOffset,
    rawData,
    originalRawData,
    correctedData,
    outlierRemovedData,
    aggregatedData,
    levelDeviationData,
    crossLevelData,
    stepData,
    longitudinalLevelIrregularityData,
    straightnessData,
    guideRailClearanceData,
    selectedRows,
    correctedSelectedRows,
    outlierRemovedSelectedRows,
    aggregatedSelectedRows,
    hasModifications,
    outlierRemovalSettings,
    applyModeChanged,
    aggregationTabEntered,
    analysisTabEntered,
    currentApplyMode,
    bulkSettings,
    aggregationSettings,
    isAggregating,
    aggregationProgress: progress,
    aggregationError: error,
    isAnalysisProcessing,
    analysisProgress,
    analysisError,
    longitudinalLevelIrregularitySettings,
    straightnessSettings,
    planaritySettings,
    planarityData,
    updateStraightnessSettings: (settings: Partial<{ interval: number }>) => {
      setStraightnessSettings(prev => ({ ...prev, ...settings }));
    },
    updatePlanaritySettings: (settings: Partial<{ interval: number; aggregationMethod: 'median' | 'mean' | 'ema'; emaSpan: number }>) => {
      setPlanaritySettings(prev => ({ ...prev, ...settings }));
    },
    setPlanarityData,
    setProcessedData,
    setMetadata,
    setCorrectionData,
    updateMetadata,
    updateCorrectionData,
    setIsProcessing,
    
    // STA offset 액션
    setStaOffset,
    setUseStaOffset,
    applyStaOffsetToData,
    removeStaOffsetFromData,
    setRawData: handleSetRawData,
    setCorrectedData,
    setOutlierRemovedData,
    setAggregatedData,
    setLevelDeviationData,
    setCrossLevelData,
    setStepData,
    setLongitudinalLevelIrregularityData,
    setGuideRailClearanceData,
    setSelectedRows: handleSetSelectedRows,
    setCorrectedSelectedRows,
    setOutlierRemovedSelectedRows,
    setAggregatedSelectedRows,
    resetToRawData,
    resetToOriginalData,
    resetToFileOpenTime,
    resetToFileRecordTime,
    undoLastModification,
    transferSelectedDataToAggregation,
    transferSelectedDataToCorrection,
    applyCorrections,
    updateOutlierRemovalSettings,
    applyAggregation,
    setApplyModeChanged,
    triggerOutlierReprocessing,
    setCurrentApplyMode,
    setBulkSettings,
    setAggregationTabEntered,
    setAnalysisTabEntered,
    getDataCsv,
    getStepCsv,
    getMetaCsv,
    hasData,
    getCorrectionValue,
    updateAggregationSettings,
    updateLongitudinalLevelIrregularitySettings,
    resetOutlierSettingsToDefault,
    resetScaleOffsetSettingsToDefault,
    resetAggregationSettingsToDefault,
    saveAllSettingsToFile,
    sendAnalysisDataToMain,
  }

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
