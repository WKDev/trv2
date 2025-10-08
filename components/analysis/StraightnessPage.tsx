'use client';

import { AnalysisModule } from './analysis-module';

export function StraightnessPage() {
  return (
    <div className="space-y-6">
      <AnalysisModule 
        title="평활도" 
        moduleId="straightness"
        hasRefLevel={true}
        hasVehicleParams={true}
      />
    </div>
  );
}
