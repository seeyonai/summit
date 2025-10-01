import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  className 
}: EmptyStateProps) {
  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="text-center py-12">
        {Icon && (
          <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
            <Icon className="w-full h-full" />
          </div>
        )}
        <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
        {description && (
          <p className="text-muted-foreground mb-6">{description}</p>
        )}
        {action && (
          <div className="flex justify-center">
            {action}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default EmptyState
