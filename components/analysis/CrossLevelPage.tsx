'use client';

import { AnalysisModule } from './analysis-module';

export function CrossLevelPage() {
  return (
    <div className="space-y-6">
      <AnalysisModule 
        title="고저차" 
        moduleId="cross-level"
        hasRefLevel={true}
      />
    </div>
  );
}
