import React from 'react';
import { Button } from '@/components/ui/button';
import { Expand } from 'lucide-react';

interface MinimalModeToggleProps {
  isDarkMode: boolean;
  onExitMinimal: () => void;
  themeClasses: {
    text: {
      primary: string;
      secondary: string;
    };
  };
}

const MinimalModeToggle: React.FC<MinimalModeToggleProps> = ({
  isDarkMode,
  onExitMinimal,
  themeClasses
}) => {
  return (
    <div className="fixed top-4 right-4 z-60">
      <Button
        onClick={onExitMinimal}
        variant="outline"
        size="sm"
        className={`${isDarkMode ? 'bg-slate-800/90 border-slate-600 text-white hover:bg-slate-700' : 'bg-white/90 border-gray-300 text-gray-900 hover:bg-gray-50'} backdrop-blur-sm shadow-lg`}
        title="退出专注模式"
      >
        <Expand className="w-4 h-4 mr-2" />
        退出专注模式
      </Button>
    </div>
  );
};

export default MinimalModeToggle;
