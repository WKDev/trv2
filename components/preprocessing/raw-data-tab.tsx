"use client"

// 차트와 ChartDataSelector는 이제 PreprocessingLayout에서 공유 컴포넌트로 관리됨
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/shared/DataTable"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { DataStatistics } from "@/components/shared/data-statistics"
import { useData } from "@/contexts/data-context"
import { useMemo, memo, useEffect, useState } from "react"
import { RotateCcw, Undo2, AlertTriangle, Check, ChevronDown } from "lucide-react"
import { SensorType } from "@/components/shared/Chart"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const RawDataTab = memo(() => {
  const { 
    selectedRows, 
    setSelectedRows, 
    rawData,
    setRawData,
    processedData,
    resetToRawData,
    resetToOriginalData,
    resetToFileOpenTime,
    resetToFileRecordTime,
    undoLastModification,
    transferSelectedDataToCorrection,
    hasModifications,
    hasData,
    useStaOffset,
    staOffset,
    removeStaOffsetFromData,
    applyStaOffsetToData
  } = useData()

  const [restoreMenuOpen, setRestoreMenuOpen] = useState(false)
  
  // 패널 최소화 상태 (Accordion으로 대체되어 제거됨)

  // 데이터가 로드되면 rawData 초기화 (데이터 컨텍스트에서 처리됨)

  const handleRowSelection = (rowIndex: number, checked: boolean) => {
    const newSelectedRows = new Set(selectedRows)
    if (checked) {
      newSelectedRows.add(rowIndex)
    } else {
      newSelectedRows.delete(rowIndex)
    }
    setSelectedRows(newSelectedRows)
    // useEffect에서 자동으로 보정 탭으로 전달됨
  }

  const handleDataUpdate = (rowIndex: number, field: string, value: number) => {
    setRawData((prevData) => {
      const newData = [...prevData]
      if (newData[rowIndex]) {
        newData[rowIndex] = { ...newData[rowIndex], [field]: value }
      }
      return newData
    })
    // useEffect에서 자동으로 보정 탭으로 전달됨
  }

  const handleRowRemove = (rowIndex: number) => {
    setRawData((prevData) => {
      const newData = prevData.filter((_, index) => index !== rowIndex)
      return newData
    })
    
    // 선택된 행들도 업데이트
    const newSelectedRows = new Set<number>()
    selectedRows.forEach(index => {
      if (index < rowIndex) {
        newSelectedRows.add(index)
      } else if (index > rowIndex) {
        newSelectedRows.add(index - 1)
      }
    })
    setSelectedRows(newSelectedRows)
    // useEffect에서 자동으로 보정 탭으로 전달됨
  }

  const handleApplyChanges = async () => {
    try {
      // 현재 처리된 데이터에서 원본 ZIP 파일 경로 가져오기
      if (!processedData?.filePath) {
        console.error('원본 ZIP 파일 경로를 찾을 수 없습니다.')
        return
      }

      // 수정된 데이터를 CSV 형식으로 변환하여 저장
      // RAW 데이터 저장 시에는 STA offset을 제거한 원본 Travelled 값 저장
      const dataToSave = useStaOffset ? removeStaOffsetFromData(rawData) : rawData
      
      const csvData = {
        data: dataToSave,
        // meta와 step 데이터는 기존 것 유지
        meta: processedData.data?.raw?.meta || [],
        step: processedData.data?.raw?.step || []
      }

      // Electron API를 통해 파일 저장
      if (window.electronAPI?.saveCsvFiles) {
        const result = await window.electronAPI.saveCsvFiles(processedData.filePath, csvData)
        if (result.success) {
          console.log('변경사항이 성공적으로 적용되었습니다:', result.message)
          // 성공 메시지 표시 (toast 등)
        } else {
          console.error('파일 저장 실패:', result.message)
        }
      } else {
        console.error('Electron API를 사용할 수 없습니다.')
      }
    } catch (error) {
      console.error('변경사항 적용 중 오류:', error)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIndices = new Set(rawData.map((_, index) => index))
      setSelectedRows(allIndices)
    } else {
      setSelectedRows(new Set())
    }
    // useEffect에서 자동으로 보정 탭으로 전달됨
  }

  const handleReset = () => {
    // 수정된 데이터를 원본으로 되돌리기 (되돌리기 기능)
    resetToRawData()
  }

  const handleUndo = () => {
    // 마지막 수정을 되돌리기
    undoLastModification()
  }


  const handleRestoreToFileOpenTime = async () => {
    // 파일 열기 시점으로 복원
    await resetToFileOpenTime()
    setRestoreMenuOpen(false)
  }

  const handleRestoreToFileRecordTime = async () => {
    // 측정 시점으로 복원 (완전 복원과 동일)
    resetToOriginalData()
    setRestoreMenuOpen(false)
  }

  // 센서 타입과 컬럼 관련 핸들러는 이제 PreprocessingLayout에서 관리됨


  // 데이터가 없을 때는 로딩 상태 표시
  if (!hasData() || !rawData || rawData.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <div className="text-center">
          <p>데이터를 먼저 로드해주세요</p>
          <p className="text-sm mt-2">파일 열기 탭에서 ZIP 파일을 선택하세요</p>
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
                  <CardTitle className="text-foreground">원본 데이터</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    선택 데이터수: {selectedRows.size} / 전체 데이터 수: {rawData.length}
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
                    className="bg-primary hover:bg-primary/90" 
                    onClick={handleApplyChanges}
                    title="수정된 데이터를 파일로 저장합니다"
                  >
                    <Check className="mr-1 h-3 w-3" />
                    변경 적용
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={(useStaOffset ? applyStaOffsetToData(rawData) : rawData).map((row: any, index: number) => ({
                  id: index + 1,
                  selected: selectedRows.has(index),
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
                columns={rawData.length > 0 ? ['Index', 'Travelled', 'Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2', 'Ang3'].filter(col => 
                  rawData[0] && rawData[0].hasOwnProperty(col)
                ) : []}
                showCheckboxes={true}
                onRowSelection={handleRowSelection}
                onSelectAll={handleSelectAll}
                selectedRows={selectedRows}
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
          
          {/* 데이터 통계 */}
          <DataStatistics 
            data={rawData} 
            columns={['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2', 'Ang3']} 
          />
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>• 데이터 수정 시 자동으로 [이상치 제거] 탭으로 전달됩니다</p>
          <p>• 데이터 수정 후 초기화 버튼으로 원본 상태로 되돌릴 수 있습니다</p>
        </div>
    </div>
  )
})

RawDataTab.displayName = "RawDataTab"

export { RawDataTab }
