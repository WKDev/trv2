"use client"

import { memo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RawDataTab } from "@/components/raw-data-tab"
import { OutlierRemovalTab } from "@/components/outlier-removal-tab"
import { DataCorrectionTab } from "@/components/data-correction-tab"
import { AggregationTab } from "@/components/aggregation-tab"
import { ConnectionTab } from "@/components/connection-tab"

export const PreprocessingTabs = memo(() => {
  return (
    <Tabs defaultValue="raw" className="w-full">
      <TabsList className="bg-muted/50">
        <TabsTrigger value="raw">RAW 데이터</TabsTrigger>
        <TabsTrigger value="outlier">이상치 처리</TabsTrigger>
        <TabsTrigger value="correction">Scale & Offset</TabsTrigger>
        <TabsTrigger value="aggregation">집계</TabsTrigger>
        <TabsTrigger value="connection">연결부 단차</TabsTrigger>
      </TabsList>

      <TabsContent value="raw" className="mt-6">
        <RawDataTab />
      </TabsContent>

      <TabsContent value="outlier" className="mt-6">
        <OutlierRemovalTab />
      </TabsContent>

      <TabsContent value="correction" className="mt-6">
        <DataCorrectionTab />
      </TabsContent>

      <TabsContent value="aggregation" className="mt-6">
        <AggregationTab />
      </TabsContent>

      <TabsContent value="connection" className="mt-6">
        <ConnectionTab />
      </TabsContent>
    </Tabs>
  )
})

PreprocessingTabs.displayName = "PreprocessingTabs"
