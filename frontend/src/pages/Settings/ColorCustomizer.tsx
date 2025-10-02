import React, { useState } from 'react';
import { useColorTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import ColorPicker from '@/components/ui/ColorPicker';
import { RotateCcw, Palette } from 'lucide-react';

function ColorCustomizer() {
  const { colors, updateColors, resetColors } = useColorTheme();
  const [tempColors, setTempColors] = useState(colors);

  function handleColorChange(colorKey: keyof typeof colors, value: string) {
    const newColors = { ...tempColors, [colorKey]: value };
    setTempColors(newColors);
  }

  function handleSaveColors() {
    updateColors(tempColors);
    toast.success('主题颜色已保存');
  }

  function handleResetColors() {
    resetColors();
    setTempColors(colors);
    toast.success('主题颜色已重置');
  }

  function handleCancel() {
    setTempColors(colors);
  }

  const hasChanges = JSON.stringify(tempColors) !== JSON.stringify(colors);

  return (
    <div className="p-6 border border-border rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-5 h-5" />
        <h3 className="text-lg font-semibold">主题颜色</h3>
      </div>

      <div className="space-y-6">
        <ColorPicker
          label="主色调"
          value={tempColors.primary}
          onChange={(value) => handleColorChange('primary', value)}
        />

        <ColorPicker
          label="主色调文字"
          value={tempColors.primaryForeground}
          onChange={(value) => handleColorChange('primaryForeground', value)}
        />

        <ColorPicker
          label="强调色"
          value={tempColors.accent}
          onChange={(value) => handleColorChange('accent', value)}
        />

        <ColorPicker
          label="强调色文字"
          value={tempColors.accentForeground}
          onChange={(value) => handleColorChange('accentForeground', value)}
        />
      </div>

      <div className="flex gap-3 mt-6 pt-6 border-t border-border">
        <button
          onClick={handleSaveColors}
          disabled={!hasChanges}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-60 transition-all"
        >
          保存更改
        </button>
        <button
          onClick={handleCancel}
          disabled={!hasChanges}
          className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium disabled:opacity-60 transition-all"
        >
          取消
        </button>
        <button
          onClick={handleResetColors}
          className="px-4 py-2 rounded-lg bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-all flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          重置为默认
        </button>
      </div>
    </div>
  );
}

export default ColorCustomizer;