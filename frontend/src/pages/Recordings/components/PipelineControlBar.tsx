import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PlayIcon, ChevronDownIcon, CheckCircleIcon, CircleIcon, LoaderIcon, AlertCircleIcon, FastForwardIcon, RotateCcwIcon } from 'lucide-react';
import type { PipelineStage, PipelineStageStatus } from './hooks/usePipelineRunner';

interface PipelineControlBarProps {
  stageStatuses: PipelineStageStatus[];
  isRunning: boolean;
  onRunFullPipeline: () => void;
  onRunFromStage: (stage: PipelineStage) => void;
  onRunRemaining: () => void;
  onAbort: () => void;
  onReset?: () => void;
}

function PipelineControlBar({
  stageStatuses,
  isRunning,
  onRunFullPipeline,
  onRunFromStage,
  onRunRemaining,
  onAbort,
  onReset,
}: PipelineControlBarProps) {
  const completedCount = stageStatuses.filter((s) => s.isComplete).length;
  const totalCount = stageStatuses.length;
  const allComplete = completedCount === totalCount;
  const hasIncomplete = completedCount < totalCount;

  const getStageIcon = (status: PipelineStageStatus) => {
    if (status.isRunning) {
      return <LoaderIcon className="w-4 h-4 animate-spin text-primary" />;
    }
    if (status.error) {
      return <AlertCircleIcon className="w-4 h-4 text-destructive" />;
    }
    if (status.isComplete) {
      return <CheckCircleIcon className="w-4 h-4 text-success" />;
    }
    return <CircleIcon className="w-4 h-4 text-muted-foreground" />;
  };

  const getStageClass = (status: PipelineStageStatus) => {
    if (status.isRunning) return 'text-primary font-medium';
    if (status.isComplete) return 'text-success';
    if (!status.isEnabled) return 'text-muted-foreground opacity-50';
    return 'text-muted-foreground';
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        {/* Pipeline Progress Stepper */}
        <div className="flex items-center gap-1 flex-1">
          {stageStatuses.map((status, index) => (
            <div key={status.stage} className="flex items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => !isRunning && status.isEnabled && onRunFromStage(status.stage)}
                      disabled={isRunning || !status.isEnabled}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${getStageClass(status)} ${
                        !isRunning && status.isEnabled ? 'hover:bg-muted cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      {getStageIcon(status)}
                      <span className="text-sm">{status.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {status.isComplete
                      ? `${status.label}已完成 - 点击重新运行`
                      : status.isEnabled
                      ? `点击从${status.label}开始运行`
                      : `${status.label}：需要先完成前置步骤`}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {index < stageStatuses.length - 1 && (
                <div className={`w-6 h-px mx-1 ${status.isComplete ? 'bg-success' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Progress Badge */}
        <div className="text-sm text-muted-foreground">
          {completedCount}/{totalCount} 完成
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button onClick={onAbort} variant="outline" size="sm">
              停止
            </Button>
          ) : (
            <>
              {hasIncomplete && (
                <Button onClick={onRunRemaining} variant="outline" size="sm">
                  <FastForwardIcon className="w-4 h-4 mr-2" />
                  继续运行
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" size="sm">
                    <PlayIcon className="w-4 h-4 mr-2" />
                    {allComplete ? '重新运行' : '运行流水线'}
                    <ChevronDownIcon className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onRunFullPipeline}>
                    <PlayIcon className="w-4 h-4 mr-2" />
                    运行全部流水线
                  </DropdownMenuItem>
                  {stageStatuses.map((status) => (
                    <DropdownMenuItem
                      key={status.stage}
                      onClick={() => onRunFromStage(status.stage)}
                      disabled={!status.isEnabled}
                    >
                      {getStageIcon(status)}
                      <span className="ml-2">从{status.label}开始</span>
                    </DropdownMenuItem>
                  ))}
                  {onReset && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onReset} className="text-destructive focus:text-destructive">
                        <RotateCcwIcon className="w-4 h-4 mr-2" />
                        重置流水线
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PipelineControlBar;
