"use client"

// 차트와 ChartDataSelector는 이제 PreprocessingLayout에서 공유 컴포넌트로 관리됨
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataStatistics } from "@/components/shared/data-statistics"
import { useData } from "@/contexts/data-context"
import { memo, useState, useEffect } from "react"
import { SensorType } from "@/components/shared/Chart"
import { ReadonlyDataTable } from "@/components/shared/ReadonlyDataTable"

const AggregationTab = memo(() => {
  const { 
    correctedData,
    aggregatedData, 
    aggregatedSelectedRows, 
    setAggregatedSelectedRows, 
    setAggregatedData,
    hasData
  } = useData()

  // 센서 컨트롤 상태는 이제 PreprocessingLayout에서 관리됨
  
  // 패널 최소화 상태 (Accordion으로 대체되어 제거됨)
  
  // 집계 설정 상태
  const [aggregationInterval, setAggregationInterval] = useState<number>(1.0)
  const [aggregationMethod, setAggregationMethod] = useState<'median' | 'mean' | 'ema'>('mean')
  const [emaSpan, setEmaSpan] = useState<number>(5)

  // 보정된 데이터가 변경될 때 자동으로 집계 적용
  useEffect(() => {
    if (correctedData && correctedData.length > 0) {
      const newAggregatedData = aggregateData(correctedData, aggregationInterval, aggregationMethod, aggregationMethod === 'ema' ? emaSpan : undefined)
      setAggregatedData(newAggregatedData)
      
      // 집계된 데이터가 변경되면 모든 행을 선택하도록 설정
      const allIndices = new Set<number>(newAggregatedData.map((_, index) => index))
      setAggregatedSelectedRows(allIndices)
    }
  }, [correctedData, aggregationInterval, aggregationMethod, emaSpan, setAggregatedData, setAggregatedSelectedRows])

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
      const allIndices = new Set(aggregatedData.map((_, index) => index))
      setAggregatedSelectedRows(allIndices)
    } else {
      setAggregatedSelectedRows(new Set())
    }
  }

  // 센서 타입과 컬럼 관련 핸들러는 이제 PreprocessingLayout에서 관리됨

  // 집계 로직 함수들
  const calculateMedian = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  }

  const calculateMean = (values: number[]) => {
    return values.reduce((sum, val) => sum + val, 0) / values.length
  }

  const calculateEMA = (values: number[], span: number) => {
    if (values.length === 0) return 0
    if (values.length === 1) return values[0]
    
    const alpha = 2 / (span + 1)
    let ema = values[0]
    
    for (let i = 1; i < values.length; i++) {
      ema = alpha * values[i] + (1 - alpha) * ema
    }
    
    return ema
  }

  const aggregateData = (data: any[], interval: number, method: 'median' | 'mean' | 'ema', emaSpan?: number) => {
    if (!data || data.length === 0) return []
    
    const result = []
    const numericColumns = ['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2', 'Ang3']
    
    // Travelled 열을 기준으로 거리 구간별로 집계
    const maxTravelled = Math.max(...data.map(row => parseFloat(row.Travelled) || 0))
    const numIntervals = Math.ceil(maxTravelled / interval)
    
    for (let i = 0; i < numIntervals; i++) {
      const startDistance = i * interval
      const endDistance = (i + 1) * interval
      
      // 해당 거리 구간에 속하는 데이터 필터링
      const chunk = data.filter(row => {
        const travelled = parseFloat(row.Travelled) || 0
        return travelled >= startDistance && travelled < endDistance
      })
      
      if (chunk.length === 0) continue
      
      const aggregatedRow: any = {}
      
      // 각 컬럼에 대해 집계 수행
      Object.keys(data[0]).forEach(key => {
        if (numericColumns.includes(key)) {
          const values = chunk.map(row => parseFloat(row[key]) || 0)
          if (values.length > 0) {
            switch (method) {
              case 'median':
                aggregatedRow[key] = calculateMedian(values)
                break
              case 'mean':
                aggregatedRow[key] = calculateMean(values)
                break
              case 'ema':
                aggregatedRow[key] = calculateEMA(values, emaSpan || 5)
                break
            }
          } else {
            aggregatedRow[key] = 0
          }
        } else if (key === 'Travelled') {
          // Travelled는 구간의 중간값으로 설정
          aggregatedRow[key] = (startDistance + endDistance) / 2
        } else {
          // 숫자가 아닌 컬럼은 첫 번째 값 사용
          aggregatedRow[key] = chunk[0][key]
        }
      })
      
      result.push(aggregatedRow)
    }
    
    return result
  }

  // 집계 설정 변경 핸들러
  const handleAggregationIntervalChange = (value: string) => {
    const numValue = parseFloat(value) || 1
    
    // 집계구간이 0.1보다 큰지 검증
    if (numValue <= 0.1) {
      alert('집계구간은 0.1보다 커야 합니다.')
      return
    }
    
    setAggregationInterval(numValue)
    // 보정된 데이터를 기반으로 집계된 데이터 업데이트
    if (correctedData && correctedData.length > 0) {
      const newAggregatedData = aggregateData(correctedData, numValue, aggregationMethod, aggregationMethod === 'ema' ? emaSpan : undefined)
      setAggregatedData(newAggregatedData)
      
      // 집계된 데이터가 변경되면 모든 행을 선택하도록 설정
      const allIndices = new Set<number>(newAggregatedData.map((_, index) => index))
      setAggregatedSelectedRows(allIndices)
    }
  }

  const handleAggregationMethodChange = (method: 'median' | 'mean' | 'ema') => {
    setAggregationMethod(method)
    // 보정된 데이터를 기반으로 집계된 데이터 업데이트
    if (correctedData && correctedData.length > 0) {
      const newAggregatedData = aggregateData(correctedData, aggregationInterval, method, method === 'ema' ? emaSpan : undefined)
      setAggregatedData(newAggregatedData)
      
      // 집계된 데이터가 변경되면 모든 행을 선택하도록 설정
      const allIndices = new Set<number>(newAggregatedData.map((_, index) => index))
      setAggregatedSelectedRows(allIndices)
    }
  }

  const handleEmaSpanChange = (value: string) => {
    const numValue = parseInt(value) || 1
    setEmaSpan(numValue)
    // EMA 방식인 경우에만 보정된 데이터를 기반으로 집계된 데이터 업데이트
    if (aggregationMethod === 'ema' && correctedData && correctedData.length > 0) {
      const newAggregatedData = aggregateData(correctedData, aggregationInterval, 'ema', numValue)
      setAggregatedData(newAggregatedData)
      
      // 집계된 데이터가 변경되면 모든 행을 선택하도록 설정
      const allIndices = new Set<number>(newAggregatedData.map((_, index) => index))
      setAggregatedSelectedRows(allIndices)
    }
  }

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
          <p className="text-sm mt-2">데이터 보정 탭에서 데이터를 선택하고 전달해주세요</p>
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
                columns={correctedData.length > 0 ? ['Index', 'Travelled', 'Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2', 'Ang3'].filter(col => 
                  correctedData[0] && correctedData[0].hasOwnProperty(col)
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
          <p>• 체크박스로 선택한 데이터는 [연결부 단차] 탭으로 전달됩니다</p>
          <p>• 집계 설정을 변경하면 자동으로 데이터가 업데이트됩니다</p>
        </div>
        
    </div>
  )
})

AggregationTab.displayName = "AggregationTab"

export { AggregationTab }