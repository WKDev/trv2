'use client';

import { AnalysisModule } from './analysis-module';

export function LevelAbnormalityPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">수평도 이상 분석</h1>
      <AnalysisModule />
    </div>
  );
}
