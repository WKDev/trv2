'use client';

import { AnalysisModule } from './analysis-module';

export function JointStepPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">이음새 단차 분석</h1>
      <AnalysisModule />
    </div>
  );
}
