'use client';

import { AnalysisLayout } from '@/components/analysis/AnalysisLayout';

export default function AnalysisLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AnalysisLayout>{children}</AnalysisLayout>;
}
