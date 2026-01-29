import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FoldableCardProps {
  title: ReactNode;
  description?: ReactNode;
  defaultExpanded?: boolean;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
}

function FoldableCard({ title, description, defaultExpanded = true, headerAction, children, className }: FoldableCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}>
      <div className="flex flex-col space-y-1.5 p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 -ml-3">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
              aria-label={isExpanded ? '折叠' : '展开'}
            >
              <svg
                viewBox="0 0 12 12"
                className={cn('w-4 h-4 transition-transform duration-200', isExpanded ? 'rotate-90' : 'rotate-0')}
                fill="currentColor"
              >
                <path d="M4.5 2L9 6L4.5 10V2Z" />
              </svg>
            </button>
            <div>
              <h3 className="text-lg font-semibold leading-none tracking-tight">{title}</h3>
              {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
          </div>
          {headerAction && <div className="flex items-center gap-2">{headerAction}</div>}
        </div>
      </div>
      <div
        className={cn('overflow-hidden transition-all duration-200', isExpanded ? 'opacity-100' : 'max-h-0 opacity-0')}
        style={{ maxHeight: isExpanded ? 'none' : 0 }}
      >
        <div className="p-6 pt-0">{children}</div>
      </div>
    </div>
  );
}

export default FoldableCard;
