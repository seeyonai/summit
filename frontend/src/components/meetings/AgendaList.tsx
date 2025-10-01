import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListOrdered, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { cn } from '@/lib/utils';

interface AgendaItem {
  order: number;
  text: string;
  status: 'resolved' | 'ongoing' | 'pending';
}

interface AgendaListProps {
  items: AgendaItem[];
  className?: string;
}

function AgendaList({ items, className }: AgendaListProps) {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'ongoing':
        return <Clock className="w-4 h-4 text-primary animate-pulse" />;
      default:
        return <AlertCircle className="w-4 h-4 text-warning" />;
    }
  };

  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="bg-gradient-to-r from-primary/2 to-primary/5 border-b">
        <CardTitle className="flex items-center gap-2">
          <ListOrdered className="w-5 h-5" />
          会议议程
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {items.filter(item => item.status === 'resolved').length}/{items.length} 已完成
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
                item.status === 'resolved' && 'opacity-60'
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
                  item.status === 'resolved' && 'line-through text-muted-foreground'
                )}>
                  {item.text}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(item.status)}
                <StatusBadge status={item.status} type="agenda" size="sm" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default AgendaList;
