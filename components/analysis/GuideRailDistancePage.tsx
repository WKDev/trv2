'use client';

import { AnalysisModule } from './analysis-module';

export function GuideRailDistancePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">가이드레일 거리 분석</h1>
      <AnalysisModule />
    </div>
  );
}
