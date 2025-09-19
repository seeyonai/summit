import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
  iconClassName?: string;
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
  iconClassName,
}: StatCardProps) {
  return (
    <Card className={cn('group hover:shadow-lg transition-all duration-300 border-muted/50', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          {title}
          <div className={cn(
            'p-2 rounded-lg bg-gradient-to-br from-primary/2 to-primary/5 group-hover:from-primary/5 group-hover:to-primary/10 transition-colors',
            iconClassName
          )}>
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">{value}</span>
            {trend && (
              <span className={cn(
                'text-xs font-medium',
                trend.value > 0 ? 'text-green-600' : trend.value < 0 ? 'text-red-600' : 'text-gray-600'
              )}>
                {trend.value > 0 && '+'}
                {trend.value}% {trend.label}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default StatCard;
