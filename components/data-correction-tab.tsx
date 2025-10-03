"use client"

import { DataChartTable } from "@/components/data-chart-table"
import { ChartJSLineChart } from "@/components/chart-js-line-chart"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReadOnlyVirtualizedTable } from "@/components/readonly-virtualized-table"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { DataStatistics } from "@/components/data-statistics"
import { useData } from "@/contexts/data-context"
import { memo, useState } from "react"
import { SensorType } from "@/components/chart-js-line-chart"

const DataCorrectionTab = memo(() => {
  const { 
    rawData,
    outlierRemovedData,
    correctedData, 
    correctedSelectedRows, 
    setCorrectedSelectedRows, 
    setCorrectedData,
    hasData, 
    correctionData,
    updateCorrectionData,
    getCorrectionValue
  } = useData()

  
  // 패널 최소화 상태 (Accordion으로 대체되어 제거됨)
  
  // 센서 컨트롤 상태
  const [selectedSensorType, setSelectedSensorType] = useState<SensorType>('Level')
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6']))

  const handleRowSelection = (rowIndex: number, checked: boolean) => {
    const newSelectedRows = new Set(correctedSelectedRows)
    if (checked) {
      newSelectedRows.add(rowIndex)
    } else {
      newSelectedRows.delete(rowIndex)
    }
    setCorrectedSelectedRows(newSelectedRows)
    // DataContext의 useEffect에서 자동으로 집계 탭으로 전달됨
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIndices = new Set(correctedData.map((_, index) => index))
      setCorrectedSelectedRows(allIndices)
    } else {
      setCorrectedSelectedRows(new Set())
    }
    // DataContext의 useEffect에서 자동으로 집계 탭으로 전달됨
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

  // 보정값 변경 핸들러
  const handleCorrectionChange = (key: string, field: 'Scaler' | 'offset', value: string) => {
    const numValue = parseFloat(value) || 0
    updateCorrectionData('preprocessing', key, field, numValue)
    // DataContext의 updateCorrectionData에서 자동으로 보정 데이터 업데이트 및 집계 탭으로 전달됨
  }

  // 데이터가 없을 때는 로딩 상태 표시
  if (!hasData() || !outlierRemovedData || outlierRemovedData.length === 0) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="text-center">
            <p>보정할 데이터가 없습니다</p>
            <p className="text-sm mt-2">이상치 처리 탭에서 데이터를 처리하면 자동으로 전달됩니다</p>
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
            data={correctedData}
            selectedRows={correctedSelectedRows}
            onSensorTypeChange={handleSensorTypeChange}
            onColumnToggle={handleColumnToggle}
            selectedSensorType={selectedSensorType}
            visibleColumns={visibleColumns}
            maxDataPoints={1000}
          />
          
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">보정된 데이터</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    선택 데이터수: {correctedSelectedRows.size} / 전체 데이터 수: {correctedData.length}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ReadOnlyVirtualizedTable
                data={correctedData.map((row: any, index: number) => ({
                  id: index + 1,
                  selected: correctedSelectedRows.has(index),
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
                selectedRows={correctedSelectedRows}
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
            data={correctedData} 
            columns={['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2', 'Ang3']} 
          />
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>• 이상치 제거된 데이터에 Scale & Offset 보정을 적용합니다</p>
          <p>• 보정값 변경 시 자동으로 집계 탭으로 전달됩니다</p>
          <p>• 각 셀 데이터를 편집하거나 행을 삭제할 수 없습니다 (읽기 전용)</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <Accordion type="multiple" defaultValue={["chart", "correction"]} className="w-full">
          {/* 차트 표시 데이터 선택 패널 */}
          <AccordionItem value="chart">
            <AccordionTrigger className="px-4 py-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium">차트 표시 데이터 선택</h4>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
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
            </AccordionContent>
          </AccordionItem>

          {/* 보정값 설정 패널 */}
          <AccordionItem value="correction">
            <AccordionTrigger className="px-4 py-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium">보정값 설정</h4>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4">
                {/* Level 센서 보정값 */}
                <div>
                  <h5 className="text-sm font-medium mb-2">Level 센서</h5>
                  <div className="grid grid-cols-1 gap-2">
                    {['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6'].map((key) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs">{key}</Label>
                        <div className="flex gap-1">
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Scaler</Label>
                            <Input
                              type="number"
                              step="0.001"
                              value={getCorrectionValue('preprocessing', key, 'Scaler')}
                              onChange={(e) => handleCorrectionChange(key, 'Scaler', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Offset</Label>
                            <Input
                              type="number"
                              step="0.001"
                              value={getCorrectionValue('preprocessing', key, 'offset')}
                              onChange={(e) => handleCorrectionChange(key, 'offset', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Encoder 센서 보정값 */}
                <div>
                  <h5 className="text-sm font-medium mb-2">Encoder 센서</h5>
                  <div className="space-y-1">
                    <Label className="text-xs">Encoder3</Label>
                    <div className="flex gap-1">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Scaler</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={getCorrectionValue('preprocessing', 'Encoder3', 'Scaler')}
                          onChange={(e) => handleCorrectionChange('Encoder3', 'Scaler', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Offset</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={getCorrectionValue('preprocessing', 'Encoder3', 'offset')}
                          onChange={(e) => handleCorrectionChange('Encoder3', 'offset', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Angle 센서 보정값 */}
                <div>
                  <h5 className="text-sm font-medium mb-2">Angle 센서</h5>
                  <div className="grid grid-cols-1 gap-2">
                    {['Ang1', 'Ang2', 'Ang3'].map((key) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs">{key}</Label>
                        <div className="flex gap-1">
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Scaler</Label>
                            <Input
                              type="number"
                              step="0.001"
                              value={getCorrectionValue('preprocessing', key, 'Scaler')}
                              onChange={(e) => handleCorrectionChange(key, 'Scaler', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Offset</Label>
                            <Input
                              type="number"
                              step="0.001"
                              value={getCorrectionValue('preprocessing', key, 'offset')}
                              onChange={(e) => handleCorrectionChange(key, 'offset', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )
})

DataCorrectionTab.displayName = "DataCorrectionTab"

export { DataCorrectionTab }