"use client"

// 차트와 ChartDataSelector는 이제 PreprocessingLayout에서 공유 컴포넌트로 관리됨
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataStatistics } from "@/components/shared/data-statistics"
import { useData } from "@/contexts/data-context"
import { memo, useState, useEffect, useCallback } from "react"
import { ReadonlyDataTable } from "@/components/shared/ReadonlyDataTable"
import { useAggregationWorker } from "@/hooks/use-aggregation-worker"
import { Progress } from "@/components/ui/progress"

const AggregationTab = memo(() => {
  const { 
    outlierRemovedData,
    aggregatedData, 
    aggregatedSelectedRows, 
    setAggregatedSelectedRows, 
    setAggregatedData,
    hasData,
    aggregationSettings,
    updateAggregationSettings,
    aggregationTabEntered,
    setAggregationTabEntered
  } = useData()

  // Web Worker 훅 사용
  const { aggregateData, validateSettings, isProcessing, progress, error } = useAggregationWorker()

  // 센서 컨트롤 상태는 이제 PreprocessingLayout에서 관리됨
  
  // 패널 최소화 상태 (Accordion으로 대체되어 제거됨)
  
  // 로컬 집계 설정 상태 (UI용)
  const [localSettings, setLocalSettings] = useState({
    interval: aggregationSettings.interval,
    method: aggregationSettings.method,
    emaSpan: aggregationSettings.emaSpan
  })

  // Web Worker를 사용한 집계 수행
  const performAggregation = useCallback(async (data: unknown[], settings: {interval: number, method: 'median' | 'mean' | 'ema', emaSpan: number}) => {
    try {
      console.log('🔄 집계 작업 시작:', {
        inputDataLength: data.length,
        settings: settings,
        inputDataSample: data.slice(0, 2)
      })
      
      // 설정 검증
      const validation = await validateSettings(settings)
      if (!validation.isValid) {
        console.error('집계 설정 오류:', validation.errors)
        return
      }

      // 집계 수행
      const result = await aggregateData(data, settings)
      if (result.success) {
        console.log('✅ 집계 완료 - aggregatedData 설정:', {
          resultDataLength: result.data.length,
          sample: result.data.slice(0, 3)
        })
        setAggregatedData(result.data)
        
        // 집계된 데이터가 변경되면 모든 행을 선택하도록 설정
        const allAggregatedIndices = new Set<number>(result.data.map((_, index) => index))
        setAggregatedSelectedRows(allAggregatedIndices)
        console.log('✅ 집계된 데이터 선택 행 설정 완료:', allAggregatedIndices.size)
      } else {
        console.error('집계 실패:', result.error)
      }
    } catch (error) {
      console.error('집계 중 오류 발생:', error)
    }
  }, [aggregateData, validateSettings, setAggregatedData, setAggregatedSelectedRows])

  // 탭 진입 시에만 집계 작업 수행
  useEffect(() => {
    console.log('🔄 AggregationTab useEffect 실행:', {
      aggregationTabEntered,
      outlierRemovedDataLength: outlierRemovedData.length,
      aggregationSettings
    })
    
    if (aggregationTabEntered && outlierRemovedData && outlierRemovedData.length > 0) {
      console.log('🔄 집계 탭 진입 - 집계 작업 시작')
      performAggregation(outlierRemovedData, aggregationSettings)
    } else {
      console.log('⚠️ 집계 탭 진입 조건 미충족:', {
        aggregationTabEntered,
        hasOutlierRemovedData: outlierRemovedData.length > 0
      })
    }
  }, [aggregationTabEntered, outlierRemovedData, aggregationSettings, performAggregation])

  // 집계 설정이 변경될 때 로컬 상태 동기화
  useEffect(() => {
    setLocalSettings({
      interval: aggregationSettings.interval,
      method: aggregationSettings.method,
      emaSpan: aggregationSettings.emaSpan
    })
  }, [aggregationSettings])

  const handleRowSelection = (rowIndex: number, checked: boolean) => {
    const newSelectedRows = new Set(aggregatedSelectedRows)
    if (checked) {
      newSelectedRows.add(rowIndex)
    } else {
      newSelectedRows.delete(rowIndex)
    }
    setAggregatedSelectedRows(newSelectedRows)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allSelectIndices = new Set(aggregatedData.map((_, index) => index))
      setAggregatedSelectedRows(allSelectIndices)
    } else {
      setAggregatedSelectedRows(new Set())
    }
  }

  // 집계 설정 변경 핸들러들

  const handleAggregationIntervalChange = useCallback(async (value: string) => {
    const numValue = parseFloat(value) || 1
    
    // 집계구간이 0.1보다 큰지 검증
    if (numValue <= 0.1) {
      alert('집계구간은 0.1보다 커야 합니다.')
      return
    }
    
    const newSettings = { ...localSettings, interval: numValue }
    setLocalSettings(newSettings)
    updateAggregationSettings({ interval: numValue })
    
    // 집계 탭에 진입했을 때만 집계 작업 수행
    if (aggregationTabEntered && outlierRemovedData && outlierRemovedData.length > 0) {
      await performAggregation(outlierRemovedData, newSettings)
    }
  }, [localSettings, outlierRemovedData, performAggregation, updateAggregationSettings, aggregationTabEntered])

  const handleAggregationMethodChange = useCallback(async (method: 'median' | 'mean' | 'ema') => {
    const newSettings = { ...localSettings, method }
    setLocalSettings(newSettings)
    updateAggregationSettings({ method })
    
    // 집계 탭에 진입했을 때만 집계 작업 수행
    if (aggregationTabEntered && outlierRemovedData && outlierRemovedData.length > 0) {
      await performAggregation(outlierRemovedData, newSettings)
    }
  }, [localSettings, outlierRemovedData, performAggregation, updateAggregationSettings, aggregationTabEntered])

  const handleEmaSpanChange = useCallback(async (value: string) => {
    const numValue = parseInt(value) || 1
    const newSettings = { ...localSettings, emaSpan: numValue }
    setLocalSettings(newSettings)
    updateAggregationSettings({ emaSpan: numValue })
    
    // 집계 탭에 진입했을 때만 집계 작업 수행
    if (aggregationTabEntered && localSettings.method === 'ema' && outlierRemovedData && outlierRemovedData.length > 0) {
      await performAggregation(outlierRemovedData, newSettings)
    }
  }, [localSettings, outlierRemovedData, performAggregation, updateAggregationSettings, aggregationTabEntered])

  // 데이터가 없을 때는 로딩 상태 표시
  if (!hasData()) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <div className="text-center">
          <p>데이터를 먼저 로드해주세요</p>
          <p className="text-sm mt-2">파일 열기 탭에서 ZIP 파일을 선택하세요</p>
        </div>
      </div>
    )
  }

  // 집계된 데이터가 없을 때
  if (aggregatedData.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <div className="text-center">
          <p>집계할 데이터가 없습니다</p>
          <p className="text-sm mt-2">이상치 처리 탭에서 데이터를 처리하면 자동으로 전달됩니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        <div className="space-y-6">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">집계된 데이터</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    선택 데이터수: {aggregatedSelectedRows.size} / 전체 데이터 수: {aggregatedData.length}
                  </p>
                  {isProcessing && progress && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>집계 진행 중...</span>
                        <span>{progress.progress}%</span>
                      </div>
                      <Progress value={progress.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        처리된 구간: {progress.processed} / {progress.total}
                      </p>
                    </div>
                  )}
                  {error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-xs text-red-600">
                        집계 오류: {error}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ReadonlyDataTable
                data={aggregatedData.map((row: any, index: number) => ({
                  id: index + 1,
                  selected: aggregatedSelectedRows.has(index),
                  index: index + 1,
                  ...Object.keys(row).reduce((acc, col) => {
                    if (!['UnixTimestamp', 'Elasped', 'Timestamp', 'Velocity', 'Encoder1', 'Encoder2'].includes(col)) {
                      if (col === 'Index') {
                        acc[col] = parseInt(row[col]) || 0
                      } else if (['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2'].includes(col)) {
                        acc[col] = parseFloat((parseFloat(row[col]) || 0).toFixed(3))
                      } else {
                        acc[col] = parseFloat(row[col]) || 0
                      }
                    }
                    return acc
                  }, {} as Record<string, number>)
                }))}
                columns={aggregatedData.length > 0 ? ['Index', 'Travelled', 'Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2', 'Ang3'].filter(col => 
                  aggregatedData[0] && aggregatedData[0].hasOwnProperty(col)
                ) : []}
                showCheckboxes={true}
                onRowSelection={handleRowSelection}
                onSelectAll={handleSelectAll}
                selectedRows={aggregatedSelectedRows}
                rowHeight={32}
                visibleRows={25}
                columnWidths={{
                  'Index': 60,
                  'Travelled': 100,
                  'Level1': 80,
                  'Level2': 80,
                  'Level3': 80,
                  'Level4': 80,
                  'Level5': 80,
                  'Level6': 80,
                  'Encoder3': 80,
                  'Ang1': 80,
                  'Ang2': 80,
                  'Ang3': 80
                }}
              />
            </CardContent>
          </Card>
          
          {/* 데이터 통계 */}
          <DataStatistics 
            data={aggregatedData} 
            columns={['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2', 'Ang3']} 
          />
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>• 체크박스로 선택한 데이터는 [Scale & Offset] 탭으로 전달됩니다</p>
          <p>• 집계 설정을 변경하면 자동으로 데이터가 업데이트됩니다</p>
          <p>• Web Worker를 사용하여 대용량 데이터 처리 시에도 UI가 블로킹되지 않습니다</p>
        </div>
        
    </div>
  )
})

AggregationTab.displayName = "AggregationTab"

export { AggregationTab }