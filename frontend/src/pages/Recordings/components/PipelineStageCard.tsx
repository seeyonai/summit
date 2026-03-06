import { type ReactNode, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface PipelineStageCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  primaryButton: ReactNode;
  actionButtons?: ReactNode[];
  isEmpty: boolean;
  emptyIcon?: ReactNode;
  emptyMessage?: string;
  children?: ReactNode;
  maxHeight?: string;
}

function PipelineStageCard({
  icon,
  title,
  description,
  primaryButton,
  actionButtons = [],
  isEmpty,
  emptyIcon,
  emptyMessage,
  children,
  maxHeight = '500px',
}: PipelineStageCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [iconHovered, setIconHovered] = useState(false);
  return (
    <div className="bg-card rounded-lg shadow-sm border border-border h-full flex flex-col">
      <div className="p-6 flex-1 flex flex-col">
        {isEmpty ? (
          /* Empty State - Simplified view with centered button */
          <div className="flex-1 flex flex-col">
            <div className="flex items-start gap-3 mb-6">
              <button
                type="button"
                className="w-10 h-10 bg-primary/70 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-primary/90 transition-colors cursor-pointer"
                onClick={() => setCollapsed((c) => !c)}
                onMouseEnter={() => setIconHovered(true)}
                onMouseLeave={() => setIconHovered(false)}
                title={collapsed ? '展开' : '收起'}
              >
                {iconHovered
                  ? (collapsed ? <ChevronDownIcon className="w-5 h-5 text-white" /> : <ChevronUpIcon className="w-5 h-5 text-white" />)
                  : icon}
              </button>
              <div>
                <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              </div>
            </div>
            {!collapsed && (
              <>
                <Separator className="mb-6" />
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center py-12">
                    {emptyIcon && <div className="w-12 h-12 text-muted-foreground mx-auto mb-4">{emptyIcon}</div>}
                    {emptyMessage && <p className="text-sm text-muted-foreground mb-4">{emptyMessage}</p>}
                    <div className="flex justify-center">{primaryButton}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Normal State - Full header with buttons */
          <>
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className="w-10 h-10 bg-primary/70 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-primary/90 transition-colors cursor-pointer"
                    onClick={() => setCollapsed((c) => !c)}
                    onMouseEnter={() => setIconHovered(true)}
                    onMouseLeave={() => setIconHovered(false)}
                    title={collapsed ? '展开' : '收起'}
                  >
                    {iconHovered
                      ? (collapsed ? <ChevronDownIcon className="w-5 h-5 text-white" /> : <ChevronUpIcon className="w-5 h-5 text-white" />)
                      : icon}
                  </button>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                  </div>
                </div>
                {!collapsed && (
                  <div className="flex items-center gap-2">
                    {primaryButton}
                    {actionButtons.map((button, idx) => (
                      <div key={idx}>{button}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!collapsed && <Separator className="my-4" />}

            {!collapsed && (
              <div className="flex-1 overflow-auto" style={{ maxHeight }}>
                {children}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default PipelineStageCard;
