"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RotateCcw, Check, AlertCircle } from "lucide-react"
import { ChartJSLineChart } from "@/components/chart-js-line-chart"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useElectronStorage } from "@/hooks/use-electron-storage"
import { useData } from "@/contexts/data-context"

// Sample data
const sampleData = Array.from({ length: 50 }, (_, i) => ({
  x: i,
  y: Math.sin(i / 5) * 10 + 50 + Math.random() * 5,
  y2: Math.cos(i / 5) * 8 + 45 + Math.random() * 3,
}))

const tableData = [
  { id: 1, selected: true, index: 1, value1: 45.2, value2: 48.1, value3: 50.3 },
  { id: 2, selected: true, index: 2, value1: 46.1, value2: 47.8, value3: 51.2 },
  { id: 3, selected: true, index: 3, value1: 47.3, value2: 49.2, value3: 49.8 },
  { id: 4, selected: true, index: 4, value1: 48.5, value2: 50.1, value3: 52.1 },
  { id: 5, selected: true, index: 5, value1: 49.2, value2: 48.9, value3: 50.7 },
]

interface AnalysisModuleProps {
  title: string
  moduleId?: string
  hasVehicleParams?: boolean
  hasCycleParam?: boolean
  hasRefLevel?: boolean
}

const getDefaultRefLevel = (moduleId: string): number => {
  const defaults: Record<string, number> = {
    level: 4,
    flatness: 3,
    height: 3,
    smoothness: 1.2,
    "guide-rail": 10,
    straightness: 3,
    connection: 9,
  }
  return defaults[moduleId] || 0
}

const getRefLevelLabel = (moduleId: string): string => {
  const labels: Record<string, string> = {
    level: "±",
    flatness: "±",
    height: "±",
    smoothness: "σ ≤",
    "guide-rail": "<",
    straightness: "<",
    connection: "<",
  }
  return labels[moduleId] || "ref.level"
}

const getRefLevelUnit = (moduleId: string): string => {
  const units: Record<string, string> = {
    level: "mm",
    flatness: "mm / 3m",
    height: "mm / 3m",
    smoothness: "mm",
    "guide-rail": "mm",
    straightness: "mm / 3m",
    connection: "mm",
  }
  return units[moduleId] || ""
}

export function AnalysisModule({
  title,
  moduleId = "",
  hasVehicleParams = false,
  hasCycleParam = false,
  hasRefLevel = true,
}: AnalysisModuleProps) {
  const { getDataCsv, hasData } = useData()
  const [data, setData] = useState(tableData)
  const [editingCell, setEditingCell] = useState<{ rowId: number; field: string } | null>(null)
  const [editValue, setEditValue] = useState("")
  const [chartData, setChartData] = useState(sampleData)

  // Context에서 실제 데이터를 가져와서 차트 데이터로 변환
  useEffect(() => {
    if (hasData()) {
      const rawData = getDataCsv()
      
      if (rawData && rawData.length > 0) {
        // 실제 데이터를 차트 형식으로 변환
        const convertedData = rawData.map((row: any, index: number) => ({
          x: index,
          y: row.Level1 || 0,
          y2: row.Level2 || 0,
        }))
        
        setChartData(convertedData)
        
        // 테이블 데이터도 실제 데이터로 업데이트
        const tableDataFromCsv = rawData.slice(0, 10).map((row: any, index: number) => ({
          id: index + 1,
          selected: true,
          index: index + 1,
          value1: row.Level1 || 0,
          value2: row.Level2 || 0,
          value3: row.Level3 || 0,
        }))
        setData(tableDataFromCsv)
      }
    }
  }, [hasData, getDataCsv])

  const [refLevel, setRefLevel] = useLocalStorage({
    key: `analysis-${moduleId}-refLevel`,
    defaultValue: getDefaultRefLevel(moduleId),
    debounceMs: 100,
  })

  const [chartYMin, setChartYMin] = useLocalStorage({
    key: `analysis-${moduleId}-chartYMin`,
    defaultValue: -10,
    debounceMs: 100,
  })

  const [chartYMax, setChartYMax] = useLocalStorage({
    key: `analysis-${moduleId}-chartYMax`,
    defaultValue: 10,
    debounceMs: 100,
  })

  const [irqEnabled, setIrqEnabled] = useLocalStorage({
    key: `analysis-${moduleId}-irqEnabled`,
    defaultValue: false,
    debounceMs: 100,
  })

  const [irqValue, setIrqValue] = useLocalStorage({
    key: `analysis-${moduleId}-irqValue`,
    defaultValue: 1.5,
    debounceMs: 100,
  })

  const [zScoreEnabled, setZScoreEnabled] = useLocalStorage({
    key: `analysis-${moduleId}-zScoreEnabled`,
    defaultValue: false,
    debounceMs: 100,
  })

  const [zScoreValue, setZScoreValue] = useLocalStorage({
    key: `analysis-${moduleId}-zScoreValue`,
    defaultValue: 3.0,
    debounceMs: 100,
  })

  const { correctionData, updateCorrectionData } = useData()
  
  const [scaler, setScaler] = useElectronStorage({
    key: `analysis-${moduleId}-scaler`,
    defaultValue: 1.0,
    debounceMs: 100,
  })

  const [offset, setOffset] = useElectronStorage({
    key: `analysis-${moduleId}-offset`,
    defaultValue: 0.0,
    debounceMs: 100,
  })

  // correction data가 변경될 때 scaler와 offset 값 업데이트
  useEffect(() => {
    if (correctionData?.analysis?.[moduleId]) {
      const correction = correctionData.analysis[moduleId]
      setScaler(correction.Scaler)
      setOffset(correction.offset)
    }
  }, [correctionData, moduleId])

  const [params, setParams] = useState({
    wheelTrack: 1.5,
    wheelbase: 2.5,
    span: 10.0,
    cycle: 3.0,
  })

  const handleToggleSelect = (id: number) => {
    setData((prev) => prev.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row)))
  }

  const handleCellClick = (rowId: number, field: string, currentValue: number) => {
    setEditingCell({ rowId, field })
    setEditValue(currentValue.toString())
  }

  const handleCellBlur = () => {
    if (editingCell) {
      const numValue = Number.parseFloat(editValue)
      if (!isNaN(numValue)) {
        setData((prev) =>
          prev.map((row) => (row.id === editingCell.rowId ? { ...row, [editingCell.field]: numValue } : row)),
        )
      }
      setEditingCell(null)
      setEditValue("")
    }
  }

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCellBlur()
    } else if (e.key === "Escape") {
      setEditingCell(null)
      setEditValue("")
    }
  }

  // debounce를 위한 ref
  const debounceRefs = useRef<{ [key: string]: NodeJS.Timeout }>({})

  // debounce된 context 업데이트 함수
  const debouncedUpdateCorrectionData = useCallback((section: 'preprocessing' | 'analysis', key: string, field: 'Scaler' | 'offset', value: number) => {
    const debounceKey = `${section}-${key}-${field}`
    
    // 기존 타이머가 있으면 취소
    if (debounceRefs.current[debounceKey]) {
      clearTimeout(debounceRefs.current[debounceKey])
    }
    
    // 새로운 타이머 설정 (500ms 후에 context 업데이트)
    debounceRefs.current[debounceKey] = setTimeout(() => {
      updateCorrectionData(section, key, field, value)
      delete debounceRefs.current[debounceKey]
    }, 500)
  }, [updateCorrectionData])

  const handleParamChange = (field: string, value: string | boolean) => {
    if (field === "scaler") {
      const numValue = Number.parseFloat(value as string) || 0
      setScaler(numValue)
      debouncedUpdateCorrectionData('analysis', moduleId, 'Scaler', numValue)
    } else if (field === "offset") {
      const numValue = Number.parseFloat(value as string) || 0
      setOffset(numValue)
      debouncedUpdateCorrectionData('analysis', moduleId, 'offset', numValue)
    } else {
      setParams((prev) => ({ ...prev, [field]: typeof value === "string" ? Number.parseFloat(value) || 0 : value }))
    }
  }

  const handleAutoYAxis = () => {
    const yValues = chartData.flatMap((d) => [d.y, d.y2])
    const min = Math.floor(Math.min(...yValues) - 5)
    const max = Math.ceil(Math.max(...yValues) + 5)
    setChartYMin(min)
    setChartYMax(max)
  }

  const handleAutoScale = () => {
    setScaler(1.0)
  }

  const handleAutoOffset = () => {
    const yValues = chartData.flatMap((d) => [d.y, d.y2])
    const avg = yValues.reduce((a, b) => a + b, 0) / yValues.length
    setOffset(-avg)
  }

  const handleAutoCorrection = () => {
    handleAutoScale()
    handleAutoOffset()
  }

  const handleSetDefaultRefLevel = () => {
    setRefLevel(getDefaultRefLevel(moduleId))
  }

  // 데이터가 없을 때 표시할 메시지
  if (!hasData()) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
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
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <ChartJSLineChart
          title="차트"
          data={chartData}
          maxDataPoints={1000}
        />

        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">데이터 테이블</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  초기화
                </Button>
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  <Check className="mr-2 h-4 w-4" />
                  수정사항 적용
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-2 text-left text-sm font-medium text-muted-foreground">선택</th>
                    <th className="p-2 text-left text-sm font-medium text-muted-foreground">Index</th>
                    <th className="p-2 text-left text-sm font-medium text-muted-foreground">Value 1</th>
                    <th className="p-2 text-left text-sm font-medium text-muted-foreground">Value 2</th>
                    <th className="p-2 text-left text-sm font-medium text-muted-foreground">Value 3</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.id} className="border-b border-border hover:bg-accent/50">
                      <td className="p-2">
                        <Checkbox checked={row.selected} onCheckedChange={() => handleToggleSelect(row.id)} />
                      </td>
                      <td className="p-2 text-sm text-foreground">{row.index}</td>
                      <td
                        className="p-2 text-sm text-foreground cursor-pointer hover:bg-accent/70 transition-colors"
                        onClick={() => handleCellClick(row.id, "value1", row.value1)}
                      >
                        {editingCell?.rowId === row.id && editingCell?.field === "value1" ? (
                          <Input
                            type="number"
                            step="0.1"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleCellKeyDown}
                            className="h-7 w-full bg-background"
                            autoFocus
                          />
                        ) : (
                          row.value1
                        )}
                      </td>
                      <td
                        className="p-2 text-sm text-foreground cursor-pointer hover:bg-accent/70 transition-colors"
                        onClick={() => handleCellClick(row.id, "value2", row.value2)}
                      >
                        {editingCell?.rowId === row.id && editingCell?.field === "value2" ? (
                          <Input
                            type="number"
                            step="0.1"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleCellKeyDown}
                            className="h-7 w-full bg-background"
                            autoFocus
                          />
                        ) : (
                          row.value2
                        )}
                      </td>
                      <td
                        className="p-2 text-sm text-foreground cursor-pointer hover:bg-accent/70 transition-colors"
                        onClick={() => handleCellClick(row.id, "value3", row.value3)}
                      >
                        {editingCell?.rowId === row.id && editingCell?.field === "value3" ? (
                          <Input
                            type="number"
                            step="0.1"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleCellKeyDown}
                            className="h-7 w-full bg-background"
                            autoFocus
                          />
                        ) : (
                          row.value3
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[800px] overflow-y-auto">
          {hasRefLevel && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">ref.level</Label>
                <Button size="sm" variant="outline" onClick={handleSetDefaultRefLevel}>
                  기본값
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-foreground font-medium">{getRefLevelLabel(moduleId)}</span>
                <Input
                  id="refLevel"
                  type="number"
                  step="0.1"
                  value={refLevel}
                  onChange={(e) => setRefLevel(Number.parseFloat(e.target.value) || 0)}
                  className="bg-background flex-1"
                />
                <span className="text-foreground font-medium whitespace-nowrap">{getRefLevelUnit(moduleId)}</span>
              </div>
            </div>
          )}

          <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">차트 Y축 범위</h4>
              <Button size="sm" variant="outline" onClick={handleAutoYAxis}>
                AUTO
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="chartYMin" className="text-foreground">
                  Y min
                </Label>
                <Input
                  id="chartYMin"
                  type="number"
                  step="1"
                  value={chartYMin}
                  onChange={(e) => setChartYMin(Number.parseFloat(e.target.value) || 0)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chartYMax" className="text-foreground">
                  Y max
                </Label>
                <Input
                  id="chartYMax"
                  type="number"
                  step="1"
                  value={chartYMax}
                  onChange={(e) => setChartYMax(Number.parseFloat(e.target.value) || 0)}
                  className="bg-background"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">데이터 보정</h4>
              <Button size="sm" variant="outline" onClick={handleAutoCorrection}>
                AUTO
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scaler" className="text-foreground">
                scaler (≠ 0)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="scaler"
                  type="number"
                  step="0.1"
                  value={scaler}
                  onChange={(e) => handleParamChange("scaler", e.target.value)}
                  className="bg-background flex-1"
                />
                <Button size="sm" variant="outline" onClick={handleAutoScale}>
                  AUTO SCALE
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="offset" className="text-foreground">
                offset
              </Label>
              <div className="flex gap-2">
                <Input
                  id="offset"
                  type="number"
                  step="0.1"
                  value={offset}
                  onChange={(e) => handleParamChange("offset", e.target.value)}
                  className="bg-background flex-1"
                />
                <Button size="sm" variant="outline" onClick={handleAutoOffset}>
                  AUTO OFFSET
                </Button>
              </div>
            </div>
          </div>

          {hasRefLevel && (
            <div className="space-y-3 rounded-lg border border-border bg-accent/30 p-4">
              <h4 className="font-medium text-foreground">Outlier Removal</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="irq"
                    checked={irqEnabled}
                    onCheckedChange={(checked) => setIrqEnabled(checked as boolean)}
                  />
                  <Label htmlFor="irq" className="text-foreground flex-shrink-0">
                    IQR
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="IQR value"
                    value={irqValue}
                    onChange={(e) => setIrqValue(Number.parseFloat(e.target.value) || 0)}
                    disabled={!irqEnabled}
                    className="bg-background flex-1"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="zscore"
                    checked={zScoreEnabled}
                    onCheckedChange={(checked) => setZScoreEnabled(checked as boolean)}
                  />
                  <Label htmlFor="zscore" className="text-foreground flex-shrink-0">
                    z_score
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="z_score value"
                    value={zScoreValue}
                    onChange={(e) => setZScoreValue(Number.parseFloat(e.target.value) || 0)}
                    disabled={!zScoreEnabled}
                    className="bg-background flex-1"
                  />
                </div>
              </div>
            </div>
          )}

          {hasVehicleParams && (
            <>
              <div className="space-y-2">
                <Label htmlFor="wheelTrack" className="text-foreground">
                  차량 윤거 ({">"} 1)
                </Label>
                <Input
                  id="wheelTrack"
                  type="number"
                  step="0.1"
                  min="1"
                  value={params.wheelTrack}
                  onChange={(e) => handleParamChange("wheelTrack", e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wheelbase" className="text-foreground">
                  차량 wheelbase ({">"} 1)
                </Label>
                <Input
                  id="wheelbase"
                  type="number"
                  step="0.1"
                  min="1"
                  value={params.wheelbase}
                  onChange={(e) => handleParamChange("wheelbase", e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="span" className="text-foreground">
                  span ({">"} 1)
                </Label>
                <Input
                  id="span"
                  type="number"
                  step="0.1"
                  min="1"
                  value={params.span}
                  onChange={(e) => handleParamChange("span", e.target.value)}
                  className="bg-background"
                />
              </div>
            </>
          )}

          {hasCycleParam && (
            <div className="space-y-2">
              <Label htmlFor="cycle" className="text-foreground">
                평탄성 주기 ({">"} 0)
              </Label>
              <Input
                id="cycle"
                type="number"
                step="0.1"
                min="0"
                value={params.cycle}
                onChange={(e) => handleParamChange("cycle", e.target.value)}
                className="bg-background"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
