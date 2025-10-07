"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"

export function MetaEditTab() {
  const [metadata, setMetadata] = useState({
    projectName: "철도 프로젝트 A",
    date: "2024-01-15",
    location: "서울-부산 구간",
    inspector: "홍길동",
    equipment: "측정기 Model-X",
  })

  const handleChange = (field: string, value: string) => {
    setMetadata((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="text-foreground">메타데이터 수정</CardTitle>
        <CardDescription className="text-muted-foreground">프로젝트 메타데이터를 수정합니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="projectName" className="text-foreground">
              프로젝트명
            </Label>
            <Input
              id="projectName"
              value={metadata.projectName}
              onChange={(e) => handleChange("projectName", e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date" className="text-foreground">
              측정 날짜
            </Label>
            <Input
              id="date"
              type="date"
              value={metadata.date}
              onChange={(e) => handleChange("date", e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location" className="text-foreground">
              측정 위치
            </Label>
            <Input
              id="location"
              value={metadata.location}
              onChange={(e) => handleChange("location", e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inspector" className="text-foreground">
              검사자
            </Label>
            <Input
              id="inspector"
              value={metadata.inspector}
              onChange={(e) => handleChange("inspector", e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="equipment" className="text-foreground">
              측정 장비
            </Label>
            <Input
              id="equipment"
              value={metadata.equipment}
              onChange={(e) => handleChange("equipment", e.target.value)}
              className="bg-background"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button>
            <Save className="mr-2 h-4 w-4" />
            저장
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
