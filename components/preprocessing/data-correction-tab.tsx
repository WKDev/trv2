"use client"

// 차트와 ChartDataSelector는 이제 PreprocessingLayout에서 공유 컴포넌트로 관리됨
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReadonlyDataTable } from "@/components/shared/ReadonlyDataTable"
import { DataStatistics } from "@/components/shared/data-statistics"
import { useData } from "@/contexts/data-context"
import { memo, useState } from "react"
import { SensorType } from "@/components/shared/Chart"

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
  
  // 센서 컨트롤 상태는 이제 PreprocessingLayout에서 관리됨

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


  // 센서 타입과 컬럼 관련 핸들러는 이제 PreprocessingLayout에서 관리됨

  // 보정값 변경 핸들러
  const handleCorrectionChange = (key: string, field: 'Scaler' | 'offset', value: string) => {
    const numValue = parseFloat(value) || 0
    updateCorrectionData('preprocessing', key, field, numValue)
    // DataContext의 updateCorrectionData에서 자동으로 보정 데이터 업데이트 및 집계 탭으로 전달됨
  }

  // 데이터가 없을 때는 로딩 상태 표시
  if (!hasData() || !outlierRemovedData || outlierRemovedData.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <div className="text-center">
          <p>보정할 데이터가 없습니다</p>
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
                  <CardTitle className="text-foreground">보정된 데이터</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    선택 데이터수: {correctedSelectedRows.size} / 전체 데이터 수: {correctedData.length}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ReadonlyDataTable
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
  )
})

DataCorrectionTab.displayName = "DataCorrectionTab"

export { DataCorrectionTab }