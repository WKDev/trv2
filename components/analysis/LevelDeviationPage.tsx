'use client';

import { AnalysisModule } from './analysis-module';

export function LevelDeviationPage() {
  return (
    <div className="space-y-6">
      <AnalysisModule 
        title="수준이상" 
        moduleId="level-deviation"
        hasRefLevel={true}
      />
    </div>
  );
}
