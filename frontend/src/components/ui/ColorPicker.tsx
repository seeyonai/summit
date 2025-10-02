import React from 'react';
import { hslToHex, hexToHsl } from '@/contexts/ThemeContext';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const hexValue = hslToHex(value);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    const newHsl = hexToHsl(newHex);
    onChange(newHsl);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <label className="block text-sm font-medium mb-2">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={hexValue}
            onChange={handleColorChange}
            className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer"
          />
          <input
            type="text"
            value={hexValue}
            onChange={(e) => {
              const hex = e.target.value;
              if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                onChange(hexToHsl(hex));
              }
            }}
            className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm font-mono"
            placeholder="#000000"
          />
        </div>
      </div>
      <div
        className="w-16 h-16 rounded-lg border-2 border-border"
        style={{ backgroundColor: `hsl(${value})` }}
      />
    </div>
  );
}

export default ColorPicker;