"use client"

import { memo } from "react"
import { DataChartTable } from "@/components/data-chart-table"

export const StepEditTab = memo(() => {
  return <DataChartTable title="step.csv 데이터" dataType="step" />
})

StepEditTab.displayName = "StepEditTab"
