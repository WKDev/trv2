"use client"

import { useState, useCallback, useRef, memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Save } from "lucide-react"
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
  
  // debounce를 위한 ref
  const debounceRefs = useRef<{ [key: string]: NodeJS.Timeout }>({})
  
  const parameterStorageHooks = initialParameters.map((param) => ({
    scaler: useElectronStorage({
      key: `preprocess-${param.name}-scaler`,
      defaultValue: param.scaler,
      debounceMs: 100,
    }),
    offset: useElectronStorage({
      key: `preprocess-${param.name}-offset`,
      defaultValue: param.offset,
      debounceMs: 100,
    }),
  }))

  const [parameters, setParameters] = useState(() =>
    initialParameters.map((param, index) => ({
      ...param,
      scaler: parameterStorageHooks[index].scaler[0],
      offset: parameterStorageHooks[index].offset[0],
    })),
  )

  const [sectionAverage, setSectionAverage] = useState("10")
  const [aggregationMethod, setAggregationMethod] = useState("average")
  const [emaSpan, setEmaSpan] = useState("10")
  const [irqEnabled, setIrqEnabled] = useState(false)
  const [irqValue, setIrqValue] = useState("1.5")
  const [zScoreEnabled, setZScoreEnabled] = useState(false)
  const [zScoreValue, setZScoreValue] = useState("3.0")

  // debounce된 context 업데이트 함수
  const debouncedUpdateCorrectionData = useCallback((section: 'preprocessing' | 'analysis', key: string, field: 'Scaler' | 'offset', value: number) => {
    const debounceKey = `${section}-${key}-${field}`
    
    // 기존 타이머가 있으면 취소
    if (debounceRefs.current[debounceKey]) {
      clearTimeout(debounceRefs.current[debounceKey])
    }
    
    // 새로운 타이머 설정 (500ms 후에 context 업데이트)
    debounceRefs.current[debounceKey] = setTimeout(() => {
      updateCorrectionData(section, key, field, value)
      delete debounceRefs.current[debounceKey]
    }, 500)
  }, [updateCorrectionData])

  const handleChange = (index: number, field: "scaler" | "offset", value: string) => {
    const numValue = Number.parseFloat(value)
    if (!isNaN(numValue)) {
      setParameters((prev) => prev.map((param, i) => (i === index ? { ...param, [field]: numValue } : param)))
      const [, setter] = parameterStorageHooks[index][field]
      setter(numValue)
      
      // debounce된 context 업데이트
      const param = parameters[index]
      const correctionKey = param.name === "Angle1" ? "Ang1" : 
                           param.name === "Angle2" ? "Ang2" : 
                           param.name === "Angle3" ? "Ang3" : param.name
      
      debouncedUpdateCorrectionData('preprocessing', correctionKey, field === 'scaler' ? 'Scaler' : 'offset', numValue)
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
        <div className="space-y-3 rounded-lg border border-border bg-accent/30 p-4">
          <h4 className="font-medium text-foreground">데이터 집계</h4>

          <div className="flex items-center gap-4">
            <Label htmlFor="section-interval" className="text-sm font-medium whitespace-nowrap">
              집계구간
            </Label>
            <Input
              id="section-interval"
              type="number"
              value={sectionAverage}
              onChange={(e) => setSectionAverage(e.target.value)}
              className="w-32 bg-background"
              placeholder="10"
            />
            <span className="text-sm text-muted-foreground">m</span>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">집계방식</Label>
            <RadioGroup value={aggregationMethod} onValueChange={setAggregationMethod}>
              <div className="flex items-center gap-6">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="average" id="agg-average" />
                  <Label htmlFor="agg-average" className="font-normal cursor-pointer">
                    평균
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="median" id="agg-median" />
                  <Label htmlFor="agg-median" className="font-normal cursor-pointer">
                    중앙값
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ema" id="agg-ema" />
                  <Label htmlFor="agg-ema" className="font-normal cursor-pointer">
                    EMA
                  </Label>
                </div>
              </div>
              {aggregationMethod === "ema" && (
                <div className="flex items-center gap-3 mt-2">
                  <Label htmlFor="ema-span" className="text-sm whitespace-nowrap">
                    Span
                  </Label>
                  <Input
                    id="ema-span"
                    type="number"
                    value={emaSpan}
                    onChange={(e) => setEmaSpan(e.target.value)}
                    className="w-32 bg-background"
                    placeholder="10"
                  />
                </div>
              )}
            </RadioGroup>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {"집계 구간및 방식 변경시 \n데이터 체크박스가 초기화됩니다."}
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-accent/30 p-4">
          <h4 className="font-medium text-foreground">Outlier Removal</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="irq-preprocess"
                checked={irqEnabled}
                onCheckedChange={(checked) => setIrqEnabled(checked as boolean)}
              />
              <Label htmlFor="irq-preprocess" className="text-foreground flex-shrink-0 w-20">
                IQR
              </Label>
              <Input
                type="number"
                step="0.1"
                placeholder="IQR value"
                value={irqValue}
                onChange={(e) => setIrqValue(e.target.value)}
                disabled={!irqEnabled}
                className="bg-background flex-1"
              />
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="zscore-preprocess"
                checked={zScoreEnabled}
                onCheckedChange={(checked) => setZScoreEnabled(checked as boolean)}
              />
              <Label htmlFor="zscore-preprocess" className="text-foreground flex-shrink-0 w-20">
                z_score
              </Label>
              <Input
                type="number"
                step="0.1"
                placeholder="z_score value"
                value={zScoreValue}
                onChange={(e) => setZScoreValue(e.target.value)}
                disabled={!zScoreEnabled}
                className="bg-background flex-1"
              />
            </div>
          </div>
        </div>

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
