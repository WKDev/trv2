"use client"

import type React from "react"

import { useState, useEffect, useMemo, memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RotateCcw, Check, AlertCircle, Loader2 } from "lucide-react"
import { useData } from "@/contexts/data-context"
import { DataTable } from "@/components/shared/DataTable"
import { formatValueByColumn, formatColumnHeader } from "@/lib/unit-formatters"
import { ChartJSLineChart, SensorType, ChartViewOptions } from "@/components/shared/Chart"

// 제외할 컬럼들
const EXCLUDED_COLUMNS = ['UnixTimestamp', 'Elasped', 'Timestamp', 'Velocity', 'Encoder1', 'Encoder2']

interface DataChartTableProps {
  title: string
  dataType?: 'data' | 'step' // 'data' for data.csv, 'step' for step.csv
  data?: any[] // 외부에서 데이터를 전달받을 수 있음
  showCheckboxes?: boolean // 체크박스 표시 여부
  onRowSelection?: (rowIndex: number, checked: boolean) => void // 행 선택 핸들러
  onSelectAll?: (checked: boolean) => void // 전체 선택 핸들러
  selectedRows?: Set<number> // 선택된 행들
  onDataUpdate?: (rowIndex: number, field: string, value: number) => void // 데이터 업데이트 핸들러
}

export const DataChartTable = memo(({ 
  title, 
  dataType = 'data', 
  data: externalData, 
  showCheckboxes = false,
  onRowSelection,
  onSelectAll,
  selectedRows = new Set(),
  onDataUpdate
}: DataChartTableProps) => {
  const { getDataCsv, getStepCsv, hasData, setRawData } = useData()
  const [isChartLoading, setIsChartLoading] = useState(true)
  
  // 차트 옵션 상태
  const [chartOptions, setChartOptions] = useState<ChartViewOptions>({ yAxisMode: 'auto' })

  // 실제 데이터에서 컬럼 정보 추출
  const { columns, data, rawData } = useMemo(() => {
    if (!hasData() && !externalData) {
      return {
        columns: [],
        data: [],
        rawData: []
      }
    }

    const rawData = externalData || (dataType === 'data' ? getDataCsv() : getStepCsv())
    
    if (!rawData || rawData.length === 0) {
      return {
        columns: [],
        data: [],
        rawData: []
      }
    }

    // 지정된 순서로 컬럼 정보 추출
    const orderedColumns = ['Index', 'Travelled', 'Level1', 'Level2', 'Level3', 'Level4', 'Encoder3', 'Ang1', 'Ang2', 'Ang3']
    const filteredColumns = orderedColumns.filter(col => 
      rawData[0] && rawData[0].hasOwnProperty(col)
    )

    // 테이블용 데이터 생성 (모든 데이터를 가상화로 처리)
    const tableData = rawData.map((row: any, index: number) => ({
      id: index + 1,
      selected: selectedRows.has(index),
      index: index + 1,
      ...filteredColumns.reduce((acc, col) => {
        if (col === 'Index') {
          acc[col] = parseInt(row[col]) || 0
        } else {
          acc[col] = parseFloat(row[col]) || 0
        }
        return acc
      }, {} as Record<string, number>)
    })) as Array<{ id: number; selected: boolean; index: number } & Record<string, number>>

    return {
      columns: filteredColumns,
      data: tableData,
      rawData
    }
  }, [hasData, getDataCsv, getStepCsv, dataType, selectedRows, externalData])


  const handleReset = () => {
    // 리셋 로직은 나중에 구현
    console.log('Reset data')
  }

  const handleDataUpdate = (rowIndex: number, field: string, value: number) => {
    if (onDataUpdate) {
      onDataUpdate(rowIndex, field, value)
    } else if (externalData && setRawData) {
      // 외부 데이터가 있고 setRawData가 있으면 직접 업데이트
      setRawData((prevData: any[]) => {
        const newData = [...prevData]
        if (newData[rowIndex]) {
          newData[rowIndex] = { ...newData[rowIndex], [field]: value }
        }
        return newData
      })
    }
  }

  // 데이터가 변경될 때 차트 로딩 상태 초기화
  useEffect(() => {
    if (rawData && rawData.length > 0) {
      setIsChartLoading(true)
      // 차트 렌더링을 다음 프레임으로 지연시켜 UI 블로킹 방지
      const timeoutId = setTimeout(() => {
        setIsChartLoading(false)
      }, 100)
      
      return () => clearTimeout(timeoutId)
    }
  }, [rawData])

  // 데이터가 없을 때 표시할 메시지
  if (!hasData() && !externalData) {
    return (
      <div className="space-y-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>데이터를 먼저 로드해주세요</p>
                <p className="text-sm mt-2">파일 열기 탭에서 ZIP 파일을 선택하세요</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">차트</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full relative">
            {isChartLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">차트를 생성하는 중...</p>
                </div>
              </div>
            ) : (
              <ChartJSLineChart
                title=""
                data={rawData}
                selectedRows={selectedRows}
                maxDataPoints={1000}
                chartOptions={chartOptions}
                onChartOptionsChange={setChartOptions}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">{title}</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                초기화
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Check className="mr-2 h-4 w-4" />
                변경 적용
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
              <DataTable
            data={data}
            columns={columns}
            showCheckboxes={showCheckboxes}
            onRowSelection={onRowSelection}
            onSelectAll={onSelectAll}
            selectedRows={selectedRows}
            onDataUpdate={handleDataUpdate}
            rowHeight={40}
            visibleRows={20}
          />
        </CardContent>
      </Card>
    </div>
  )
})

DataChartTable.displayName = "DataChartTable"
