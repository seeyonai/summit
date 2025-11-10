import React from 'react';
import { useTheme } from '@/layout/useTheme';

function BackgroundPattern() {
  const { theme } = useTheme();
  const patternColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.03)';
  return (
    <div className="bg-background absolute inset-0 z-0 pointer-events-none">
      <div
        className="w-full h-full"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, ${patternColor} 0, ${patternColor} 1px, transparent 1px, transparent 50px),
            repeating-linear-gradient(-45deg, ${patternColor} 0, ${patternColor} 1px, transparent 1px, transparent 50px)
          `,
          backgroundSize: '100px 100px',
        }}
      />
    </div>
  );
}

export default BackgroundPattern;
