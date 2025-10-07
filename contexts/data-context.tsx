"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
  // 모든 컬럼에 대해 한 번에 이상치 감지 및 대체하는 함수
  const detectAndReplaceOutliersForAllColumns = (data: any[], columns: string[], columnSettings: Record<string, {useIQR: boolean, iqrMultiplier: number, useZScore: boolean, zScoreThreshold: number}>, applyMode: 'individual' | 'bulk', bulkSettings?: {useIQR: boolean, iqrMultiplier: number, useZScore: boolean, zScoreThreshold: number}) => {
    if (data.length === 0) return data
    
    let processedData = [...data]
    let totalOutliers = 0
    
    // 각 컬럼별로 이상치 감지 및 대체
    columns.forEach(column => {
      let settings
      
      if (applyMode === 'bulk' && bulkSettings) {
        // 일괄 적용 모드: 모든 컬럼에 동일한 설정 사용
        settings = bulkSettings
        console.log(`일괄 적용 모드 - ${column}: IQR=${bulkSettings.useIQR}(${bulkSettings.iqrMultiplier}), Z-score=${bulkSettings.useZScore}(${bulkSettings.zScoreThreshold})`)
      } else {
        // 개별 적용 모드: 각 컬럼의 개별 설정 사용
        settings = columnSettings[column]
        if (!settings) return // 설정이 없으면 건너뜀
        console.log(`개별 적용 모드 - ${column}: IQR=${settings.useIQR}(${settings.iqrMultiplier}), Z-score=${settings.useZScore}(${settings.zScoreThreshold})`)
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
        console.log(`이상치 처리 완료 - ${column}: ${changedCount}개 값 대체`)
        totalOutliers += changedCount
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
  
  // 단계별 데이터 상태
  rawData: any[]
  originalRawData: any[] // 원본 데이터 백업
  correctedData: any[]
  outlierRemovedData: any[] // 이상치 제거된 데이터
  aggregatedData: any[]
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
  
  // 데이터 액션
  setProcessedData: (data: ProcessedData | null) => void
  setMetadata: (metadata: Metadata) => void
  setCorrectionData: (correctionData: CorrectionData | null) => void
  updateMetadata: (field: string, value: string) => void
  updateCorrectionData: (section: 'preprocessing' | 'analysis', key: string, field: 'Scaler' | 'offset', value: number) => void
  setIsProcessing: (processing: boolean) => void
  
  // 단계별 데이터 액션
  setRawData: React.Dispatch<React.SetStateAction<any[]>>
  setCorrectedData: React.Dispatch<React.SetStateAction<any[]>>
  setOutlierRemovedData: React.Dispatch<React.SetStateAction<any[]>>
  setAggregatedData: React.Dispatch<React.SetStateAction<any[]>>
  setSelectedRows: (rows: Set<number>) => void
  setCorrectedSelectedRows: (rows: Set<number>) => void
  setOutlierRemovedSelectedRows: (rows: Set<number>) => void
  setAggregatedSelectedRows: (rows: Set<number>) => void
  resetToRawData: () => void
  resetToOriginalData: () => void // 완전 원본 복원
  resetToFileOpenTime: () => Promise<void> // 파일 열기 시점으로 복원
  resetToFileRecordTime: () => Promise<void> // 파일 기록 시점으로 복원
  undoLastModification: () => void // 마지막 수정 되돌리기
  transferSelectedDataToCorrection: () => void // 선택된 데이터를 보정 탭으로 전달
  transferSelectedDataToOutlierRemoval: () => void // 선택된 데이터를 이상치 제거 탭으로 전달
  transferSelectedDataToAggregation: () => void // 선택된 데이터를 집계 탭으로 전달
  applyCorrections: () => void
  updateOutlierRemovalSettings: (column: string, settings: Partial<{useIQR: boolean, iqrMultiplier: number, useZScore: boolean, zScoreThreshold: number}>) => void
  applyAggregation: (aggregationType: string, outlierRemoval: boolean) => void
  
  // 탭 변경 관련 함수
  setApplyModeChanged: (changed: boolean) => void
  triggerOutlierReprocessing: () => void
  setCurrentApplyMode: (mode: 'individual' | 'bulk') => void
  setBulkSettings: (settings: {useIQR: boolean, iqrMultiplier: number, useZScore: boolean, zScoreThreshold: number}) => void
  
  // 데이터 접근 헬퍼
  getDataCsv: () => any[]
  getStepCsv: () => any[]
  getMetaCsv: () => any[]
  hasData: () => boolean
  getCorrectionValue: (section: 'preprocessing' | 'analysis', key: string, field: 'Scaler' | 'offset') => number
  
  // 집계 설정 업데이트
  updateAggregationSettings: (settings: Partial<{interval: number, method: 'median' | 'mean' | 'ema', emaSpan: number}>) => void
  
  // 기본값 복원 함수들
  resetOutlierSettingsToDefault: () => Promise<void>
  resetScaleOffsetSettingsToDefault: () => Promise<void>
  resetAggregationSettingsToDefault: () => Promise<void>
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
  
  // 단계별 데이터 상태
  const [rawData, setRawData] = useState<any[]>([])
  const [originalRawData, setOriginalRawData] = useState<any[]>([])
  const [correctedData, setCorrectedData] = useState<any[]>([])
  const [outlierRemovedData, setOutlierRemovedData] = useState<any[]>([])
  const [aggregatedData, setAggregatedData] = useState<any[]>([])
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [correctedSelectedRows, setCorrectedSelectedRows] = useState<Set<number>>(new Set())
  const [outlierRemovedSelectedRows, setOutlierRemovedSelectedRows] = useState<Set<number>>(new Set())
  const [aggregatedSelectedRows, setAggregatedSelectedRows] = useState<Set<number>>(new Set())
  const [hasModifications, setHasModifications] = useState(false)
  const [modificationHistory, setModificationHistory] = useState<any[]>([]) // 수정 히스토리
  const [applyModeChanged, setApplyModeChanged] = useState(false) // 탭 변경 감지
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

  const updateCorrectionData = (section: 'preprocessing' | 'analysis', key: string, field: 'Scaler' | 'offset', value: number) => {
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
        
        // options.json 업데이트
        updateOptionsFile(newData)
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
      
      // options.json 업데이트
      updateOptionsFile(newCorrectionData)
      
      // 보정값이 변경되면 자동으로 보정 적용 (이상치 처리된 데이터 사용)
      if (section === 'preprocessing' && outlierRemovedData.length > 0) {
        const corrected = outlierRemovedData.map(row => {
          const newRow = { ...row }
          Object.keys(newCorrectionData.preprocessing).forEach(correctionKey => {
            const correction = newCorrectionData.preprocessing[correctionKey]
            if (newRow[correctionKey] !== undefined) {
              newRow[correctionKey] = (newRow[correctionKey] * correction.Scaler) + correction.offset
            }
          })
          return newRow
        })
        
        setCorrectedData(corrected)
        // 보정 탭에서도 모든 데이터가 선택되도록 설정
        const allIndices = new Set<number>(corrected.map((_, index) => index))
        setCorrectedSelectedRows(allIndices)
        // useEffect에서 자동으로 집계 탭으로 전달됨
      }
      
      return newCorrectionData
    })
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

  const transferSelectedDataToCorrection = () => {
    // 선택된 데이터를 보정 탭으로 전달
    const selectedData = rawData.filter((_, index) => selectedRows.has(index))
    setCorrectedData(selectedData)
    // 보정 탭에서도 모든 데이터가 선택되도록 설정
    const allIndices = new Set<number>(selectedData.map((_, index) => index))
    setCorrectedSelectedRows(allIndices)
  }

  const transferSelectedDataToOutlierRemoval = () => {
    // 선택된 데이터를 이상치 제거 탭으로 전달
    const selectedData = correctedData.filter((_, index) => correctedSelectedRows.has(index))
    setOutlierRemovedData(selectedData)
    // 이상치 제거 탭에서도 모든 데이터가 선택되도록 설정
    const allIndices = new Set<number>(selectedData.map((_, index) => index))
    setOutlierRemovedSelectedRows(allIndices)
  }

  const transferSelectedDataToAggregation = () => {
    // 선택된 데이터를 집계 탭으로 전달
    const selectedData = outlierRemovedData.filter((_, index) => outlierRemovedSelectedRows.has(index))
    setAggregatedData(selectedData)
    // 집계 탭에서도 모든 데이터가 선택되도록 설정
    const allIndices = new Set<number>(selectedData.map((_, index) => index))
    setAggregatedSelectedRows(allIndices)
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
      
      // options.json에서 설정값 로딩
      loadOptionsFromFile()
      
      // 기본적으로 모든 데이터 선택 - setTimeout으로 다음 렌더링 사이클에서 실행
      setTimeout(() => {
        const allIndices = new Set<number>(sortedData.map((_: any, index: number) => index))
        setSelectedRows(allIndices)
        // 선택된 행이 설정되면 handleSetSelectedRows에서 자동으로 보정 탭으로 전달됨
      }, 0)
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

  // options.json 파일 업데이트
  const updateOptionsFile = async (correctionData?: CorrectionData | null, outlierSettings?: Record<string, any>) => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI && processedData?.filePath) {
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
        
        if (result.success) {
          console.log('options.json 파일이 성공적으로 업데이트되었습니다.')
        } else {
          console.error('options.json 파일 업데이트 실패:', result.message)
        }
      }
    } catch (error) {
      console.error('options.json 업데이트 중 오류:', error)
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
      
      // options.json 업데이트
      updateOptionsFile()
      
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

  // correctionData가 로드될 때 자동으로 보정 적용 (이상치 처리된 데이터 사용)
  useEffect(() => {
    if (correctionData && correctionData.preprocessing && outlierRemovedData.length > 0) {
      const corrected = outlierRemovedData.map(row => {
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
      // 보정 탭에서도 모든 데이터가 선택되도록 설정
      const allIndices = new Set<number>(corrected.map((_, index) => index))
      setCorrectedSelectedRows(allIndices)
    }
  }, [correctionData, outlierRemovedData])

  // selectedRows나 rawData가 변경될 때 자동으로 이상치 제거 및 대체 적용
  useEffect(() => {
    if (rawData.length > 0) {
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

  // outlierRemovedData가 변경될 때 자동으로 보정 탭으로 전달
  useEffect(() => {
    if (outlierRemovedData.length > 0) {
      // 선택된 행이 있으면 해당 행만, 없으면 모든 데이터를 보정 탭으로 전달
      const dataToTransfer = outlierRemovedSelectedRows.size > 0 
        ? outlierRemovedData.filter((_, index) => outlierRemovedSelectedRows.has(index))
        : outlierRemovedData
      
      setCorrectedData([...dataToTransfer])
      // 보정 탭에서도 모든 데이터가 선택되도록 설정
      const allIndices = new Set<number>(dataToTransfer.map((_, index) => index))
      setCorrectedSelectedRows(allIndices)
    }
  }, [outlierRemovedData, outlierRemovedSelectedRows])

  // correctedData가 변경될 때 자동으로 집계 탭으로 전달
  useEffect(() => {
    if (correctedData.length > 0) {
      // 선택된 행이 있으면 해당 행만, 없으면 모든 데이터를 집계 탭으로 전달
      const dataToTransfer = correctedSelectedRows.size > 0 
        ? correctedData.filter((_, index) => correctedSelectedRows.has(index))
        : correctedData
      
      setAggregatedData([...dataToTransfer])
      // 집계 탭에서도 모든 데이터가 선택되도록 설정
      const allIndices = new Set<number>(dataToTransfer.map((_, index) => index))
      setAggregatedSelectedRows(allIndices)
    }
  }, [correctedData, correctedSelectedRows])

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
      
      // options.json 업데이트
      updateOptionsFile(null, newSettings)
      
      return newSettings
    })
  }

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

  // 탭 변경 시 이상치 재처리 트리거
  const triggerOutlierReprocessing = () => {
    setApplyModeChanged(true)
  }

  const value: DataContextType = {
    processedData,
    metadata,
    correctionData,
    isProcessing,
    rawData,
    originalRawData,
    correctedData,
    outlierRemovedData,
    aggregatedData,
    selectedRows,
    correctedSelectedRows,
    outlierRemovedSelectedRows,
    aggregatedSelectedRows,
    hasModifications,
    outlierRemovalSettings,
    applyModeChanged,
    currentApplyMode,
    bulkSettings,
    aggregationSettings,
    setProcessedData,
    setMetadata,
    setCorrectionData,
    updateMetadata,
    updateCorrectionData,
    setIsProcessing,
    setRawData: handleSetRawData,
    setCorrectedData,
    setOutlierRemovedData,
    setAggregatedData,
    setSelectedRows: handleSetSelectedRows,
    setCorrectedSelectedRows,
    setOutlierRemovedSelectedRows,
    setAggregatedSelectedRows,
    resetToRawData,
    resetToOriginalData,
    resetToFileOpenTime,
    resetToFileRecordTime,
    undoLastModification,
    transferSelectedDataToCorrection,
    transferSelectedDataToOutlierRemoval,
    transferSelectedDataToAggregation,
    applyCorrections,
    updateOutlierRemovalSettings,
    applyAggregation,
    setApplyModeChanged,
    triggerOutlierReprocessing,
    setCurrentApplyMode,
    setBulkSettings,
    getDataCsv,
    getStepCsv,
    getMetaCsv,
    hasData,
    getCorrectionValue,
    updateAggregationSettings,
    resetOutlierSettingsToDefault,
    resetScaleOffsetSettingsToDefault,
    resetAggregationSettingsToDefault,
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
