'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { SaveButton } from './SaveButton';
import { useData } from '@/contexts/data-context';

export function OutlierProcessingSettings() {
  const { 
    outlierRemovalSettings,
    updateOutlierRemovalSettings,
    setCurrentApplyMode,
    setBulkSettings: setContextBulkSettings,
    resetOutlierSettingsToDefault,
    triggerOutlierReprocessing
  } = useData();

  // 적용 모드 상태
  const [applyMode, setApplyMode] = useState<'individual' | 'bulk'>('bulk');
  
  // 일괄 적용용 설정 상태 (편의용 UI)
  const [bulkSettings, setBulkSettings] = useState({
    useIQR: true,
    iqrMultiplier: 1.5,
    useZScore: true,
    zScoreThreshold: 3.0
  });

  // 이상치 제거 설정 변경 핸들러 (개별 적용 UI 폼 요소 상태만 업데이트)
  const handleColumnSettingChange = (column: string, field: 'useIQR' | 'iqrMultiplier' | 'useZScore' | 'zScoreThreshold', value: boolean | number) => {
    console.log(`🔧 [개별 적용 UI] ${column}.${field} = ${value}`)
    updateOutlierRemovalSettings(column, { [field]: value });
    // 개별 설정 변경 시에도 재처리 트리거
    if (applyMode === 'individual') {
      setTimeout(() => {
        triggerOutlierReprocessing();
      }, 100);
    }
  };

  // 일괄 적용 핸들러 (일괄 적용 UI 폼 요소 상태만 업데이트)
  const handleBulkApply = (field: 'useIQR' | 'iqrMultiplier' | 'useZScore' | 'zScoreThreshold', value: boolean | number) => {
    console.log(`🔧 [일괄 적용 UI] ${field} = ${value}`)
    const newBulkSettings = {
      ...bulkSettings,
      [field]: value
    };
    setBulkSettings(newBulkSettings);
    
    // 일괄 적용 모드일 때는 컨텍스트에도 전달하고 즉시 재처리 트리거
    if (applyMode === 'bulk') {
      setContextBulkSettings(newBulkSettings);
      // 설정 변경 시 즉시 재처리 트리거
      setTimeout(() => {
        triggerOutlierReprocessing();
      }, 100);
    }
  };

  // 탭 변경 핸들러
  const handleApplyModeChange = (newMode: 'individual' | 'bulk') => {
    setApplyMode(newMode);
    
    // 컨텍스트에 현재 모드와 일괄 설정 전달
    setCurrentApplyMode(newMode);
    setContextBulkSettings(bulkSettings);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">이상치 처리 설정</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetOutlierSettingsToDefault}
            className="text-xs"
          >
            기본값 복원
          </Button>
          <SaveButton />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        IQR과 Z-score 방법을 사용하여 이상치를 감지하고 처리합니다.
      </p>
      
      <div className="space-y-4">
        {/* 적용 모드 탭 */}
        <Tabs value={applyMode} onValueChange={(value) => handleApplyModeChange(value as 'individual' | 'bulk')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bulk">일괄 적용</TabsTrigger>
            <TabsTrigger value="individual">개별 적용</TabsTrigger>
          </TabsList>
          
          <TabsContent value="individual" className="mt-4">
            <div className="mb-3">
              <p className="text-xs text-muted-foreground">
                각 컬럼별로 개별 설정된 IQR과 Z-score를 적용합니다
              </p>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6', 'Encoder3', 'Ang1', 'Ang2', 'Ang3'].map((column) => {
                const settings = outlierRemovalSettings[column];
                if (!settings) return null;
                
                return (
                  <div key={column} className="space-y-2">
                    {/* 컬럼명과 IQR, Z-score 설정을 모두 한 줄에 배치 */}
                    <div className="flex items-center space-x-3">
                      <Label className="text-xs font-medium w-16">{column}</Label>
                      
                      {/* IQR 설정 */}
                      <div className="flex flex-col">
                        <Label htmlFor={`${column}-iqr-multiplier`} className="text-xs text-muted-foreground">
                          IQR Multiplier
                        </Label>
                        <div className="flex items-center space-x-1 justify-center">
                          <Checkbox
                            id={`${column}-use-iqr`}
                            checked={settings.useIQR}
                            onCheckedChange={(checked) => handleColumnSettingChange(column, 'useIQR', checked as boolean)}
                          />
                          <Input
                            id={`${column}-iqr-multiplier`}
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="5.0"
                            value={settings.useIQR ? settings.iqrMultiplier : ''}
                            onChange={(e) => handleColumnSettingChange(column, 'iqrMultiplier', parseFloat(e.target.value) || 1.5)}
                            className="h-6 text-xs w-16"
                            disabled={!settings.useIQR}
                          />
                        </div>
                      </div>

                      {/* Z-score 설정 */}
                      <div className="flex flex-col">
                        <Label htmlFor={`${column}-zscore-threshold`} className="text-xs text-muted-foreground">
                          z-score
                        </Label>
                        
                        <div className="flex items-center space-x-1 justify-center">
                          <Checkbox
                            id={`${column}-use-zscore`}
                            checked={settings.useZScore}
                            onCheckedChange={(checked) => handleColumnSettingChange(column, 'useZScore', checked as boolean)}
                          />
                          <Input
                            id={`${column}-zscore-threshold`}
                            type="number"
                            step="0.1"
                            min="1.0"
                            max="10.0"
                            value={settings.useZScore ? settings.zScoreThreshold : ''}
                            onChange={(e) => handleColumnSettingChange(column, 'zScoreThreshold', parseFloat(e.target.value) || 3.0)}
                            className="h-6 text-xs w-16"
                            disabled={!settings.useZScore}
                            placeholder="Z-score Threshold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="bulk" className="mt-4">
            <div className="w-full flex flex-col items-center justify-center">
              <div className="flex items-center space-x-2">
                {/* IQR 일괄 설정 */}
                <div className="mt-3 space-y-2">
                  <div className="flex flex-col">
                    <Label htmlFor="bulk-iqr-multiplier" className="text-xs text-muted-foreground mb-1">
                      IQR Multiplier
                    </Label>

                    <div className="flex items-center space-x-1 justify-center">
                      <Checkbox
                        id="bulk-use-iqr"
                        checked={bulkSettings.useIQR}
                        onCheckedChange={(checked) => handleBulkApply('useIQR', checked as boolean)}
                      />
                      
                      <Input
                        id="bulk-iqr-multiplier"
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="5.0"
                        value={bulkSettings.iqrMultiplier}
                        onChange={(e) => handleBulkApply('iqrMultiplier', parseFloat(e.target.value) || 1.5)}
                        className="h-6 text-xs w-20"
                      />
                    </div>
                  </div>
                </div>

                {/* Z-score 일괄 설정 */}
                <div className="mt-3 space-y-2">
                  <div className="flex flex-col">
                    <Label htmlFor="bulk-zscore-threshold" className="text-xs text-muted-foreground mb-1">
                      Z-score Threshold
                    </Label>
                    <div className="flex items-center space-x-1 justify-center">
                      <Checkbox
                        id="bulk-use-zscore"
                        checked={bulkSettings.useZScore}
                        onCheckedChange={(checked) => handleBulkApply('useZScore', checked as boolean)}
                      />
                      
                      <Input
                        id="bulk-zscore-threshold"
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="10.0"
                        value={bulkSettings.zScoreThreshold}
                        onChange={(e) => handleBulkApply('zScoreThreshold', parseFloat(e.target.value) || 3.0)}
                        className="h-6 text-xs w-20"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
