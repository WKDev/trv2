'use client';

import { redirect } from 'next/navigation';

export default function AnalysisPage() {
  // 기본적으로 level-deviation으로 리다이렉트
  redirect('/analysis/level-deviation');
}
