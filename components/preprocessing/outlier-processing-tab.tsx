"use client"

// 차트와 ChartDataSelector는 이제 PreprocessingLayout에서 공유 컴포넌트로 관리됨
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/shared/DataTable"
import { DataStatistics } from "@/components/shared/data-statistics"
import { useData } from "@/contexts/data-context"
import { useMemo, memo, useEffect, useState } from "react"
import { SensorType } from "@/components/shared/Chart"

const OutlierProcessingTab = memo(() => {
  const { 
    outlierRemovedSelectedRows, 
    setOutlierRemovedSelectedRows, 
    outlierRemovedData,
    setOutlierRemovedData,
    rawData,
    updateOutlierRemovalSettings,
    outlierRemovalSettings,
    hasData,
    triggerOutlierReprocessing,
    setCurrentApplyMode,
    setBulkSettings: setContextBulkSettings,
    useStaOffset,
    applyStaOffsetToData
  } = useData()

  
  // 센서 컨트롤 상태는 이제 PreprocessingLayout에서 관리됨
  
  // 패널 최소화 상태 (Accordion으로 대체되어 제거됨)
  
  // 적용 모드 상태
  const [applyMode, setApplyMode] = useState<'individual' | 'bulk'>('bulk')
  
  // 이전 적용 모드 상태 (탭 변경 감지용)
  const [prevApplyMode, setPrevApplyMode] = useState<'individual' | 'bulk'>('bulk')
  
  // 일괄 적용용 설정 상태 (편의용 UI)
  const [bulkSettings, setBulkSettings] = useState({
    useIQR: true,
    iqrMultiplier: 1.5,
    useZScore: true,
    zScoreThreshold: 3.0
  })

  const handleRowSelection = (rowIndex: number, checked: boolean) => {
    const newSelectedRows = new Set(outlierRemovedSelectedRows)
    if (checked) {
      newSelectedRows.add(rowIndex)
    } else {
      newSelectedRows.delete(rowIndex)
    }
    setOutlierRemovedSelectedRows(newSelectedRows)
  }

  // 데이터 수정 및 행 삭제는 이 탭에서 지원하지 않음 (읽기 전용)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIndices = new Set(outlierRemovedData.map((_, index) => index))
      setOutlierRemovedSelectedRows(allIndices)
    } else {
      setOutlierRemovedSelectedRows(new Set())
    }
  }


  // 센서 타입과 컬럼 관련 핸들러는 이제 PreprocessingLayout에서 관리됨

  // 이상치 제거 설정 변경 핸들러 (개별 적용 UI 폼 요소 상태만 업데이트)
  const handleColumnSettingChange = (column: string, field: 'useIQR' | 'iqrMultiplier' | 'useZScore' | 'zScoreThreshold', value: boolean | number) => {
    console.log(`🔧 [개별 적용 UI] ${column}.${field} = ${value}`)
    updateOutlierRemovalSettings(column, { [field]: value })
    // 개별 설정 변경 시에도 재처리 트리거
    if (applyMode === 'individual') {
      setTimeout(() => {
        triggerOutlierReprocessing()
      }, 100)
    }
  }

  // 일괄 적용 핸들러 (일괄 적용 UI 폼 요소 상태만 업데이트)
  const handleBulkApply = (field: 'useIQR' | 'iqrMultiplier' | 'useZScore' | 'zScoreThreshold', value: boolean | number) => {
    console.log(`🔧 [일괄 적용 UI] ${field} = ${value}`)
    const newBulkSettings = {
      ...bulkSettings,
      [field]: value
    }
    setBulkSettings(newBulkSettings)
    
    // 일괄 적용 모드일 때는 컨텍스트에도 전달하고 즉시 재처리 트리거
    if (applyMode === 'bulk') {
      setContextBulkSettings(newBulkSettings)
      // 설정 변경 시 즉시 재처리 트리거
      setTimeout(() => {
        triggerOutlierReprocessing()
      }, 100)
    }
  }

  // 탭 변경 핸들러
  const handleApplyModeChange = (newMode: 'individual' | 'bulk') => {
    const hasChanged = newMode !== prevApplyMode
    setApplyMode(newMode)
    setPrevApplyMode(newMode)
    
    // 컨텍스트에 현재 모드와 일괄 설정 전달
    setCurrentApplyMode(newMode)
    setContextBulkSettings(bulkSettings)
    
    // 탭이 변경되면 항상 데이터 재처리 (전체 적용 vs 개별 적용은 다른 처리 방식)
    if (hasChanged) {
      console.log(`적용 모드 변경: ${prevApplyMode} → ${newMode}, 데이터 재처리 실행`)
      triggerOutlierReprocessing()
    }
  }

  // 데이터가 없을 때는 로딩 상태 표시
  if (!hasData() || !rawData || rawData.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <div className="text-center">
          <p>데이터를 먼저 로드해주세요</p>
          <p className="text-sm mt-2">RAW 데이터 탭에서 데이터를 선택하세요</p>
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
                  <CardTitle className="text-foreground">이상치 처리된 데이터</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    선택 데이터수: {outlierRemovedSelectedRows.size} / 전체 데이터 수: {outlierRemovedData.length}
                  </p>
                </div>
                

              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={(useStaOffset ? applyStaOffsetToData(outlierRemovedData) : outlierRemovedData).map((row: any, index: number) => ({
                  id: index + 1,
                  selected: outlierRemovedSelectedRows.has(index),
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
                columns={outlierRemovedData.length > 0 ? ['Index', 'Travelled', 'Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2', 'Ang3'].filter(col => 
                  outlierRemovedData[0] && outlierRemovedData[0].hasOwnProperty(col)
                ) : []}
                showCheckboxes={true}
                onRowSelection={handleRowSelection}
                onSelectAll={handleSelectAll}
                selectedRows={outlierRemovedSelectedRows}
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
            data={outlierRemovedData} 
            columns={['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2', 'Ang3']} 
          />
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>• RAW 데이터에서 자동으로 이상치를 감지하고 대체합니다</p>
          <p>• IQR과 Z-score 방법을 사용하여 이상치를 감지합니다</p>
          <p>• 이상치 발견 시 전후 값으로 대체 (선형보간 또는 앞/뒤 값 사용)</p>
          <p>• 설정 변경 시 실시간으로 자동 적용됩니다</p>
          <p>• 탭 변경 시 자동으로 데이터를 재처리합니다 (전체 적용 vs 개별 적용)</p>
          <p>• 처리된 데이터는 자동으로 [Scale & Offset] 탭으로 전달됩니다</p>
        </div>
        
    </div>
  )
})

OutlierProcessingTab.displayName = "OutlierProcessingTab"

export { OutlierProcessingTab }
