'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, Check, AlertCircle } from 'lucide-react';
import { useData } from '@/contexts/data-context';
import { ReadonlyDataTable } from '@/components/shared/ReadonlyDataTable';
import { AnalysisChart } from './AnalysisChart';
import { useAnalysisWorker } from '@/hooks/use-analysis-worker';

interface PlanarityData {
  id: number;
  selected: boolean;
  Index: number;
  Travelled: number;
  Level1: number;
  Level2: number;
  FLH_ref: number;
  FLH: number;
  FRH_ref: number;
  FRH: number;
  RLH_ref: number;
  RLH: number;
  RRH_ref: number;
  RRH: number;
  PL: number;
}

export function PlanarityPage() {
  const { 
    planarityData, 
    aggregatedData, 
    hasData, 
    useStaOffset, 
    applyStaOffsetToData,
    planaritySettings,
    setPlanarityData,
    correctionData
  } = useData();
  
  const [data, setData] = useState<PlanarityData[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const { calculatePlanarity, isProcessing, progress, error } = useAnalysisWorker();

  // 평면성 계산 실행 (자동)
  const handleCalculatePlanarity = async () => {
    if (!hasData() || !aggregatedData || aggregatedData.length === 0) {
      return;
    }

    setIsCalculating(true);
    try {
      // 평면성 계산은 원본 데이터로 수행 (STA offset 적용하지 않음)
      
      // 분석용 Scale & Offset 설정
      const analysisCorrection = correctionData?.analysis?.['planarity'] ? {
        Scaler: correctionData.analysis['planarity'].Scaler || 1.0,
        offset: correctionData.analysis['planarity'].offset || 0.0
      } : undefined;

      const result = await calculatePlanarity(
        aggregatedData, // 원본 데이터 사용
        { 
          interval: planaritySettings.interval,
          aggregationMethod: planaritySettings.aggregationMethod,
          emaSpan: planaritySettings.emaSpan
        },
        analysisCorrection
      );

      if (result.success && result.data) {
        setPlanarityData(result.data);
        console.log('평면성 계산 완료:', result.data.length, '개 데이터');
      } else {
        console.error('평면성 계산 실패:', result.error);
      }
    } catch (error) {
      console.error('평면성 계산 중 오류:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  // 평면성 설정 변경 시 자동 재계산
  useEffect(() => {
    if (hasData() && aggregatedData && aggregatedData.length > 0) {
      handleCalculatePlanarity();
    }
  }, [planaritySettings, aggregatedData, useStaOffset, correctionData]);

  // 평면성 설정 변경 이벤트 리스너
  useEffect(() => {
    const handlePlanaritySettingsChange = (event: CustomEvent) => {
      console.log('🔧 평면성 설정 변경 감지:', event.detail.settings);
      if (hasData() && aggregatedData && aggregatedData.length > 0) {
        handleCalculatePlanarity();
      }
    };

    window.addEventListener('planaritySettingsChanged', handlePlanaritySettingsChange as EventListener);
    return () => window.removeEventListener('planaritySettingsChanged', handlePlanaritySettingsChange as EventListener);
  }, [hasData, aggregatedData]);

  // 컴포넌트 마운트 시 자동 계산
  useEffect(() => {
    if (hasData() && aggregatedData && aggregatedData.length > 0 && (!planarityData || planarityData.length === 0)) {
      handleCalculatePlanarity();
    }
  }, [hasData, aggregatedData]);

  // 평면성 데이터를 테이블 데이터로 변환 (STA offset 적용)
  useEffect(() => {
    if (planarityData && planarityData.length > 0) {
      // STA offset 적용
      const dataWithOffset = useStaOffset ? applyStaOffsetToData(planarityData) : planarityData;
      
      const tableData = dataWithOffset.map((row: any, index: number) => ({
        id: index + 1,
        selected: true,
        Index: row.Index !== undefined && row.Index !== null ? row.Index : index + 1,
        Travelled: row.Travelled,
        Level1: row.Level1 || 0,
        Level2: row.Level2 || 0,
        FLH_ref: row.FLH_ref || 0,
        FLH: row.FLH || 0,
        FRH_ref: row.FRH_ref || 0,
        FRH: row.FRH || 0,
        RLH_ref: row.RLH_ref || 0,
        RLH: row.RLH || 0,
        RRH_ref: row.RRH_ref || 0,
        RRH: row.RRH || 0,
        PL: row.PL || 0,
      }));
      
      setData(tableData);
    } else {
      setData([]);
    }
  }, [planarityData, useStaOffset, applyStaOffsetToData]);

  const handleToggleSelect = (id: number) => {
    setData((prev) => prev.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row)));
  };

  // 차트용 데이터 변환
  const chartData = useMemo(() => {
    return data.map(row => ({
      Travelled: row.Travelled,
      y: row.PL // 평면성 값
    }));
  }, [data]);

  // 데이터가 없을 때 표시할 메시지
  if (!hasData()) {
    return (
      <div className="space-y-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">평면성 분석 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>데이터를 먼저 로드해주세요</p>
                <p className="text-sm mt-2">파일 열기 탭에서 ZIP 파일을 선택하세요</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 집계된 데이터가 없을 때
  if (!aggregatedData || aggregatedData.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">평면성 분석 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>전처리 단계를 먼저 완료해주세요</p>
                <p className="text-sm mt-2">전처리 → 집계 → Scale & Offset 탭에서 데이터를 처리하세요</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 계산 상태 표시 */}
      {(isCalculating || isProcessing) && (
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm text-muted-foreground">
                {isCalculating ? '평면성 계산 중...' : '처리 중...'}
              </span>
              {progress && (
                <span className="text-sm text-muted-foreground">
                  ({Math.round(progress.progress * 100)}%)
                </span>
              )}
            </div>
            {error && (
              <div className="text-sm text-red-500 mt-2">
                오류: {error}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 데이터 테이블 */}
      {data.length > 0 && (
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">평면성 데이터</CardTitle>
            <div className="text-sm text-muted-foreground mt-2">
              <p>• <strong>FLH, FRH, RLH, RRH</strong>: 4점 평면 계산에 사용되는 좌표값</p>
              <p>• <strong>_ref</strong>: 해당 지점의 x,y 좌표 입력 시 나오는 기준값</p>
              <p>• <strong>RLH, RRH</strong>: 직전 구간의 FLH, FRH 값 (4점 평면 계산용)</p>
            </div>
          </CardHeader>
          <CardContent>
            <ReadonlyDataTable
              data={data.map((row: any, index: number) => ({
                id: index + 1,
                selected: row.selected,
                Index: row.Index !== undefined && row.Index !== null ? row.Index : index + 1,
                Travelled: row.Travelled,
                Level1: row.Level1,
                Level2: row.Level2,
                FLH_ref: row.FLH_ref,
                FLH: row.FLH,
                FRH_ref: row.FRH_ref,
                FRH: row.FRH,
                RLH_ref: row.RLH_ref,
                RLH: row.RLH,
                RRH_ref: row.RRH_ref,
                RRH: row.RRH,
                PL: row.PL,
              }))}
              columns={['Index', 'Travelled', 'Level1', 'Level2', 'FLH_ref', 'FLH', 'FRH_ref', 'FRH', 'RLH_ref', 'RLH', 'RRH_ref', 'RRH', 'PL']}
              showCheckboxes={true}
              onRowSelection={handleToggleSelect}
              onSelectAll={(checked: boolean) => {
                if (checked) {
                  setData(prev => prev.map(row => ({ ...row, selected: true })));
                } else {
                  setData(prev => prev.map(row => ({ ...row, selected: false })));
                }
              }}
              selectedRows={new Set(data.map((_, index) => index).filter(index => data[index].selected))}
              rowHeight={32}
              visibleRows={50}
              columnWidths={{
                'Index': 60,
                'Travelled': 80,
                'Level1': 70,
                'Level2': 70,
                'FLH_ref': 70,
                'FLH': 70,
                'FRH_ref': 70,
                'FRH': 70,
                'RLH_ref': 70,
                'RLH': 70,
                'RRH_ref': 70,
                'RRH': 70,
                'PL': 70,
              }}
              columnStyles={{
                'PL': 'bg-sky-50',
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
