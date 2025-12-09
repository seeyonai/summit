import { useState, useCallback, useRef } from 'react';
import type { Recording } from '@/types';

export type PipelineStage = 'transcription' | 'alignment' | 'analysis' | 'organize';

export interface PipelineStageStatus {
  stage: PipelineStage;
  label: string;
  isComplete: boolean;
  isRunning: boolean;
  isEnabled: boolean;
  error?: string;
}

export interface PipelineRunnerState {
  isRunning: boolean;
  currentStage: PipelineStage | null;
  completedStages: PipelineStage[];
  error: string | null;
}

interface UsePipelineRunnerOptions {
  recording: Recording | null | undefined;
  onStageComplete?: (stage: PipelineStage) => void;
  onPipelineComplete?: () => void;
  onError?: (stage: PipelineStage, error: string) => void;
}

const STAGE_ORDER: PipelineStage[] = ['transcription', 'alignment', 'analysis', 'organize'];

const STAGE_LABELS: Record<PipelineStage, string> = {
  transcription: '转录',
  alignment: '对齐',
  analysis: '分析',
  organize: '整理',
};

function usePipelineRunner({ recording, onStageComplete, onPipelineComplete, onError }: UsePipelineRunnerOptions) {
  const [state, setState] = useState<PipelineRunnerState>({
    isRunning: false,
    currentStage: null,
    completedStages: [],
    error: null,
  });

  const stageRunnersRef = useRef<Map<PipelineStage, () => Promise<void>>>(new Map());
  const abortRef = useRef(false);

  // Register a stage runner function
  const registerStageRunner = useCallback((stage: PipelineStage, runner: () => Promise<void>) => {
    stageRunnersRef.current.set(stage, runner);
  }, []);

  // Unregister a stage runner
  const unregisterStageRunner = useCallback((stage: PipelineStage) => {
    stageRunnersRef.current.delete(stage);
  }, []);

  // Check if a stage is complete based on recording data
  const isStageComplete = useCallback((stage: PipelineStage): boolean => {
    if (!recording) return false;
    switch (stage) {
      case 'transcription':
        return Boolean(recording.transcription);
      case 'alignment':
        return Boolean(recording.alignmentItems && recording.alignmentItems.length > 0);
      case 'analysis':
        return Boolean(recording.speakerSegments && recording.speakerSegments.length > 0);
      case 'organize':
        return Boolean(recording.organizedSpeeches && recording.organizedSpeeches.length > 0);
      default:
        return false;
    }
  }, [recording]);

  // Check if a stage can be run (dependencies met)
  const isStageEnabled = useCallback((stage: PipelineStage): boolean => {
    if (!recording) return false;
    switch (stage) {
      case 'transcription':
        return true;
      case 'alignment':
        return Boolean(recording.transcription);
      case 'analysis':
        return Boolean(recording.transcription) && (recording.duration || 0) >= 30;
      case 'organize':
        return Boolean(
          recording.transcription &&
          recording.alignmentItems?.length &&
          recording.speakerSegments?.length
        );
      default:
        return false;
    }
  }, [recording]);

  // Get status for all stages
  const getStageStatuses = useCallback((): PipelineStageStatus[] => {
    return STAGE_ORDER.map((stage) => ({
      stage,
      label: STAGE_LABELS[stage],
      isComplete: isStageComplete(stage),
      isRunning: state.currentStage === stage,
      isEnabled: isStageEnabled(stage),
      error: state.currentStage === stage ? state.error || undefined : undefined,
    }));
  }, [isStageComplete, isStageEnabled, state]);

  // Run pipeline from a specific stage
  const runFromStage = useCallback(async (startStage: PipelineStage) => {
    const startIndex = STAGE_ORDER.indexOf(startStage);
    if (startIndex === -1) return;

    abortRef.current = false;
    setState((prev) => ({
      ...prev,
      isRunning: true,
      currentStage: null,
      completedStages: [],
      error: null,
    }));

    const stagesToRun = STAGE_ORDER.slice(startIndex);
    // Track completed stages locally to avoid stale state issues
    const localCompletedStages: PipelineStage[] = [];

    for (let i = 0; i < stagesToRun.length; i++) {
      const stage = stagesToRun[i];
      if (abortRef.current) break;

      // Only check dependencies for the FIRST stage being run
      // Subsequent stages are guaranteed to have dependencies met since previous stage just completed
      const isFirstStage = i === 0;
      
      if (isFirstStage && !isStageEnabled(stage)) {
        const errorMsg = `无法运行${STAGE_LABELS[stage]}：依赖条件未满足`;
        setState((prev) => ({
          ...prev,
          isRunning: false,
          currentStage: null,
          error: errorMsg,
        }));
        onError?.(stage, errorMsg);
        return;
      }

      // Get the runner for this stage
      const runner = stageRunnersRef.current.get(stage);
      if (!runner) {
        console.warn(`No runner registered for stage: ${stage}`);
        continue;
      }

      setState((prev) => ({
        ...prev,
        currentStage: stage,
        error: null,
      }));

      try {
        await runner();
        localCompletedStages.push(stage);
        setState((prev) => ({
          ...prev,
          completedStages: [...localCompletedStages],
        }));
        onStageComplete?.(stage);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '未知错误';
        setState((prev) => ({
          ...prev,
          isRunning: false,
          currentStage: null,
          error: errorMsg,
        }));
        onError?.(stage, errorMsg);
        return;
      }
    }

    setState((prev) => ({
      ...prev,
      isRunning: false,
      currentStage: null,
    }));
    onPipelineComplete?.();
  }, [isStageEnabled, onStageComplete, onPipelineComplete, onError]);

  // Run the full pipeline
  const runFullPipeline = useCallback(() => {
    return runFromStage('transcription');
  }, [runFromStage]);

  // Run remaining stages (from first incomplete stage)
  const runRemaining = useCallback(() => {
    const firstIncomplete = STAGE_ORDER.find((stage) => !isStageComplete(stage));
    if (firstIncomplete) {
      return runFromStage(firstIncomplete);
    }
  }, [isStageComplete, runFromStage]);

  // Abort the current pipeline run
  const abort = useCallback(() => {
    abortRef.current = true;
    setState((prev) => ({
      ...prev,
      isRunning: false,
      currentStage: null,
    }));
  }, []);

  return {
    ...state,
    stageStatuses: getStageStatuses(),
    registerStageRunner,
    unregisterStageRunner,
    runFullPipeline,
    runFromStage,
    runRemaining,
    abort,
    isStageComplete,
    isStageEnabled,
  };
}

export default usePipelineRunner;
