'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { SaveButton } from './SaveButton';
import { useData } from '@/contexts/data-context';
import { useDebounce } from '@/lib/debounce';

export function ScaleOffsetSettings() {
  const { 
    correctionData,
    updateCorrectionData,
    getCorrectionValue,
    resetScaleOffsetSettingsToDefault
  } = useData();

  // 디바운싱된 보정값 변경 핸들러 (50ms 지연)
  const debouncedUpdateCorrectionData = useDebounce(updateCorrectionData, 50);

  const handleCorrectionChange = (key: string, field: 'Scaler' | 'offset', value: string) => {
    const numValue = parseFloat(value) || 0;
    console.log(`🔧 Scale & Offset 설정 변경 (디바운싱): ${key}.${field} = ${numValue}`);
    debouncedUpdateCorrectionData('preprocessing', key, field, numValue);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Scale & Offset 설정</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetScaleOffsetSettingsToDefault}
            className="text-xs"
          >
            기본값 복원
          </Button>
          <SaveButton />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        데이터의 스케일과 오프셋을 조정합니다.
      </p>
      
      <div className="space-y-4">
        {/* Level 센서 보정값 */}
        <div>
          <h5 className="text-sm font-medium mb-2">Level 센서</h5>
          <div className="grid grid-cols-1 gap-2">
            {['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6'].map((key) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{key}</Label>
                <div className="flex gap-1">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Scaler</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={getCorrectionValue('preprocessing', key, 'Scaler')}
                      onChange={(e) => handleCorrectionChange(key, 'Scaler', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Offset</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={getCorrectionValue('preprocessing', key, 'offset')}
                      onChange={(e) => handleCorrectionChange(key, 'offset', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Encoder 센서 보정값 */}
        <div>
          <h5 className="text-sm font-medium mb-2">Encoder 센서</h5>
          <div className="space-y-1">
            <Label className="text-xs">Encoder3</Label>
            <div className="flex gap-1">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Scaler</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={getCorrectionValue('preprocessing', 'Encoder3', 'Scaler')}
                  onChange={(e) => handleCorrectionChange('Encoder3', 'Scaler', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Offset</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={getCorrectionValue('preprocessing', 'Encoder3', 'offset')}
                  onChange={(e) => handleCorrectionChange('Encoder3', 'offset', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Angle 센서 보정값 */}
        <div>
          <h5 className="text-sm font-medium mb-2">Angle 센서</h5>
          <div className="grid grid-cols-1 gap-2">
            {['Ang1', 'Ang2', 'Ang3'].map((key) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{key}</Label>
                <div className="flex gap-1">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Scaler</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={getCorrectionValue('preprocessing', key, 'Scaler')}
                      onChange={(e) => handleCorrectionChange(key, 'Scaler', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Offset</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={getCorrectionValue('preprocessing', key, 'offset')}
                      onChange={(e) => handleCorrectionChange(key, 'offset', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
