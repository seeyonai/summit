import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { MinimizeIcon, TypeIcon, AlignLeftIcon, PaletteIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';

interface FullscreenMarkdownViewerProps {
  content: string;
  onClose: () => void;
}

function FullscreenMarkdownViewer({ content, onClose }: FullscreenMarkdownViewerProps) {
  const [viewWidth, setViewWidth] = useState(800);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [bgColor, setBgColor] = useState<'white' | 'cream' | 'gray'>('white');
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif'>('sans');

  const getBgColorClass = () => {
    switch (bgColor) {
      case 'cream':
        return 'bg-amber-50 dark:bg-amber-950/20';
      case 'gray':
        return 'bg-gray-100 dark:bg-gray-900';
      default:
        return 'bg-white dark:bg-gray-950';
    }
  };

  const getFontFamilyClass = () => {
    return fontFamily === 'serif' ? 'font-serif' : 'font-sans';
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Toolbar */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <h3 className="text-lg font-semibold">会议记录预览</h3>
            
            {/* View Width Control */}
            <div className="flex items-center gap-3">
              <AlignLeftIcon className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm text-muted-foreground min-w-[60px]">宽度</Label>
              <Slider value={[viewWidth]} onValueChange={(v) => setViewWidth(v[0])} min={600} max={1200} step={50} className="w-32" />
              <span className="text-sm text-muted-foreground min-w-[50px]">{viewWidth}px</span>
            </div>

            {/* Line Height Control */}
            <div className="flex items-center gap-3">
              <TypeIcon className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm text-muted-foreground min-w-[60px]">行高</Label>
              <Slider value={[lineHeight]} onValueChange={(v) => setLineHeight(v[0])} min={1.2} max={2.5} step={0.1} className="w-32" />
              <span className="text-sm text-muted-foreground min-w-[50px]">{lineHeight.toFixed(1)}</span>
            </div>

            {/* Background Color */}
            <div className="flex items-center gap-3">
              <PaletteIcon className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm text-muted-foreground min-w-[60px]">背景</Label>
              <ButtonGroup>
                <Button onClick={() => setBgColor('white')} variant={bgColor === 'white' ? 'default' : 'outline'} size="sm">
                  白色
                </Button>
                <Button onClick={() => setBgColor('cream')} variant={bgColor === 'cream' ? 'default' : 'outline'} size="sm">
                  米色
                </Button>
                <Button onClick={() => setBgColor('gray')} variant={bgColor === 'gray' ? 'default' : 'outline'} size="sm">
                  灰色
                </Button>
              </ButtonGroup>
            </div>

            {/* Font Family */}
            <div className="flex items-center gap-3">
              <TypeIcon className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm text-muted-foreground min-w-[60px]">字体</Label>
              <ButtonGroup>
                <Button onClick={() => setFontFamily('sans')} variant={fontFamily === 'sans' ? 'default' : 'outline'} size="sm">
                  Sans
                </Button>
                <Button onClick={() => setFontFamily('serif')} variant={fontFamily === 'serif' ? 'default' : 'outline'} size="sm">
                  Serif
                </Button>
              </ButtonGroup>
            </div>
          </div>

          <Button onClick={onClose} variant="outline">
            <MinimizeIcon className="w-4 h-4 mr-2" />
            退出全屏
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className={`flex-1 overflow-y-auto ${getBgColorClass()} transition-colors duration-200`}>
        <div className="py-12 px-6">
          <div
            className={`mx-auto transition-all duration-200 ${getFontFamilyClass()}`}
            style={{
              maxWidth: `${viewWidth}px`,
              lineHeight: lineHeight
            }}
          >
            <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-p:text-base prose-li:text-base">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]}>
                {content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FullscreenMarkdownViewer;
