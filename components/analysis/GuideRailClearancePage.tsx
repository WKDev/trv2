'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { useData } from '@/contexts/data-context';
import { ReadonlyDataTable } from '@/components/shared/ReadonlyDataTable';

interface GuideRailClearanceData {
  id: number;
  selected: boolean;
  Index: number;
  Travelled: number;
  Level3: number;
  Level4: number;
  Encoder3: number;
  GC: number;
}

export function GuideRailClearancePage() {
  const { guideRailClearanceData, hasData, useStaOffset, applyStaOffsetToData } = useData();
  const [data, setData] = useState<GuideRailClearanceData[]>([]);

  // 계산된 데이터를 상태에 반영
  useEffect(() => {
    setData(guideRailClearanceData);
  }, [guideRailClearanceData]);

  const handleToggleSelect = (id: number) => {
    setData((prev) => prev.map((row) => (row.id === id ? { ...row, selected: !row.selected } : row)));
  };

  // 데이터가 없을 때 표시할 메시지
  if (!hasData()) {
    return (
      <div className="space-y-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">안내레일 내측거리 분석 결과</CardTitle>
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

  // 안내레일 내측거리 계산 데이터가 없을 때
  if (!guideRailClearanceData || guideRailClearanceData.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">안내레일 내측거리 분석 결과</CardTitle>
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
          <CardTitle className="text-foreground">안내레일 내측거리 데이터</CardTitle>
        </CardHeader>
        <CardContent>
          <ReadonlyDataTable
            data={(useStaOffset ? applyStaOffsetToData(data) : data).map((row: any, index: number) => ({
              id: index + 1,
              selected: row.selected,
              Index: row.Index !== undefined && row.Index !== null ? row.Index : index + 1,
              Travelled: row.Travelled,
              Level3: row.Level3,
              Level4: row.Level4,
              Encoder3: row.Encoder3,
              GC: row.GC,
            }))}
            columns={['Index', 'Travelled', 'Level3', 'Level4', 'Encoder3', 'GC']}
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
              'Level3': 100,
              'Level4': 100,
              'Encoder3': 100,
              'GC': 100,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
