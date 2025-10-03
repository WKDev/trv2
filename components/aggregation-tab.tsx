"use client"

import { DataChartTable } from "@/components/data-chart-table"
import { ChartJSLineChart } from "@/components/chart-js-line-chart"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useData } from "@/contexts/data-context"
import { memo, useState, useEffect } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { SensorType } from "@/components/chart-js-line-chart"

const AggregationTab = memo(() => {
  const { 
    correctedData,
    aggregatedData, 
    aggregatedSelectedRows, 
    setAggregatedSelectedRows, 
    setAggregatedData,
    hasData
  } = useData()

  // 센서 컨트롤 상태
  const [selectedSensorType, setSelectedSensorType] = useState<SensorType>('Level')
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6']))
  
  // 패널 최소화 상태
  const [isDataInfoCollapsed, setIsDataInfoCollapsed] = useState(true)
  const [isAggregationPanelCollapsed, setIsAggregationPanelCollapsed] = useState(false)
  
  // 집계 설정 상태
  const [aggregationInterval, setAggregationInterval] = useState<number>(10)
  const [aggregationMethod, setAggregationMethod] = useState<'median' | 'mean' | 'ema'>('mean')
  const [emaSpan, setEmaSpan] = useState<number>(5)

  // 보정된 데이터가 변경될 때 자동으로 집계 적용
  useEffect(() => {
    if (correctedData && correctedData.length > 0) {
      const newAggregatedData = aggregateData(correctedData, aggregationInterval, aggregationMethod, aggregationMethod === 'ema' ? emaSpan : undefined)
      setAggregatedData(newAggregatedData)
    }
  }, [correctedData, aggregationInterval, aggregationMethod, emaSpan, setAggregatedData])

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

  // 센서 타입 변경 핸들러
  const handleSensorTypeChange = (sensorType: SensorType) => {
    setSelectedSensorType(sensorType)
    
    // 센서 타입에 따라 기본 컬럼 설정
    const defaultColumns = {
      Level: ['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6'],
      Encoder: ['Encoder3'],
      Angle: ['Ang1', 'Ang2', 'Ang3'],
    }
    
    setVisibleColumns(new Set(defaultColumns[sensorType]))
  }

  // 탭 변경 핸들러 (string을 받아서 SensorType으로 변환)
  const handleTabChange = (value: string) => {
    const sensorType = value as SensorType
    handleSensorTypeChange(sensorType)
  }

  // 컬럼 토글 핸들러
  const handleColumnToggle = (column: string, checked: boolean) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(column)
      } else {
        newSet.delete(column)
      }
      return newSet
    })
  }

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
    
    for (let i = 0; i < data.length; i += interval) {
      const chunk = data.slice(i, i + interval)
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
    const numValue = parseInt(value) || 1
    setAggregationInterval(numValue)
    // 보정된 데이터를 기반으로 집계된 데이터 업데이트
    if (correctedData && correctedData.length > 0) {
      const newAggregatedData = aggregateData(correctedData, numValue, aggregationMethod, aggregationMethod === 'ema' ? emaSpan : undefined)
      setAggregatedData(newAggregatedData)
    }
  }

  const handleAggregationMethodChange = (method: 'median' | 'mean' | 'ema') => {
    setAggregationMethod(method)
    // 보정된 데이터를 기반으로 집계된 데이터 업데이트
    if (correctedData && correctedData.length > 0) {
      const newAggregatedData = aggregateData(correctedData, aggregationInterval, method, method === 'ema' ? emaSpan : undefined)
      setAggregatedData(newAggregatedData)
    }
  }

  const handleEmaSpanChange = (value: string) => {
    const numValue = parseInt(value) || 1
    setEmaSpan(numValue)
    // EMA 방식인 경우에만 보정된 데이터를 기반으로 집계된 데이터 업데이트
    if (aggregationMethod === 'ema' && correctedData && correctedData.length > 0) {
      const newAggregatedData = aggregateData(correctedData, aggregationInterval, 'ema', numValue)
      setAggregatedData(newAggregatedData)
    }
  }

  // 데이터가 없을 때는 로딩 상태 표시
  if (!hasData()) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="text-center">
            <p>데이터를 먼저 로드해주세요</p>
            <p className="text-sm mt-2">파일 열기 탭에서 ZIP 파일을 선택하세요</p>
          </div>
        </div>
        <div></div>
      </div>
    )
  }

  // 집계된 데이터가 없을 때
  if (aggregatedData.length === 0) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="text-center">
            <p>집계할 데이터가 없습니다</p>
            <p className="text-sm mt-2">데이터 보정 탭에서 데이터를 선택하고 전달해주세요</p>
          </div>
        </div>
        <div></div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <div className="space-y-6">
          <ChartJSLineChart
            title="차트"
            data={aggregatedData}
            selectedRows={aggregatedSelectedRows}
            onSensorTypeChange={handleSensorTypeChange}
            onColumnToggle={handleColumnToggle}
            selectedSensorType={selectedSensorType}
            visibleColumns={visibleColumns}
            maxDataPoints={1000}
          />
          
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">집계된 데이터</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <DataChartTable 
                title="집계된 데이터" 
                dataType="data" 
                data={aggregatedData}
                showCheckboxes={true}
                onRowSelection={handleRowSelection}
                onSelectAll={handleSelectAll}
                selectedRows={aggregatedSelectedRows}
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>• 체크박스로 선택한 데이터는 [연결부 단차] 탭으로 전달됩니다</p>
          <p>• 집계 설정을 변경하면 자동으로 데이터가 업데이트됩니다</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* 차트 표시 데이터 선택 패널 */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">차트 표시 데이터 선택</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAggregationPanelCollapsed(!isAggregationPanelCollapsed)}
              className="h-6 w-6 p-0"
            >
              {isAggregationPanelCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
          {!isAggregationPanelCollapsed && (
            <Tabs value={selectedSensorType} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="Level">Level</TabsTrigger>
                <TabsTrigger value="Encoder">Encoder</TabsTrigger>
                <TabsTrigger value="Angle">Angle</TabsTrigger>
              </TabsList>
              <TabsContent value={selectedSensorType} className="mt-4">
                <div className="grid grid-cols-2 gap-2">
                  {selectedSensorType === 'Level' && ['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6'].map((column) => (
                    <div key={column} className="flex items-center space-x-2">
                      <Checkbox
                        id={`column-${column}`}
                        checked={visibleColumns.has(column)}
                        onCheckedChange={(checked) => 
                          handleColumnToggle(column, checked as boolean)
                        }
                      />
                      <Label htmlFor={`column-${column}`} className="text-sm">
                        {column}
                      </Label>
                    </div>
                  ))}
                  {selectedSensorType === 'Encoder' && ['Encoder3'].map((column) => (
                    <div key={column} className="flex items-center space-x-2">
                      <Checkbox
                        id={`column-${column}`}
                        checked={visibleColumns.has(column)}
                        onCheckedChange={(checked) => 
                          handleColumnToggle(column, checked as boolean)
                        }
                      />
                      <Label htmlFor={`column-${column}`} className="text-sm">
                        {column}
                      </Label>
                    </div>
                  ))}
                  {selectedSensorType === 'Angle' && ['Ang1', 'Ang2', 'Ang3'].map((column) => (
                    <div key={column} className="flex items-center space-x-2">
                      <Checkbox
                        id={`column-${column}`}
                        checked={visibleColumns.has(column)}
                        onCheckedChange={(checked) => 
                          handleColumnToggle(column, checked as boolean)
                        }
                      />
                      <Label htmlFor={`column-${column}`} className="text-sm">
                        {column}
                      </Label>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* 데이터 집계 설정 패널 */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">데이터 집계</h4>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">집계 간격</Label>
              <Input
                type="number"
                min="1"
                value={aggregationInterval}
                onChange={(e) => handleAggregationIntervalChange(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label className="text-sm mb-2 block">집계 방식</Label>
              <Tabs value={aggregationMethod} onValueChange={(value) => handleAggregationMethodChange(value as 'median' | 'mean' | 'ema')} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="median">중간값</TabsTrigger>
                  <TabsTrigger value="mean">평균값</TabsTrigger>
                  <TabsTrigger value="ema">EMA</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {aggregationMethod === 'ema' && (
              <div>
                <Label className="text-sm">EMA span</Label>
                <Input
                  type="number"
                  min="1"
                  value={emaSpan}
                  onChange={(e) => handleEmaSpanChange(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">선택된 데이터</h4>
            <span className="text-sm text-muted-foreground">{aggregatedSelectedRows.size}개</span>
          </div>
          <Button 
            className="w-full" 
            disabled={aggregatedSelectedRows.size === 0}
            onClick={() => console.log('연결부 단차로 이동')}
            size="sm"
          >
            연결부 단차로 이동
          </Button>
        </div>
        
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">데이터 정보</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDataInfoCollapsed(!isDataInfoCollapsed)}
              className="h-6 w-6 p-0"
            >
              {isDataInfoCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
          {!isDataInfoCollapsed && (
            <div className="text-sm space-y-1">
              <p>총 행 수: {aggregatedData.length}</p>
              <p>선택된 행: {aggregatedSelectedRows.size}</p>
              <p>집계 간격: {aggregationInterval}</p>
              <p>집계 방식: {aggregationMethod === 'median' ? '중간값' : aggregationMethod === 'mean' ? '평균값' : 'EMA'}</p>
              {aggregationMethod === 'ema' && <p>EMA span: {emaSpan}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

AggregationTab.displayName = "AggregationTab"

export { AggregationTab }