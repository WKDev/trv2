'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, Check, AlertCircle } from 'lucide-react';
import { useData } from '@/contexts/data-context';
import { ReadonlyDataTable } from '@/components/shared/ReadonlyDataTable';

interface LevelDeviationData {
  id: number;
  selected: boolean;
  Index: number;
  Travelled: number;
  Left: number;
  Right: number;
}

export function LevelDeviationPage() {
  const { correctedData, hasData } = useData();
  const [data, setData] = useState<LevelDeviationData[]>([]);

  // Scale & Offset 탭에서 처리된 데이터를 기반으로 수준 이상 계산
  const levelDeviationData = useMemo(() => {
    if (!correctedData || correctedData.length === 0) {
      return [];
    }

    return correctedData.map((row: any, index: number) => {
      const level2 = parseFloat(row.Level2) || 0;
      const level5 = parseFloat(row.Level5) || 0;
      const level6 = parseFloat(row.Level6) || 0;
      const level1 = parseFloat(row.Level1) || 0;

      return {
        id: index + 1,
        selected: true,
        Index: parseInt(row.Index) || index + 1,
        Travelled: parseFloat(row.Travelled) || 0,
        Left: level6 - level2,  // Level6 - Level2
        Right: level5 - level1, // Level5 - Level1
      };
    });
  }, [correctedData]);

  // 계산된 데이터를 상태에 반영
  useEffect(() => {
    setData(levelDeviationData);
  }, [levelDeviationData]);

  const handleToggleSelect = (id: number) => {
    setData((prev) => prev.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row)));
  };




  // 데이터가 없을 때 표시할 메시지
  if (!hasData()) {
    return (
      <div className="space-y-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">수준이상 분석 결과</CardTitle>
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

  // Scale & Offset 탭에서 처리된 데이터가 없을 때
  if (!correctedData || correctedData.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">수준이상 분석 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Scale & Offset 탭에서 데이터를 먼저 처리해주세요</p>
                <p className="text-sm mt-2">전처리 → Scale & Offset 탭에서 데이터를 보정하세요</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 데이터 테이블 */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">수준이상 데이터</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                초기화
              </Button>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Check className="mr-2 h-4 w-4" />
                수정사항 적용
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ReadonlyDataTable
            data={data.map((row: any, index: number) => ({
              id: index + 1,
              selected: row.selected,
              index: row.Index,
              Travelled: row.Travelled,
              Left: row.Left,
              Right: row.Right,
            }))}
            columns={['Index', 'Travelled', 'Left', 'Right']}
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
              'Left': 120,
              'Right': 120,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
