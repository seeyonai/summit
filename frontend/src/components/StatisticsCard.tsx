import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatisticsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  description: string;
  compact?: boolean;
}

function StatisticsCard({ icon, label, value, description, compact }: StatisticsCardProps) {
  return (
    <div className={cn("bg-gray-100 dark:bg-gray-800 rounded-lg p-4")}>
      <div className={cn("flex items-center gap-2 mb-3", compact && "mb-2")}>
        {icon}
        <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <p className={cn("text-lg font-semibold text-gray-900 dark:text-gray-100", compact && "text-base")}>
        {value}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-500">
        {description}
      </p>
    </div>
  );
}

export default StatisticsCard;
