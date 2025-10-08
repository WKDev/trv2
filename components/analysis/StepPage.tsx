'use client';

import { AnalysisModule } from './analysis-module';

export function StepPage() {
  return (
    <div className="space-y-6">
      <AnalysisModule 
        title="이음새 단차" 
        moduleId="step"
        hasRefLevel={true}
      />
    </div>
  );
}
