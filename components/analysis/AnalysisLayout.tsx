'use client';

import { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter, usePathname } from 'next/navigation';

interface AnalysisLayoutProps {
  children: ReactNode;
}

export function AnalysisLayout({ children }: AnalysisLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const getCurrentTab = () => {
    if (pathname.includes('/level-abnormality')) return 'level-abnormality';
    if (pathname.includes('/high-low')) return 'high-low';
    if (pathname.includes('/flatness')) return 'flatness';
    if (pathname.includes('/guide-rail-distance')) return 'guide-rail-distance';
    if (pathname.includes('/alignment')) return 'alignment';
    if (pathname.includes('/smoothness')) return 'smoothness';
    if (pathname.includes('/joint-step')) return 'joint-step';
    return 'level-abnormality';
  };

  const handleTabChange = (value: string) => {
    router.push(`/analysis/${value}`);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-6">
      <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="flex-1 flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-7 mb-4 flex-shrink-0">
          <TabsTrigger value="level-abnormality">수평도 이상</TabsTrigger>
          <TabsTrigger value="high-low">고저차</TabsTrigger>
          <TabsTrigger value="flatness">평면도</TabsTrigger>
          <TabsTrigger value="guide-rail-distance">가이드레일 거리</TabsTrigger>
          <TabsTrigger value="alignment">정렬도</TabsTrigger>
          <TabsTrigger value="smoothness">평활도</TabsTrigger>
          <TabsTrigger value="joint-step">이음새 단차</TabsTrigger>
        </TabsList>
        
        <div className="flex-1 overflow-y-auto h-full">
          <TabsContent value="level-abnormality" className="h-full m-0">
            {children}
          </TabsContent>
          <TabsContent value="high-low" className="h-full m-0">
            {children}
          </TabsContent>
          <TabsContent value="flatness" className="h-full m-0">
            {children}
          </TabsContent>
          <TabsContent value="guide-rail-distance" className="h-full m-0">
            {children}
          </TabsContent>
          <TabsContent value="alignment" className="h-full m-0">
            {children}
          </TabsContent>
          <TabsContent value="smoothness" className="h-full m-0">
            {children}
          </TabsContent>
          <TabsContent value="joint-step" className="h-full m-0">
            {children}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
