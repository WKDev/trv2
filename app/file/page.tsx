'use client';

import { FileUploader } from '@/components/file/FileUploader';

export default function FilePage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">파일 열기</h1>
      <FileUploader />
    </div>
  );
}
