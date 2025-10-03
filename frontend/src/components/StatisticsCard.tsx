import type { ReactNode } from 'react';

interface StatisticsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  description: string;
}

function StatisticsCard({ icon, label, value, description }: StatisticsCardProps) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {value}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-500">
        {description}
      </p>
    </div>
  );
}

export default StatisticsCard;
