"use client"
import { useState } from "react"
import { FileOpenTab } from "@/components/file-open-tab"
import { PreprocessingTabs } from "@/components/preprocessing-tabs"
import { DataAnalysisTabs } from "@/components/data-analysis-tabs"
import { OutputTab } from "@/components/output-tab"

export function MainLayout() {
  const [activeTab, setActiveTab] = useState("open-file")

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
            AGTReportAnalyzer
          </h1>
        </div>
        <nav className="container mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("open-file")}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === "open-file" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              파일 열기
              {activeTab === "open-file" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
            <button
              onClick={() => setActiveTab("preprocessing")}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === "preprocessing" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              전처리
              {activeTab === "preprocessing" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
            <button
              onClick={() => setActiveTab("data-analysis")}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === "data-analysis" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              데이터 분석
              {activeTab === "data-analysis" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
            <button
              onClick={() => setActiveTab("output")}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === "output" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              출력
              {activeTab === "output" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          </div>
        </nav>
      </header>

      <main className="container mx-auto p-6">
        {activeTab === "open-file" && <FileOpenTab />}
        {activeTab === "preprocessing" && <PreprocessingTabs />}
        {activeTab === "data-analysis" && <DataAnalysisTabs />}
        {activeTab === "output" && <OutputTab />}
      </main>
    </div>
  )
}
