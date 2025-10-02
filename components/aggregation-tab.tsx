"use client"

import { DataChartTable } from "@/components/data-chart-table"
import { Button } from "@/components/ui/button"
import { useData } from "@/contexts/data-context"
import { memo, useState } from "react"
import { RotateCcw, Undo2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const AggregationTab = memo(() => {
  const { 
    aggregatedData, 
    aggregatedSelectedRows, 
    setAggregatedSelectedRows, 
    setAggregatedData,
    resetToRawData,
    resetToOriginalData,
    undoLastModification,
    hasModifications,
    hasData, 
    getDataCsv 
  } = useData()

  // 수정 히스토리 관리를 위한 로컬 상태
  const [modificationHistory, setModificationHistory] = useState<any[]>([])
  const [hasModificationsLocal, setHasModificationsLocal] = useState(false)

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  
  // 패널 최소화 상태
  const [isDataInfoCollapsed, setIsDataInfoCollapsed] = useState(true)

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

  const handleReset = () => {
    // 수정된 데이터를 원본으로 되돌리기 (되돌리기 기능)
    resetToRawData()
    setModificationHistory([])
    setHasModificationsLocal(false)
  }

  const handleUndo = () => {
    // 마지막 수정을 되돌리기
    if (modificationHistory.length > 0) {
      const lastState = modificationHistory[modificationHistory.length - 1]
      setAggregatedData([...lastState])
      setModificationHistory(prev => prev.slice(0, -1))
      setHasModificationsLocal(modificationHistory.length > 1)
    }
  }

  const handleCompleteReset = () => {
    // 완전 원본 복원
    resetToOriginalData()
    setModificationHistory([])
    setHasModificationsLocal(false)
    setShowConfirmDialog(false)
  }

  const handleDataUpdate = (rowIndex: number, field: string, value: number) => {
    setAggregatedData((prevData: any[]) => {
      // 수정 전 상태를 히스토리에 저장
      setModificationHistory((prev: any[]) => [...prev, [...prevData]])
      setHasModificationsLocal(true)
      
      const newData = [...prevData]
      if (newData[rowIndex]) {
        newData[rowIndex] = { ...newData[rowIndex], [field]: value }
      }
      return newData
    })
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
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">집계 및 이상치 제거</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={!hasModificationsLocal}
            >
              <Undo2 className="w-4 h-4 mr-1" />
              되돌리기
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!hasModificationsLocal}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              수정 복원
            </Button>
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  완전 복원
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>완전 복원 확인</DialogTitle>
                  <DialogDescription>
                    모든 수정사항이 삭제되고 원본 데이터로 완전히 복원됩니다.
                    이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                    취소
                  </Button>
                  <Button variant="destructive" onClick={handleCompleteReset}>
                    완전 복원
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <DataChartTable 
          title="집계된 데이터" 
          dataType="data" 
          data={aggregatedData}
          showCheckboxes={true}
          onRowSelection={handleRowSelection}
          onSelectAll={handleSelectAll}
          selectedRows={aggregatedSelectedRows}
          onDataUpdate={handleDataUpdate}
        />
        
        <div className="text-sm text-muted-foreground">
          <p>• 체크박스로 선택한 데이터는 [연결부 단차] 탭으로 전달됩니다</p>
          <p>• 데이터 수정 후 초기화 버튼으로 원본 상태로 되돌릴 수 있습니다</p>
        </div>
      </div>
      
      <div className="space-y-4">
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
              <p>백업 파일: data_prep_aggregated.csv</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

AggregationTab.displayName = "AggregationTab"

export { AggregationTab }