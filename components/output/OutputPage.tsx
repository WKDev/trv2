"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, FileText, BarChart3, FolderOpen } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useData } from "@/contexts/data-context"
import { useEffect } from "react"

const reportTypes = ["수준이상", "평면성이상", "고저", "평탄성", "안내레일 내측거리", "직진도", "연결부 단차"]

export function OutputPage() {
  const { toast } = useToast()
  const { sendAnalysisDataToMain } = useData()
  const [savePath, setSavePath] = useLocalStorage({
    key: "output-savePath",
    defaultValue: "바탕화면",
  })

  // 출력 탭 진입 시 분석 데이터를 메인 프로세스로 전송
  useEffect(() => {
    console.log('🔄 OutputPage 마운트 - 출력 탭 진입 감지');
    
    // 출력 탭에 진입할 때 데이터를 메인 프로세스로 전송
    sendAnalysisDataToMain().then((result) => {
      if (result.success) {
        console.log('✅ 출력 탭 진입 시 데이터 전송 완료');
      } else {
        console.error('❌ 출력 탭 진입 시 데이터 전송 실패:', result.message);
      }
    }).catch((error) => {
      console.error('❌ 출력 탭 진입 시 데이터 전송 중 오류:', error);
    });
  }, [sendAnalysisDataToMain]);

  const handleBrowse = () => {
    // In a real application, this would open a file dialog
    toast({
      title: "폴더 선택",
      description: "파일 저장 경로를 선택하세요.",
    })
  }

  const handleDownload = (type: string, reportType: string) => {
    // Simulate download
    setTimeout(() => {
      toast({
        title: "다운로드 완료",
        description: `${type} - ${reportType} 리포트가 저장되었습니다.`,
        duration: 3000,
      })
    }, 500)
  }

  const handleDownloadAll = (reportType: string) => {
    // Simulate download
    setTimeout(() => {
      toast({
        title: "다운로드 완료",
        description: `모든 ${reportType} 리포트가 저장되었습니다.`,
        duration: 3000,
      })
    }, 1000)
  }

  return (
    <div className="h-[calc(100vh-4rem)] p-6 overflow-y-auto">
      <div className="space-y-6">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">저장 경로 설정</CardTitle>
            <CardDescription className="text-muted-foreground">리포트를 저장할 경로를 선택하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="savePath" className="text-foreground">
                  저장 경로
                </Label>
                <Input
                  id="savePath"
                  value={savePath}
                  onChange={(e) => setSavePath(e.target.value)}
                  className="bg-background"
                  placeholder="파일 저장 경로"
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={handleBrowse}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  찾아보기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <FileText className="h-5 w-5" />
                Numeric Report
              </CardTitle>
              <CardDescription className="text-muted-foreground">수치 데이터 리포트 다운로드</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="default" onClick={() => handleDownloadAll("Numeric")}>
                <Download className="mr-2 h-4 w-4" />
                모두 다운로드
              </Button>
              <div className="space-y-2">
                {reportTypes.map((type, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-border bg-accent/50 p-3 transition-colors hover:bg-accent"
                  >
                    <span className="text-sm text-foreground">{type}</span>
                    <Button size="sm" variant="outline" onClick={() => handleDownload(type, "Numeric")}>
                      <Download className="mr-1 h-3 w-3" />
                      다운로드
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <BarChart3 className="h-5 w-5" />
                Graphic Report
              </CardTitle>
              <CardDescription className="text-muted-foreground">그래픽 리포트 다운로드</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="default" onClick={() => handleDownloadAll("Graphic")}>
                <Download className="mr-2 h-4 w-4" />
                모두 다운로드
              </Button>
              <div className="space-y-2">
                {reportTypes.map((type, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-border bg-accent/50 p-3 transition-colors hover:bg-accent"
                  >
                    <span className="text-sm text-foreground">{type}</span>
                    <Button size="sm" variant="outline" onClick={() => handleDownload(type, "Graphic")}>
                      <Download className="mr-1 h-3 w-3" />
                      다운로드
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
