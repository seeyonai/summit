import React from 'react';
import { Button } from '@/components/ui/button';
import { Expand } from 'lucide-react';

interface MinimalModeToggleProps {
  isDarkMode: boolean;
  onExitMinimal: () => void;
}

const MinimalModeToggle: React.FC<MinimalModeToggleProps> = ({
  isDarkMode,
  onExitMinimal
}) => {
  return (
    <div className="fixed top-4 right-4 z-60">
      <Button
        onClick={onExitMinimal}
        variant="outline"
        size="sm"
        className={`${'bg-background/90 border-border text-foreground hover:bg-muted'} backdrop-blur-sm shadow-lg`}
        title="退出专注模式"
      >
        <Expand className="w-4 h-4 mr-2" />
        退出专注模式
      </Button>
    </div>
  );
};

export default MinimalModeToggle;
