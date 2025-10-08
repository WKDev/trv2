"use client"

import { useState, useCallback, useRef, memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"
import { useElectronStorage } from "@/hooks/use-electron-storage"
import { useData } from "@/contexts/data-context"
import { useToast } from "@/hooks/use-toast"

interface Parameter {
  name: string
  scaler: number
  offset: number
  scalerMin: number | null
  offsetMin: number | null
}

interface ParameterPanelProps {
  parameters: Parameter[]
}

const ParameterPanel = memo(({ parameters: initialParameters }: ParameterPanelProps) => {
  const { updateCorrectionData, correctionData, processedData } = useData()
  const { toast } = useToast()
  
  
  // Create individual storage hooks for each parameter
  const level1Scaler = useElectronStorage({
    key: 'preprocess-Level1-scaler',
    defaultValue: 1,
  })
  const level1Offset = useElectronStorage({
    key: 'preprocess-Level1-offset',
    defaultValue: 0,
  })
  const level2Scaler = useElectronStorage({
    key: 'preprocess-Level2-scaler',
    defaultValue: 1,
  })
  const level2Offset = useElectronStorage({
    key: 'preprocess-Level2-offset',
    defaultValue: 0,
  })
  const level3Scaler = useElectronStorage({
    key: 'preprocess-Level3-scaler',
    defaultValue: 1,
  })
  const level3Offset = useElectronStorage({
    key: 'preprocess-Level3-offset',
    defaultValue: 0,
  })
  const level4Scaler = useElectronStorage({
    key: 'preprocess-Level4-scaler',
    defaultValue: 1,
  })
  const level4Offset = useElectronStorage({
    key: 'preprocess-Level4-offset',
    defaultValue: 0,
  })
  const level5Scaler = useElectronStorage({
    key: 'preprocess-Level5-scaler',
    defaultValue: 1,
  })
  const level5Offset = useElectronStorage({
    key: 'preprocess-Level5-offset',
    defaultValue: 0,
  })
  const level6Scaler = useElectronStorage({
    key: 'preprocess-Level6-scaler',
    defaultValue: 1,
  })
  const level6Offset = useElectronStorage({
    key: 'preprocess-Level6-offset',
    defaultValue: 0,
  })
  const encoder3Scaler = useElectronStorage({
    key: 'preprocess-Encoder3-scaler',
    defaultValue: 1,
  })
  const encoder3Offset = useElectronStorage({
    key: 'preprocess-Encoder3-offset',
    defaultValue: 0,
  })
  const ang1Scaler = useElectronStorage({
    key: 'preprocess-Ang1-scaler',
    defaultValue: 1,
  })
  const ang1Offset = useElectronStorage({
    key: 'preprocess-Ang1-offset',
    defaultValue: 0,
  })
  const ang2Scaler = useElectronStorage({
    key: 'preprocess-Ang2-scaler',
    defaultValue: 1,
  })
  const ang2Offset = useElectronStorage({
    key: 'preprocess-Ang2-offset',
    defaultValue: 0,
  })
  const ang3Scaler = useElectronStorage({
    key: 'preprocess-Ang3-scaler',
    defaultValue: 1,
  })
  const ang3Offset = useElectronStorage({
    key: 'preprocess-Ang3-offset',
    defaultValue: 0,
  })

  const parameterStorageHooks = [
    { scaler: level1Scaler, offset: level1Offset },
    { scaler: level2Scaler, offset: level2Offset },
    { scaler: level3Scaler, offset: level3Offset },
    { scaler: level4Scaler, offset: level4Offset },
    { scaler: level5Scaler, offset: level5Offset },
    { scaler: level6Scaler, offset: level6Offset },
    { scaler: encoder3Scaler, offset: encoder3Offset },
    { scaler: ang1Scaler, offset: ang1Offset },
    { scaler: ang2Scaler, offset: ang2Offset },
    { scaler: ang3Scaler, offset: ang3Offset },
  ]

  const [parameters, setParameters] = useState(() =>
    initialParameters.map((param, index) => ({
      ...param,
      scaler: parameterStorageHooks[index].scaler[0],
      offset: parameterStorageHooks[index].offset[0],
    })),
  )


  // 즉시 context 업데이트 함수 (디바운싱 제거)
  const immediateUpdateCorrectionData = useCallback((section: 'preprocessing' | 'analysis', key: string, field: 'Scaler' | 'offset', value: number) => {
    console.log(`🔧 ParameterPanel에서 보정값 변경 (즉시): ${key}.${field} = ${value}`)
    updateCorrectionData(section, key, field, value)
  }, [updateCorrectionData])

  const handleChange = (index: number, field: "scaler" | "offset", value: string) => {
    const numValue = Number.parseFloat(value)
    if (!isNaN(numValue)) {
      setParameters((prev) => prev.map((param, i) => (i === index ? { ...param, [field]: numValue } : param)))
      const [, setter] = parameterStorageHooks[index][field]
      setter(numValue)
      
      // 즉시 context 업데이트
      const param = parameters[index]
      const correctionKey = param.name === "Angle1" ? "Ang1" : 
                           param.name === "Angle2" ? "Ang2" : 
                           param.name === "Angle3" ? "Ang3" : param.name
      
      immediateUpdateCorrectionData('preprocessing', correctionKey, field === 'scaler' ? 'Scaler' : 'offset', numValue)
    }
  }

  const handleSaveCorrectionData = async () => {
    if (!processedData || !processedData.filePath) {
      toast({
        title: "오류",
        description: "저장할 파일이 없습니다. 먼저 파일을 열어주세요.",
        variant: "destructive"
      })
      return
    }

    if (!correctionData) {
      toast({
        title: "오류",
        description: "저장할 보정 데이터가 없습니다.",
        variant: "destructive"
      })
      return
    }

    // Electron API 사용 가능 여부 확인
    if (typeof window === 'undefined' || !window.electronAPI) {
      toast({
        title: "오류",
        description: "Electron 환경에서만 파일 저장이 가능합니다.",
        variant: "destructive"
      })
      return
    }

    if (typeof window.electronAPI.updateCorrectionFile !== 'function') {
      toast({
        title: "오류",
        description: "보정 데이터 저장 기능을 사용할 수 없습니다.",
        variant: "destructive"
      })
      return
    }

    try {
      const result = await window.electronAPI.updateCorrectionFile(processedData.filePath, correctionData)
      
      if (result && result.success) {
        toast({
          title: "저장 완료",
          description: "보정 데이터가 성공적으로 저장되었습니다.",
        })
      } else {
        throw new Error(result?.message || '보정 데이터 저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('보정 데이터 저장 중 오류:', error)
      toast({
        title: "저장 실패",
        description: error instanceof Error ? error.message : "보정 데이터 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    }
  }

  return (
    <Card className="bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">데이터 보정</CardTitle>
          <Button 
            onClick={handleSaveCorrectionData}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <Save className="mr-2 h-4 w-4" />
            보정 데이터 저장
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[800px] overflow-y-auto">

        {parameters.map((param, index) => (
          <div key={param.name} className="space-y-3 rounded-lg border border-border bg-accent/30 p-4">
            <h4 className="font-medium text-foreground">{param.name}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor={`${param.name}-scaler`} className="text-sm text-muted-foreground">
                  scaler {param.scalerMin !== null && `(${param.scalerMin}보다 커야 함)`}
                </Label>
                <Input
                  id={`${param.name}-scaler`}
                  type="number"
                  step="0.1"
                  value={param.scaler}
                  onChange={(e) => handleChange(index, "scaler", e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${param.name}-offset`} className="text-sm text-muted-foreground">
                  offset
                </Label>
                <Input
                  id={`${param.name}-offset`}
                  type="number"
                  step="0.1"
                  value={param.offset}
                  onChange={(e) => handleChange(index, "offset", e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
})

ParameterPanel.displayName = "ParameterPanel"

export { ParameterPanel }
