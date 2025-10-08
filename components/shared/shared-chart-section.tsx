"use client"

import { useMemo, memo, useState } from "react"
import { ChartJSLineChart, SensorType, ChartViewOptions } from "./Chart"
import { ChartDataSelector } from "./chart-data-selector"
import { useData } from "@/contexts/data-context"

interface SharedChartSectionProps {
  currentTab: string
  selectedRows: Set<number>
  onSensorTypeChange?: (sensorType: SensorType) => void
  onColumnToggle?: (column: string, checked: boolean) => void
  selectedSensorType?: SensorType
  visibleColumns?: Set<string>
}

export const SharedChartSection = memo(({
  currentTab,
  selectedRows,
  onSensorTypeChange,
  onColumnToggle,
  selectedSensorType = 'Level',
  visibleColumns = new Set(['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6'])
}: SharedChartSectionProps) => {
  // 차트 옵션 상태
  const [chartOptions, setChartOptions] = useState<ChartViewOptions>({ yAxisMode: 'auto' })
  const { 
    rawData,
    outlierRemovedData,
    correctedData,
    aggregatedData
  } = useData()

  // ChartDataSelector의 선택 변경 핸들러
  const handleChartSelectionChange = (group: SensorType, items: string[]) => {
    // 센서 타입 변경 알림
    if (onSensorTypeChange && group !== selectedSensorType) {
      onSensorTypeChange(group)
    }
    
    // visibleColumns 업데이트
    if (onColumnToggle) {
      // 모든 그룹의 컬럼을 먼저 해제
      const allColumns = ['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2', 'Ang3']
      allColumns.forEach(column => onColumnToggle(column, false))
      // 선택된 아이템들만 활성화
      items.forEach(item => onColumnToggle(item, true))
    }
  }

  // 현재 탭에 따른 데이터 선택
  const currentData = useMemo(() => {
    console.log(`📊 차트 데이터 업데이트: ${currentTab}`, {
      rawDataLength: rawData.length,
      outlierRemovedDataLength: outlierRemovedData.length,
      correctedDataLength: correctedData.length,
      aggregatedDataLength: aggregatedData.length,
      timestamp: new Date().toISOString()
    })
    
    let selectedData
    switch(currentTab) {
      case 'raw-analysis':
        selectedData = rawData
        break
      case 'outlier-replacement':
        selectedData = outlierRemovedData
        break
      case 'scale-offset':
        selectedData = correctedData
        break
      case 'aggregation':
        selectedData = aggregatedData
        break
      default:
        selectedData = rawData
    }
    
    console.log(`📊 선택된 데이터 (${currentTab}):`, {
      length: selectedData.length,
      sample: selectedData.slice(0, 3),
      hasData: selectedData.length > 0
    })
    
    return selectedData
  }, [currentTab, rawData, outlierRemovedData, correctedData, aggregatedData])

  // 차트 제목 설정
  const chartTitle = useMemo(() => {
    switch(currentTab) {
      case 'raw-analysis':
        return '원본 데이터 차트'
      case 'outlier-replacement':
        return '이상치 처리 후 차트'
      case 'scale-offset':
        return 'Scale & Offset 적용 후 차트'
      case 'aggregation':
        return '집계 데이터 차트'
      default:
        return '분석 데이터 차트'
    }
  }, [currentTab])

  return (
    <div className="space-y-6">
      <ChartJSLineChart
        title={chartTitle}
        data={currentData}
        selectedRows={selectedRows}
        onSensorTypeChange={onSensorTypeChange}
        onColumnToggle={onColumnToggle}
        selectedSensorType={selectedSensorType}
        visibleColumns={visibleColumns}
        maxDataPoints={1000}
        chartOptions={chartOptions}
        onChartOptionsChange={setChartOptions}
      />
      
      <ChartDataSelector 
        onSelectionChange={handleChartSelectionChange}
      />
    </div>
  )
})

SharedChartSection.displayName = "SharedChartSection"

