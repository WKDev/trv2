"use client"

import React, { useMemo, memo } from 'react'
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
import annotationPlugin from 'chartjs-plugin-annotation'
import { Line } from 'react-chartjs-2'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTravelled } from "@/lib/unit-formatters"

// Chart.js 컴포넌트 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin,
  annotationPlugin
)

// 분석 차트 옵션 설정 타입
export interface AnalysisChartOptions {
  yAxisMode: 'auto' | 'manual'
  yAxisMin?: number
  yAxisMax?: number
  yAxisTickStep?: number
}

// 분석 데이터 타입 정의
export interface AnalysisDataPoint {
  Travelled: number
  Left?: number | null
  Right?: number | null
  GC?: number
  y?: number
}

interface AnalysisChartProps {
  title: string
  moduleId?: string
  data: AnalysisDataPoint[]
  refLevel?: number
  selectedRows?: Set<number>
  maxDataPoints?: number
  chartOptions?: AnalysisChartOptions
  onChartOptionsChange?: (options: AnalysisChartOptions) => void
}

export const AnalysisChart = memo(({
  title,
  moduleId,
  data,
  refLevel,
  selectedRows,
  maxDataPoints = 1000,
  chartOptions = { yAxisMode: 'auto' },
  onChartOptionsChange,
}: AnalysisChartProps) => {

  // 데이터 형식 감지 (Left/Right, Left/Right/GC 또는 y)
  const dataFormat = useMemo(() => {
    if (data.length === 0) return 'none'
    const firstItem = data[0]
    if (firstItem.Left !== undefined && firstItem.Right !== undefined && firstItem.GC !== undefined) {
      return 'left-right-gid'
    } else if (firstItem.Left !== undefined && firstItem.Right !== undefined) {
      return 'left-right'
    } else if (firstItem.y !== undefined) {
      return 'single'
    }
    return 'none'
  }, [data])

  // 차트 데이터 변환
  const chartData = useMemo((): ChartData<'line'> => {
    if (data.length === 0) {
      return {
        labels: [],
        datasets: []
      }
    }

    // 데이터 포인트 수 제한
    const limitedData = data.length > maxDataPoints 
      ? data.slice(0, maxDataPoints)
      : data

    const labels = limitedData.map((dataPoint) => formatTravelled(dataPoint.Travelled))

    if (dataFormat === 'left-right-gid') {
      return {
        labels,
        datasets: [
          {
            label: 'Level3',
            data: limitedData.map(d => d.Left || 0),
            borderColor: '#3B82F6', // 파란색
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
          {
            label: 'Level4',
            data: limitedData.map(d => d.Right || 0),
            borderColor: '#EF4444', // 빨간색
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
          {
            label: 'GC',
            data: limitedData.map(d => d.GC || 0),
            borderColor: '#10B981', // 초록색
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
          }
        ]
      }
    } else if (dataFormat === 'left-right') {
      // 연결부 단차의 경우 각 Direction별로 독립적인 데이터셋 생성
      if (moduleId === 'step') {
        console.log('🔍 AnalysisChart step 데이터 확인:', {
          limitedDataLength: limitedData.length,
          limitedDataSample: limitedData.slice(0, 3)
        })
        
        // 모든 Position을 수집하여 x축 라벨 생성
        const allPositions = Array.from(new Set(limitedData.map(d => d.Travelled))).sort((a, b) => a - b)
        const stepLabels = allPositions.map(pos => formatTravelled(pos))
        
        // Left 데이터셋 - 각 Position에서 Left 값이 있으면 표시, 없으면 null
        const leftDataset = {
          label: 'Left',
          data: allPositions.map(pos => {
            const leftItem = limitedData.find(d => d.Travelled === pos && d.Left !== null && d.Left !== undefined)
            return leftItem ? leftItem.Left! : null
          }),
          borderColor: '#3B82F6', // 파란색
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 1, // 이전 방식과 동일
          pointRadius: 0, // 점 숨김 (이전 방식과 동일)
          pointHoverRadius: 4,
          spanGaps: true, // 연속적인 선으로 표시
          tension: 0, // 직선으로 표시
        }
        
        // Right 데이터셋 - 각 Position에서 Right 값이 있으면 표시, 없으면 null
        const rightDataset = {
          label: 'Right',
          data: allPositions.map(pos => {
            const rightItem = limitedData.find(d => d.Travelled === pos && d.Right !== null && d.Right !== undefined)
            return rightItem ? rightItem.Right! : null
          }),
          borderColor: '#EF4444', // 빨간색 (이전 방식과 동일)
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 1, // 이전 방식과 동일
          pointRadius: 0, // 점 숨김 (이전 방식과 동일)
          pointHoverRadius: 4,
          spanGaps: true, // 연속적인 선으로 표시
          tension: 0, // 직선으로 표시
        }
        
        // 디버깅을 위한 데이터 카운트
        const leftDataCount = leftDataset.data.filter(d => d !== null).length
        const rightDataCount = rightDataset.data.filter(d => d !== null).length
        
        console.log('🔍 AnalysisChart step 데이터셋 생성:', {
          totalPositions: allPositions.length,
          leftDataCount: leftDataCount,
          rightDataCount: rightDataCount,
          leftDataSample: leftDataset.data.slice(0, 5),
          rightDataSample: rightDataset.data.slice(0, 5),
          limitedDataLength: limitedData.length
        })
        
        return {
          labels: stepLabels,
          datasets: [leftDataset, rightDataset]
        }
      } else {
        // 다른 탭들은 기존 방식 유지
        return {
          labels,
          datasets: [
            {
              label: 'Left',
              data: limitedData.map(d => d.Left ?? null),
              borderColor: '#3B82F6', // 파란색
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 4,
              spanGaps: false, // null 값에서 선이 끊어지도록
            },
            {
              label: 'Right',
              data: limitedData.map(d => d.Right ?? null),
              borderColor: '#EF4444', // 빨간색
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 4,
              spanGaps: false, // null 값에서 선이 끊어지도록
            }
          ]
        }
      }
    } else if (dataFormat === 'single') {
      // 모듈 ID에 따라 라벨 설정
      const label = moduleId === 'guiderail-clearance' ? 'GC' : 'Data';
      
      return {
        labels,
        datasets: [
          {
            label: label,
            data: limitedData.map(d => d.y || 0),
            borderColor: '#3B82F6', // 파란색
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
          }
        ]
      }
    }

    return {
      labels: [],
      datasets: []
    }
  }, [data, dataFormat, maxDataPoints])

  // refLevel 기반 annotation 설정
  const annotations = useMemo(() => {
    if (!refLevel || refLevel <= 0) return {}

    // 특정 모듈들은 하한선을 0으로 설정
    const isZeroBasedModule = moduleId === 'longitudinal-level-irregularity' || 
                             moduleId === 'guiderail-clearance' || 
                             moduleId === 'step'

    return {
      box1: {
        type: 'box' as const,
        yMin: isZeroBasedModule ? 0 : -refLevel,
        yMax: refLevel,
        backgroundColor: 'rgba(34, 197, 94, 0.1)', // 반투명 녹색
        borderColor: 'rgba(34, 197, 94, 0.3)',
        borderWidth: 1,
        drawTime: 'beforeDatasetsDraw' as const,
      }
    }
  }, [refLevel, moduleId])

  // 차트 옵션 설정
  const options: ChartOptions<'line'> = useMemo(() => {
    const baseOptions: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            usePointStyle: true,
            padding: 20,
          },
        },
        tooltip: {
          callbacks: {
            title: (context) => {
              const index = context[0].dataIndex
              const travelled = data[index]?.Travelled || 0
              return `Index: ${index + 1} | STA: ${formatTravelled(travelled)}`
            },
            label: (context) => {
              const label = context.dataset.label || ''
              const value = context.parsed.y
              return `${label}: ${value.toFixed(2)}`
            },
          },
        },
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: 'x' as const,
          },
          pan: {
            enabled: true,
            mode: 'x' as const,
          },
        },
      },
      scales: {
        x: {
          display: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
          offset: true,
        },
        y: {
          display: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
          ...(chartOptions.yAxisMode === 'manual' && chartOptions.yAxisMin !== undefined && chartOptions.yAxisMax !== undefined && {
            min: chartOptions.yAxisMin,
            max: chartOptions.yAxisMax,
            ...(chartOptions.yAxisTickStep !== undefined && {
              ticks: {
                stepSize: chartOptions.yAxisTickStep,
              },
            }),
          }),
        },
      },
    }

    // annotation 플러그인 추가
    if (Object.keys(annotations).length > 0) {
      baseOptions.plugins = {
        ...baseOptions.plugins,
        annotation: {
          annotations,
        },
      }
    }

    return baseOptions
  }, [title, data, chartOptions, annotations])


  if (data.length === 0) {
    return (
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center">
              <p>데이터가 없습니다</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  )
})

AnalysisChart.displayName = "AnalysisChart"
