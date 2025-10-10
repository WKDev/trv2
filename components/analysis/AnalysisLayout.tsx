'use client';

import { ReactNode, useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter, usePathname } from 'next/navigation';
import { AnalysisChart, AnalysisChartOptions } from './AnalysisChart';
import { useData } from '@/contexts/data-context';
import { AnalysisSettings } from './AnalysisSettings';
import { useLocalStorage } from '@/hooks/use-local-storage';

interface AnalysisLayoutProps {
  children: ReactNode;
}

export function AnalysisLayout({ children }: AnalysisLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // 차트 옵션 상태 관리 (y축 범위 설정에 따라 동적으로 업데이트)
  const [chartOptions, setChartOptions] = useState<AnalysisChartOptions>({ yAxisMode: 'auto' });

  // localStorage 변경 감지를 위한 상태
  const [settingsVersion, setSettingsVersion] = useState(0);
  
  // localStorage 변경 감지
  useEffect(() => {
    const handleStorageChange = () => {
      setSettingsVersion(prev => prev + 1);
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // 주기적으로 localStorage 변경 확인 (같은 탭 내에서의 변경 감지)
    const interval = setInterval(() => {
      const currentTab = getCurrentTab();
      const currentRefLevel = localStorage.getItem(`analysis-${currentTab}-refLevel`);
      const currentYAxisEnabled = localStorage.getItem(`analysis-${currentTab}-yAxisEnabled`);
      const currentYAxisMin = localStorage.getItem(`analysis-${currentTab}-yAxisMin`);
      const currentYAxisMax = localStorage.getItem(`analysis-${currentTab}-yAxisMax`);
      const currentYAxisTickStep = localStorage.getItem(`analysis-${currentTab}-yAxisTickStep`);
      
      // 이전 값과 비교하여 변경되었으면 상태 업데이트
      const currentSettings = JSON.stringify({
        refLevel: currentRefLevel,
        yAxisEnabled: currentYAxisEnabled,
        yAxisMin: currentYAxisMin,
        yAxisMax: currentYAxisMax,
        yAxisTickStep: currentYAxisTickStep
      });
      
      if (currentSettings !== localStorage.getItem('_lastAnalysisSettings')) {
        localStorage.setItem('_lastAnalysisSettings', currentSettings);
        setSettingsVersion(prev => prev + 1);
      }
    }, 100); // 100ms마다 확인
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [pathname]);
  
  const { 
    selectedRows,
    aggregatedSelectedRows,
    correctedData
  } = useData();

  const getCurrentTab = () => {
    if (pathname.includes('/level-deviation')) return 'level-deviation';
    if (pathname.includes('/cross-level')) return 'cross-level';
    if (pathname.includes('/longitudinal-level-irregularity')) return 'longitudinal-level-irregularity';
    if (pathname.includes('/guiderail-clearance')) return 'guiderail-clearance';
    if (pathname.includes('/alignment')) return 'alignment';
    if (pathname.includes('/straightness')) return 'straightness';
    if (pathname.includes('/step')) return 'step';
    return 'level-deviation';
  };

  const handleTabChange = (value: string) => {
    console.log('🔄 AnalysisLayout 탭 변경:', {
      from: getCurrentTab(),
      to: value,
      timestamp: new Date().toISOString()
    });
    
    router.push(`/analysis/${value}`);
  };

  // 현재 탭에 따른 선택된 행들 (분석에서는 집계된 데이터 사용)
  const currentSelectedRows = useMemo(() => {
    const currentTab = getCurrentTab();
    console.log(`🔄 분석 탭 변경 감지: ${currentTab}`, {
      selectedRowsSize: selectedRows.size,
      aggregatedSelectedRowsSize: aggregatedSelectedRows.size
    });
    
    // 분석에서는 집계된 데이터를 사용
    return aggregatedSelectedRows;
  }, [selectedRows, aggregatedSelectedRows, pathname]);

  // 분석용 차트 데이터 변환
  const analysisChartData = useMemo(() => {
    const currentTab = getCurrentTab();
    
    // 수준 이상 탭의 경우 실제 데이터 계산
    if (currentTab === 'level-deviation' && correctedData && correctedData.length > 0) {
      return correctedData.map((row: any) => {
        const level2 = parseFloat(row.Level2) || 0;
        const level5 = parseFloat(row.Level5) || 0;
        const level6 = parseFloat(row.Level6) || 0;
        const level1 = parseFloat(row.Level1) || 0;

        return {
          Travelled: parseFloat(row.Travelled) || 0,
          Left: level6 - level2,  // Level6 - Level2
          Right: level5 - level1, // Level5 - Level1
        };
      });
    }
    
    // 다른 탭들은 샘플 데이터 사용
    return [
      { Travelled: 0, Left: 2.1, Right: -1.8 },
      { Travelled: 1, Left: 1.5, Right: -2.2 },
      { Travelled: 2, Left: 3.2, Right: -0.9 },
      { Travelled: 3, Left: 0.8, Right: -3.1 },
      { Travelled: 4, Left: 2.7, Right: -1.5 },
    ];
  }, [pathname, correctedData]);

  // 현재 탭의 refLevel 가져오기 (AnalysisSettings에서 설정된 값 사용)
  const currentRefLevel = useMemo(() => {
    const currentTab = getCurrentTab();
    // AnalysisSettings에서 설정된 reference level 값을 가져오기 위해 localStorage 사용
    const storedRefLevel = localStorage.getItem(`analysis-${currentTab}-refLevel`);
    if (storedRefLevel) {
      return parseFloat(storedRefLevel);
    }
    
    // 기본값들
    const defaultRefLevels = {
      'level-deviation': 4,
      'cross-level': 3,
      'longitudinal-level-irregularity': 1.2,
      'guiderail-clearance': 10,
      'alignment': 3,
      'straightness': 3,
      'step': 9,
    };
    return defaultRefLevels[currentTab as keyof typeof defaultRefLevels] || 0;
  }, [pathname, settingsVersion]);

  // 현재 탭의 y축 범위 설정 가져오기
  const currentYAxisSettings = useMemo(() => {
    const currentTab = getCurrentTab();
    const yAxisEnabled = localStorage.getItem(`analysis-${currentTab}-yAxisEnabled`) === 'true';
    const yAxisMin = parseFloat(localStorage.getItem(`analysis-${currentTab}-yAxisMin`) || '0');
    const yAxisMax = parseFloat(localStorage.getItem(`analysis-${currentTab}-yAxisMax`) || '0');
    const yAxisTickStep = parseFloat(localStorage.getItem(`analysis-${currentTab}-yAxisTickStep`) || '1');
    
    return {
      enabled: yAxisEnabled,
      min: yAxisMin,
      max: yAxisMax,
      tickStep: yAxisTickStep
    };
  }, [pathname, settingsVersion]);

  // y축 범위 설정이 변경될 때마다 차트 옵션 업데이트
  useEffect(() => {
    const newChartOptions: AnalysisChartOptions = {
      yAxisMode: currentYAxisSettings.enabled ? 'manual' : 'auto',
      yAxisMin: currentYAxisSettings.enabled ? currentYAxisSettings.min : undefined,
      yAxisMax: currentYAxisSettings.enabled ? currentYAxisSettings.max : undefined,
      yAxisTickStep: currentYAxisSettings.enabled ? currentYAxisSettings.tickStep : undefined,
    };
    setChartOptions(newChartOptions);
  }, [currentYAxisSettings]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-6">
      <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="flex-1 flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-7 mb-4 flex-shrink-0">
          <TabsTrigger value="level-deviation">수준 이상</TabsTrigger>
          <TabsTrigger value="cross-level">고저</TabsTrigger>
          <TabsTrigger value="longitudinal-level-irregularity">평탄성</TabsTrigger>
          <TabsTrigger value="guiderail-clearance">안내레일 내측거리</TabsTrigger>
          <TabsTrigger value="alignment">정렬</TabsTrigger>
          <TabsTrigger value="straightness">직진도</TabsTrigger>
          <TabsTrigger value="step">연결부 단차</TabsTrigger>
        </TabsList>
        
        <div className="flex-1 flex min-h-0 h-full">
          <div className="flex-1 pr-4 min-w-0 overflow-y-auto h-full">
            {/* 분석 차트 섹션 */}
            <div className="mb-6">
              <AnalysisChart
                title={`${getCurrentTab().replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Analysis Chart`}
                data={analysisChartData}
                refLevel={currentRefLevel}
                selectedRows={currentSelectedRows}
                chartOptions={chartOptions}
                onChartOptionsChange={setChartOptions}
              />
            </div>
            
            {/* 탭별 콘텐츠 */}
            <TabsContent value="level-deviation" className="h-full m-0">
              {children}
            </TabsContent>
            <TabsContent value="cross-level" className="h-full m-0">
              {children}
            </TabsContent>
            <TabsContent value="longitudinal-level-irregularity" className="h-full m-0">
              {children}
            </TabsContent>
            <TabsContent value="guiderail-clearance" className="h-full m-0">
              {children}
            </TabsContent>
            <TabsContent value="alignment" className="h-full m-0">
              {children}
            </TabsContent>
            <TabsContent value="straightness" className="h-full m-0">
              {children}
            </TabsContent>
            <TabsContent value="step" className="h-full m-0">
              {children}
            </TabsContent>
          </div>
          
          <div className="w-80 min-w-80 border-l pl-4 flex-shrink-0 overflow-y-auto h-full">
            <AnalysisSidebar />
          </div>
        </div>
      </Tabs>
    </div>
  );
}

function AnalysisSidebar() {
  const pathname = usePathname();

  if (pathname.includes('/level-deviation')) {
    return <LevelDeviationSidebar />;
  }
  
  if (pathname.includes('/cross-level')) {
    return <CrossLevelSidebar />;
  }
  
  if (pathname.includes('/longitudinal-level-irregularity')) {
    return <LongitudinalLevelIrregularitySidebar />;
  }
  
  if (pathname.includes('/guiderail-clearance')) {
    return <GuideRailClearanceSidebar />;
  }
  
  if (pathname.includes('/alignment')) {
    return <AlignmentSidebar />;
  }
  
  if (pathname.includes('/straightness')) {
    return <StraightnessSidebar />;
  }
  
  if (pathname.includes('/step')) {
    return <StepSidebar />;
  }

  return null;
}

function LevelDeviationSidebar() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">수준 이상 분석</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        레벨 센서 데이터의 이상치를 분석합니다.
      </p>
      <div className="space-y-2">
        <div className="text-sm font-medium">분석 항목</div>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• 레벨 센서 이상치 탐지</li>
          <li>• 임계값 기반 분석</li>
          <li>• 통계적 분석</li>
        </ul>
      </div>
      
      <AnalysisSettings 
        moduleId="level-deviation" 
        title="수준 이상" 
        hasLeftRight={false}
      />
    </div>
  );
}

function CrossLevelSidebar() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">고저 분석</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        고저 센서 데이터를 분석합니다.
      </p>
      <div className="space-y-2">
        <div className="text-sm font-medium">분석 항목</div>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• 고저 센서 데이터 분석</li>
          <li>• 편차 계산</li>
          <li>• 품질 평가</li>
        </ul>
      </div>
      
      <AnalysisSettings 
        moduleId="cross-level" 
        title="고저" 
        hasLeftRight={false}
      />
    </div>
  );
}

function LongitudinalLevelIrregularitySidebar() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">평탄성 분석</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        종방향 레벨 불규칙성을 분석합니다.
      </p>
      <div className="space-y-2">
        <div className="text-sm font-medium">분석 항목</div>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• 종방향 레벨 분석</li>
          <li>• 불규칙성 탐지</li>
          <li>• 표준 편차 계산</li>
        </ul>
      </div>
      
      <AnalysisSettings 
        moduleId="longitudinal-level-irregularity" 
        title="평탄성" 
        hasLeftRight={false}
      />
    </div>
  );
}

function GuideRailClearanceSidebar() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">안내레일 내측거리</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        안내레일과의 내측거리를 분석합니다.
      </p>
      <div className="space-y-2">
        <div className="text-sm font-medium">분석 항목</div>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• 내측거리 측정</li>
          <li>• 허용 오차 분석</li>
          <li>• 안전성 평가</li>
        </ul>
      </div>
      
      <AnalysisSettings 
        moduleId="guiderail-clearance" 
        title="안내레일 내측거리" 
        hasLeftRight={false}
      />
    </div>
  );
}

function AlignmentSidebar() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">정렬 분석</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        레일의 정렬 상태를 분석합니다.
      </p>
      <div className="space-y-2">
        <div className="text-sm font-medium">분석 항목</div>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• 정렬 편차 측정</li>
          <li>• 기준선 대비 분석</li>
          <li>• 보정 필요 구간 식별</li>
        </ul>
      </div>
      
      <AnalysisSettings 
        moduleId="alignment" 
        title="정렬" 
        hasLeftRight={true}
      />
    </div>
  );
}

function StraightnessSidebar() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">직진도 분석</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        레일의 직진도를 분석합니다.
      </p>
      <div className="space-y-2">
        <div className="text-sm font-medium">분석 항목</div>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• 직진도 편차 측정</li>
          <li>• 곡률 분석</li>
          <li>• 품질 기준 대비 평가</li>
        </ul>
      </div>
      
      <AnalysisSettings 
        moduleId="straightness" 
        title="직진도" 
        hasLeftRight={true}
      />
    </div>
  );
}

function StepSidebar() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">연결부 단차</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        레일 연결부의 단차를 분석합니다.
      </p>
      <div className="space-y-2">
        <div className="text-sm font-medium">분석 항목</div>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• 연결부 단차 측정</li>
          <li>• 허용 오차 분석</li>
          <li>• 안전성 평가</li>
        </ul>
      </div>
      
      <AnalysisSettings 
        moduleId="step" 
        title="연결부 단차" 
        hasLeftRight={false}
      />
    </div>
  );
}
