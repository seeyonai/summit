import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListOrdered } from 'lucide-react';
import AgendaStatusBadge from './AgendaStatusBadge';
import { useAgendaSort } from '@/hooks/useAgenda';
import { cn } from '@/lib/utils';
import type { AgendaItem } from '@/types';

interface AgendaListProps {
  items: AgendaItem[];
  className?: string;
}

function AgendaList({ items, className }: AgendaListProps) {
  const sortedItems = useAgendaSort(items);

  if (!items || items.length === 0) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ListOrdered className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">暂无议程安排</p>
        </CardContent>
      </Card>
    );
  }

  const completedCount = items.filter(item => item.status === 'completed').length;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="bg-gradient-to-r from-primary/2 to-primary/5 border-b">
        <CardTitle className="flex items-center gap-2">
          <ListOrdered className="w-5 h-5" />
          会议议程
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {completedCount}/{items.length} 已完成
          </span>
        </CardTitle>
        <CardDescription>本次会议的议程安排</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {sortedItems.map((item, index) => (
            <div
              key={index}
              className={cn(
                'flex items-start gap-4 p-4 transition-all hover:bg-muted/50',
                (item.status === 'completed' || item.status === 'cancelled') && 'opacity-60'
              )}
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">{item.order}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm leading-relaxed',
                  (item.status === 'completed' || item.status === 'cancelled') && 'line-through text-muted-foreground'
                )}>
                  {item.text}
                </p>
              </div>
              <AgendaStatusBadge status={item.status} size="sm" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default AgendaList;
