"use client"

import React, { useMemo, useCallback, memo, useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from 'chart.js'
import zoomPlugin from 'chartjs-plugin-zoom'
import { Line } from 'react-chartjs-2'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RotateCcw, Loader2 } from "lucide-react"
import { formatTravelled } from "@/lib/unit-formatters"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
// Chart.js 컴포넌트 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
)

// 데이터 포인트 색상 정의 - 더 인간적이고 구분하기 쉬운 색상
const CHART_COLORS = [
  '#3B82F6', // 파란색
  '#EF4444', // 빨간색
  '#10B981', // 초록색
  '#F59E0B', // 주황색
  '#8B5CF6', // 보라색
  '#06B6D4', // 청록색
  '#84CC16', // 라임색
  '#F97316', // 오렌지색
  '#EC4899', // 핑크색
  '#6B7280', // 회색
]

// 센서 타입 정의
export type SensorType = 'Level' | 'Encoder' | 'Angle'

// 센서별 데이터 컬럼 정의
const SENSOR_COLUMNS = {
  Level: ['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6'],
  Encoder: ['Encoder3'],
  Angle: ['Ang1', 'Ang2', 'Ang3'],
} as const

// 컬럼별 고정 색상 정의 (빨, 주, 노, 초, 파, 남, 보)
const COLUMN_COLORS: Record<string, string> = {
  'Level1': '#EF4444', // 빨강
  'Level2': '#F97316', // 주황
  'Level3': '#F59E0B', // 노랑
  'Level4': '#10B981', // 초록
  'Level5': '#3B82F6', // 파랑
  'Level6': '#1E40AF', // 남색
  'Encoder3': '#8B5CF6', // 보라
  'Ang1': '#EF4444', // 빨강
  'Ang2': '#F97316', // 주황
  'Ang3': '#F59E0B', // 노랑
}

interface ChartJSLineChartProps {
  title: string
  data: any[]
  selectedRows?: Set<number>
  onSensorTypeChange?: (sensorType: SensorType) => void
  onColumnToggle?: (column: string, checked: boolean) => void
  selectedSensorType?: SensorType
  visibleColumns?: Set<string>
  maxDataPoints?: number // 최적화를 위한 최대 데이터 포인트 수
}

export const ChartJSLineChart = memo(({
  title,
  data,
  selectedRows = new Set(),
  onSensorTypeChange,
  onColumnToggle,
  selectedSensorType = 'Level',
  visibleColumns = new Set(),
  maxDataPoints = 1000, // 기본값 1000개로 설정
}: ChartJSLineChartProps) => {
  const [isChartLoading, setIsChartLoading] = useState(true)
  const [chartData, setChartData] = useState<ChartData<'line'>>({
    labels: [],
    datasets: []
  })
  
  // 데이터 최적화: 선택된 행만 필터링 (모든 데이터 표시)
  const optimizedData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    // 선택된 행이 있으면 해당 행만 사용, 없으면 모든 데이터 사용
    const filteredData = selectedRows.size > 0 
      ? data.filter((_, index) => selectedRows.has(index))
      : data
    
    
    // 모든 데이터 표시 - 샘플링 제거
    return filteredData
  }, [data, selectedRows])

  // 차트 데이터를 비동기로 생성
  useEffect(() => {
    if (optimizedData.length === 0) {
      setChartData({
        labels: [],
        datasets: []
      })
      setIsChartLoading(false)
      return
    }

    setIsChartLoading(true)
    
    // 차트 데이터 생성을 다음 프레임으로 지연시켜 UI 블로킹 방지
    const timeoutId = setTimeout(() => {
      try {
        // x축은 Travelled 컬럼 사용 - 이미 포맷된 값으로 설정
        const labels = optimizedData.map(row => formatTravelled(row.Travelled || 0))
        
        // 표시할 컬럼들 결정
        let columnsToShow: string[] = []
        
        if (selectedSensorType && visibleColumns && visibleColumns.size > 0) {
          // 외부에서 센서 타입과 컬럼이 전달된 경우
          columnsToShow = SENSOR_COLUMNS[selectedSensorType].filter(col => 
            visibleColumns.has(col)
          )
        } else {
          // 일반적인 경우 모든 숫자 컬럼 표시 (Travelled 제외)
          const allColumns = Object.keys(optimizedData[0] || {})
          columnsToShow = allColumns.filter(col => 
            col !== 'Travelled' && 
            col !== 'UnixTimestamp' && 
            col !== 'Elasped' && 
            col !== 'Index' &&
            typeof optimizedData[0][col] === 'number'
          )
        }

        const datasets = columnsToShow.map((column, index) => {
          // 컬럼별 고정 색상 사용, 없으면 기본 색상 사용
          const color = COLUMN_COLORS[column] || CHART_COLORS[index % CHART_COLORS.length]
          return {
            label: column,
            data: optimizedData.map(row => row[column] || 0),
            borderColor: color,
            backgroundColor: color + '20',
            borderWidth: 1.0, // 선 두께를 얇게 조정
            pointRadius: 0, // 점 숨김으로 성능 향상
            pointHoverRadius: 4,
            tension: 0, // 직선으로 변경 (성능 향상)
            // 성능 최적화 옵션 제거하여 모든 데이터 표시
            spanGaps: false,
          }
        })

        setChartData({
          labels,
          datasets
        })
      } catch (error) {
        console.error('차트 데이터 생성 중 오류:', error)
        setChartData({
          labels: [],
          datasets: []
        })
      } finally {
        setIsChartLoading(false)
      }
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [optimizedData, selectedSensorType, visibleColumns])

  // 차트 옵션
  const options: ChartOptions<'line'> = useMemo(() => {
    // 데이터가 10,000개 이상이면 애니메이션 비활성화
    const shouldDisableAnimation = optimizedData.length >= 10000
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          left: 20,
          right: 20,
          top: 10,
          bottom: 10
        }
      },
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
      // 성능 최적화: 데이터가 많으면 애니메이션 비활성화
      animation: shouldDisableAnimation ? false : {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      elements: {
        line: {
          tension: 0, // 직선으로 변경 (성능 향상)
        },
      },
      // pan과 zoom 설정
      plugins: {
        zoom: {
          pan: {
            enabled: true,
            mode: 'x' as const,
            modifierKey: 'shift',
          },
          zoom: {
            wheel: {
              enabled: true,
              modifierKey: 'ctrl',
            },
            pinch: {
              enabled: true,
            },
            mode: 'x' as const,
          },
          reset: {
            enabled: true,
            modifierKey: 'esc',
          },
          // wheel 이벤트를 pan으로도 사용할 수 있도록 설정
          wheel: {
            enabled: true,
            modifierKey: 'shift',
            speed: 0.1,
          },
        },
        legend: {
          position: 'bottom' as const,
          labels: {
            usePointStyle: true,
            padding: 20,
            boxWidth: 12,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)', // 반투명 검정 배경
          titleColor: '#ffffff', // 흰색 제목
          bodyColor: '#ffffff', // 흰색 본문
          borderColor: 'transparent',
          borderWidth: 0,
          cornerRadius: 8,
          displayColors: true,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 12
          },
          callbacks: {
            title: (context) => {
              const dataIndex = context[0].dataIndex
              return `Travelled: ${chartData.labels?.[dataIndex] || ''}`
            },
            label: (context) => {
              const label = context.dataset.label || ''
              const value = context.parsed.y
              return `${label}: ${value.toFixed(2)}`
            }
          }
        },
      },
      scales: {
        x: {
          type: 'category', // CategoryScale로 명시적 설정
          display: true,
          title: {
            display: false, // x축 설명 제거
          },
          ticks: {
            color: '#141414',
            font: {
              weight: 'normal',
              size: 12
            },
            maxTicksLimit: 10, // x축 라벨 10개로 제한
          },
          grid: {
            color: '#808080', // 회색 grid
          },
          border: {
            color: '#141414',
            width: 2
          }
        },
        y: {
          display: true,
          title: {
            display: false, // y축 설명 제거
          },
          ticks: {
            color: '#141414',
            font: {
              weight: 'normal',
              size: 12
            },
            callback: function(value: any): string {
              return `${value.toFixed(1)} mm`
            }
          },
          grid: {
            color: '#808080', // 회색 grid
          },
          border: {
            color: '#141414',
            width: 2
          }
        },
      },
    }
  }, [optimizedData.length, chartData.labels])

  // 센서 타입 변경 핸들러
  const handleSensorTypeChange = useCallback((sensorType: SensorType) => {
    onSensorTypeChange?.(sensorType)
  }, [onSensorTypeChange])

  // 컬럼 토글 핸들러
  const handleColumnToggle = useCallback((column: string, checked: boolean) => {
    onColumnToggle?.(column, checked)
  }, [onColumnToggle])


  return (
    <div className="space-y-4">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-foreground">{title}</h3>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-sm text-muted-foreground px-2 py-1 rounded hover:bg-accent transition"
                aria-label="단축키 안내"
              >
                단축키
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 text-sm">
              <div className="space-y-1">
                <p>• <b>Shift</b> + 스크롤: x축 이동</p>
                <p>• <b>Ctrl</b> + 스크롤: x축 확대/축소</p>
                <p>• <b>ESC</b>: 줌 리셋</p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
      
      <div className="h-[300px] w-full relative">
        {isChartLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">차트를 생성하는 중...</p>
            </div>
          </div>
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>
    </div>
  )
})

ChartJSLineChart.displayName = 'ChartJSLineChart'
