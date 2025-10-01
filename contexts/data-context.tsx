"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

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
  
  // 데이터 액션
  setProcessedData: (data: ProcessedData | null) => void
  setMetadata: (metadata: Metadata) => void
  setCorrectionData: (correctionData: CorrectionData | null) => void
  updateMetadata: (field: string, value: string) => void
  updateCorrectionData: (section: 'preprocessing' | 'analysis', key: string, field: 'Scaler' | 'offset', value: number) => void
  setIsProcessing: (processing: boolean) => void
  
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

  const updateMetadata = (field: string, value: string) => {
    setMetadata((prev) => ({ ...prev, [field]: value }))
  }

  const updateCorrectionData = (section: 'preprocessing' | 'analysis', key: string, field: 'Scaler' | 'offset', value: number) => {
    setCorrectionData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [key]: {
            ...prev[section][key],
            [field]: value
          }
        }
      }
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
      return 0
    }
    return correctionData[section][key][field]
  }

  const value: DataContextType = {
    processedData,
    metadata,
    correctionData,
    isProcessing,
    setProcessedData,
    setMetadata,
    setCorrectionData,
    updateMetadata,
    updateCorrectionData,
    setIsProcessing,
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
