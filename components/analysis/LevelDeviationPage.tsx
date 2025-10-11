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
  const { levelDeviationData, aggregatedData, hasData, useStaOffset, applyStaOffsetToData } = useData();
  const [data, setData] = useState<any[]>([]);

  // 집계된 데이터와 수준이상 계산 데이터를 사용하여 테이블 데이터 생성
  useEffect(() => {
    if (hasData() && aggregatedData && aggregatedData.length > 0) {
      const dataWithOffset = useStaOffset ? applyStaOffsetToData(aggregatedData) : aggregatedData;
      
      const tableData = dataWithOffset.slice(0, 25).map((row: any, index: number) => {
        // levelDeviationData에서 해당하는 Left, Right 값 찾기
        let ldLeft = 0;
        let ldRight = 0;
        
        if (levelDeviationData && levelDeviationData.length > index) {
          ldLeft = levelDeviationData[index].Left || 0;
          ldRight = levelDeviationData[index].Right || 0;
        } else {
          // levelDeviationData가 없으면 직접 계산
          const level2 = parseFloat(row.Level2) || 0;
          const level5 = parseFloat(row.Level5) || 0;
          const level6 = parseFloat(row.Level6) || 0;
          const level1 = parseFloat(row.Level1) || 0;
          
          ldLeft = level6 - level2;  // Level6 - Level2
          ldRight = level5 - level1; // Level5 - Level1
        }
        
        return {
          id: index + 1,
          selected: true,
          Index: row.Index !== undefined && row.Index !== null ? row.Index : index + 1,
          Travelled: row.Travelled,
          Level1: row.Level1 || 0,
          Level2: row.Level2 || 0,
          Level5: row.Level5 || 0,
          Level6: row.Level6 || 0,
          LD_L: ldLeft,   // Level Deviation Left (기존 Left 값)
          LD_R: ldRight,  // Level Deviation Right (기존 Right 값)
        };
      });
      
      setData(tableData);
    } else {
      setData([]);
    }
  }, [hasData, aggregatedData, levelDeviationData, useStaOffset]);

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

  // 집계된 데이터가 없을 때
  if (!aggregatedData || aggregatedData.length === 0) {
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
      {/* 데이터 테이블 */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">수준이상 데이터</CardTitle>
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
              Level5: row.Level5,
              Level6: row.Level6,
              LD_L: row.LD_L,   // Level Deviation Left
              LD_R: row.LD_R,  // Level Deviation Right
            }))}
            columns={['Index', 'Travelled', 'Level1', 'Level2', 'Level5', 'Level6', 'LD_L', 'LD_R']}
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
              'Level1': 100,
              'Level2': 100,
              'Level5': 100,
              'Level6': 100,
              'LD_L': 100,
              'LD_R': 100,
            }}
            columnStyles={{
              'LD_L': 'bg-sky-50',
              'LD_R': 'bg-sky-50',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
