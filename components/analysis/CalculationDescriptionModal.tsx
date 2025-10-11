'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

interface CalculationDescriptionModalProps {
  moduleId: string;
  title: string;
}

export function CalculationDescriptionModal({ moduleId, title }: CalculationDescriptionModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Info className="mr-2 h-4 w-4" />
          계산 설명
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title} 계산 설명</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* 여기에 계산 설명 내용이 들어갈 공간 */}
          <div className="text-sm text-muted-foreground">
            계산 설명 내용을 여기에 추가하세요.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
