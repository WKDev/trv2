"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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
  aggregatedData: any[]
  selectedRows: Set<number>
  correctedSelectedRows: Set<number>
  aggregatedSelectedRows: Set<number>
  hasModifications: boolean // 수정 여부 추적
  
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
  setAggregatedData: React.Dispatch<React.SetStateAction<any[]>>
  setSelectedRows: (rows: Set<number>) => void
  setCorrectedSelectedRows: (rows: Set<number>) => void
  setAggregatedSelectedRows: (rows: Set<number>) => void
  resetToRawData: () => void
  resetToOriginalData: () => void // 완전 원본 복원
  resetToFileOpenTime: () => Promise<void> // 파일 열기 시점으로 복원
  resetToFileRecordTime: () => Promise<void> // 파일 기록 시점으로 복원
  undoLastModification: () => void // 마지막 수정 되돌리기
  transferSelectedDataToCorrection: () => void // 선택된 데이터를 보정 탭으로 전달
  transferSelectedDataToAggregation: () => void // 선택된 데이터를 집계 탭으로 전달
  applyCorrections: () => void
  applyAggregation: (aggregationType: string, outlierRemoval: boolean) => void
  
  // 데이터 접근 헬퍼
  getDataCsv: () => any[]
  getStepCsv: () => any[]
  getMetaCsv: () => any[]
  hasData: () => boolean
  getCorrectionValue: (section: 'preprocessing' | 'analysis', key: string, field: 'Scaler' | 'offset') => number
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
  const [aggregatedData, setAggregatedData] = useState<any[]>([])
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [correctedSelectedRows, setCorrectedSelectedRows] = useState<Set<number>>(new Set())
  const [aggregatedSelectedRows, setAggregatedSelectedRows] = useState<Set<number>>(new Set())
  const [hasModifications, setHasModifications] = useState(false)
  const [modificationHistory, setModificationHistory] = useState<any[]>([]) // 수정 히스토리

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
        return {
          ...defaultCorrectionData,
          [section]: {
            ...defaultCorrectionData[section],
            [key]: {
              ...defaultCorrectionData[section][key],
              [field]: value
            }
          }
        }
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
      
      // 보정값이 변경되면 자동으로 보정 적용
      if (section === 'preprocessing' && rawData.length > 0) {
        const corrected = rawData.map(row => {
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
      // Level5, Level6에 대한 기본값 반환
      if (section === 'preprocessing' && (key === 'Level5' || key === 'Level6')) {
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
      if (processedData?.filePath && window.electronAPI) {
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

  const transferSelectedDataToAggregation = () => {
    // 선택된 데이터를 집계 탭으로 전달
    const selectedData = correctedData.filter((_, index) => correctedSelectedRows.has(index))
    setAggregatedData(selectedData)
    // 집계 탭에서도 모든 데이터가 선택되도록 설정
    const allIndices = new Set<number>(selectedData.map((_, index) => index))
    setAggregatedSelectedRows(allIndices)
  }

  // 커스텀 setCorrectedData 함수 - 자동 집계 탭 전달
  const handleSetCorrectedData = (newData: any[] | ((prev: any[]) => any[])) => {
    setCorrectedData((prevData) => {
      const updatedData = typeof newData === 'function' ? newData(prevData) : newData
      
      // 데이터가 변경되었는지 확인
      const hasChanged = JSON.stringify(prevData) !== JSON.stringify(updatedData)
      if (hasChanged) {
        // 데이터 보정이 변경되면 자동으로 집계 탭으로 전달
        setAggregatedData([...updatedData])
        // 집계 탭에서도 모든 데이터가 선택되도록 설정
        const allIndices = new Set<number>(updatedData.map((_, index) => index))
        setAggregatedSelectedRows(allIndices)
      }
      
      return updatedData
    })
  }

  // 데이터가 로드될 때 rawData 초기화
  useEffect(() => {
    if (hasData()) {
      const originalData = getDataCsv()
      setRawData([...originalData])
      setOriginalRawData([...originalData]) // 원본 데이터 백업
      
      // 전처리 단계별 데이터 초기화
      setAggregatedData([])
      setCorrectedSelectedRows(new Set())
      setAggregatedSelectedRows(new Set())
      setHasModifications(false)
      setModificationHistory([])
      
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
      
      // 기본적으로 모든 데이터 선택 - setTimeout으로 다음 렌더링 사이클에서 실행
      setTimeout(() => {
        const allIndices = new Set<number>(originalData.map((_: any, index: number) => index))
        setSelectedRows(allIndices)
        // 선택된 행이 설정되면 handleSetSelectedRows에서 자동으로 보정 탭으로 전달됨
      }, 0)
    }
  }, [processedData?.fileName, processedData?.filePath]) // processedData의 고유 식별자로 변경

  // correctionData가 로드될 때 자동으로 보정 적용
  useEffect(() => {
    if (correctionData && correctionData.preprocessing && rawData.length > 0) {
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
      // 보정 탭에서도 모든 데이터가 선택되도록 설정
      const allIndices = new Set<number>(corrected.map((_, index) => index))
      setCorrectedSelectedRows(allIndices)
    }
  }, [correctionData, rawData])

  // selectedRows나 rawData가 변경될 때 자동으로 보정 탭으로 전달
  useEffect(() => {
    if (rawData.length > 0) {
      // 선택된 행이 있으면 해당 행만, 없으면 모든 데이터를 보정 탭으로 전달
      const dataToTransfer = selectedRows.size > 0 
        ? rawData.filter((_, index) => selectedRows.has(index))
        : rawData
      
      setCorrectedData([...dataToTransfer])
      // 보정 탭에서도 모든 데이터가 선택되도록 설정
      const allIndices = new Set<number>(dataToTransfer.map((_, index) => index))
      setCorrectedSelectedRows(allIndices)
    }
  }, [selectedRows, rawData])

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

  const value: DataContextType = {
    processedData,
    metadata,
    correctionData,
    isProcessing,
    rawData,
    originalRawData,
    correctedData,
    aggregatedData,
    selectedRows,
    correctedSelectedRows,
    aggregatedSelectedRows,
    hasModifications,
    setProcessedData,
    setMetadata,
    setCorrectionData,
    updateMetadata,
    updateCorrectionData,
    setIsProcessing,
    setRawData: handleSetRawData,
    setCorrectedData: handleSetCorrectedData,
    setAggregatedData,
    setSelectedRows: handleSetSelectedRows,
    setCorrectedSelectedRows,
    setAggregatedSelectedRows,
    resetToRawData,
    resetToOriginalData,
    resetToFileOpenTime,
    resetToFileRecordTime,
    undoLastModification,
    transferSelectedDataToCorrection,
    transferSelectedDataToAggregation,
    applyCorrections,
    applyAggregation,
    getDataCsv,
    getStepCsv,
    getMetaCsv,
    hasData,
    getCorrectionValue,
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
