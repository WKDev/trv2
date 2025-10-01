"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface DescriptionModalProps {
  isOpen: boolean
  onClose: () => void
  moduleId: string
}

const moduleContent: Record<
  string,
  {
    title: string
    overview: string
    calculation: string[]
    notes: string
  }
> = {
  level: {
    title: "수준이상",
    overview: "여기에 수준이상 분석 항목에 대한 개요를 작성하세요.",
    calculation: ["1. 수준이상 계산 단계 1 설명", "2. 수준이상 계산 단계 2 설명", "3. 수준이상 계산 단계 3 설명"],
    notes: "여기에 수준이상 분석에 대한 추가 참고 사항을 작성하세요.",
  },
  flatness: {
    title: "평면성이상",
    overview: "여기에 평면성이상 분석 항목에 대한 개요를 작성하세요.",
    calculation: ["1. 평면성이상 계산 단계 1 설명", "2. 평면성이상 계산 단계 2 설명", "3. 평면성이상 계산 단계 3 설명"],
    notes: "여기에 평면성이상 분석에 대한 추가 참고 사항을 작성하세요.",
  },
  height: {
    title: "고저",
    overview: "여기에 고저 분석 항목에 대한 개요를 작성하세요.",
    calculation: ["1. 고저 계산 단계 1 설명", "2. 고저 계산 단계 2 설명", "3. 고저 계산 단계 3 설명"],
    notes: "여기에 고저 분석에 대한 추가 참고 사항을 작성하세요.",
  },
  smoothness: {
    title: "평탄성",
    overview: "여기에 평탄성 분석 항목에 대한 개요를 작성하세요.",
    calculation: ["1. 평탄성 계산 단계 1 설명", "2. 평탄성 계산 단계 2 설명", "3. 평탄성 계산 단계 3 설명"],
    notes: "여기에 평탄성 분석에 대한 추가 참고 사항을 작성하세요.",
  },
  "guide-rail": {
    title: "안내레일 내측거리",
    overview: "여기에 안내레일 내측거리 분석 항목에 대한 개요를 작성하세요.",
    calculation: [
      "1. 안내레일 내측거리 계산 단계 1 설명",
      "2. 안내레일 내측거리 계산 단계 2 설명",
      "3. 안내레일 내측거리 계산 단계 3 설명",
    ],
    notes: "여기에 안내레일 내측거리 분석에 대한 추가 참고 사항을 작성하세요.",
  },
  straightness: {
    title: "직진도",
    overview: "여기에 직진도 분석 항목에 대한 개요를 작성하세요.",
    calculation: ["1. 직진도 계산 단계 1 설명", "2. 직진도 계산 단계 2 설명", "3. 직진도 계산 단계 3 설명"],
    notes: "여기에 직진도 분석에 대한 추가 참고 사항을 작성하세요.",
  },
  connection: {
    title: "연결부단차",
    overview: "여기에 연결부단차 분석 항목에 대한 개요를 작성하세요.",
    calculation: ["1. 연결부단차 계산 단계 1 설명", "2. 연결부단차 계산 단계 2 설명", "3. 연결부단차 계산 단계 3 설명"],
    notes: "여기에 연결부단차 분석에 대한 추가 참고 사항을 작성하세요.",
  },
}

export function DescriptionModal({ isOpen, onClose, moduleId }: DescriptionModalProps) {
  const content = moduleContent[moduleId] || {
    title: "분석 항목",
    overview: "여기에 분석 항목에 대한 개요를 작성하세요.",
    calculation: ["1. 단계 1 설명", "2. 단계 2 설명", "3. 단계 3 설명"],
    notes: "여기에 추가 참고 사항을 작성하세요.",
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{content.title} - 설명 및 계산과정</DialogTitle>
          <DialogDescription>분석 항목에 대한 상세 설명과 계산 과정입니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-border bg-muted/50 p-6">
            <h3 className="font-semibold text-lg mb-3">개요</h3>
            <p className="text-muted-foreground">{content.overview}</p>
          </div>

          <div className="rounded-lg border border-border bg-muted/50 p-6">
            <h3 className="font-semibold text-lg mb-3">계산 과정</h3>
            <p className="text-muted-foreground mb-4">여기에 계산 과정을 작성하세요.</p>
            <div className="space-y-2">
              {content.calculation.map((step, index) => (
                <p key={index} className="text-sm text-muted-foreground">
                  {step}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/50 p-6">
            <h3 className="font-semibold text-lg mb-3">참고 사항</h3>
            <p className="text-muted-foreground">{content.notes}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
