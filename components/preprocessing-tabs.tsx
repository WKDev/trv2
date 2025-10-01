"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataEditTab } from "@/components/data-edit-tab"
import { StepEditTab } from "@/components/step-edit-tab"

export function PreprocessingTabs() {
  return (
    <Tabs defaultValue="data" className="w-full">
      <TabsList className="bg-muted/50">
        <TabsTrigger value="data">data.csv 수정</TabsTrigger>
        <TabsTrigger value="step">step.csv 수정</TabsTrigger>
      </TabsList>

      <TabsContent value="data" className="mt-6">
        <DataEditTab />
      </TabsContent>

      <TabsContent value="step" className="mt-6">
        <StepEditTab />
      </TabsContent>
    </Tabs>
  )
}
