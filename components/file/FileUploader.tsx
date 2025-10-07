"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FolderOpen, Clock, FileText, Trash2, Save, Loader2, AlertCircle, CheckCircle, X, Shield } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useData } from "@/contexts/data-context"

interface RecentFile {
  name: string
  path: string
  date: string
  timestamp: number
}

export function FileUploader() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])
  const { toast } = useToast()
  
  // Context에서 데이터 상태와 함수들을 가져옴
  const {
    processedData,
    metadata,
    correctionData,
    isProcessing,
    setProcessedData,
    setMetadata,
    setCorrectionData,
    updateMetadata,
    setIsProcessing
  } = useData()

  // 컴포넌트 마운트 시 최근 파일 목록 로드
  useEffect(() => {
    loadRecentFiles()
  }, [])

  // 최근 파일 목록 로드 (검증 포함)
  const loadRecentFiles = async () => {
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.getValidatedRecentFiles === 'function') {
      try {
        const result = await window.electronAPI.getValidatedRecentFiles()
        if (result && result.success && result.files) {
          setRecentFiles(result.files)
        }
      } catch (error) {
        console.error('최근 파일 목록 로드 중 오류:', error)
      }
    }
  }

  // 최근 파일 목록 검증 및 정리 (사용자 확인 포함)
  const validateAndCleanRecentFiles = async () => {
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.validateAndCleanRecentFilesWithDialog === 'function') {
      try {
        const result = await window.electronAPI.validateAndCleanRecentFilesWithDialog()
        if (result && result.success && result.files) {
          setRecentFiles(result.files)
          toast({
            title: "파일 목록 검증 완료",
            description: result.message,
          })
        }
      } catch (error) {
        console.error('최근 파일 목록 검증 중 오류:', error)
        toast({
          title: "오류",
          description: "최근 파일 목록 검증 중 오류가 발생했습니다.",
          variant: "destructive"
        })
      }
    }
  }

  // ZIP 파일 선택 및 처리
  const handleFileSelect = async () => {
    if (typeof window === 'undefined' || !window.electronAPI) {
      toast({
        title: "오류",
        description: "Electron 환경에서만 ZIP 파일 처리가 가능합니다.",
        variant: "destructive"
      })
      return
    }

    // 필요한 API 함수들이 존재하는지 확인
    if (typeof window.electronAPI.selectZipFile !== 'function' ||
        typeof window.electronAPI.validateZipFile !== 'function' ||
        typeof window.electronAPI.validateZipStructure !== 'function' ||
        typeof window.electronAPI.extractZipFile !== 'function' ||
        typeof window.electronAPI.checkAndAddCorrectionFile !== 'function' ||
        typeof window.electronAPI.readCsvFiles !== 'function' ||
        typeof window.electronAPI.cleanupTempDirectory !== 'function') {
      toast({
        title: "오류",
        description: "필요한 파일 처리 기능을 사용할 수 없습니다.",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    setProcessedData(null)

    try {
      // ZIP 파일 선택
      const selectResult = await window.electronAPI.selectZipFile()
      if (!selectResult.success) {
        throw new Error(selectResult.message)
      }

      // ZIP 파일 유효성 검사
      const validationResult = await window.electronAPI.validateZipFile(selectResult.filePath!)
      if (!validationResult.valid) {
        throw new Error(validationResult.message)
      }

      // ZIP 파일 구조 검증
      const structureResult = await window.electronAPI.validateZipStructure(selectResult.filePath!)
      if (!structureResult.valid) {
        throw new Error(structureResult.message)
      }

      // ZIP 파일 압축 해제
      const extractResult = await window.electronAPI.extractZipFile(selectResult.filePath!)
      if (!extractResult.success) {
        throw new Error(extractResult.message)
      }

      // data_correction.json 파일 확인 및 추가
      const correctionResult = await window.electronAPI.checkAndAddCorrectionFile(selectResult.filePath!)
      if (!correctionResult.success) {
        console.warn('보정 파일 처리 중 오류:', correctionResult.message)
      }

      // data_correction.json 파일 읽기
      const correctionDataResult = await window.electronAPI.readCorrectionFile(selectResult.filePath!)
      if (correctionDataResult.success && correctionDataResult.data) {
        setCorrectionData(correctionDataResult.data)
      } else {
        console.warn('보정 데이터 읽기 중 오류:', correctionDataResult.message)
      }

      // CSV 파일들 읽기
      const csvResult = await window.electronAPI.readCsvFiles(extractResult.extractPath!, (extractResult as any).foundFilePaths)
      if (!csvResult.success) {
        throw new Error(csvResult.message)
      }

      // 임시 디렉토리 정리
      await window.electronAPI.cleanupTempDirectory()

      const result = {
        success: true,
        fileName: selectResult.fileName!,
        filePath: selectResult.filePath!,
        data: csvResult.data,
        qualityCheck: csvResult.qualityCheck,
        message: 'ZIP 파일이 성공적으로 처리되었습니다.'
      }
      
      if (result.success) {
        setSelectedFile(result.fileName)
        setProcessedData(result)
        
        // 메타데이터 로드
        if (result.data && result.data.raw && result.data.raw.meta && result.data.raw.meta.length > 0) {
          const metaRow = result.data.raw.meta[0]
          setMetadata({
            time: metaRow.time || "",
            testername: metaRow.testername || "",
            line: metaRow.line || "",
            recording_type: metaRow.recording_type || "",
            recording_interval: metaRow.recording_interval || "",
            wheel_diameter: metaRow.wheel_diameter || "",
            enc_ppr: metaRow.enc_ppr || "",
            device_type: metaRow.device_type || "",
            level_sensor: metaRow.level_sensor || "",
            encoder_sensor: metaRow.encoder_sensor || "",
          })
        }
        
        // 최근 파일 목록 새로고침
        await loadRecentFiles()
        
        toast({
          title: "파일 처리 완료",
          description: `${result.fileName}이(가) 성공적으로 처리되었습니다.`,
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('ZIP 파일 처리 중 오류:', error)
      toast({
        title: "파일 처리 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRecentFileOpen = async (fileName: string, filePath: string) => {
    if (typeof window === 'undefined' || !window.electronAPI) {
      toast({
        title: "오류",
        description: "Electron 환경에서만 ZIP 파일 처리가 가능합니다.",
        variant: "destructive"
      })
      return
    }

    // 필요한 API 함수들이 존재하는지 확인
    if (typeof window.electronAPI.validateZipFile !== 'function' ||
        typeof window.electronAPI.validateZipStructure !== 'function' ||
        typeof window.electronAPI.extractZipFile !== 'function' ||
        typeof window.electronAPI.checkAndAddCorrectionFile !== 'function' ||
        typeof window.electronAPI.readCsvFiles !== 'function' ||
        typeof window.electronAPI.cleanupTempDirectory !== 'function') {
      toast({
        title: "오류",
        description: "필요한 파일 처리 기능을 사용할 수 없습니다.",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    setProcessedData(null)

    try {
      // ZIP 파일 유효성 검사
      const validationResult = await window.electronAPI.validateZipFile(filePath)
      if (!validationResult.valid) {
        throw new Error(validationResult.message)
      }

      // ZIP 파일 구조 검증
      const structureResult = await window.electronAPI.validateZipStructure(filePath)
      if (!structureResult.valid) {
        throw new Error(structureResult.message)
      }

      // ZIP 파일 압축 해제
      const extractResult = await window.electronAPI.extractZipFile(filePath)
      if (!extractResult.success) {
        throw new Error(extractResult.message)
      }

      // data_correction.json 파일 확인 및 추가
      const correctionResult = await window.electronAPI.checkAndAddCorrectionFile(filePath)
      if (!correctionResult.success) {
        console.warn('보정 파일 처리 중 오류:', correctionResult.message)
      }

      // data_correction.json 파일 읽기
      const correctionDataResult = await window.electronAPI.readCorrectionFile(filePath)
      if (correctionDataResult.success && correctionDataResult.data) {
        setCorrectionData(correctionDataResult.data)
      } else {
        console.warn('보정 데이터 읽기 중 오류:', correctionDataResult.message)
      }

      // CSV 파일들 읽기
      const csvResult = await window.electronAPI.readCsvFiles(extractResult.extractPath!, (extractResult as any).foundFilePaths)
      if (!csvResult.success) {
        throw new Error(csvResult.message)
      }

      // 임시 디렉토리 정리
      await window.electronAPI.cleanupTempDirectory()

      const result = {
        success: true,
        fileName: fileName,
        filePath: filePath,
        data: csvResult.data,
        qualityCheck: csvResult.qualityCheck,
        message: 'ZIP 파일이 성공적으로 처리되었습니다.'
      }
      
      if (result.success) {
        setSelectedFile(result.fileName)
        setProcessedData(result)
        
        // 메타데이터 로드
        if (result.data && result.data.raw && result.data.raw.meta && result.data.raw.meta.length > 0) {
          const metaRow = result.data.raw.meta[0]
          setMetadata({
            time: metaRow.time || "",
            testername: metaRow.testername || "",
            line: metaRow.line || "",
            recording_type: metaRow.recording_type || "",
            recording_interval: metaRow.recording_interval || "",
            wheel_diameter: metaRow.wheel_diameter || "",
            enc_ppr: metaRow.enc_ppr || "",
            device_type: metaRow.device_type || "",
            level_sensor: metaRow.level_sensor || "",
            encoder_sensor: metaRow.encoder_sensor || "",
          })
        }
        
        // 최근 파일 목록 새로고침
        await loadRecentFiles()
        
        toast({
          title: "파일 처리 완료",
          description: `${result.fileName}이(가) 성공적으로 처리되었습니다.`,
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('ZIP 파일 처리 중 오류:', error)
      toast({
        title: "파일 처리 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClearHistory = async () => {
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.clearRecentFiles === 'function') {
      try {
        const result = await window.electronAPI.clearRecentFiles()
        if (result && result.success) {
          setRecentFiles([])
          toast({
            title: "기록 제거됨",
            description: "최근 파일 기록이 모두 제거되었습니다.",
          })
        } else {
          throw new Error(result?.message || '최근 파일 목록 초기화에 실패했습니다.')
        }
      } catch (error) {
        console.error('최근 파일 목록 초기화 중 오류:', error)
        toast({
          title: "오류",
          description: error instanceof Error ? error.message : "최근 파일 목록 초기화 중 오류가 발생했습니다.",
          variant: "destructive"
        })
      }
    } else {
      toast({
        title: "오류",
        description: "최근 파일 목록 초기화 기능을 사용할 수 없습니다.",
        variant: "destructive"
      })
    }
  }

  const handleRemoveFromRecentFiles = async (filePath: string) => {
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.removeFromRecentFiles === 'function') {
      try {
        const result = await window.electronAPI.removeFromRecentFiles(filePath)
        if (result && result.success) {
          // 목록에서 제거
          setRecentFiles(prev => prev.filter(file => file.path !== filePath))
          toast({
            title: "파일 제거됨",
            description: "파일이 최근 목록에서 제거되었습니다.",
          })
        } else {
          throw new Error(result?.message || '파일 제거에 실패했습니다.')
        }
      } catch (error) {
        console.error('파일 제거 중 오류:', error)
        toast({
          title: "오류",
          description: error instanceof Error ? error.message : "파일 제거 중 오류가 발생했습니다.",
          variant: "destructive"
        })
      }
    } else {
      toast({
        title: "오류",
        description: "파일 제거 기능을 사용할 수 없습니다.",
        variant: "destructive"
      })
    }
  }

  const handleMetadataChange = (field: string, value: string) => {
    updateMetadata(field, value)
  }

  const handleMetadataSave = async () => {
    if (!processedData || !processedData.filePath) {
      toast({
        title: "오류",
        description: "저장할 파일이 없습니다. 먼저 파일을 열어주세요.",
        variant: "destructive"
      })
      return
    }

    // Electron API 사용 가능 여부 확인
    if (typeof window === 'undefined' || !window.electronAPI) {
      console.error('Electron API not available:', { 
        window: typeof window, 
        electronAPI: !!window?.electronAPI,
        electronAPILoaded: (window as any)?.electronAPILoaded
      })
      toast({
        title: "오류",
        description: "Electron 환경에서만 파일 저장이 가능합니다.",
        variant: "destructive"
      })
      return
    }

    console.log('Electron API available:', Object.keys(window.electronAPI))
    console.log('Electron API loaded flag:', (window as any)?.electronAPILoaded)
    
    if (typeof window.electronAPI.saveCsvFiles !== 'function' || 
        typeof window.electronAPI.updateCorrectionFile !== 'function') {
      console.error('Required functions not available:', {
        saveCsvFiles: typeof window.electronAPI.saveCsvFiles,
        updateCorrectionFile: typeof window.electronAPI.updateCorrectionFile
      })
      console.error('Available functions:', Object.keys(window.electronAPI).filter(key => typeof (window.electronAPI as any)[key] === 'function'))
      toast({
        title: "오류",
        description: "파일 저장 기능을 사용할 수 없습니다.",
        variant: "destructive"
      })
      return
    }

    try {
      // 메타데이터를 CSV 형식으로 변환
      const metaCsvData = [metadata]
      
      // correction data가 있으면 ZIP 파일에 저장
      if (correctionData) {
        const correctionResult = await window.electronAPI.updateCorrectionFile(processedData.filePath, correctionData)
        if (!correctionResult.success) {
          console.warn('보정 데이터 저장 중 오류:', correctionResult.message)
        }
      }
      
      // Electron API를 통해 파일 저장
      const result = await window.electronAPI.saveCsvFiles(processedData.filePath, {
        meta: metaCsvData,
        data: processedData.data?.raw?.data || [],
        step: processedData.data?.raw?.step || []
      })

      if (result && result.success) {
        toast({
          title: "저장 완료",
          description: "메타데이터와 보정 데이터가 성공적으로 저장되었습니다.",
        })
      } else {
        throw new Error(result?.message || '저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('메타데이터 저장 중 오류:', error)
      toast({
        title: "저장 실패",
        description: error instanceof Error ? error.message : "메타데이터 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="grid grid-cols-10 gap-6">
      {/* Top left: 파일 열기 (4/10 width) */}
      <Card className="col-span-4 bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">파일 열기</CardTitle>
          <CardDescription className="text-muted-foreground">분석할 데이터 파일을 선택하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            className="w-full sm:w-auto bg-primary hover:bg-primary/90" 
            onClick={handleFileSelect}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FolderOpen className="mr-2 h-4 w-4" />
            )}
            {isProcessing ? "처리 중..." : "ZIP 파일 선택"}
          </Button>
          
          {selectedFile && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-accent/50 p-3">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">{selectedFile}</span>
            </div>
          )}

          {processedData && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">파일이 성공적으로 처리되었습니다.</span>
              </div>
              
              {processedData.qualityCheck && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">데이터 품질 검사 결과</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      {processedData.qualityCheck.valid ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-red-600" />
                      )}
                      <span className={processedData.qualityCheck.valid ? "text-green-700" : "text-red-700"}>
                        데이터 품질: {processedData.qualityCheck.valid ? "양호" : "문제 있음"}
                      </span>
                    </div>
                    
                    {processedData.qualityCheck.issues && processedData.qualityCheck.issues.length > 0 && (
                      <div className="ml-5 space-y-1">
                        {processedData.qualityCheck.issues.map((issue: string, index: number) => (
                          <div key={index} className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 text-red-600" />
                            <span className="text-red-700">{issue}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {processedData.qualityCheck.warnings && processedData.qualityCheck.warnings.length > 0 && (
                      <div className="ml-5 space-y-1">
                        {processedData.qualityCheck.warnings.map((warning: string, index: number) => (
                          <div key={index} className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 text-yellow-600" />
                            <span className="text-yellow-700">{warning}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {processedData.data && processedData.data.summary && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">데이터 요약</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded bg-accent/30 p-2">
                      <div className="font-medium">데이터 행 수</div>
                      <div className="text-muted-foreground">
                        {processedData.data.summary.files.data?.rowCount || 0}행
                      </div>
                    </div>
                    <div className="rounded bg-accent/30 p-2">
                      <div className="font-medium">메타데이터 행 수</div>
                      <div className="text-muted-foreground">
                        {processedData.data.summary.files.meta?.rowCount || 0}행
                      </div>
                    </div>
                    <div className="rounded bg-accent/30 p-2">
                      <div className="font-medium">스텝 행 수</div>
                      <div className="text-muted-foreground">
                        {processedData.data.summary.files.step?.rowCount || 0}행
                      </div>
                    </div>
                    <div className="rounded bg-accent/30 p-2">
                      <div className="font-medium">총 행 수</div>
                      <div className="text-muted-foreground">
                        {processedData.data.summary.overall?.totalRows || 0}행
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top right: 메타데이터 수정 (6/10 width) */}
      <Card className="col-span-6 bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">메타데이터 수정</CardTitle>
          <CardDescription className="text-muted-foreground">
            {processedData ? "프로젝트 메타데이터를 수정합니다" : "파일을 먼저 열어주세요"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!processedData ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>파일을 먼저 열어주세요</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="time" className="text-foreground">
                    시간 (time)
                  </Label>
                  <Input
                    id="time"
                    value={metadata.time}
                    onChange={(e) => handleMetadataChange("time", e.target.value)}
                    className="bg-background"
                    placeholder="1759230044"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testername" className="text-foreground">
                    테스터명 (testername)
                  </Label>
                  <Input
                    id="testername"
                    value={metadata.testername}
                    onChange={(e) => handleMetadataChange("testername", e.target.value)}
                    className="bg-background"
                    placeholder="2509302000_data(0+000.00m)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line" className="text-foreground">
                    라인 (line)
                  </Label>
                  <Input
                    id="line"
                    value={metadata.line}
                    onChange={(e) => handleMetadataChange("line", e.target.value)}
                    className="bg-background"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recording_type" className="text-foreground">
                    기록 유형 (recording_type)
                  </Label>
                  <Input
                    id="recording_type"
                    value={metadata.recording_type}
                    onChange={(e) => handleMetadataChange("recording_type", e.target.value)}
                    className="bg-background"
                    placeholder="meter"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recording_interval" className="text-foreground">
                    기록 간격 (recording_interval)
                  </Label>
                  <Input
                    id="recording_interval"
                    value={metadata.recording_interval}
                    onChange={(e) => handleMetadataChange("recording_interval", e.target.value)}
                    className="bg-background"
                    placeholder="0.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wheel_diameter" className="text-foreground">
                    휠 직경 (wheel_diameter)
                  </Label>
                  <Input
                    id="wheel_diameter"
                    value={metadata.wheel_diameter}
                    onChange={(e) => handleMetadataChange("wheel_diameter", e.target.value)}
                    className="bg-background"
                    placeholder="150"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enc_ppr" className="text-foreground">
                    인코더 PPR (enc_ppr)
                  </Label>
                  <Input
                    id="enc_ppr"
                    value={metadata.enc_ppr}
                    onChange={(e) => handleMetadataChange("enc_ppr", e.target.value)}
                    className="bg-background"
                    placeholder="1250"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device_type" className="text-foreground">
                    장치 유형 (device_type)
                  </Label>
                  <Input
                    id="device_type"
                    value={metadata.device_type}
                    onChange={(e) => handleMetadataChange("device_type", e.target.value)}
                    className="bg-background"
                    placeholder="measurer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level_sensor" className="text-foreground">
                    레벨 센서 (level_sensor)
                  </Label>
                  <Input
                    id="level_sensor"
                    value={metadata.level_sensor}
                    onChange={(e) => handleMetadataChange("level_sensor", e.target.value)}
                    className="bg-background"
                    placeholder="LAT52-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="encoder_sensor" className="text-foreground">
                    인코더 센서 (encoder_sensor)
                  </Label>
                  <Input
                    id="encoder_sensor"
                    value={metadata.encoder_sensor}
                    onChange={(e) => handleMetadataChange("encoder_sensor", e.target.value)}
                    className="bg-background"
                    placeholder="WPI-M-1250-L"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleMetadataSave}>
                  <Save className="mr-2 h-4 w-4" />
                  저장
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bottom: 최근 파일 (full width) */}
      <Card className="col-span-10 bg-card border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Clock className="h-5 w-5 text-primary" />
              최근 파일
            </CardTitle>
            {recentFiles.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={validateAndCleanRecentFiles}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 bg-transparent"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  검증
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearHistory}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 bg-transparent"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  기록 제거
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {recentFiles.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">최근 파일 기록이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {recentFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-border bg-accent/30 p-4 transition-colors hover:bg-accent/50"
                >
                  <div>
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{file.path}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{file.date}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRecentFileOpen(file.name, file.path)}
                      disabled={isProcessing}
                      className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      {isProcessing ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : null}
                      열기
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveFromRecentFiles(file.path)}
                      disabled={isProcessing}
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
