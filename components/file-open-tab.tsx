"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FolderOpen, Clock, FileText, Trash2, Save, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface RecentFile {
  name: string
  path: string
  date: string
  timestamp: number
}

interface ProcessedData {
  success: boolean
  fileName: string
  filePath: string
  data: any
  qualityCheck: any
  message: string
}

export function FileOpenTab() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null)
  const { toast } = useToast()

  const [metadata, setMetadata] = useState({
    projectName: "철도 프로젝트 A",
    date: "2024-01-15",
    location: "서울-부산 구간",
    inspector: "홍길동",
    equipment: "측정기 Model-X",
  })

  // 컴포넌트 마운트 시 최근 파일 목록 로드
  useEffect(() => {
    loadRecentFiles()
  }, [])

  // 최근 파일 목록 로드
  const loadRecentFiles = async () => {
    if (typeof window !== 'undefined' && window.electronHelpers) {
      try {
        const result = await window.electronHelpers.getRecentFiles()
        if (result.success) {
          setRecentFiles(result.files)
        }
      } catch (error) {
        console.error('최근 파일 목록 로드 중 오류:', error)
      }
    }
  }

  // ZIP 파일 선택 및 처리
  const handleFileSelect = async () => {
    if (typeof window === 'undefined' || !window.electronHelpers) {
      toast({
        title: "오류",
        description: "Electron 환경에서만 ZIP 파일 처리가 가능합니다.",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    setProcessedData(null)

    try {
      const result = await window.electronHelpers.selectAndProcessZipFile()
      
      if (result.success) {
        setSelectedFile(result.fileName)
        setProcessedData(result)
        
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

  const handleRecentFileOpen = (fileName: string) => {
    setSelectedFile(fileName)
    toast({
      title: "파일 열기",
      description: `${fileName}을(를) 불러왔습니다.`,
    })
  }

  const handleClearHistory = async () => {
    if (typeof window !== 'undefined' && window.electronHelpers) {
      try {
        const result = await window.electronHelpers.clearRecentFiles()
        if (result.success) {
          setRecentFiles([])
          toast({
            title: "기록 제거됨",
            description: "최근 파일 기록이 모두 제거되었습니다.",
          })
        }
      } catch (error) {
        console.error('최근 파일 목록 초기화 중 오류:', error)
        toast({
          title: "오류",
          description: "최근 파일 목록 초기화 중 오류가 발생했습니다.",
          variant: "destructive"
        })
      }
    }
  }

  const handleMetadataChange = (field: string, value: string) => {
    setMetadata((prev) => ({ ...prev, [field]: value }))
  }

  const handleMetadataSave = () => {
    toast({
      title: "저장 완료",
      description: "메타데이터가 저장되었습니다.",
    })
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
                onChange={(e) => handleMetadataChange("projectName", e.target.value)}
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
                onChange={(e) => handleMetadataChange("date", e.target.value)}
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
                onChange={(e) => handleMetadataChange("location", e.target.value)}
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
                onChange={(e) => handleMetadataChange("inspector", e.target.value)}
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
                onChange={(e) => handleMetadataChange("equipment", e.target.value)}
                className="bg-background"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleMetadataSave}>
              <Save className="mr-2 h-4 w-4" />
              저장
            </Button>
          </div>
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearHistory}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 bg-transparent"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                기록 제거
              </Button>
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
                      onClick={() => handleRecentFileOpen(file.name)}
                      className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      열기
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
