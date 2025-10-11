'use client';

import { ReactNode, useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter, usePathname } from 'next/navigation';
import { AnalysisChart, AnalysisChartOptions } from './AnalysisChart';
import { useData } from '@/contexts/data-context';
import { AnalysisSettings } from './AnalysisSettings';
import { PlanaritySettings } from './PlanaritySettings';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { CalculationDescriptionModal } from './CalculationDescriptionModal';
import { StraightnessPage } from './StraightnessPage';
import { StepPage } from './StepPage';

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
  
  // 분석 탭 진입 감지
  useEffect(() => {
    console.log('🔄 AnalysisLayout 마운트 - 분석 탭 진입 감지');
    setAnalysisTabEntered(true);
    
    return () => {
      console.log('🔄 AnalysisLayout 언마운트 - 분석 탭 이탈');
      setAnalysisTabEntered(false);
      
      // 분석 탭에서 나갈 때 데이터를 메인 프로세스로 전송
      sendAnalysisDataToMain().then((result) => {
        if (result.success) {
          console.log('✅ 분석 탭 이탈 시 데이터 전송 완료');
        } else {
          console.error('❌ 분석 탭 이탈 시 데이터 전송 실패:', result.message);
        }
      }).catch((error) => {
        console.error('❌ 분석 탭 이탈 시 데이터 전송 중 오류:', error);
      });
    };
  }, []);

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
    levelDeviationData,
    crossLevelData,
    longitudinalLevelIrregularityData,
    straightnessData,
    guideRailClearanceData,
    stepData,
    planarityData,
    useStaOffset,
    staOffset,
    applyStaOffsetToData,
    setAnalysisTabEntered,
    rawData,
    outlierRemovedData,
    aggregatedData,
    correctedData,
    isAggregating,
    aggregationProgress,
    aggregationError,
    sendAnalysisDataToMain
  } = useData();

  const getCurrentTab = () => {
    if (pathname.includes('/level-deviation')) return 'level-deviation';
    if (pathname.includes('/cross-level')) return 'cross-level';
    if (pathname.includes('/longitudinal-level-irregularity')) return 'longitudinal-level-irregularity';
    if (pathname.includes('/guiderail-clearance')) return 'guiderail-clearance';
    if (pathname.includes('/planarity')) return 'planarity';
    if (pathname.includes('/straightness')) return 'straightness';
    if (pathname.includes('/step')) return 'step';
    return 'level-deviation';
  };

  const getCurrentTabTitle = (tab: string) => {
    const titles: Record<string, string> = {
      'level-deviation': '수준 이상',
      'planarity': '평면성이상',
      'cross-level': '고저',
      'longitudinal-level-irregularity': '평탄성',
      'guiderail-clearance': '안내레일 내측거리',
      'straightness': '직진도',
      'step': '연결부 단차',
    };
    return titles[tab] || '분석';
  };

  const handleTabChange = (value: string) => {
    console.log('🔄 AnalysisLayout 탭 변경:', {
      from: getCurrentTab(),
      to: value,
      timestamp: new Date().toISOString()
    });
    
    // 분석 탭 진입 감지
    setAnalysisTabEntered(true);
    
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
    
    // 수준 이상 탭의 경우 levelDeviationData 사용
    if (currentTab === 'level-deviation' && levelDeviationData && levelDeviationData.length > 0) {
      const data = levelDeviationData.map((row: any) => ({
        Travelled: row.Travelled,
        Left: row.Left,
        Right: row.Right,
      }));
      
      // STA offset 적용
      return useStaOffset ? applyStaOffsetToData(data) : data;
    }
    
    // 고저차 탭의 경우 crossLevelData 사용
    if (currentTab === 'cross-level' && crossLevelData && crossLevelData.length > 0) {
      const data = crossLevelData.map((row: any) => ({
        Travelled: row.Travelled,
        Left: row.Left,
        Right: row.Right,
      }));
      
      // STA offset 적용
      return useStaOffset ? applyStaOffsetToData(data) : data;
    }
    
    // 평탄성 탭의 경우 longitudinalLevelIrregularityData 사용
    if (currentTab === 'longitudinal-level-irregularity' && longitudinalLevelIrregularityData && longitudinalLevelIrregularityData.length > 0) {
      const data = longitudinalLevelIrregularityData.map((row: any) => ({
        Travelled: row.Travelled,
        Left: row.Level2,  // Level2를 Left로 매핑 (Level2의 구간별 표준편차)
        Right: row.Level1, // Level1을 Right로 매핑 (Level1의 구간별 표준편차)
      }));
      
      // STA offset 적용
      return useStaOffset ? applyStaOffsetToData(data) : data;
    }
    
    // 직진도 탭의 경우 straightnessData 사용 (Level3=Right, Level4=Left)
    if (currentTab === 'straightness' && straightnessData && straightnessData.length > 0) {
      const data = straightnessData.map((row: any) => ({
        Travelled: row.Travelled,
        Left: row.Level4,  // Level4를 Left로 매핑 (Level4의 구간별 표준편차)
        Right: row.Level3, // Level3을 Right로 매핑 (Level3의 구간별 표준편차)
      }));
      
      // STA offset 적용
      return useStaOffset ? applyStaOffsetToData(data) : data;
    }
    
    // 안내레일 내측거리 탭의 경우 guideRailClearanceData 사용 (GC만 표시)
    if (currentTab === 'guiderail-clearance' && guideRailClearanceData && guideRailClearanceData.length > 0) {
      const data = guideRailClearanceData.map((row: any) => ({
        Travelled: row.Travelled,
        y: row.GC,        // GC 값을 y로 매핑하여 단일 라인으로 표시
      }));
      
      // STA offset 적용
      return useStaOffset ? applyStaOffsetToData(data) : data;
    }
    
    // 연결부 단차 탭의 경우 stepData 사용
    console.log('🔍 AnalysisLayout step 탭 데이터 확인:', {
      currentTab,
      stepDataLength: stepData?.length || 0,
      stepDataSample: stepData?.slice(0, 2)
    })
    
    // 평면성 탭의 경우 planarityData 사용
    if (currentTab === 'planarity' && planarityData && planarityData.length > 0) {
      const data = planarityData.map((row: any) => ({
        Travelled: row.Travelled,
        y: row.PL, // 평면성 값
      }));
      
      // STA offset 적용
      return useStaOffset ? applyStaOffsetToData(data) : data;
    }
    
    // step 탭은 StepPage에서 직접 데이터를 처리하므로 여기서는 처리하지 않음
    if (currentTab === 'step') {
      return []; // 빈 배열 반환하여 StepPage에서 처리하도록 함
    }
    
    // 다른 탭들은 샘플 데이터 사용
    const sampleData = [
      { Travelled: 0, Left: 2.1, Right: -1.8 },
      { Travelled: 1, Left: 1.5, Right: -2.2 },
      { Travelled: 2, Left: 3.2, Right: -0.9 },
      { Travelled: 3, Left: 0.8, Right: -3.1 },
      { Travelled: 4, Left: 2.7, Right: -1.5 },
    ];
    
    // STA offset 적용
    return useStaOffset ? applyStaOffsetToData(sampleData) : sampleData;
  }, [pathname, levelDeviationData, crossLevelData, longitudinalLevelIrregularityData, straightnessData, guideRailClearanceData, stepData, planarityData, settingsVersion, useStaOffset, staOffset]);

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
      'planarity': 3,
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

  // 전처리 상태 확인
  const preprocessingStatus = useMemo(() => {
    if (rawData.length === 0) return { status: 'no-data', message: '데이터가 없습니다' }
    if (outlierRemovedData.length === 0) return { status: 'processing', message: '이상치 처리 중...' }
    if (isAggregating) return { status: 'processing', message: `집계 처리 중... ${aggregationProgress ? `${aggregationProgress.progress}%` : ''}` }
    if (aggregatedData.length === 0) return { status: 'processing', message: '집계 처리 중...' }
    if (correctedData.length === 0) return { status: 'processing', message: 'Scale & Offset 처리 중...' }
    return { status: 'completed', message: '전처리 완료' }
  }, [rawData, outlierRemovedData, aggregatedData, correctedData, isAggregating, aggregationProgress]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-6">
      <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="flex-1 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <TabsList className="grid grid-cols-7">
              <TabsTrigger value="level-deviation">수준 이상</TabsTrigger>
              <TabsTrigger value="planarity">평면성 이상</TabsTrigger>
              <TabsTrigger value="cross-level">고저</TabsTrigger>
              <TabsTrigger value="longitudinal-level-irregularity">평탄성</TabsTrigger>
              <TabsTrigger value="guiderail-clearance">안내레일 내측거리</TabsTrigger>
              <TabsTrigger value="straightness">직진도</TabsTrigger>
              <TabsTrigger value="step">연결부 단차</TabsTrigger>
            </TabsList>
            
            {/* 전처리 상태 표시 */}
            {preprocessingStatus.status === 'processing' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-md">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-700">{preprocessingStatus.message}</span>
              </div>
            )}
          </div>
          
          <CalculationDescriptionModal 
            moduleId={getCurrentTab()} 
            title={getCurrentTabTitle(getCurrentTab())} 
          />
        </div>
        
        <div className="flex-1 flex min-h-0 h-full">
          <div className="flex-1 pr-4 min-w-0 overflow-y-auto h-full">
            {/* 전처리 상태에 따른 메시지 표시 */}
            {preprocessingStatus.status === 'no-data' && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg font-medium">데이터를 먼저 로드해주세요</p>
                  <p className="text-sm mt-2">파일 열기 탭에서 ZIP 파일을 선택하세요</p>
                </div>
              </div>
            )}
            
            {preprocessingStatus.status === 'processing' && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-lg font-medium">{preprocessingStatus.message}</p>
                  {isAggregating && aggregationProgress && (
                    <div className="mt-4 w-64">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span>집계 진행률</span>
                        <span>{aggregationProgress.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${aggregationProgress.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs mt-2">
                        처리된 구간: {aggregationProgress.processed} / {aggregationProgress.total}
                      </p>
                    </div>
                  )}
                  {aggregationError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">
                        집계 오류: {aggregationError}
                      </p>
                    </div>
                  )}
                  <p className="text-sm mt-2">잠시만 기다려주세요...</p>
                </div>
              </div>
            )}
            
            {/* 분석 차트 섹션 - 전처리가 완료된 경우에만 표시 (step 탭 제외) */}
            {preprocessingStatus.status === 'completed' && getCurrentTab() !== 'step' && (
              <div className="mb-6">
                <AnalysisChart
                  title={`${getCurrentTab().replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Analysis Chart`}
                  moduleId={getCurrentTab()}
                  data={analysisChartData}
                  refLevel={currentRefLevel}
                  selectedRows={currentSelectedRows}
                  chartOptions={chartOptions}
                  onChartOptionsChange={setChartOptions}
                />
              </div>
            )}
            
            {/* 탭별 콘텐츠 - 전처리가 완료된 경우에만 표시 */}
            {preprocessingStatus.status === 'completed' && (
              <>
                <TabsContent value="level-deviation" className="h-full m-0">
                  {children}
                </TabsContent>
                <TabsContent value="cross-level" className="h-full m-0">
                  {children}
                </TabsContent>
                <TabsContent value="planarity" className="h-full m-0">
                  {children}
                </TabsContent>
                <TabsContent value="longitudinal-level-irregularity" className="h-full m-0">
                  {children}
                </TabsContent>
                <TabsContent value="guiderail-clearance" className="h-full m-0">
                  {children}
                </TabsContent>
                
                <TabsContent value="straightness" className="h-full m-0">
                  <StraightnessPage />
                </TabsContent>
                <TabsContent value="step" className="h-full m-0">
                  <StepPage />
                </TabsContent>
              </>
            )}
          </div>
          
          <div className="w-80 min-w-80 border-l pl-4 flex-shrink-0 overflow-y-auto h-full">
            {preprocessingStatus.status === 'completed' && <AnalysisSidebar />}
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
  
  if (pathname.includes('/planarity')) {
    return <PlanaritySidebar />;
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
      <AnalysisSettings 
        moduleId="level-deviation" 
        title="수준 이상" 
        hasLeftRight={false}
      />
    </div>
  );
}

function PlanaritySidebar() {
  return (
    <div className="space-y-4">
      <PlanaritySettings />
      <AnalysisSettings 
        moduleId="planarity" 
        title="평면성 이상" 
        hasLeftRight={true}
      />
    </div>
  );
}

function CrossLevelSidebar() {
  return (
    <div className="space-y-4">
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
      <AnalysisSettings 
        moduleId="guiderail-clearance" 
        title="안내레일 내측거리" 
        hasLeftRight={false}
      />
    </div>
  );
}



function StraightnessSidebar() {
  return (
    <div className="space-y-4">
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
      <AnalysisSettings 
        moduleId="step" 
        title="연결부 단차" 
        hasLeftRight={false}
      />
    </div>
  );
}
