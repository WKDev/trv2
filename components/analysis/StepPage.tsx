"use client"

import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RotateCcw, Undo2, AlertTriangle, Check, ChevronDown, Save } from "lucide-react"
import { AnalysisChart, AnalysisChartOptions } from './AnalysisChart'
import { DataTable } from "@/components/shared/DataTable"
import { useData } from "@/contexts/data-context"
import { formatTravelled } from "@/lib/unit-formatters"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useToast } from "@/hooks/use-toast"

// 연결부 단차 데이터 타입 정의
interface StepData {
  No: number  // 원본 Index 값 (테이블에 표시)
  Position: number
  Velocity: number
  Direction: 'left' | 'right'
  StepSize: number
}

export function StepPage() {
  const { 
    getStepCsv, 
    hasData, 
    processedData,
    useStaOffset,
    staOffset,
    applyStaOffsetToData,
    removeStaOffsetFromData
  } = useData()
  
  const { toast } = useToast()
  
  // 상태 관리 - Left와 Right 데이터를 분리
  const [selectedLeftRows, setSelectedLeftRows] = useState<Set<number>>(new Set())
  const [selectedRightRows, setSelectedRightRows] = useState<Set<number>>(new Set())
  const [stepLeftData, setStepLeftData] = useState<StepData[]>([])
  const [stepRightData, setStepRightData] = useState<StepData[]>([])
  const [originalStepLeftData, setOriginalStepLeftData] = useState<StepData[]>([])
  const [originalStepRightData, setOriginalStepRightData] = useState<StepData[]>([])
  const [hasModifications, setHasModifications] = useState(false)
  const [modificationHistory, setModificationHistory] = useState<{left: StepData[], right: StepData[]}[]>([])
  const [restoreMenuOpen, setRestoreMenuOpen] = useState(false)
  const [chartOptions, setChartOptions] = useState<AnalysisChartOptions>({ yAxisMode: 'auto' })

  // y축 범위 설정을 localStorage에서 읽어와서 chartOptions 업데이트
  useEffect(() => {
    const yAxisEnabled = localStorage.getItem('analysis-step-yAxisEnabled') === 'true'
    const yAxisMin = parseFloat(localStorage.getItem('analysis-step-yAxisMin') || '0')
    const yAxisMax = parseFloat(localStorage.getItem('analysis-step-yAxisMax') || '0')
    const yAxisTickStep = parseFloat(localStorage.getItem('analysis-step-yAxisTickStep') || '1')
    
    const newChartOptions: AnalysisChartOptions = {
      yAxisMode: yAxisEnabled ? 'manual' : 'auto',
      yAxisMin: yAxisEnabled ? yAxisMin : undefined,
      yAxisMax: yAxisEnabled ? yAxisMax : undefined,
      yAxisTickStep: yAxisEnabled ? yAxisTickStep : undefined,
    }
    setChartOptions(newChartOptions)
  }, [])

  // y축 설정 변경 이벤트 리스너 추가
  useEffect(() => {
    const handleYAxisSettingsChange = (event: CustomEvent) => {
      const { moduleId: eventModuleId, enabled, min, max, tickStep } = event.detail
      
      // step 모듈의 설정 변경만 처리
      if (eventModuleId === 'step') {
        const newChartOptions: AnalysisChartOptions = {
          yAxisMode: enabled ? 'manual' : 'auto',
          yAxisMin: enabled ? min : undefined,
          yAxisMax: enabled ? max : undefined,
          yAxisTickStep: enabled ? tickStep : undefined,
        }
        setChartOptions(newChartOptions)
        console.log('🔧 StepPage y축 설정 변경:', newChartOptions)
      }
    }

    window.addEventListener('yAxisSettingsChanged', handleYAxisSettingsChange as EventListener)
    return () => window.removeEventListener('yAxisSettingsChanged', handleYAxisSettingsChange as EventListener)
  }, [])

  // step.csv 데이터 로딩 및 변환
  useEffect(() => {
    if (hasData()) {
      const rawStepData = getStepCsv()
      if (rawStepData && rawStepData.length > 0) {
        // 원본 데이터의 Index 값들 확인
        console.log('🔍 원본 step.csv 데이터 Index 값들:', rawStepData.slice(0, 10).map((row: any, index: number) => ({
          rowIndex: index,
          rawIndex: row.Index,
          parsedIndex: parseInt(row.Index) || 0,
          Direction: row.Direction,
          Position: row.Position
        })))
        
        // step.csv 데이터를 StepData 타입으로 변환
        const convertedData: StepData[] = rawStepData.map((row: any) => ({
          No: parseInt(row.Index) || 0,
          Position: parseFloat(row.Position) || 0,
          Velocity: parseFloat(row.Velocity) || 0,
          Direction: row.Direction === 'left' || row.Direction === 'right' ? row.Direction : 'left',
          StepSize: parseFloat(row.StepSize) || 0,
        }))
        
        // StepSize가 20을 넘는 행 제거
        const filteredData = convertedData.filter(item => Math.abs(item.StepSize) <= 20)
        
        // Left와 Right 데이터로 분리
        const leftData = filteredData.filter(item => item.Direction === 'left')
        const rightData = filteredData.filter(item => item.Direction === 'right')
        
        // Position 기준으로 정렬
        const sortedLeftData = [...leftData].sort((a, b) => a.Position - b.Position)
        const sortedRightData = [...rightData].sort((a, b) => a.Position - b.Position)
        
        setStepLeftData(sortedLeftData)
        setStepRightData(sortedRightData)
        setOriginalStepLeftData([...sortedLeftData])
        setOriginalStepRightData([...sortedRightData])
        setModificationHistory([{left: [...sortedLeftData], right: [...sortedRightData]}])
        setHasModifications(false)
        
        // 각 방향별로 모든 데이터 선택
        const leftIndices = new Set<number>(sortedLeftData.map((_, index) => index))
        const rightIndices = new Set<number>(sortedRightData.map((_, index) => index))
        setSelectedLeftRows(leftIndices)
        setSelectedRightRows(rightIndices)
        
        console.log('📊 연결부 단차 데이터 로드 완료:', {
          originalRows: convertedData.length,
          filteredRows: filteredData.length,
          removedRows: convertedData.length - filteredData.length,
          leftCount: sortedLeftData.length,
          rightCount: sortedRightData.length,
          selectedLeftCount: leftIndices.size,
          selectedRightCount: rightIndices.size,
          sampleLeftData: sortedLeftData.slice(0, 3),
          sampleRightData: sortedRightData.slice(0, 3)
        })
      } else {
        // 테스트용 샘플 데이터 추가 - 다양한 케이스 포함
        const sampleStepData: StepData[] = [
          // Position 0: left만 있음
          { No: 1, Position: 0, Velocity: 10, Direction: 'left', StepSize: 2.5 },
          
          // Position 1: right만 있음
          { No: 2, Position: 1, Velocity: 10, Direction: 'right', StepSize: -1.8 },
          
          // Position 2: left만 있음 (StepSize > 20 - 필터링됨)
          { No: 3, Position: 2, Velocity: 10, Direction: 'left', StepSize: 25.2 },
          
          // Position 3: 둘 다 있음
          { No: 4, Position: 3, Velocity: 10, Direction: 'left', StepSize: 1.9 },
          { No: 5, Position: 3, Velocity: 10, Direction: 'right', StepSize: -2.1 },
          
          // Position 4: right만 있음 (StepSize > 20 - 필터링됨)
          { No: 6, Position: 4, Velocity: 10, Direction: 'right', StepSize: -22.8 },
          
          // Position 5: left만 있음
          { No: 7, Position: 5, Velocity: 10, Direction: 'left', StepSize: 2.1 },
          
          // Position 6: 둘 다 있음
          { No: 8, Position: 6, Velocity: 10, Direction: 'left', StepSize: 1.5 },
          { No: 9, Position: 6, Velocity: 10, Direction: 'right', StepSize: -1.2 },
          
          // Position 7: left만 있음 (StepSize > 20 - 필터링됨)
          { No: 10, Position: 7, Velocity: 10, Direction: 'left', StepSize: 30.5 },
          
          // Position 8: right만 있음
          { No: 11, Position: 8, Velocity: 10, Direction: 'right', StepSize: -0.8 },
        ]
        
        // StepSize가 20을 넘는 행 제거
        const filteredSampleData = sampleStepData.filter(item => Math.abs(item.StepSize) <= 20)
        
        // Left와 Right 데이터로 분리
        const leftData = filteredSampleData.filter(item => item.Direction === 'left')
        const rightData = filteredSampleData.filter(item => item.Direction === 'right')
        
        // Position 기준으로 정렬
        const sortedLeftData = [...leftData].sort((a, b) => a.Position - b.Position)
        const sortedRightData = [...rightData].sort((a, b) => a.Position - b.Position)
        
        setStepLeftData(sortedLeftData)
        setStepRightData(sortedRightData)
        setOriginalStepLeftData([...sortedLeftData])
        setOriginalStepRightData([...sortedRightData])
        setModificationHistory([{left: [...sortedLeftData], right: [...sortedRightData]}])
        setHasModifications(false)
        
        // 각 방향별로 모든 데이터 선택
        const leftIndices = new Set<number>(sortedLeftData.map((_, index) => index))
        const rightIndices = new Set<number>(sortedRightData.map((_, index) => index))
        setSelectedLeftRows(leftIndices)
        setSelectedRightRows(rightIndices)
        
        console.log('📊 step.csv 데이터가 없어서 샘플 데이터 사용:', {
          originalRows: sampleStepData.length,
          filteredRows: filteredSampleData.length,
          removedRows: sampleStepData.length - filteredSampleData.length,
          leftCount: sortedLeftData.length,
          rightCount: sortedRightData.length,
          selectedLeftCount: leftIndices.size,
          selectedRightCount: rightIndices.size,
          sampleData: filteredSampleData
        })
      }
    }
  }, [hasData, getStepCsv])

  // STA offset 적용된 데이터
  const displayLeftData = useMemo(() => {
    if (useStaOffset) {
      return stepLeftData.map(item => ({
        ...item,
        Position: item.Position + (staOffset || 0)
      }))
    }
    return stepLeftData
  }, [stepLeftData, useStaOffset, staOffset])

  const displayRightData = useMemo(() => {
    if (useStaOffset) {
      return stepRightData.map(item => ({
        ...item,
        Position: item.Position + (staOffset || 0)
      }))
    }
    return stepRightData
  }, [stepRightData, useStaOffset, staOffset])

  // AnalysisChart에서 사용할 수 있는 형태로 데이터 변환 - 선택된 데이터만 표시
  const analysisChartData = useMemo(() => {
    console.log('🔍 StepPage analysisChartData 변환:', {
      leftDataLength: displayLeftData.length,
      rightDataLength: displayRightData.length,
      selectedLeftCount: selectedLeftRows.size,
      selectedRightCount: selectedRightRows.size,
      sampleLeftData: displayLeftData.slice(0, 3),
      sampleRightData: displayRightData.slice(0, 3)
    })
    
    // 선택된 Left 데이터만 필터링
    const selectedLeftData = displayLeftData.filter((_, index) => selectedLeftRows.has(index))
    
    // 선택된 Right 데이터만 필터링
    const selectedRightData = displayRightData.filter((_, index) => selectedRightRows.has(index))
    
    // 각 데이터 포인트를 독립적으로 처리
    const chartData: Array<{ Travelled: number, Left: number | null, Right: number | null }> = []
    
    // Left 데이터 추가
    selectedLeftData.forEach(item => {
      chartData.push({
        Travelled: item.Position,
        Left: item.StepSize,
        Right: null
      })
    })
    
    // Right 데이터 추가
    selectedRightData.forEach(item => {
      chartData.push({
        Travelled: item.Position,
        Left: null,
        Right: item.StepSize
      })
    })
    
    // Position 기준으로 정렬
    return chartData.sort((a, b) => a.Travelled - b.Travelled)
  }, [displayLeftData, displayRightData, selectedLeftRows, selectedRightRows])

  // 테이블용 데이터 변환 - 각각 독립적으로 처리
  const leftTableData = useMemo(() => {
    const tableData = displayLeftData.map((row, index) => ({
      id: index + 1,
      selected: selectedLeftRows.has(index),
      Index: row.No, // 원본 CSV의 Index 값 사용
      Position: row.Position,
      Velocity: row.Velocity,
      Direction: row.Direction,
      StepSize: row.StepSize,
      dataIndex: index,
    }))
    
    // 테이블 데이터의 Index 값들 확인
    console.log('🔍 Left 테이블 데이터 Index 값들:', tableData.slice(0, 5).map(item => ({
      tableIndex: item.id,
      originalIndex: item.Index,
      Position: item.Position,
      Direction: item.Direction
    })))
    
    return tableData
  }, [displayLeftData, selectedLeftRows])

  const rightTableData = useMemo(() => {
    const tableData = displayRightData.map((row, index) => ({
      id: index + 1,
      selected: selectedRightRows.has(index),
      Index: row.No, // 원본 CSV의 Index 값 사용
      Position: row.Position,
      Velocity: row.Velocity,
      Direction: row.Direction,
      StepSize: row.StepSize,
      dataIndex: index,
    }))
    
    // 테이블 데이터의 Index 값들 확인
    console.log('🔍 Right 테이블 데이터 Index 값들:', tableData.slice(0, 5).map(item => ({
      tableIndex: item.id,
      originalIndex: item.Index,
      Position: item.Position,
      Direction: item.Direction
    })))
    
    return tableData
  }, [displayRightData, selectedRightRows])

  // Left 방향 행 선택 핸들러
  const handleLeftRowSelection = useCallback((dataIndex: number, checked: boolean) => {
    const newSelectedRows = new Set(selectedLeftRows)
    if (checked) {
      newSelectedRows.add(dataIndex)
    } else {
      newSelectedRows.delete(dataIndex)
    }
    setSelectedLeftRows(newSelectedRows)
  }, [selectedLeftRows])

  // Right 방향 행 선택 핸들러
  const handleRightRowSelection = useCallback((dataIndex: number, checked: boolean) => {
    const newSelectedRows = new Set(selectedRightRows)
    if (checked) {
      newSelectedRows.add(dataIndex)
    } else {
      newSelectedRows.delete(dataIndex)
    }
    setSelectedRightRows(newSelectedRows)
  }, [selectedRightRows])

  // Left 방향 전체 선택 핸들러
  const handleLeftSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const leftIndices = new Set<number>(stepLeftData.map((_, index) => index))
      setSelectedLeftRows(leftIndices)
    } else {
      setSelectedLeftRows(new Set())
    }
  }, [stepLeftData])

  // Right 방향 전체 선택 핸들러
  const handleRightSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const rightIndices = new Set<number>(stepRightData.map((_, index) => index))
      setSelectedRightRows(rightIndices)
    } else {
      setSelectedRightRows(new Set())
    }
  }, [stepRightData])

  // Left 데이터 업데이트 핸들러 (StepSize만 수정 가능)
  const handleLeftDataUpdate = useCallback((dataIndex: number, field: string, value: number) => {
    if (field !== 'StepSize') return // StepSize만 수정 가능
    
    setStepLeftData((prevData) => {
      const newData = [...prevData]
      if (newData[dataIndex]) {
        // 수정 전 상태를 히스토리에 저장
        setModificationHistory(prev => [...prev, {left: [...prevData], right: [...stepRightData]}])
        setHasModifications(true)
        
        newData[dataIndex] = { ...newData[dataIndex], [field]: value }
      }
      return newData
    })
  }, [stepRightData])

  // Right 데이터 업데이트 핸들러 (StepSize만 수정 가능)
  const handleRightDataUpdate = useCallback((dataIndex: number, field: string, value: number) => {
    if (field !== 'StepSize') return // StepSize만 수정 가능
    
    setStepRightData((prevData) => {
      const newData = [...prevData]
      if (newData[dataIndex]) {
        // 수정 전 상태를 히스토리에 저장
        setModificationHistory(prev => [...prev, {left: [...stepLeftData], right: [...prevData]}])
        setHasModifications(true)
        
        newData[dataIndex] = { ...newData[dataIndex], [field]: value }
      }
      return newData
    })
  }, [stepLeftData])

  // Left 행 제거 핸들러
  const handleLeftRowRemove = useCallback((dataIndex: number) => {
    setStepLeftData((prevData) => {
      // 수정 전 상태를 히스토리에 저장
      setModificationHistory(prev => [...prev, {left: [...prevData], right: [...stepRightData]}])
      setHasModifications(true)
      
      const newData = prevData.filter((_, index) => index !== dataIndex)
      return newData
    })
    
    // 선택된 행들도 업데이트
    const newSelectedLeftRows = new Set<number>()
    selectedLeftRows.forEach(index => {
      if (index < dataIndex) {
        newSelectedLeftRows.add(index)
      } else if (index > dataIndex) {
        newSelectedLeftRows.add(index - 1)
      }
    })
    setSelectedLeftRows(newSelectedLeftRows)
  }, [selectedLeftRows, stepRightData])

  // Right 행 제거 핸들러
  const handleRightRowRemove = useCallback((dataIndex: number) => {
    setStepRightData((prevData) => {
      // 수정 전 상태를 히스토리에 저장
      setModificationHistory(prev => [...prev, {left: [...stepLeftData], right: [...prevData]}])
      setHasModifications(true)
      
      const newData = prevData.filter((_, index) => index !== dataIndex)
      return newData
    })
    
    // 선택된 행들도 업데이트
    const newSelectedRightRows = new Set<number>()
    selectedRightRows.forEach(index => {
      if (index < dataIndex) {
        newSelectedRightRows.add(index)
      } else if (index > dataIndex) {
        newSelectedRightRows.add(index - 1)
      }
    })
    setSelectedRightRows(newSelectedRightRows)
  }, [selectedRightRows, stepLeftData])

  // 되돌리기 핸들러
  const handleUndo = useCallback(() => {
    if (modificationHistory.length > 1) {
      const previousState = modificationHistory[modificationHistory.length - 2]
      setStepLeftData([...previousState.left])
      setStepRightData([...previousState.right])
      setModificationHistory(prev => prev.slice(0, -1))
      setHasModifications(modificationHistory.length > 2)
    }
  }, [modificationHistory])

  // 리셋 핸들러
  const handleReset = useCallback(() => {
    setStepLeftData([...originalStepLeftData])
    setStepRightData([...originalStepRightData])
    setModificationHistory([{left: [...originalStepLeftData], right: [...originalStepRightData]}])
    setHasModifications(false)
  }, [originalStepLeftData, originalStepRightData])

  // 파일 열기 시점으로 복원
  const handleRestoreToFileOpenTime = useCallback(async () => {
    if (hasData()) {
      const rawStepData = getStepCsv()
      if (rawStepData && rawStepData.length > 0) {
        const convertedData: StepData[] = rawStepData.map((row: any, index: number) => ({
          No: parseInt(row.Index) || 0,  // 원본 Index 값을 No로 저장
          Index: index,  // 내부적으로 고유한 인덱스 생성
          Position: parseFloat(row.Position) || 0,
          Velocity: parseFloat(row.Velocity) || 0,
          Direction: row.Direction === 'left' || row.Direction === 'right' ? row.Direction : 'left',
          StepSize: parseFloat(row.StepSize) || 0,
        }))
        
        // Left와 Right 데이터로 분리
        const leftData = convertedData.filter(item => item.Direction === 'left')
        const rightData = convertedData.filter(item => item.Direction === 'right')
        
        // Position 기준으로 정렬
        const sortedLeftData = [...leftData].sort((a, b) => a.Position - b.Position)
        const sortedRightData = [...rightData].sort((a, b) => a.Position - b.Position)
        
        setStepLeftData(sortedLeftData)
        setStepRightData(sortedRightData)
        setModificationHistory([{left: [...sortedLeftData], right: [...sortedRightData]}])
        setHasModifications(false)
        setRestoreMenuOpen(false)
        
        toast({
          title: "복원 완료",
          description: "파일 열기 시점으로 복원되었습니다.",
        })
      }
    }
  }, [hasData, getStepCsv, toast])

  // 측정 시점으로 복원
  const handleRestoreToFileRecordTime = useCallback(() => {
    setStepLeftData([...originalStepLeftData])
    setStepRightData([...originalStepRightData])
    setModificationHistory([{left: [...originalStepLeftData], right: [...originalStepRightData]}])
    setHasModifications(false)
    setRestoreMenuOpen(false)
    
    toast({
      title: "복원 완료",
      description: "측정 시점으로 복원되었습니다.",
    })
  }, [originalStepLeftData, originalStepRightData, toast])

  // 변경사항 저장
  const handleSaveChanges = useCallback(async () => {
    try {
      if (!processedData?.filePath) {
        toast({
          title: "저장 실패",
          description: "원본 ZIP 파일 경로를 찾을 수 없습니다.",
          variant: "destructive"
        })
        return
      }

      // 수정된 데이터를 CSV 형식으로 변환하여 저장
      const leftDataToSave = useStaOffset ? removeStaOffsetFromData(stepLeftData) : stepLeftData
      const rightDataToSave = useStaOffset ? removeStaOffsetFromData(stepRightData) : stepRightData
      const combinedData = [...leftDataToSave, ...rightDataToSave]
      
      const csvData = {
        data: processedData.data?.raw?.data || [],
        meta: processedData.data?.raw?.meta || [],
        step: combinedData.map(item => ({
          Index: item.No,  // 원본 Index 값(No)을 저장
          Position: item.Position,
          Velocity: item.Velocity,
          Direction: item.Direction,
          StepSize: item.StepSize,
        }))
      }

      // Electron API를 통해 파일 저장
      if (window.electronAPI?.saveCsvFiles) {
        const result = await window.electronAPI.saveCsvFiles(processedData.filePath, csvData)
        if (result.success) {
          toast({
            title: "저장 완료",
            description: "변경사항이 성공적으로 저장되었습니다.",
          })
          
          // 저장 후 원본 데이터 업데이트
          setOriginalStepLeftData([...stepLeftData])
          setOriginalStepRightData([...stepRightData])
          setModificationHistory([{left: [...stepLeftData], right: [...stepRightData]}])
          setHasModifications(false)
        } else {
          toast({
            title: "저장 실패",
            description: result.message,
            variant: "destructive"
          })
        }
      } else {
        toast({
          title: "저장 실패",
          description: "Electron API를 사용할 수 없습니다.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('변경사항 저장 중 오류:', error)
      toast({
        title: "저장 실패",
        description: "저장 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    }
  }, [processedData, stepLeftData, stepRightData, useStaOffset, removeStaOffsetFromData, toast])

  // 데이터가 없을 때 표시
  if (!hasData() || (stepLeftData.length === 0 && stepRightData.length === 0)) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">연결부 단차 데이터가 없습니다</p>
          <p className="text-sm mt-2">ZIP 파일에 step.csv가 포함되어 있는지 확인해주세요</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 차트 섹션 */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">연결부 단차 차트</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalysisChart
            title=""
            moduleId="step"
            data={analysisChartData}
            refLevel={9} // 연결부 단차 기본 reference level
            selectedRows={new Set(Array.from(selectedLeftRows).concat(Array.from(selectedRightRows)))}
            chartOptions={chartOptions}
            onChartOptionsChange={setChartOptions}
          />
        </CardContent>
      </Card>

      {/* 테이블 섹션 */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">연결부 단차 데이터</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                선택 데이터수: {selectedLeftRows.size + selectedRightRows.size} / 전체 데이터 수: {stepLeftData.length + stepRightData.length}
                (Left: {stepLeftData.length}, Right: {stepRightData.length})
              </p>
            </div>
            
            {/* 데이터 조작 버튼들 */}
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleUndo}
                disabled={!hasModifications}
                title="마지막 수정을 되돌립니다"
              >
                <Undo2 className="mr-1 h-3 w-3" />
                되돌리기
              </Button>
              
              {/* 복원 메뉴 */}
              <Popover open={restoreMenuOpen} onOpenChange={setRestoreMenuOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    title="데이터 복원 옵션을 선택합니다"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    복원
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">복원 옵션 선택</h4>
                    <div className="space-y-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={handleRestoreToFileOpenTime}
                        title="파일을 열었을 때의 상태로 복원합니다"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        파일 열기 시점으로 복원
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-destructive hover:text-destructive"
                        onClick={handleRestoreToFileRecordTime}
                        title="측정 시점의 원본 데이터로 완전히 복원합니다"
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        측정 시점으로 복원
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleReset}
                title="원본 상태로 되돌립니다"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                초기화
              </Button>
              
              <Button 
                size="sm" 
                className="bg-primary hover:bg-primary/90" 
                onClick={handleSaveChanges}
                title="수정된 데이터를 파일로 저장합니다"
              >
                <Save className="mr-1 h-3 w-3" />
                저장
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 2단 테이블 배치 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left 방향 테이블 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-foreground">Left 방향</h3>
                <div className="text-sm text-muted-foreground">
                  {leftTableData.filter(row => row.selected).length} / {leftTableData.length} 선택
                </div>
              </div>
              <DataTable
                data={leftTableData}
                columns={['Index', 'Position', 'Velocity', 'StepSize']}
                showCheckboxes={true}
                onRowSelection={(rowIndex, checked) => {
                  const dataIndex = leftTableData[rowIndex]?.dataIndex
                  if (dataIndex !== undefined) {
                    handleLeftRowSelection(dataIndex, checked)
                  }
                }}
                onSelectAll={handleLeftSelectAll}
                selectedRows={new Set(leftTableData.filter(row => row.selected).map(row => row.dataIndex))}
                onDataUpdate={(rowIndex, field, value) => {
                  const dataIndex = leftTableData[rowIndex]?.dataIndex
                  if (dataIndex !== undefined) {
                    handleLeftDataUpdate(dataIndex, field, value)
                  }
                }}
                onRowRemove={(rowIndex) => {
                  const dataIndex = leftTableData[rowIndex]?.dataIndex
                  if (dataIndex !== undefined) {
                    handleLeftRowRemove(dataIndex)
                  }
                }}
                rowHeight={32}
                visibleRows={15}
                columnWidths={{
                  'Index': 60,
                  'Position': 100,
                  'Velocity': 80,
                  'StepSize': 100,
                  'Action': 80
                }}
              />
            </div>

            {/* Right 방향 테이블 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-foreground">Right 방향</h3>
                <div className="text-sm text-muted-foreground">
                  {rightTableData.filter(row => row.selected).length} / {rightTableData.length} 선택
                </div>
              </div>
              <DataTable
                data={rightTableData}
                columns={['Index', 'Position', 'Velocity', 'StepSize']}
                showCheckboxes={true}
                onRowSelection={(rowIndex, checked) => {
                  const dataIndex = rightTableData[rowIndex]?.dataIndex
                  if (dataIndex !== undefined) {
                    handleRightRowSelection(dataIndex, checked)
                  }
                }}
                onSelectAll={handleRightSelectAll}
                selectedRows={new Set(rightTableData.filter(row => row.selected).map(row => row.dataIndex))}
                onDataUpdate={(rowIndex, field, value) => {
                  const dataIndex = rightTableData[rowIndex]?.dataIndex
                  if (dataIndex !== undefined) {
                    handleRightDataUpdate(dataIndex, field, value)
                  }
                }}
                onRowRemove={(rowIndex) => {
                  const dataIndex = rightTableData[rowIndex]?.dataIndex
                  if (dataIndex !== undefined) {
                    handleRightRowRemove(dataIndex)
                  }
                }}
                rowHeight={32}
                visibleRows={15}
                columnWidths={{
                  'Index': 60,
                  'Position': 100,
                  'Velocity': 80,
                  'StepSize': 100,
                  'Action': 80
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-sm text-muted-foreground">
        <p>• StepSize 값만 수정할 수 있습니다</p>
        <p>• 데이터 수정 후 초기화 버튼으로 원본 상태로 되돌릴 수 있습니다</p>
        <p>• 저장 버튼을 눌러 변경사항을 파일에 저장할 수 있습니다</p>
      </div>
    </div>
  )
}