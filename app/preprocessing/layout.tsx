'use client';

import { PreprocessingLayout } from '@/components/preprocessing/PreprocessingLayout';

export default function PreprocessingLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PreprocessingLayout>{children}</PreprocessingLayout>;
}
