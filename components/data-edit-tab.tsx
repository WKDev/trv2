"use client"

import { DataChartTable } from "@/components/data-chart-table"
import { ParameterPanel } from "@/components/parameter-panel"
import { useData } from "@/contexts/data-context"
import { useMemo, memo } from "react"

const DataEditTab = memo(() => {
  const { correctionData } = useData()

  const parameters = useMemo(() => {
    const defaultParams = [
      { name: "Level1", scaler: 1.0, offset: 0.0, scalerMin: null, offsetMin: null },
      { name: "Level2", scaler: 1.0, offset: 0.0, scalerMin: 0, offsetMin: null },
      { name: "Level3", scaler: 100.0, offset: 0.0, scalerMin: 0, offsetMin: null },
      { name: "Level4", scaler: 1.0, offset: 0.0, scalerMin: 0, offsetMin: null },
      { name: "Level5", scaler: 1.0, offset: 0.0, scalerMin: 0, offsetMin: null },
      { name: "Level6", scaler: 1.0, offset: 0.0, scalerMin: 0, offsetMin: null },
      { name: "Encoder3", scaler: 1.0, offset: 0.0, scalerMin: 0, offsetMin: null },
      { name: "Angle1", scaler: 1.0, offset: 0.0, scalerMin: 0, offsetMin: null },
      { name: "Angle2", scaler: 1.0, offset: 0.0, scalerMin: 0, offsetMin: null },
      { name: "Angle3", scaler: 1.0, offset: 0.0, scalerMin: 0, offsetMin: null },
    ]

    if (!correctionData || !correctionData.preprocessing) {
      return defaultParams
    }

    // correction data에서 값을 가져와서 parameters 업데이트
    return defaultParams.map(param => {
      const correctionKey = param.name === "Angle1" ? "Ang1" : 
                           param.name === "Angle2" ? "Ang2" : 
                           param.name === "Angle3" ? "Ang3" : param.name
      
      const correction = correctionData.preprocessing[correctionKey]
      if (correction) {
        return {
          ...param,
          scaler: correction.Scaler,
          offset: correction.offset
        }
      }
      return param
    })
  }, [correctionData])

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <DataChartTable title="data.csv 데이터" dataType="data" />
      <ParameterPanel parameters={parameters} />
    </div>
  )
})

DataEditTab.displayName = "DataEditTab"

export { DataEditTab }
