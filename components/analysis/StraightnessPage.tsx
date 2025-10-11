'use client';

import { ReadonlyDataTable } from '@/components/shared/ReadonlyDataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/contexts/data-context';
import { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';

export function StraightnessPage() {
  const { straightnessData, hasData, useStaOffset, applyStaOffsetToData, isAnalysisProcessing, analysisProgress, analysisError } = useData();
  const [data, setData] = useState<any[]>([]);

  // 직진도 데이터를 테이블용으로 변환 (Level3=Right, Level4=Left)
  useMemo(() => {
    if (!straightnessData || straightnessData.length === 0) {
      setData([]);
      return;
    }

    const tableData = straightnessData.map((row: any, index: number) => ({
      id: index + 1,
      selected: true,
      Index: row.Index !== undefined && row.Index !== null ? row.Index : index + 1,
      Travelled: row.Travelled,
      Level3: row.Level3, // Right
      Level4: row.Level4, // Left
    }));

    setData(tableData);
  }, [straightnessData]);

  const handleToggleSelect = (rowIndex: number, checked: boolean) => {
    setData(prev => prev.map((row, index) => 
      index === rowIndex ? { ...row, selected: checked } : row
    ));
  };

  // 데이터가 없을 때 표시할 메시지
  if (!hasData()) {
    return (
      <div className="space-y-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">직진도 분석 결과</CardTitle>
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

  // 직진도 계산 데이터가 없을 때
  if (!straightnessData || straightnessData.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">직진도 분석 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>전처리 단계를 먼저 완료해주세요</p>
                <p className="text-sm mt-2">전처리 → 이상치 처리 → Scale & Offset 탭에서 데이터를 처리하세요</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 직진도 데이터 테이블 */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">직진도 데이터 (구간별 표준편차)</CardTitle>
          {/* 분석 진행 상태 표시 */}
          {(isAnalysisProcessing || analysisError) && (
            <div className="mt-2">
              {isAnalysisProcessing && (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>
                    {analysisProgress?.message || '직진도 분석 중...'}
                    {analysisProgress?.progress !== undefined && (
                      <span className="ml-2">
                        ({Math.round(analysisProgress.progress * 100)}%)
                      </span>
                    )}
                  </span>
                </div>
              )}
              {analysisError && (
                <div className="text-sm text-red-600">
                  <span className="inline-block w-4 h-4 mr-1">⚠️</span>
                  직진도 분석 오류: {analysisError}
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <ReadonlyDataTable
            data={(useStaOffset ? applyStaOffsetToData(data) : data).map((row: any, index: number) => ({
              id: index + 1,
              selected: row.selected,
              Index: row.Index !== undefined && row.Index !== null ? row.Index : index + 1,
              Travelled: row.Travelled,
              SOA_R: row.Level3,  // Level3 -> SOA_R
              SOA_L: row.Level4,  // Level4 -> SOA_L
            }))}
            columns={['Index', 'Travelled', 'SOA_R', 'SOA_L']}
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
            visibleRows={25}
            columnWidths={{
              'Index': 80,
              'Travelled': 120,
              'SOA_R': 120,
              'SOA_L': 120,
            }}
            columnStyles={{
              'SOA_L': 'bg-sky-50',
              'SOA_R': 'bg-sky-50',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}