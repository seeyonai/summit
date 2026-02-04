import { useState, useRef, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, AlertCircle, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import type { Hotword, HotwordBulkImportResult } from '@/types';
import type { HotwordService } from '@/services/hotwordService';

interface HotwordAutoDiscoverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: HotwordService;
  existingHotwords: Hotword[];
  onComplete: () => void;
}

type Stage = 'input' | 'processing' | 'review' | 'saving' | 'done';

interface DiscoveredWord {
  word: string;
  isDuplicate: boolean;
  selected: boolean;
}

function splitTextIntoChunks(text: string, wordsPerChunk: number = 1000): string[] {
  const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
  const segments = Array.from(segmenter.segment(text));

  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let wordCount = 0;

  for (const segment of segments) {
    currentChunk.push(segment.segment);
    if (segment.isWordLike) {
      wordCount++;
    }

    if (wordCount >= wordsPerChunk) {
      chunks.push(currentChunk.join(''));
      currentChunk = [];
      wordCount = 0;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(''));
  }

  return chunks.filter((c) => c.trim().length > 0);
}

function HotwordAutoDiscoverDialog({ open, onOpenChange, service, existingHotwords, onComplete }: HotwordAutoDiscoverDialogProps) {
  const [stage, setStage] = useState<Stage>('input');
  const [inputText, setInputText] = useState('');
  const [progress, setProgress] = useState(0);
  const [discoveredWords, setDiscoveredWords] = useState<DiscoveredWord[]>([]);
  const [liveWords, setLiveWords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [duplicatesExpanded, setDuplicatesExpanded] = useState(false);
  const [saveResult, setSaveResult] = useState<HotwordBulkImportResult | null>(null);
  const cancelledRef = useRef(false);

  const existingWordsLower = useMemo(() => new Set(existingHotwords.map((h) => h.word.toLowerCase())), [existingHotwords]);

  const resetState = useCallback(() => {
    setStage('input');
    setInputText('');
    setProgress(0);
    setDiscoveredWords([]);
    setLiveWords([]);
    setError(null);
    setIsPublic(false);
    setDuplicatesExpanded(false);
    setSaveResult(null);
    cancelledRef.current = false;
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      cancelledRef.current = true;
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    if (liveWords.length > 0) {
      finalizeDiscovery(liveWords);
    } else {
      resetState();
    }
  };

  const finalizeDiscovery = (words: string[]) => {
    const seen = new Set<string>();
    const unique: DiscoveredWord[] = [];

    for (const word of words) {
      const lower = word.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);

      unique.push({
        word,
        isDuplicate: existingWordsLower.has(lower),
        selected: !existingWordsLower.has(lower),
      });
    }

    setDiscoveredWords(unique);
    setStage('review');
  };

  const handleStartDiscovery = async () => {
    if (!inputText.trim()) return;

    setStage('processing');
    setProgress(0);
    setLiveWords([]);
    setError(null);
    cancelledRef.current = false;

    const chunks = splitTextIntoChunks(inputText.trim());
    if (chunks.length === 0) {
      setError('文本内容为空');
      setStage('input');
      return;
    }

    const allWords: string[] = [];
    const seenLower = new Set<string>();

    for (let i = 0; i < chunks.length; i++) {
      if (cancelledRef.current) break;

      try {
        const words = await service.discoverHotwords(chunks[i]);

        for (const word of words) {
          const lower = word.toLowerCase();
          if (!seenLower.has(lower)) {
            seenLower.add(lower);
            allWords.push(word);
            setLiveWords((prev) => [...prev, word]);
          }
        }
      } catch (err) {
        console.warn(`Chunk ${i + 1} failed:`, err);
      }

      setProgress(((i + 1) / chunks.length) * 100);
    }

    if (!cancelledRef.current) {
      finalizeDiscovery(allWords);
    }
  };

  const handleToggleWord = (index: number) => {
    setDiscoveredWords((prev) => prev.map((w, i) => (i === index ? { ...w, selected: !w.selected } : w)));
  };

  const handleSelectAll = () => {
    setDiscoveredWords((prev) => prev.map((w) => (w.isDuplicate ? w : { ...w, selected: true })));
  };

  const handleDeselectAll = () => {
    setDiscoveredWords((prev) => prev.map((w) => ({ ...w, selected: false })));
  };

  const handleSave = async () => {
    const wordsToSave = discoveredWords.filter((w) => w.selected).map((w) => w.word);

    if (wordsToSave.length === 0) {
      handleOpenChange(false);
      return;
    }

    setStage('saving');
    setError(null);

    try {
      const result = await service.importHotwordsBulk(wordsToSave, isPublic);
      setSaveResult(result);
      setStage('done');
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
      setStage('review');
    }
  };

  const newWords = discoveredWords.filter((w) => !w.isDuplicate);
  const duplicateWords = discoveredWords.filter((w) => w.isDuplicate);
  const selectedCount = discoveredWords.filter((w) => w.selected).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            智能发现热词
          </DialogTitle>
          <DialogDescription>粘贴会议纪要文本，AI 将自动识别专业术语、人名、缩写等热词</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {stage === 'input' && (
            <>
              <Textarea
                placeholder="在此粘贴会议纪要内容..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[300px] resize-none"
              />
              <p className="text-xs text-muted-foreground">支持任意长度文本，系统会自动分块处理</p>
            </>
          )}

          {stage === 'processing' && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>正在分析文本...</span>
                  <span className="text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {liveWords.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">已发现 {liveWords.length} 个热词</p>
                  <div className="flex flex-wrap gap-2 max-h-[200px] overflow-auto p-3 bg-muted/50 rounded-lg">
                    {liveWords.map((word, i) => (
                      <span
                        key={`${word}-${i}`}
                        className="px-2 py-1 text-sm bg-primary/10 text-primary rounded-md animate-in fade-in slide-in-from-bottom-1 duration-300"
                        style={{ animationDelay: `${Math.min(i * 50, 500)}ms` }}
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Button variant="outline" onClick={handleCancel} className="w-full">
                取消并保留已发现的热词
              </Button>
            </div>
          )}

          {stage === 'review' && (
            <div className="space-y-4">
              {discoveredWords.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <AlertCircle className="mx-auto h-10 w-10 mb-3" />
                  <p>未发现任何热词</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm">
                      共发现 <span className="font-medium">{discoveredWords.length}</span> 个热词，
                      已选择 <span className="font-medium text-primary">{selectedCount}</span> 个
                    </p>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                        全选新词
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                        取消全选
                      </Button>
                    </div>
                  </div>

                  {newWords.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-green-600">新热词 ({newWords.length})</p>
                      <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-auto p-3 bg-muted/30 rounded-lg">
                        {newWords.map((item, idx) => {
                          const originalIndex = discoveredWords.indexOf(item);
                          return (
                            <label
                              key={item.word}
                              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                            >
                              <Checkbox checked={item.selected} onCheckedChange={() => handleToggleWord(originalIndex)} />
                              <span className="text-sm truncate">{item.word}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {duplicateWords.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setDuplicatesExpanded(!duplicatesExpanded)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {duplicatesExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span>已存在热词 ({duplicateWords.length})</span>
                      </button>
                      {duplicatesExpanded && (
                        <div className="mt-2 grid grid-cols-2 gap-2 max-h-[150px] overflow-auto p-3 bg-muted/30 rounded-lg">
                          {duplicateWords.map((item) => (
                            <div key={item.word} className="flex items-center gap-2 p-2 rounded-md opacity-50">
                              <Checkbox checked={false} disabled />
                              <span className="text-sm truncate line-through">{item.word}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Switch id="public-switch" checked={isPublic} onCheckedChange={setIsPublic} />
                      <Label htmlFor="public-switch" className="text-sm cursor-pointer">
                        设为公开热词
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">{isPublic ? '所有用户可见' : '仅自己可见'}</p>
                  </div>
                </>
              )}

              {error && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>
          )}

          {stage === 'saving' && (
            <div className="py-8 text-center">
              <Loader2 className="mx-auto h-10 w-10 text-primary animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">正在保存热词...</p>
            </div>
          )}

          {stage === 'done' && saveResult && (
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">保存完成</p>
                  <p className="text-sm">成功添加 {saveResult.created.length} 个热词</p>
                </div>
              </div>

              {saveResult.skipped.length > 0 && (
                <div className="text-sm text-muted-foreground">跳过 {saveResult.skipped.length} 个热词（已存在）</div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          {stage === 'input' && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleStartDiscovery} disabled={!inputText.trim()}>
                <Sparkles className="h-4 w-4 mr-2" />
                开始发现
              </Button>
            </>
          )}

          {stage === 'review' && discoveredWords.length > 0 && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={selectedCount === 0}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                保存 {selectedCount} 个热词
              </Button>
            </>
          )}

          {stage === 'review' && discoveredWords.length === 0 && (
            <Button onClick={() => handleOpenChange(false)}>关闭</Button>
          )}

          {stage === 'done' && <Button onClick={() => handleOpenChange(false)}>完成</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HotwordAutoDiscoverDialog;
