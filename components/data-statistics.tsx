"use client"

import { memo, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DataStatisticsProps {
  data: any[]
  columns: string[]
}

const DataStatistics = memo(({ data, columns }: DataStatisticsProps) => {
  const statistics = useMemo(() => {
    if (!data || data.length === 0) return {}

    const stats: Record<string, {
      min: number
      median: number
      max: number
      mean: number
      std: number
    }> = {}

    columns.forEach(column => {
      const values = data
        .map(row => parseFloat(row[column]))
        .filter(val => !isNaN(val))

      if (values.length === 0) {
        stats[column] = { min: 0, median: 0, max: 0, mean: 0, std: 0 }
        return
      }

      const sortedValues = [...values].sort((a, b) => a - b)
      const min = Math.min(...values)
      const max = Math.max(...values)
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length
      
      // 중간값 계산
      const mid = Math.floor(sortedValues.length / 2)
      const median = sortedValues.length % 2 === 0 
        ? (sortedValues[mid - 1] + sortedValues[mid]) / 2 
        : sortedValues[mid]
      
      // 표준편차 계산
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
      const std = Math.sqrt(variance)

      stats[column] = { min, median, max, mean, std }
    })

    return stats
  }, [data, columns])

  if (!data || data.length === 0) {
    return null
  }

  const statTypes = [
    { key: 'min', label: '최소' },
    { key: 'median', label: '중간값' },
    { key: 'max', label: '최대' },
    { key: 'mean', label: '평균' },
    { key: 'std', label: '표준편차' }
  ]

  return (
    <Card className="bg-card border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-foreground text-sm">데이터 통계</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium text-muted-foreground">통계</th>
                {columns.map(column => (
                  <th key={column} className="text-center p-2 font-medium text-muted-foreground">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statTypes.map(statType => (
                <tr key={statType.key} className="border-b">
                  <td className="p-2 font-medium text-foreground">{statType.label}</td>
                  {columns.map(column => {
                    const stat = statistics[column]
                    if (!stat) return <td key={column} className="p-2 text-center text-muted-foreground">-</td>
                    
                    const value = stat[statType.key as keyof typeof stat]
                    return (
                      <td key={column} className="p-2 text-center text-foreground">
                        {typeof value === 'number' ? value.toFixed(2) : '-'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
})

DataStatistics.displayName = "DataStatistics"

export { DataStatistics }
