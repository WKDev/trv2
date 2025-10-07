"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

type DataGroup = "Level" | "Encoder" | "Angle"

const dataGroups = {
  Level: ["Level1", "Level2", "Level3", "Level4", "Level5", "Level6"],
  Encoder: ["Encoder3"],
  Angle: ["Ang1", "Ang2", "Ang3"],
} as const

interface ChartDataSelectorProps {
  onSelectionChange?: (group: DataGroup, items: string[]) => void
}

export function ChartDataSelector({ onSelectionChange }: ChartDataSelectorProps) {
  const [selectedGroup, setSelectedGroup] = useState<DataGroup>("Level")
  const [selectedItems, setSelectedItems] = useState<string[]>([...dataGroups.Level])

  const handleGroupChange = (group: DataGroup) => {
    setSelectedGroup(group)
    // 그룹 변경 시 해당 그룹의 모든 항목을 기본 선택
    const allItems = [...dataGroups[group]]
    setSelectedItems(allItems)
    
    // 외부에 변경사항 알림
    onSelectionChange?.(group, allItems)
  }

  const handleItemToggle = (item: string) => {
    const newItems = selectedItems.includes(item) 
      ? selectedItems.filter((i) => i !== item) 
      : [...selectedItems, item]
    
    setSelectedItems(newItems)
    // 외부에 변경사항 알림
    onSelectionChange?.(selectedGroup, newItems)
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-8">
        {/* Group selector - horizontal tabs */}
        <div className="flex gap-2 shrink-0">
          {(Object.keys(dataGroups) as DataGroup[]).map((group) => (
            <button
              key={group}
              onClick={() => handleGroupChange(group)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedGroup === group
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {group}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-border shrink-0" />

        {/* Checkboxes for selected group - horizontal layout */}
        <div className="flex items-center gap-4 overflow-x-auto">
          {dataGroups[selectedGroup].map((item) => (
            <div key={item} className="flex items-center gap-2 shrink-0">
              <Checkbox
                id={item}
                checked={selectedItems.includes(item)}
                onCheckedChange={() => handleItemToggle(item)}
              />
              <Label htmlFor={item} className="text-sm font-medium cursor-pointer whitespace-nowrap">
                {item}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
