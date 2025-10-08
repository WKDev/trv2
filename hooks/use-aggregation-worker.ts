import { useCallback, useRef, useState } from 'react';

interface AggregationSettings {
  interval: number;
  method: 'median' | 'mean' | 'ema';
  emaSpan: number;
}

interface AggregationResult {
  data: any[];
  success: boolean;
  error?: string;
}

interface ProgressInfo {
  progress: number;
  processed: number;
  total: number;
}

export function useAggregationWorker() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Worker 초기화
  const initializeWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    try {
      workerRef.current = new Worker('/workers/aggregation-worker.js');
      
      workerRef.current.onmessage = (e) => {
        const { type, data, success, message, progress: progressData } = e.data;
        
        switch (type) {
          case 'PROGRESS_UPDATE':
            setProgress(progressData);
            setError(null); // 진행 중이면 에러 클리어
            break;
            
          case 'AGGREGATION_COMPLETE':
            setIsProcessing(false);
            setProgress(null);
            setError(null);
            retryCountRef.current = 0; // 성공 시 재시도 카운트 리셋
            break;
            
          case 'ERROR':
            setIsProcessing(false);
            setProgress(null);
            setError(message || 'Unknown aggregation error');
            console.error('Aggregation worker error:', message);
            break;
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('Worker error:', error);
        setIsProcessing(false);
        setProgress(null);
        setError('Worker initialization failed');
      };
    } catch (error) {
      console.error('Failed to initialize aggregation worker:', error);
      setIsProcessing(false);
      setError('Failed to initialize worker');
    }
  }, []);

  // 집계 실행 (재시도 로직 포함)
  const aggregateData = useCallback(async (
    data: any[], 
    settings: AggregationSettings
  ): Promise<AggregationResult> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        initializeWorker();
      }

      if (!workerRef.current) {
        reject(new Error('Failed to initialize worker'));
        return;
      }

      setIsProcessing(true);
      setProgress({ progress: 0, processed: 0, total: 0 });
      setError(null);

      // 기존 메시지 리스너 백업
      const originalOnMessage = workerRef.current.onmessage;
      
      workerRef.current.onmessage = (e) => {
        const { type, data: resultData, success, message } = e.data;
        
        switch (type) {
          case 'PROGRESS_UPDATE':
            setProgress(e.data.progress);
            break;
            
          case 'AGGREGATION_COMPLETE':
            setIsProcessing(false);
            setProgress(null);
            setError(null);
            retryCountRef.current = 0; // 성공 시 재시도 카운트 리셋
            // 원래 리스너 복원
            if (originalOnMessage) {
              workerRef.current!.onmessage = originalOnMessage;
            }
            resolve({
              data: resultData,
              success: success,
              error: success ? undefined : message
            });
            break;
            
          case 'ERROR':
            setIsProcessing(false);
            setProgress(null);
            setError(message || 'Unknown aggregation error');
            
            // 재시도 로직
            if (retryCountRef.current < maxRetries) {
              retryCountRef.current++;
              console.log(`Aggregation failed, retrying... (${retryCountRef.current}/${maxRetries})`);
              
              // 잠시 대기 후 재시도
              setTimeout(() => {
                if (workerRef.current) {
                  workerRef.current.postMessage({
                    type: 'AGGREGATE_DATA',
                    data: data,
                    settings: settings
                  });
                }
              }, 1000 * retryCountRef.current); // 지수 백오프
            } else {
              // 최대 재시도 횟수 초과
              retryCountRef.current = 0;
              // 원래 리스너 복원
              if (originalOnMessage) {
                workerRef.current!.onmessage = originalOnMessage;
              }
              reject(new Error(message || 'Unknown aggregation error'));
            }
            break;
        }
      };

      // Worker에 집계 작업 요청
      workerRef.current.postMessage({
        type: 'AGGREGATE_DATA',
        data: data,
        settings: settings
      });
    });
  }, [initializeWorker]);

  // 설정 검증
  const validateSettings = useCallback(async (
    settings: AggregationSettings
  ): Promise<{ isValid: boolean; errors: string[] }> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        initializeWorker();
      }

      if (!workerRef.current) {
        reject(new Error('Failed to initialize worker'));
        return;
      }

      // 기존 메시지 리스너 백업
      const originalOnMessage = workerRef.current.onmessage;
      
      workerRef.current.onmessage = (e) => {
        const { type, data: resultData, success, message } = e.data;
        
        switch (type) {
          case 'VALIDATION_COMPLETE':
            // 원래 리스너 복원
            if (originalOnMessage) {
              workerRef.current!.onmessage = originalOnMessage;
            }
            resolve(resultData);
            break;
            
          case 'ERROR':
            // 원래 리스너 복원
            if (originalOnMessage) {
              workerRef.current!.onmessage = originalOnMessage;
            }
            reject(new Error(message || 'Unknown validation error'));
            break;
        }
      };

      // Worker에 검증 요청
      workerRef.current.postMessage({
        type: 'VALIDATE_SETTINGS',
        settings: settings
      });
    });
  }, [initializeWorker]);

  // Worker 정리
  const cleanup = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsProcessing(false);
    setProgress(null);
  }, []);

  return {
    aggregateData,
    validateSettings,
    isProcessing,
    progress,
    error,
    cleanup
  };
}
