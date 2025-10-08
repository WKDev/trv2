'use client';

import { AnalysisModule } from './analysis-module';

export function GuideRailClearancePage() {
  return (
    <div className="space-y-6">
      <AnalysisModule 
        title="가이드레일 거리" 
        moduleId="guiderail-clearance"
        hasRefLevel={true}
      />
    </div>
  );
}
