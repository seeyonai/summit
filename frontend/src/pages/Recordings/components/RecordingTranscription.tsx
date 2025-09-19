import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { apiService } from '@/services/api';
import type { Recording } from '@/types';
import {
  MicIcon,
  CopyIcon,
  DownloadIcon
} from 'lucide-react';

interface RecordingTranscriptionProps {
  recording: Recording;
  isEditing: boolean;
  editForm: { transcription?: string; verbatimTranscript?: string };
  setEditForm: (form: { transcription?: string; verbatimTranscript?: string }) => void;
  onRefresh: () => Promise<void>;
  setSuccess: (message: string) => void;
  setError: (message: string) => void;
}

function RecordingTranscription({
  recording,
  isEditing,
  editForm,
  setEditForm,
  onRefresh,
  setSuccess,
  setError
}: RecordingTranscriptionProps) {
  const [transcribing, setTranscribing] = useState(false);
  const [exportFormat, setExportFormat] = useState<'txt' | 'docx'>('txt');

  const generateTranscription = async () => {
    try {
      setTranscribing(true);
      const { message } = await apiService.transcribeRecording(recording._id);
      await onRefresh();
      setSuccess(message || '转录生成成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setTranscribing(false);
    }
  };

  const exportTranscription = async () => {
    if (!recording.transcription) return;

    try {
      const content = recording.transcription;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recording.filename.replace('.wav', '')}_transcription.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess('转录导出成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const copyToClipboard = async () => {
    if (!recording.transcription) return;

    try {
      await navigator.clipboard.writeText(recording.transcription);
      setSuccess('转录已复制到剪贴板');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>转录内容</CardTitle>
            <CardDescription>音频的文字转录结果</CardDescription>
          </div>
          {recording.transcription && !isEditing && (
            <div className="flex gap-2">
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="sm"
              >
                <CopyIcon className="w-4 h-4 mr-2" />
                复制
              </Button>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'txt' | 'docx')}
                className="px-3 py-1 border border-gray-200 rounded-md text-sm"
              >
                <option value="txt">TXT</option>
                <option value="docx">DOCX</option>
              </select>
              <Button
                onClick={exportTranscription}
                variant="outline"
                size="sm"
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                导出
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">转录文本</label>
              <textarea
                value={editForm.transcription || ''}
                onChange={(e) => setEditForm({...editForm, transcription: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[300px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入转录文本"
              />
            </div>
            {recording.verbatimTranscript && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">逐字稿</label>
                <textarea
                  value={editForm.verbatimTranscript || ''}
                  onChange={(e) => setEditForm({...editForm, verbatimTranscript: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入逐字稿"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {recording.transcription ? (
              <>
                <div className="prose max-w-none">
                  <div className="bg-gray-50 rounded-lg p-6 text-gray-800 whitespace-pre-wrap">
                    {recording.transcription}
                  </div>
                </div>
                
                {recording.verbatimTranscript && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">逐字稿</h4>
                      <div className="bg-purple-50 rounded-lg p-6 text-purple-900 whitespace-pre-wrap">
                        {recording.verbatimTranscript}
                      </div>
                    </div>
                  </>
                )}
                
                {/* Word Statistics */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {recording.transcription.length}
                    </p>
                    <p className="text-sm text-gray-600">字符数</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {recording.transcription.split(/\s+/).length}
                    </p>
                    <p className="text-sm text-gray-600">词数</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {recording.transcription.split(/[。！？.!?]+/).filter(s => s.trim()).length}
                    </p>
                    <p className="text-sm text-gray-600">句数</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <MicIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">暂无转录内容</p>
                <Button
                  onClick={generateTranscription}
                  disabled={transcribing}
                >
                  {transcribing ? '转录中...' : '开始转录'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RecordingTranscription;
