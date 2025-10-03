"use client"

import { DataChartTable } from "@/components/data-chart-table"
import dynamic from 'next/dynamic'

const ChartJSLineChart = dynamic(() => import("@/components/chart-js-line-chart").then(mod => ({ default: mod.ChartJSLineChart })), { 
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full flex items-center justify-center">
      <div className="flex flex-col items-center space-y-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">차트를 로드하는 중...</p>
      </div>
    </div>
  )
})
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VirtualizedTable } from "@/components/virtualized-table"
import { useData } from "@/contexts/data-context"
import { useMemo, memo, useEffect, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { SensorType } from "@/components/chart-js-line-chart"

const OutlierRemovalTab = memo(() => {
  const { 
    outlierRemovedSelectedRows, 
    setOutlierRemovedSelectedRows, 
    outlierRemovedData,
    setOutlierRemovedData,
    rawData,
    updateOutlierRemovalSettings,
    outlierRemovalSettings,
    hasData
  } = useData()

  
  // 센서 컨트롤 상태
  const [selectedSensorType, setSelectedSensorType] = useState<SensorType>('Level')
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6']))
  
  // 패널 최소화 상태
  const [isSensorPanelCollapsed, setIsSensorPanelCollapsed] = useState(false)
  const [isDataInfoCollapsed, setIsDataInfoCollapsed] = useState(true)
  const [isSettingsPanelCollapsed, setIsSettingsPanelCollapsed] = useState(false)
  
  // 적용 모드 상태
  const [applyMode, setApplyMode] = useState<'individual' | 'bulk'>('individual')

  const handleRowSelection = (rowIndex: number, checked: boolean) => {
    const newSelectedRows = new Set(outlierRemovedSelectedRows)
    if (checked) {
      newSelectedRows.add(rowIndex)
    } else {
      newSelectedRows.delete(rowIndex)
    }
    setOutlierRemovedSelectedRows(newSelectedRows)
  }

  const handleDataUpdate = (rowIndex: number, field: string, value: number) => {
    setOutlierRemovedData((prevData) => {
      const newData = [...prevData]
      if (newData[rowIndex]) {
        newData[rowIndex] = { ...newData[rowIndex], [field]: value }
      }
      return newData
    })
  }

  const handleRowRemove = (rowIndex: number) => {
    setOutlierRemovedData((prevData) => {
      const newData = prevData.filter((_, index) => index !== rowIndex)
      return newData
    })
    
    // 선택된 행들도 업데이트
    const newSelectedRows = new Set<number>()
    outlierRemovedSelectedRows.forEach(index => {
      if (index < rowIndex) {
        newSelectedRows.add(index)
      } else if (index > rowIndex) {
        newSelectedRows.add(index - 1)
      }
    })
    setOutlierRemovedSelectedRows(newSelectedRows)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIndices = new Set(outlierRemovedData.map((_, index) => index))
      setOutlierRemovedSelectedRows(allIndices)
    } else {
      setOutlierRemovedSelectedRows(new Set())
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

  // 이상치 제거 설정 변경 핸들러
  const handleColumnSettingChange = (column: string, field: 'useIQR' | 'iqrMultiplier' | 'useZScore' | 'zScoreThreshold', value: boolean | number) => {
    updateOutlierRemovalSettings(column, { [field]: value })
  }

  // 일괄 적용 핸들러
  const handleBulkApply = (field: 'useIQR' | 'iqrMultiplier' | 'useZScore' | 'zScoreThreshold', value: boolean | number) => {
    const targetColumns = ['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2', 'Ang3']
    targetColumns.forEach(column => {
      updateOutlierRemovalSettings(column, { [field]: value })
    })
  }

  // 데이터가 없을 때는 로딩 상태 표시
  if (!hasData() || !rawData || rawData.length === 0) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="text-center">
            <p>데이터를 먼저 로드해주세요</p>
            <p className="text-sm mt-2">RAW 데이터 탭에서 데이터를 선택하세요</p>
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
            title="이상치 대체 후 차트"
            data={outlierRemovedData}
            selectedRows={outlierRemovedSelectedRows}
            onSensorTypeChange={handleSensorTypeChange}
            onColumnToggle={handleColumnToggle}
            selectedSensorType={selectedSensorType}
            visibleColumns={visibleColumns}
            maxDataPoints={1000}
          />
          
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">이상치 처리된 데이터</CardTitle>
                
                {/* 자동 적용 안내 */}
                <div className="text-sm text-muted-foreground">
                  자동으로 이상치가 처리됩니다
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VirtualizedTable
                data={outlierRemovedData.map((row: any, index: number) => ({
                  id: index + 1,
                  selected: outlierRemovedSelectedRows.has(index),
                  index: index + 1,
                  ...Object.keys(row).reduce((acc, col) => {
                    if (!['UnixTimestamp', 'Elasped', 'Timestamp', 'Velocity', 'Encoder1', 'Encoder2'].includes(col)) {
                      if (col === 'Index') {
                        acc[col] = parseInt(row[col]) || 0
                      } else {
                        acc[col] = parseFloat(row[col]) || 0
                      }
                    }
                    return acc
                  }, {} as Record<string, number>)
                }))}
                columns={outlierRemovedData.length > 0 ? ['Index', 'Travelled', 'Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2', 'Ang3'].filter(col => 
                  outlierRemovedData[0] && outlierRemovedData[0].hasOwnProperty(col)
                ) : []}
                showCheckboxes={true}
                onRowSelection={handleRowSelection}
                onSelectAll={handleSelectAll}
                selectedRows={outlierRemovedSelectedRows}
                onDataUpdate={handleDataUpdate}
                onRowRemove={handleRowRemove}
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
                  'Ang3': 80,
                  'Action': 80
                }}
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>• RAW 데이터에서 자동으로 이상치를 감지하고 대체합니다</p>
          <p>• IQR과 Z-score 방법을 사용하여 이상치를 감지합니다</p>
          <p>• 이상치 발견 시 전후 값으로 대체 (선형보간 또는 앞/뒤 값 사용)</p>
          <p>• 설정 변경 시 실시간으로 자동 적용됩니다</p>
          <p>• 처리된 데이터는 자동으로 [Scale & Offset] 탭으로 전달됩니다</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* 이상치 제거 설정 패널 */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">이상치 제거 설정</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsPanelCollapsed(!isSettingsPanelCollapsed)}
              className="h-6 w-6 p-0"
            >
              {isSettingsPanelCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
          {!isSettingsPanelCollapsed && (
            <div className="space-y-4">
              {/* 적용 모드 탭 */}
              <Tabs value={applyMode} onValueChange={(value) => setApplyMode(value as 'individual' | 'bulk')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="individual">개별 적용</TabsTrigger>
                  <TabsTrigger value="bulk">일괄 적용</TabsTrigger>
                </TabsList>
                
                <TabsContent value="individual" className="mt-4">
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2', 'Ang3'].map((column) => {
                      const settings = outlierRemovalSettings[column]
                      if (!settings) return null
                      
                      return (
                        <div key={column} className="space-y-3 p-3 border rounded-lg bg-background/50">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">{column}</Label>
                          </div>
                          
                          {/* IQR과 Z-score 설정을 한 행에 배치 */}
                          <div className="flex items-center space-x-4">
                            {/* IQR 설정 */}
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`${column}-use-iqr`}
                                checked={settings.useIQR}
                                onCheckedChange={(checked) => handleColumnSettingChange(column, 'useIQR', checked as boolean)}
                              />
                              <div className="flex flex-col">
                                <Label htmlFor={`${column}-iqr-multiplier`} className="text-xs text-muted-foreground mb-1">
                                  iqr multiplier
                                </Label>
                                <Input
                                  id={`${column}-iqr-multiplier`}
                                  type="number"
                                  step="0.1"
                                  min="0.1"
                                  max="5.0"
                                  value={settings.useIQR ? settings.iqrMultiplier : ''}
                                  onChange={(e) => handleColumnSettingChange(column, 'iqrMultiplier', parseFloat(e.target.value) || 1.5)}
                                  className="h-7 text-xs w-20"
                                  disabled={!settings.useIQR}
                                />
                              </div>
                            </div>

                            {/* Z-score 설정 */}
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`${column}-use-zscore`}
                                checked={settings.useZScore}
                                onCheckedChange={(checked) => handleColumnSettingChange(column, 'useZScore', checked as boolean)}
                              />
                              <div className="flex flex-col">
                                <Label htmlFor={`${column}-zscore-threshold`} className="text-xs text-muted-foreground mb-1">
                                  z-score threshold
                                </Label>
                                <Input
                                  id={`${column}-zscore-threshold`}
                                  type="number"
                                  step="0.1"
                                  min="1.0"
                                  max="10.0"
                                  value={settings.useZScore ? settings.zScoreThreshold : ''}
                                  onChange={(e) => handleColumnSettingChange(column, 'zScoreThreshold', parseFloat(e.target.value) || 3.0)}
                                  className="h-7 text-xs w-20"
                                  disabled={!settings.useZScore}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </TabsContent>
                
                <TabsContent value="bulk" className="mt-4">
                  <div className="space-y-4">
                    <div className="p-3 border rounded-lg bg-background/50">
                      <Label className="text-sm font-medium">모든 컬럼에 일괄 적용</Label>
                      
                      {/* IQR 일괄 설정 */}
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="bulk-use-iqr"
                            checked={outlierRemovalSettings.Level1?.useIQR || false}
                            onCheckedChange={(checked) => handleBulkApply('useIQR', checked as boolean)}
                          />
                          <div className="flex flex-col">
                            <Label htmlFor="bulk-iqr-multiplier" className="text-xs text-muted-foreground mb-1">
                              iqr multiplier
                            </Label>
                            <Input
                              id="bulk-iqr-multiplier"
                              type="number"
                              step="0.1"
                              min="0.1"
                              max="5.0"
                              value={outlierRemovalSettings.Level1?.iqrMultiplier || 1.5}
                              onChange={(e) => handleBulkApply('iqrMultiplier', parseFloat(e.target.value) || 1.5)}
                              className="h-7 text-xs w-20"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Z-score 일괄 설정 */}
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="bulk-use-zscore"
                            checked={outlierRemovalSettings.Level1?.useZScore || false}
                            onCheckedChange={(checked) => handleBulkApply('useZScore', checked as boolean)}
                          />
                          <div className="flex flex-col">
                            <Label htmlFor="bulk-zscore-threshold" className="text-xs text-muted-foreground mb-1">
                              z-score threshold
                            </Label>
                            <Input
                              id="bulk-zscore-threshold"
                              type="number"
                              step="0.1"
                              min="1.0"
                              max="10.0"
                              value={outlierRemovalSettings.Level1?.zScoreThreshold || 3.0}
                              onChange={(e) => handleBulkApply('zScoreThreshold', parseFloat(e.target.value) || 3.0)}
                              className="h-7 text-xs w-20"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {/* 차트 표시 데이터 선택 패널 */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">차트 표시 데이터 선택</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSensorPanelCollapsed(!isSensorPanelCollapsed)}
              className="h-6 w-6 p-0"
            >
              {isSensorPanelCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
          {!isSensorPanelCollapsed && (
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
              <p>총 행 수: {outlierRemovedData.length}</p>
              <p>선택된 행: {outlierRemovedSelectedRows.size}</p>
              <p>처리된 데이터: {rawData.length} → {outlierRemovedData.length}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

OutlierRemovalTab.displayName = "OutlierRemovalTab"

export { OutlierRemovalTab }
