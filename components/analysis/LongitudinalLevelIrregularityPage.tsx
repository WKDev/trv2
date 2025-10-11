'use client';

import { ReadonlyDataTable } from '@/components/shared/ReadonlyDataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useData } from '@/contexts/data-context';
import { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';

export function LongitudinalLevelIrregularityPage() {
  const { longitudinalLevelIrregularityData, hasData, useStaOffset, applyStaOffsetToData } = useData();
  const [data, setData] = useState<any[]>([]);

  // 평탄성 데이터를 테이블용으로 변환
  useMemo(() => {
    if (!longitudinalLevelIrregularityData || longitudinalLevelIrregularityData.length === 0) {
      setData([]);
      return;
    }

    const tableData = longitudinalLevelIrregularityData.map((row: any, index: number) => ({
      id: index + 1,
      selected: true,
      Index: row.Index !== undefined && row.Index !== null ? row.Index : index + 1,
      Travelled: row.Travelled,
      Level1: row.Level1,
      Level2: row.Level2,
    }));

    setData(tableData);
  }, [longitudinalLevelIrregularityData]);

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
            <CardTitle className="text-foreground">평탄성 분석 결과</CardTitle>
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

  // 평탄성 계산 데이터가 없을 때
  if (!longitudinalLevelIrregularityData || longitudinalLevelIrregularityData.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">평탄성 분석 결과</CardTitle>
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
      {/* 평탄성 데이터 테이블 */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">평탄성 데이터 (구간별 표준편차)</CardTitle>
        </CardHeader>
        <CardContent>
          <ReadonlyDataTable
            data={(useStaOffset ? applyStaOffsetToData(data) : data).map((row: any, index: number) => ({
              id: index + 1,
              selected: row.selected,
              Index: row.Index !== undefined && row.Index !== null ? row.Index : index + 1,
              Travelled: row.Travelled,
              IRI_R: row.Level1,  // Level1 -> IRI_R
              IRI_L: row.Level2,  // Level2 -> IRI_L
            }))}
            columns={['Index', 'Travelled', 'IRI_R', 'IRI_L']}
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
              'IRI_R': 120,
              'IRI_L': 120,
            }}
            columnStyles={{
              'IRI_L': 'bg-sky-50',
              'IRI_R': 'bg-sky-50',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
