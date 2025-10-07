'use client';

import { AnalysisModule } from './analysis-module';

export function AlignmentPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">정렬도 분석</h1>
      <AnalysisModule />
    </div>
  );
}
