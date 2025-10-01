"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RotateCcw, Check, AlertCircle } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useData } from "@/contexts/data-context"

// Sample data with multiple y-axis values
const sampleData = Array.from({ length: 50 }, (_, i) => ({
  x: i,
  Level1: Math.sin(i / 5) * 10 + 50 + Math.random() * 5,
  Level2: Math.cos(i / 5) * 8 + 45 + Math.random() * 3,
  Level3: Math.sin(i / 4) * 12 + 48 + Math.random() * 4,
  Encoder3: Math.cos(i / 6) * 9 + 52 + Math.random() * 3,
}))

const tableData = [
  { id: 1, selected: true, index: 1, value1: 45.2, value2: 48.1, value3: 50.3 },
  { id: 2, selected: true, index: 2, value1: 46.1, value2: 47.8, value3: 51.2 },
  { id: 3, selected: true, index: 3, value1: 47.3, value2: 49.2, value3: 49.8 },
  { id: 4, selected: true, index: 4, value1: 48.5, value2: 50.1, value3: 52.1 },
  { id: 5, selected: true, index: 5, value1: 49.2, value2: 48.9, value3: 50.7 },
]

interface DataChartTableProps {
  title: string
  dataType?: 'data' | 'step' // 'data' for data.csv, 'step' for step.csv
}

export function DataChartTable({ title, dataType = 'data' }: DataChartTableProps) {
  const { getDataCsv, getStepCsv, hasData } = useData()
  const [data, setData] = useState(tableData)
  const [visibleLines, setVisibleLines] = useState({
    Level1: true,
    Level2: true,
    Level3: true,
    Encoder3: true,
  })
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null)
  const [editValue, setEditValue] = useState("")
  const [chartData, setChartData] = useState(sampleData)

  // Context에서 실제 데이터를 가져와서 차트 데이터로 변환
  useEffect(() => {
    if (hasData()) {
      const rawData = dataType === 'data' ? getDataCsv() : getStepCsv()
      
      if (rawData && rawData.length > 0) {
        // 실제 데이터를 차트 형식으로 변환
        const convertedData = rawData.map((row: any, index: number) => ({
          x: index,
          Level1: row.Level1 || 0,
          Level2: row.Level2 || 0,
          Level3: row.Level3 || 0,
          Encoder3: row.Encoder3 || 0,
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
  }, [hasData, getDataCsv, getStepCsv, dataType])

  const handleToggleSelect = (id: number) => {
    setData((prev) => prev.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row)))
  }

  const handleReset = () => {
    setData(tableData)
  }

  const handleToggleLine = (line: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({ ...prev, [line]: !prev[line] }))
  }

  const handleCellClick = (id: number, field: string, currentValue: number) => {
    setEditingCell({ id, field })
    setEditValue(currentValue.toString())
  }

  const handleCellChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value)
  }

  const handleCellBlur = () => {
    if (editingCell) {
      const newValue = Number.parseFloat(editValue)
      if (!isNaN(newValue)) {
        setData((prev) =>
          prev.map((row) => (row.id === editingCell.id ? { ...row, [editingCell.field]: newValue } : row)),
        )
      }
      setEditingCell(null)
    }
  }

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCellBlur()
    } else if (e.key === "Escape") {
      setEditingCell(null)
    }
  }

  // 데이터가 없을 때 표시할 메시지
  if (!hasData()) {
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
        <CardContent className="space-y-4">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="x" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
              {visibleLines.Level1 && (
                <Line type="monotone" dataKey="Level1" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
              )}
              {visibleLines.Level2 && (
                <Line type="monotone" dataKey="Level2" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
              )}
              {visibleLines.Level3 && (
                <Line type="monotone" dataKey="Level3" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
              )}
              {visibleLines.Encoder3 && (
                <Line type="monotone" dataKey="Encoder3" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
              )}
            </LineChart>
          </ResponsiveContainer>

          <div className="flex flex-wrap gap-4 p-4 bg-accent/30 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <Checkbox id="level1" checked={visibleLines.Level1} onCheckedChange={() => handleToggleLine("Level1")} />
              <Label htmlFor="level1" className="text-sm font-medium cursor-pointer">
                <span
                  className="inline-block w-3 h-3 rounded-full mr-1"
                  style={{ backgroundColor: "hsl(var(--chart-1))" }}
                />
                Level1
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="level2" checked={visibleLines.Level2} onCheckedChange={() => handleToggleLine("Level2")} />
              <Label htmlFor="level2" className="text-sm font-medium cursor-pointer">
                <span
                  className="inline-block w-3 h-3 rounded-full mr-1"
                  style={{ backgroundColor: "hsl(var(--chart-2))" }}
                />
                Level2
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="level3" checked={visibleLines.Level3} onCheckedChange={() => handleToggleLine("Level3")} />
              <Label htmlFor="level3" className="text-sm font-medium cursor-pointer">
                <span
                  className="inline-block w-3 h-3 rounded-full mr-1"
                  style={{ backgroundColor: "hsl(var(--chart-3))" }}
                />
                Level3
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="encoder3"
                checked={visibleLines.Encoder3}
                onCheckedChange={() => handleToggleLine("Encoder3")}
              />
              <Label htmlFor="encoder3" className="text-sm font-medium cursor-pointer">
                <span
                  className="inline-block w-3 h-3 rounded-full mr-1"
                  style={{ backgroundColor: "hsl(var(--chart-4))" }}
                />
                Encoder3
              </Label>
            </div>
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
                      className="p-2 text-sm text-foreground cursor-pointer hover:bg-accent"
                      onClick={() => handleCellClick(row.id, "value1", row.value1)}
                    >
                      {editingCell?.id === row.id && editingCell?.field === "value1" ? (
                        <input
                          type="number"
                          step="0.1"
                          value={editValue}
                          onChange={handleCellChange}
                          onBlur={handleCellBlur}
                          onKeyDown={handleCellKeyDown}
                          autoFocus
                          className="w-full bg-background border border-primary rounded px-1 py-0.5"
                        />
                      ) : (
                        row.value1
                      )}
                    </td>
                    <td
                      className="p-2 text-sm text-foreground cursor-pointer hover:bg-accent"
                      onClick={() => handleCellClick(row.id, "value2", row.value2)}
                    >
                      {editingCell?.id === row.id && editingCell?.field === "value2" ? (
                        <input
                          type="number"
                          step="0.1"
                          value={editValue}
                          onChange={handleCellChange}
                          onBlur={handleCellBlur}
                          onKeyDown={handleCellKeyDown}
                          autoFocus
                          className="w-full bg-background border border-primary rounded px-1 py-0.5"
                        />
                      ) : (
                        row.value2
                      )}
                    </td>
                    <td
                      className="p-2 text-sm text-foreground cursor-pointer hover:bg-accent"
                      onClick={() => handleCellClick(row.id, "value3", row.value3)}
                    >
                      {editingCell?.id === row.id && editingCell?.field === "value3" ? (
                        <input
                          type="number"
                          step="0.1"
                          value={editValue}
                          onChange={handleCellChange}
                          onBlur={handleCellBlur}
                          onKeyDown={handleCellKeyDown}
                          autoFocus
                          className="w-full bg-background border border-primary rounded px-1 py-0.5"
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
  )
}
