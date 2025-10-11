import { useCallback, useRef, useState } from 'react';

interface AnalysisSettings {
  interval: number;
  aggregationMethod?: 'median' | 'mean' | 'ema';
  emaSpan?: number;
}

interface AnalysisCorrection {
  Scaler: number;
  offset: number;
}

interface AnalysisResult {
  data: any[];
  success: boolean;
  error?: string;
}

interface ProgressInfo {
  progress: number;
  processed: number;
  total: number;
  message?: string;
}

export function useAnalysisWorker() {
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
      workerRef.current = new Worker('/workers/analysis-worker.js');
      
      workerRef.current.onmessage = (e) => {
        const { type, data, success, message, progress: progressData } = e.data;
        
        switch (type) {
          case 'WORKER_READY':
            console.log('Analysis worker ready:', message);
            break;
            
          case 'PROGRESS_UPDATE':
            setProgress(progressData);
            setError(null); // 진행 중이면 에러 클리어
            break;
            
          case 'STRAIGHTNESS_COMPLETE':
          case 'PLANARITY_COMPLETE':
            setIsProcessing(false);
            setProgress(null);
            setError(null);
            retryCountRef.current = 0; // 성공 시 재시도 카운트 리셋
            break;
            
          case 'ERROR':
            setIsProcessing(false);
            setProgress(null);
            setError(message || 'Unknown analysis error');
            console.error('Analysis worker error:', message);
            break;
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('Analysis worker error:', error);
        setIsProcessing(false);
        setProgress(null);
        setError('Worker initialization failed');
      };
    } catch (error) {
      console.error('Failed to initialize analysis worker:', error);
      setIsProcessing(false);
      setError('Failed to initialize worker');
    }
  }, []);

  // 직진도 계산 (재시도 로직 포함)
  const calculateStraightness = useCallback(async (
    data: any[], 
    settings: AnalysisSettings,
    analysisCorrection?: AnalysisCorrection
  ): Promise<AnalysisResult> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        initializeWorker();
      }

      if (!workerRef.current) {
        reject(new Error('Failed to initialize worker'));
        return;
      }

      setIsProcessing(true);
      setProgress({ progress: 0, processed: 0, total: 1, message: '직진도 계산 시작...' });
      setError(null);

      // 기존 메시지 리스너 백업
      const originalOnMessage = workerRef.current.onmessage;
      
      workerRef.current.onmessage = (e) => {
        const { type, data: resultData, success, message } = e.data;
        
        switch (type) {
          case 'PROGRESS_UPDATE':
            setProgress(e.data.progress);
            break;
            
          case 'STRAIGHTNESS_COMPLETE':
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
            setError(message || 'Unknown straightness calculation error');
            
            // 재시도 로직
            if (retryCountRef.current < maxRetries) {
              retryCountRef.current++;
              console.log(`Straightness calculation failed, retrying... (${retryCountRef.current}/${maxRetries})`);
              
              // 잠시 대기 후 재시도
              setTimeout(() => {
                if (workerRef.current) {
                  workerRef.current.postMessage({
                    type: 'CALCULATE_STRAIGHTNESS',
                    data: data,
                    settings: settings,
                    analysisCorrection: analysisCorrection
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
              reject(new Error(message || 'Unknown straightness calculation error'));
            }
            break;
        }
      };

      // Worker에 직진도 계산 작업 요청
      workerRef.current.postMessage({
        type: 'CALCULATE_STRAIGHTNESS',
        data: data,
        settings: settings,
        analysisCorrection: analysisCorrection
      });
    });
  }, [initializeWorker]);

  // 평탄성 계산 (재시도 로직 포함)
  const calculatePlanarity = useCallback(async (
    data: any[], 
    settings: AnalysisSettings,
    analysisCorrection?: AnalysisCorrection
  ): Promise<AnalysisResult> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        initializeWorker();
      }

      if (!workerRef.current) {
        reject(new Error('Failed to initialize worker'));
        return;
      }

      setIsProcessing(true);
      setProgress({ progress: 0, processed: 0, total: 1, message: '평탄성 계산 시작...' });
      setError(null);

      // 기존 메시지 리스너 백업
      const originalOnMessage = workerRef.current.onmessage;
      
      workerRef.current.onmessage = (e) => {
        const { type, data: resultData, success, message } = e.data;
        
        switch (type) {
          case 'PROGRESS_UPDATE':
            setProgress(e.data.progress);
            break;
            
          case 'PLANARITY_COMPLETE':
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
            setError(message || 'Unknown planarity calculation error');
            
            // 재시도 로직
            if (retryCountRef.current < maxRetries) {
              retryCountRef.current++;
              console.log(`Planarity calculation failed, retrying... (${retryCountRef.current}/${maxRetries})`);
              
              // 잠시 대기 후 재시도
              setTimeout(() => {
                if (workerRef.current) {
                  workerRef.current.postMessage({
                    type: 'CALCULATE_PLANARITY',
                    data: data,
                    settings: settings,
                    analysisCorrection: analysisCorrection
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
              reject(new Error(message || 'Unknown planarity calculation error'));
            }
            break;
        }
      };

      // Worker에 평탄성 계산 작업 요청
      workerRef.current.postMessage({
        type: 'CALCULATE_PLANARITY',
        data: data,
        settings: settings,
        analysisCorrection: analysisCorrection
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
    calculateStraightness,
    calculatePlanarity,
    isProcessing,
    progress,
    error,
    cleanup
  };
}
