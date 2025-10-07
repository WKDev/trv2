'use client';

import { AnalysisModule } from './analysis-module';

export function HighLowPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">고저차 분석</h1>
      <AnalysisModule />
    </div>
  );
}
