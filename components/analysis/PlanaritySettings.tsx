'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SaveButton } from '../preprocessing/SaveButton';
import { useData } from '@/contexts/data-context';

interface PlanaritySettings {
  interval: number;
  aggregationMethod: 'median' | 'mean' | 'ema';
  emaSpan: number;
}

const defaultPlanaritySettings: PlanaritySettings = {
  interval: 3.0,
  aggregationMethod: 'median',
  emaSpan: 5
};

export function PlanaritySettings() {
  const { 
    planaritySettings = defaultPlanaritySettings,
    updatePlanaritySettings,
    correctedData
  } = useData();

  const [settings, setSettings] = useState<PlanaritySettings>(planaritySettings);

  const handleIntervalChange = useCallback((value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0.1) {
      const newSettings = { ...settings, interval: numValue };
      setSettings(newSettings);
      updatePlanaritySettings(newSettings);
      
      // 평면성 설정 변경 이벤트 발생
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('planaritySettingsChanged', { 
          detail: { settings: newSettings }
        }));
      }, 0);
    }
  }, [settings, updatePlanaritySettings]);

  const handleAggregationMethodChange = useCallback((value: 'median' | 'mean' | 'ema') => {
    const newSettings = { ...settings, aggregationMethod: value };
    setSettings(newSettings);
    updatePlanaritySettings(newSettings);
    
    // 평면성 설정 변경 이벤트 발생
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('planaritySettingsChanged', { 
        detail: { settings: newSettings }
      }));
    }, 0);
  }, [settings, updatePlanaritySettings]);

  const handleEmaSpanChange = useCallback((value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1) {
      const newSettings = { ...settings, emaSpan: numValue };
      setSettings(newSettings);
      updatePlanaritySettings(newSettings);
      
      // 평면성 설정 변경 이벤트 발생
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('planaritySettingsChanged', { 
          detail: { settings: newSettings }
        }));
      }, 0);
    }
  }, [settings, updatePlanaritySettings]);

  const resetToDefault = useCallback(() => {
    setSettings(defaultPlanaritySettings);
    updatePlanaritySettings(defaultPlanaritySettings);
  }, [updatePlanaritySettings]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">평면성 설정</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefault}
            className="text-xs"
          >
            기본값 복원
          </Button>
          <SaveButton />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        평면성 계산을 위한 집계 설정입니다. 차량 휠베이스(3m)를 기준으로 집계합니다.
      </p>
      
      <div className="space-y-4">
        {/* 집계 간격 설정 */}
        <div>
          <Label className="text-sm">집계 간격 (m)</Label>
          <Input
            type="number"
            min="0.1"
            step="0.1"
            value={settings.interval}
            onChange={(e) => handleIntervalChange(e.target.value)}
            className="mt-1"
            placeholder="예: 3.0"
          />
          <p className="text-xs text-muted-foreground mt-1">
            차량 휠베이스(3m)를 기준으로 한 집계구간 (0.1보다 커야 함)
          </p>
        </div>
        
        {/* 집계 방식 설정 */}
        <div>
          <Label className="text-sm mb-2 block">집계 방식</Label>
          <Tabs value={settings.aggregationMethod} onValueChange={(value) => handleAggregationMethodChange(value as 'median' | 'mean' | 'ema')} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="median">중간값</TabsTrigger>
              <TabsTrigger value="mean">평균값</TabsTrigger>
              <TabsTrigger value="ema">EMA</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* EMA span 설정 */}
        {settings.aggregationMethod === 'ema' && (
          <div>
            <Label className="text-sm">EMA span</Label>
            <Input
              type="number"
              min="1"
              value={settings.emaSpan}
              onChange={(e) => handleEmaSpanChange(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              EMA 계산을 위한 span 값 (1 이상)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
