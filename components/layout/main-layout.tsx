"use client"
import { useState, ReactNode, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { DataProvider } from "@/contexts/data-context"

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState("open-file")

  // 현재 경로에 따라 activeTab 설정
  useEffect(() => {
    if (pathname.includes('/file')) {
      setActiveTab("open-file")
    } else if (pathname.includes('/preprocessing')) {
      setActiveTab("preprocessing")
    } else if (pathname.includes('/analysis')) {
      setActiveTab("data-analysis")
    } else if (pathname.includes('/output')) {
      setActiveTab("output")
    }
  }, [pathname])

  return (
    <DataProvider>
      <div className="min-h-screen bg-background">
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card shadow-sm">
          <div className="container mx-auto px-6 py-2">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                AGTReportAnalyzer
              </h1>
              <nav>
                <div className="flex gap-1">
                  <button
                    onClick={() => router.push('/file')}
                    className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                      activeTab === "open-file" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    파일 열기
                    {activeTab === "open-file" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                  </button>
                  <button
                    onClick={() => router.push('/preprocessing')}
                    className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                      activeTab === "preprocessing" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    전처리
                    {activeTab === "preprocessing" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                  </button>
                  <button
                    onClick={() => router.push('/analysis')}
                    className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                      activeTab === "data-analysis" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    데이터 분석
                    {activeTab === "data-analysis" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                  </button>
                  <button
                    onClick={() => router.push('/output')}
                    className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                      activeTab === "output" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    출력
                    {activeTab === "output" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                  </button>
                </div>
              </nav>
            </div>
          </div>
        </header>

        <main className="pt-16">
          {children}
        </main>
      </div>
    </DataProvider>
  )
}
