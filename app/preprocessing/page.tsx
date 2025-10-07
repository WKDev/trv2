'use client';

import { redirect } from 'next/navigation';

export default function PreprocessingPage() {
  // 기본적으로 raw-analysis로 리다이렉트
  redirect('/preprocessing/raw-analysis');
}
