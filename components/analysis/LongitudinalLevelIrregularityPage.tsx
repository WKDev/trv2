'use client';

import { AnalysisModule } from './analysis-module';

export function LongitudinalLevelIrregularityPage() {
  return (
    <div className="space-y-6">
      <AnalysisModule 
        title="평면도" 
        moduleId="longitudinal-level-irregularity"
        hasRefLevel={true}
        hasCycleParam={true}
      />
    </div>
  );
}
