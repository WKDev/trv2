'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/data-context';
import { useToast } from '@/hooks/use-toast';

export function SaveButton() {
  const [isSaving, setIsSaving] = useState(false);
  const { saveAllSettingsToFile } = useData();
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await saveAllSettingsToFile();
      
      if (result.success) {
        toast({
          title: "저장 완료",
          description: result.message,
        });
      } else {
        toast({
          title: "저장 실패",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "저장 오류",
        description: "저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Button
      onClick={handleSave}
      disabled={isSaving}
      size="sm"
      className="text-xs"
    >
      {isSaving ? "저장 중..." : "💾 저장"}
    </Button>
  );
}
