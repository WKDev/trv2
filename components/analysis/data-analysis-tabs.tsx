"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"
import { AnalysisModule } from "@/components/analysis/analysis-module"
import { DescriptionModal } from "@/components/shared/description-modal"

const analysisModules = [
  { id: "level", label: "수준이상", hasVehicleParams: false, hasCycleParam: false },
  { id: "flatness", label: "평면성이상", hasVehicleParams: true, hasCycleParam: false },
  { id: "height", label: "고저", hasVehicleParams: false, hasCycleParam: false },
  { id: "smoothness", label: "평탄성", hasVehicleParams: false, hasCycleParam: true },
  { id: "guide-rail", label: "안내레일 내측거리", hasVehicleParams: false, hasCycleParam: false },
  { id: "straightness", label: "직진도", hasVehicleParams: false, hasCycleParam: false },
  { id: "connection", label: "연결부단차", hasVehicleParams: false, hasCycleParam: false, hasRefLevel: false },
]

export function DataAnalysisTabs() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentModuleId, setCurrentModuleId] = useState("")
  const [activeTab, setActiveTab] = useState("level")

  const handleOpenDescription = () => {
    setCurrentModuleId(activeTab)
    setIsModalOpen(true)
  }

  return (
    <>
      <Tabs defaultValue="level" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between gap-4 mb-4">
          <TabsList className="bg-muted/50 flex-1">
            {analysisModules.map((module) => (
              <TabsTrigger key={module.id} value={module.id}>
                {module.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button variant="outline" size="sm" onClick={handleOpenDescription}>
            <Info className="mr-2 h-4 w-4" />
            설명 및 계산과정
          </Button>
        </div>

        {analysisModules.map((module) => (
          <TabsContent key={module.id} value={module.id} className="mt-6">
            <AnalysisModule
              title={module.label}
              moduleId={module.id}
              hasVehicleParams={module.hasVehicleParams}
              hasCycleParam={module.hasCycleParam}
              hasRefLevel={module.hasRefLevel}
            />
          </TabsContent>
        ))}
      </Tabs>

      <DescriptionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} moduleId={currentModuleId} />
    </>
  )
}
