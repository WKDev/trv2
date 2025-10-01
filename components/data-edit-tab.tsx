"use client"

import { DataChartTable } from "@/components/data-chart-table"
import { ParameterPanel } from "@/components/parameter-panel"

const parameters = [
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

export function DataEditTab() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <DataChartTable title="data.csv 데이터" />
      <ParameterPanel parameters={parameters} />
    </div>
  )
}
