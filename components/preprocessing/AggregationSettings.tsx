'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/contexts/data-context';

export function AggregationSettings() {
  const { 
    aggregatedSelectedRows, 
    resetAggregationSettingsToDefault,
    aggregationSettings,
    updateAggregationSettings
  } = useData();

  const handleAggregationIntervalChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0.1) {
      updateAggregationSettings({ interval: numValue });
    }
  };

  const handleAggregationMethodChange = (value: 'median' | 'mean' | 'ema') => {
    updateAggregationSettings({ method: value });
  };

  const handleEmaSpanChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1) {
      updateAggregationSettings({ emaSpan: numValue });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">집계 설정</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={resetAggregationSettingsToDefault}
          className="text-xs"
        >
          기본값 복원
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        데이터를 집계하여 요약 통계를 생성합니다.
      </p>
      
      <div className="space-y-4">
        {/* 데이터 집계 설정 */}
        <div>
          <h4 className="font-medium mb-3">데이터 집계</h4>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">집계 간격 (m)</Label>
              <Input
                type="number"
                min="0.1"
                step="0.1"
                value={aggregationSettings.interval}
                onChange={(e) => handleAggregationIntervalChange(e.target.value)}
                className="mt-1"
                placeholder="예: 1.0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Travelled 열 기준으로 m단위 집계구간 (0.1보다 커야 함)
              </p>
            </div>
            
            <div>
              <Label className="text-sm mb-2 block">집계 방식</Label>
              <Tabs value={aggregationSettings.method} onValueChange={(value) => handleAggregationMethodChange(value as 'median' | 'mean' | 'ema')} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="median">중간값</TabsTrigger>
                  <TabsTrigger value="mean">평균값</TabsTrigger>
                  <TabsTrigger value="ema">EMA</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {aggregationSettings.method === 'ema' && (
              <div>
                <Label className="text-sm">EMA span</Label>
                <Input
                  type="number"
                  min="1"
                  value={aggregationSettings.emaSpan}
                  onChange={(e) => handleEmaSpanChange(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </div>
        
        {/* 선택된 데이터 */}
        <div>
          <h4 className="font-medium mb-3">선택된 데이터</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">선택된 항목</span>
              <span className="text-sm font-medium">{aggregatedSelectedRows.size}개</span>
            </div>
            <Button 
              className="w-full" 
              disabled={aggregatedSelectedRows.size === 0}
              onClick={() => console.log('연결부 단차로 이동')}
              size="sm"
            >
              연결부 단차로 이동
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
