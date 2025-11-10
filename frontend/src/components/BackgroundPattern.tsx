import React from 'react';

function BackgroundPattern() {
  return (
    <div
      className="absolute inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: `
          repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.03) 0, rgba(0, 0, 0, 0.03) 1px, transparent 1px, transparent 50px),
          repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.03) 0, rgba(0, 0, 0, 0.03) 1px, transparent 1px, transparent 50px)
        `,
        backgroundSize: '100px 100px',
      }}
    />
  );
}

export default BackgroundPattern;
