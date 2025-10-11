'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { RotateCcw } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useElectronStorage } from '@/hooks/use-electron-storage';
import { useData } from '@/contexts/data-context';

interface AnalysisSettingsProps {
  moduleId: string;
  title: string;
  hasLeftRight?: boolean; // L/R 구분이 필요한지 여부
}

// 측정 항목별 설정값 정의
const measurementConfig = {
  'level-deviation': {
    prefix: '±',
    suffix: 'mm',
    defaultRefLevel: 4,
    defaultYMin: -10,
    defaultYMax: 10,
  },
  'planarity': {
    prefix: '<',
    suffix: 'mm/3m',
    defaultRefLevel: 3,
    defaultYMin: -8,
    defaultYMax: 8,
  },
  'cross-level': {
    prefix: '±',
    suffix: 'mm/3m',
    defaultRefLevel: 3,
    defaultYMin: -8,
    defaultYMax: 8,
  },
  'longitudinal-level-irregularity': {
    prefix: 'σ≤',
    suffix: 'mm/3m',
    defaultRefLevel: 1.2,
    defaultYMin: -5,
    defaultYMax: 5,
  },
  'guiderail-clearance': {
    prefix: '<',
    suffix: 'mm',
    defaultRefLevel: 10,
    defaultYMin: 0,
    defaultYMax: 20,
  },

  'straightness': {
    prefix: '<',
    suffix: 'mm/3m',
    defaultRefLevel: 3,
    defaultYMin: -8,
    defaultYMax: 8,
  },
  'step': {
    prefix: '<',
    suffix: 'mm',
    defaultRefLevel: 9,
    defaultYMin: -15,
    defaultYMax: 15,
  },
};

export function AnalysisSettings({ moduleId, title, hasLeftRight = false }: AnalysisSettingsProps) {
  const config = measurementConfig[moduleId as keyof typeof measurementConfig] || measurementConfig['level-deviation'];
  
  // Reference Level 설정
  const [refLevel, setRefLevel] = useLocalStorage({
    key: `analysis-${moduleId}-refLevel`,
    defaultValue: config.defaultRefLevel,
  });

  // Reference Level 변경 시 즉시 반영
  const handleRefLevelChange = (value: number) => {
    setRefLevel(value);
    // localStorage 변경 이벤트 발생시켜 AnalysisLayout에서 감지하도록 함
    window.dispatchEvent(new Event('storage'));
  };

  // Y축 범위 설정
  const [yAxisEnabled, setYAxisEnabled] = useLocalStorage({
    key: `analysis-${moduleId}-yAxisEnabled`,
    defaultValue: false,
  });

  const [yAxisMin, setYAxisMin] = useLocalStorage({
    key: `analysis-${moduleId}-yAxisMin`,
    defaultValue: config.defaultYMin,
  });

  const [yAxisMax, setYAxisMax] = useLocalStorage({
    key: `analysis-${moduleId}-yAxisMax`,
    defaultValue: config.defaultYMax,
  });

  const [yAxisTickStep, setYAxisTickStep] = useLocalStorage({
    key: `analysis-${moduleId}-yAxisTickStep`,
    defaultValue: 1,
  });

  // Y축 범위 설정 변경 시 즉시 반영
  const handleYAxisEnabledChange = (enabled: boolean) => {
    setYAxisEnabled(enabled);
    // localStorage 업데이트 후 커스텀 이벤트 발생
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('yAxisSettingsChanged', { 
        detail: { moduleId, enabled, min: yAxisMin, max: yAxisMax, tickStep: yAxisTickStep }
      }));
    }, 0);
  };

  const handleYAxisMinChange = (value: number) => {
    setYAxisMin(value);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('yAxisSettingsChanged', { 
        detail: { moduleId, enabled: yAxisEnabled, min: value, max: yAxisMax, tickStep: yAxisTickStep }
      }));
    }, 0);
  };

  const handleYAxisMaxChange = (value: number) => {
    setYAxisMax(value);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('yAxisSettingsChanged', { 
        detail: { moduleId, enabled: yAxisEnabled, min: yAxisMin, max: value, tickStep: yAxisTickStep }
      }));
    }, 0);
  };

  const handleYAxisTickStepChange = (value: number) => {
    setYAxisTickStep(value);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('yAxisSettingsChanged', { 
        detail: { moduleId, enabled: yAxisEnabled, min: yAxisMin, max: yAxisMax, tickStep: value }
      }));
    }, 0);
  };

  // Scale & Offset 설정
  const [scaleL, setScaleL] = useElectronStorage({
    key: `analysis-${moduleId}-scaleL`,
    defaultValue: 1.0,
  });

  const [offsetL, setOffsetL] = useElectronStorage({
    key: `analysis-${moduleId}-offsetL`,
    defaultValue: 0.0,
  });

  const [scaleR, setScaleR] = useElectronStorage({
    key: `analysis-${moduleId}-scaleR`,
    defaultValue: 1.0,
  });

  const [offsetR, setOffsetR] = useElectronStorage({
    key: `analysis-${moduleId}-offsetR`,
    defaultValue: 0.0,
  });

  const { correctionData, updateCorrectionData, longitudinalLevelIrregularitySettings, updateLongitudinalLevelIrregularitySettings, straightnessSettings, updateStraightnessSettings } = useData();

  // correction data가 변경될 때 scale과 offset 값 업데이트
  useEffect(() => {
    if (correctionData?.analysis?.[moduleId]) {
      const correction = correctionData.analysis[moduleId] as any;
      if (hasLeftRight) {
        setScaleL(correction.scaleL || 1.0);
        setOffsetL(correction.offsetL || 0.0);
        setScaleR(correction.scaleR || 1.0);
        setOffsetR(correction.offsetR || 0.0);
      } else {
        setScaleL(correction.Scaler || 1.0);
        setOffsetL(correction.offset || 0.0);
      }
    }
  }, [correctionData, moduleId, hasLeftRight]);

  // 즉시 context 업데이트 함수
  const updateCorrectionDataImmediate = (field: string, value: number) => {
    console.log(`🔧 AnalysisSettings에서 보정값 변경: ${moduleId}.${field} = ${value}`);
    
    if (hasLeftRight) {
      updateCorrectionData('analysis', moduleId, field as any, value);
    } else {
      const correctionField = field.includes('scale') ? 'Scaler' : 'offset';
      updateCorrectionData('analysis', moduleId, correctionField, value);
    }
  };

  // 기본값으로 리셋
  const handleResetRefLevel = () => {
    handleRefLevelChange(config.defaultRefLevel);
  };

  const handleResetYAxis = () => {
    handleYAxisMinChange(config.defaultYMin);
    handleYAxisMaxChange(config.defaultYMax);
    handleYAxisTickStepChange(1);
  };

  const handleResetScaleOffset = () => {
    setScaleL(1.0);
    setOffsetL(0.0);
    if (hasLeftRight) {
      setScaleR(1.0);
      setOffsetR(0.0);
    }
  };

  const handleResetAggregationInterval = () => {
    updateLongitudinalLevelIrregularitySettings({ interval: 1.0 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title} 설정</h3>
      </div>

      {/* Reference Level */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Reference Level</CardTitle>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleResetRefLevel}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{config.prefix}</span>
            <Input
              type="number"
              step="0.1"
              value={refLevel}
              onChange={(e) => handleRefLevelChange(Number.parseFloat(e.target.value) || 0)}
              className="bg-background flex-1"
            />
            <span className="text-sm font-medium text-foreground">{config.suffix}</span>
          </div>
        </CardContent>
      </Card>

      {/* Y축 범위 설정 */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Y축 범위 설정</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleResetYAxis}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Switch
                checked={yAxisEnabled}
                onCheckedChange={handleYAxisEnabledChange}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          
          {yAxisEnabled && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="yAxisMin" className="text-xs text-muted-foreground">
                    Min
                  </Label>
                  <Input
                    id="yAxisMin"
                    type="number"
                    step="1"
                    value={yAxisMin}
                    onChange={(e) => handleYAxisMinChange(Number.parseFloat(e.target.value) || 0)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yAxisMax" className="text-xs text-muted-foreground">
                    Max
                  </Label>
                  <Input
                    id="yAxisMax"
                    type="number"
                    step="1"
                    value={yAxisMax}
                    onChange={(e) => handleYAxisMaxChange(Number.parseFloat(e.target.value) || 0)}
                    className="bg-background"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yAxisTickStep" className="text-xs text-muted-foreground">
                  Tick Step
                </Label>
                <Input
                  id="yAxisTickStep"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={yAxisTickStep}
                  onChange={(e) => handleYAxisTickStepChange(Number.parseFloat(e.target.value) || 1)}
                  className="bg-background"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 평탄성 집계구간 설정 (평탄성만) */}
      {moduleId === 'longitudinal-level-irregularity' && (
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">집계구간 설정</CardTitle>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleResetAggregationInterval}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="aggregationInterval" className="text-xs text-muted-foreground">
                집계구간 (m)
              </Label>
              <Input
                id="aggregationInterval"
                type="number"
                step="1"
                min="1"
                value={longitudinalLevelIrregularitySettings.interval}
                onChange={(e) => {
                  const value = Number.parseFloat(e.target.value) || 1.0;
                  updateLongitudinalLevelIrregularitySettings({ interval: value });
                }}
                className="bg-background"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 직진도 집계구간 설정 (직진도만) */}
      {moduleId === 'straightness' && (
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">집계구간 설정</CardTitle>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => updateStraightnessSettings({ interval: 1.0 })}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="aggregationInterval" className="text-xs text-muted-foreground">
                집계구간 (m)
              </Label>
              <Input
                id="aggregationInterval"
                type="number"
                step="1"
                min="1"
                value={straightnessSettings.interval}
                onChange={(e) => {
                  const value = Number.parseFloat(e.target.value) || 1.0;
                  updateStraightnessSettings({ interval: value });
                }}
                className="bg-background"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scale & Offset */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Scale & Offset</CardTitle>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleResetScaleOffset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasLeftRight ? (
            // L/R 구분이 필요한 경우
            <>
              <div className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground">Left</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="scaleL" className="text-xs text-muted-foreground">
                      Scale
                    </Label>
                    <Input
                      id="scaleL"
                      type="number"
                      step="0.1"
                      value={scaleL}
                      onChange={(e) => {
                        const value = Number.parseFloat(e.target.value) || 0;
                        setScaleL(value);
                        updateCorrectionDataImmediate('scaleL', value);
                      }}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="offsetL" className="text-xs text-muted-foreground">
                      Offset
                    </Label>
                    <Input
                      id="offsetL"
                      type="number"
                      step="0.1"
                      value={offsetL}
                      onChange={(e) => {
                        const value = Number.parseFloat(e.target.value) || 0;
                        setOffsetL(value);
                        updateCorrectionDataImmediate('offsetL', value);
                      }}
                      className="bg-background"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground">Right</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="scaleR" className="text-xs text-muted-foreground">
                      Scale
                    </Label>
                    <Input
                      id="scaleR"
                      type="number"
                      step="0.1"
                      value={scaleR}
                      onChange={(e) => {
                        const value = Number.parseFloat(e.target.value) || 0;
                        setScaleR(value);
                        updateCorrectionDataImmediate('scaleR', value);
                      }}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="offsetR" className="text-xs text-muted-foreground">
                      Offset
                    </Label>
                    <Input
                      id="offsetR"
                      type="number"
                      step="0.1"
                      value={offsetR}
                      onChange={(e) => {
                        const value = Number.parseFloat(e.target.value) || 0;
                        setOffsetR(value);
                        updateCorrectionDataImmediate('offsetR', value);
                      }}
                      className="bg-background"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            // L/R 구분이 필요하지 않은 경우
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="scale" className="text-xs text-muted-foreground">
                  Scale
                </Label>
                <Input
                  id="scale"
                  type="number"
                  step="0.1"
                  value={scaleL}
                  onChange={(e) => {
                    const value = Number.parseFloat(e.target.value) || 0;
                    setScaleL(value);
                    updateCorrectionDataImmediate('Scaler', value);
                  }}
                  className="bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="offset" className="text-xs text-muted-foreground">
                  Offset
                </Label>
                <Input
                  id="offset"
                  type="number"
                  step="0.1"
                  value={offsetL}
                  onChange={(e) => {
                    const value = Number.parseFloat(e.target.value) || 0;
                    setOffsetL(value);
                    updateCorrectionDataImmediate('offset', value);
                  }}
                  className="bg-background"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
