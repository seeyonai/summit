import React from 'react';
import { useDebug } from '@/contexts/DebugContext';

function DebugInfo() {
  const { debugMode } = useDebug();

  if (!debugMode) return null;

  const handleReload = () => {
    window.location.reload();
  };

  const handleClearStorage = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="debug-info">
      <div className="flex items-center gap-4 text-xs">
        <span className="font-semibold text-primary">DEBUG MODE</span>
        <button
          onClick={handleReload}
          className="text-info hover:underline"
          title="Reload page"
        >
          Reload
        </button>
        <button
          onClick={handleClearStorage}
          className="text-destructive hover:underline"
          title="Clear local storage and reload"
        >
          Clear Storage
        </button>
        <div className="text-muted-foreground">
          {window.innerWidth}×{window.innerHeight}
        </div>
        <div className="text-muted-foreground">
          {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}
        </div>
      </div>
    </div>
  );
}

export default DebugInfo;