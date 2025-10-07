'use client';

import { redirect } from 'next/navigation';

export default function AnalysisPage() {
  // 기본적으로 level-abnormality로 리다이렉트
  redirect('/analysis/level-abnormality');
}
