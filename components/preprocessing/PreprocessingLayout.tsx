'use client';

import { ReactNode, useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter, usePathname } from 'next/navigation';
import { OutlierProcessingSettings } from './OutlierProcessingSettings';
import { ScaleOffsetSettings } from './ScaleOffsetSettings';
import { AggregationSettings } from './AggregationSettings';
import { SaveButton } from './SaveButton';
import { SharedChartSection } from '@/components/shared/shared-chart-section';
import { SensorType } from '@/components/shared/Chart';
import { useData } from '@/contexts/data-context';

interface PreprocessingLayoutProps {
  children: ReactNode;
}

export function PreprocessingLayout({ children }: PreprocessingLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // 공유 차트 상태 관리
  const [selectedSensorType, setSelectedSensorType] = useState<SensorType>('Level');
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6']));
  
  const { 
    selectedRows,
    outlierRemovedSelectedRows,
    correctedSelectedRows,
    aggregatedSelectedRows,
    setAggregationTabEntered
  } = useData();

  const getCurrentTab = () => {
    if (pathname.includes('/raw-analysis')) return 'raw-analysis';
    if (pathname.includes('/outlier-replacement')) return 'outlier-replacement';
    if (pathname.includes('/scale-offset')) return 'scale-offset';
    if (pathname.includes('/aggregation')) return 'aggregation';
    return 'raw-analysis';
  };

  const handleTabChange = (value: string) => {
    console.log('🔄 PreprocessingLayout 탭 변경:', {
      from: getCurrentTab(),
      to: value,
      timestamp: new Date().toISOString()
    });
    
    // 집계 탭 진입/이탈 감지
    if (value === 'aggregation') {
      console.log('✅ 집계 탭 진입 - setAggregationTabEntered(true)');
      setAggregationTabEntered(true);
    } else {
      console.log('❌ 집계 탭 이탈 - setAggregationTabEntered(false)');
      setAggregationTabEntered(false);
    }
    
    router.push(`/preprocessing/${value}`);
  };

  // 현재 탭에 따른 선택된 행들
  const currentSelectedRows = useMemo(() => {
    const currentTab = getCurrentTab();
    console.log(`🔄 탭 변경 감지: ${currentTab}`, {
      selectedRowsSize: selectedRows.size,
      outlierRemovedSelectedRowsSize: outlierRemovedSelectedRows.size,
      correctedSelectedRowsSize: correctedSelectedRows.size,
      aggregatedSelectedRowsSize: aggregatedSelectedRows.size
    });
    
    switch(currentTab) {
      case 'raw-analysis':
        return selectedRows;
      case 'outlier-replacement':
        return outlierRemovedSelectedRows;
      case 'scale-offset':
        return correctedSelectedRows;
      case 'aggregation':
        return aggregatedSelectedRows;
      default:
        return selectedRows;
    }
  }, [selectedRows, outlierRemovedSelectedRows, correctedSelectedRows, aggregatedSelectedRows, pathname]);

  // 센서 타입 변경 핸들러
  const handleSensorTypeChange = (sensorType: SensorType) => {
    setSelectedSensorType(sensorType);
    
    // 센서 타입에 따라 기본 컬럼 설정
    const defaultColumns = {
      Level: ['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6'],
      Encoder: ['Encoder3'],
      Angle: ['Ang1', 'Ang2', 'Ang3'],
    };
    
    setVisibleColumns(new Set(defaultColumns[sensorType]));
  };

  // 컬럼 토글 핸들러
  const handleColumnToggle = (column: string, checked: boolean) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(column);
      } else {
        newSet.delete(column);
      }
      return newSet;
    });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-6">
      <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="flex-1 flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-4 mb-4 flex-shrink-0">
          <TabsTrigger value="raw-analysis">RAW 데이터</TabsTrigger>
          <TabsTrigger value="outlier-replacement">이상치 처리</TabsTrigger>
          <TabsTrigger value="aggregation">집계</TabsTrigger>
          <TabsTrigger value="scale-offset">Scale & Offset</TabsTrigger>
        </TabsList>
        
        <div className="flex-1 flex min-h-0 h-full">
          <div className="flex-1 pr-4 min-w-0 overflow-y-auto h-full">
            {/* 공유 차트 섹션 - 모든 탭에서 동일한 인스턴스 사용 */}
            <div className="mb-6">
              <SharedChartSection
                currentTab={getCurrentTab()}
                selectedRows={currentSelectedRows}
                onSensorTypeChange={handleSensorTypeChange}
                onColumnToggle={handleColumnToggle}
                selectedSensorType={selectedSensorType}
                visibleColumns={visibleColumns}
              />
            </div>
            
            {/* 탭별 콘텐츠 */}
            <TabsContent value="raw-analysis" className="h-full m-0">
              {children}
            </TabsContent>
            <TabsContent value="outlier-replacement" className="h-full m-0">
              {children}
            </TabsContent>
            <TabsContent value="aggregation" className="h-full m-0">
              {children}
            </TabsContent>
            <TabsContent value="scale-offset" className="h-full m-0">
              {children}
            </TabsContent>
          </div>
          
          <div className="w-80 min-w-80 border-l pl-4 flex-shrink-0 overflow-y-auto h-full">
            <PreprocessingSidebar />
          </div>
        </div>
      </Tabs>
    </div>
  );
}

function PreprocessingSidebar() {
  const pathname = usePathname();

  if (pathname.includes('/raw-analysis')) {
    return <RawAnalysisSidebar />;
  }
  
  if (pathname.includes('/outlier-replacement')) {
    return <OutlierReplacementSidebar />;
  }
  
  if (pathname.includes('/aggregation')) {
    return <AggregationSidebar />;
  }
  
  if (pathname.includes('/scale-offset')) {
    return <ScaleOffsetSidebar />;
  }

  return null;
}

function RawAnalysisSidebar() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">RAW 데이터</h3>
        <SaveButton />
      </div>
      <p className="text-sm text-muted-foreground">
        원본 데이터를 확인하고 수정할 수 있습니다.
      </p>
    </div>
  );
}

function OutlierReplacementSidebar() {
  return <OutlierProcessingSettings />;
}

function ScaleOffsetSidebar() {
  return <ScaleOffsetSettings />;
}

function AggregationSidebar() {
  return <AggregationSettings />;
}
