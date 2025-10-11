"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RotateCcw, Check, AlertCircle } from "lucide-react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useElectronStorage } from "@/hooks/use-electron-storage"
import { useData } from "@/contexts/data-context"
import { GuideRailClearancePage } from "./GuideRailClearancePage"
import { StraightnessPage } from "./StraightnessPage"

// Sample data
const sampleData = Array.from({ length: 50 }, (_, i) => ({
  x: i,
  y: Math.sin(i / 5) * 10 + 50 + Math.random() * 5,
  y2: Math.cos(i / 5) * 8 + 45 + Math.random() * 3,
}))

const tableData = [
  { id: 1, selected: true, index: 1, value1: 45.2, value2: 48.1, value3: 50.3, value4: 47.5, value5: 49.8, value6: 46.2 },
  { id: 2, selected: true, index: 2, value1: 46.1, value2: 47.8, value3: 51.2, value4: 48.3, value5: 50.1, value6: 47.9 },
  { id: 3, selected: true, index: 3, value1: 47.3, value2: 49.2, value3: 49.8, value4: 46.7, value5: 48.5, value6: 49.1 },
  { id: 4, selected: true, index: 4, value1: 48.5, value2: 50.1, value3: 52.1, value4: 49.2, value5: 51.3, value6: 48.7 },
  { id: 5, selected: true, index: 5, value1: 49.2, value2: 48.9, value3: 50.7, value4: 47.8, value5: 49.6, value6: 50.2 },
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
    "level-deviation": 4,
    "cross-level": 3,
    "longitudinal-level-irregularity": 1.2,
    "guiderail-clearance": 10,
    "planarity": 3,
    "straightness": 3,
    "step": 9,
  }
  return defaults[moduleId] || 0
}

const getRefLevelLabel = (moduleId: string): string => {
  const labels: Record<string, string> = {
    "level-deviation": "±",
    "cross-level": "±",
    "longitudinal-level-irregularity": "σ ≤",
    "guiderail-clearance": "<",
    "planarity": "<",
    "straightness": "<",
    "step": "<",
  }
  return labels[moduleId] || "ref.level"
}

const getRefLevelUnit = (moduleId: string): string => {
  const units: Record<string, string> = {
    "level-deviation": "mm",
    "cross-level": "mm / 3m",
    "longitudinal-level-irregularity": "mm",
    "guiderail-clearance": "mm",
    "planarity": "mm / 3m",
    "straightness": "mm / 3m",
    "step": "mm",
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
  const { aggregatedData, correctedData, hasData, useStaOffset, applyStaOffsetToData, isAnalysisProcessing, analysisProgress, analysisError } = useData()
  const [data, setData] = useState(tableData)
  const [editingCell, setEditingCell] = useState<{ rowId: number; field: string } | null>(null)
  const [editValue, setEditValue] = useState("")

  // Context에서 보정된 데이터를 가져와서 테이블 데이터로 변환
  useEffect(() => {
    if (hasData() && correctedData && correctedData.length > 0) {
      // STA offset 적용된 데이터 사용
      const dataWithOffset = useStaOffset ? applyStaOffsetToData(correctedData) : correctedData
      
      // 테이블 데이터를 보정된 데이터로 업데이트 (Level1~Level6 포함)
      const tableDataFromCorrected = dataWithOffset.slice(0, 10).map((row: any, index: number) => ({
        id: index + 1,
        selected: true,
        index: index + 1,
        value1: row.Level1 || 0,
        value2: row.Level2 || 0,
        value3: row.Level3 || 0,
        value4: row.Level4 || 0,
        value5: row.Level5 || 0,
        value6: row.Level6 || 0,
      }))
      setData(tableDataFromCorrected)
    }
  }, [hasData, correctedData, useStaOffset])

  const [refLevel, setRefLevel] = useLocalStorage({
    key: `analysis-${moduleId}-refLevel`,
    defaultValue: getDefaultRefLevel(moduleId),
  })

  const [irqEnabled, setIrqEnabled] = useLocalStorage({
    key: `analysis-${moduleId}-irqEnabled`,
    defaultValue: false,
  })

  const [irqValue, setIrqValue] = useLocalStorage({
    key: `analysis-${moduleId}-irqValue`,
    defaultValue: 1.5,
  })

  const [zScoreEnabled, setZScoreEnabled] = useLocalStorage({
    key: `analysis-${moduleId}-zScoreEnabled`,
    defaultValue: false,
  })

  const [zScoreValue, setZScoreValue] = useLocalStorage({
    key: `analysis-${moduleId}-zScoreValue`,
    defaultValue: 3.0,
  })

  const { correctionData, updateCorrectionData } = useData()
  
  const [scaler, setScaler] = useElectronStorage({
    key: `analysis-${moduleId}-scaler`,
    defaultValue: 1.0,
  })

  const [offset, setOffset] = useElectronStorage({
    key: `analysis-${moduleId}-offset`,
    defaultValue: 0.0,
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

  // 즉시 context 업데이트 함수 (디바운싱 제거)
  const immediateUpdateCorrectionData = useCallback((section: 'preprocessing' | 'analysis', key: string, field: 'Scaler' | 'offset', value: number) => {
    console.log(`🔧 AnalysisModule에서 보정값 변경 (즉시): ${key}.${field} = ${value}`)
    updateCorrectionData(section, key, field, value)
  }, [updateCorrectionData])

  const handleParamChange = (field: string, value: string | boolean) => {
    if (field === "scaler") {
      const numValue = Number.parseFloat(value as string) || 0
      setScaler(numValue)
      immediateUpdateCorrectionData('analysis', moduleId, 'Scaler', numValue)
    } else if (field === "offset") {
      const numValue = Number.parseFloat(value as string) || 0
      setOffset(numValue)
      immediateUpdateCorrectionData('analysis', moduleId, 'offset', numValue)
    } else {
      setParams((prev) => ({ ...prev, [field]: typeof value === "string" ? Number.parseFloat(value) || 0 : value }))
    }
  }

  const handleAutoScale = () => {
    setScaler(1.0)
  }

  const handleAutoOffset = () => {
    setOffset(0.0)
  }

  const handleAutoCorrection = () => {
    handleAutoScale()
    handleAutoOffset()
  }

  const handleSetDefaultRefLevel = () => {
    setRefLevel(getDefaultRefLevel(moduleId))
  }

  // 안내레일 내측거리 모듈의 경우 별도 페이지 렌더링
  if (moduleId === "guiderail-clearance") {
    return <GuideRailClearancePage />
  }

  // 직진도 모듈의 경우 AnalysisLayout에서 처리되므로 여기서는 렌더링하지 않음
  if (moduleId === "straightness") {
    return null
  }

  // 데이터가 없을 때 표시할 메시지
  if (!hasData()) {
    return (
      <div className="space-y-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">{title} 분석 결과</CardTitle>
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
          <CardTitle className="text-foreground">{title} 분석 결과</CardTitle>
          {/* 분석 진행 상태 표시 */}
          {(isAnalysisProcessing || analysisError) && (
            <div className="mt-2">
              {isAnalysisProcessing && (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>
                    {analysisProgress?.message || '분석 중...'}
                    {analysisProgress?.progress !== undefined && (
                      <span className="ml-2">
                        ({Math.round(analysisProgress.progress * 100)}%)
                      </span>
                    )}
                  </span>
                </div>
              )}
              {analysisError && (
                <div className="text-sm text-red-600">
                  <AlertCircle className="inline h-4 w-4 mr-1" />
                  분석 오류: {analysisError}
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-2 text-left text-sm font-medium text-muted-foreground">선택</th>
                  <th className="p-2 text-left text-sm font-medium text-muted-foreground">Index</th>
                  <th className="p-2 text-left text-sm font-medium text-muted-foreground">Level 1</th>
                  <th className="p-2 text-left text-sm font-medium text-muted-foreground">Level 2</th>
                  <th className="p-2 text-left text-sm font-medium text-muted-foreground">Level 3</th>
                  <th className="p-2 text-left text-sm font-medium text-muted-foreground">Level 4</th>
                  <th className="p-2 text-left text-sm font-medium text-muted-foreground">Level 5</th>
                  <th className="p-2 text-left text-sm font-medium text-muted-foreground">Level 6</th>
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
                    <td
                      className="p-2 text-sm text-foreground cursor-pointer hover:bg-accent/70 transition-colors"
                      onClick={() => handleCellClick(row.id, "value4", row.value4 || 0)}
                    >
                      {editingCell?.rowId === row.id && editingCell?.field === "value4" ? (
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
                        row.value4 || 0
                      )}
                    </td>
                    <td
                      className="p-2 text-sm text-foreground cursor-pointer hover:bg-accent/70 transition-colors"
                      onClick={() => handleCellClick(row.id, "value5", row.value5 || 0)}
                    >
                      {editingCell?.rowId === row.id && editingCell?.field === "value5" ? (
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
                        row.value5 || 0
                      )}
                    </td>
                    <td
                      className="p-2 text-sm text-foreground cursor-pointer hover:bg-accent/70 transition-colors"
                      onClick={() => handleCellClick(row.id, "value6", row.value6 || 0)}
                    >
                      {editingCell?.rowId === row.id && editingCell?.field === "value6" ? (
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
                        row.value6 || 0
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
  )
}