import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  MessageSquare,
  Sparkles,
  Volume2
} from 'lucide-react';

interface TranscriptionSegment {
  text: string;
  startTime: number | null;
  endTime?: number;
  isPartial: boolean;
  speaker?: string;
}

interface LiveTranscriptProps {
  transcriptSegments: TranscriptionSegment[];
  partialSegment: TranscriptionSegment | null;
  isRecording: boolean;
}

function LiveTranscript({ transcriptSegments, partialSegment, isRecording }: LiveTranscriptProps) {
  const formatSegmentTimestamp = (value?: number | null): string => {
    if (!value) {
      return '--:--:--';
    }
    return new Date(value).toLocaleTimeString();
  };

  const getSpeakerColor = (speaker?: string) => {
    const colors = [
      'from-accent/20 to-primary/20 border-accent/30',
      'from-success/20 to-success/20 border-success/30',
      'from-warning/20 to-destructive/20 border-warning/30',
      'from-accent/20 to-accent/20 border-accent/30',
    ];
    
    if (!speaker) return colors[0];
    
    // Simple hash to get consistent color for speaker
    const hash = speaker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <Card className="bg-background/40 backdrop-blur-xl border-border/10 flex-1 flex flex-col">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">实时语音识别</h2>
            {isRecording && (
              <div className="flex items-center gap-2 px-3 py-1 bg-destructive/20 rounded-full">
                <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                <span className="text-destructive text-xs font-medium">LIVE</span>
              </div>
            )}
          </div>
          <MessageSquare className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          {/* Partial/Live Segment */}
          {partialSegment && (
            <div className="sticky top-0 z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-warning/20 to-destructive/20 rounded-xl blur-xl animate-pulse" />
                <div className="relative bg-gradient-to-r from-warning/10 to-destructive/10 rounded-xl p-4 border border-warning/30">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Volume2 className="w-5 h-5 text-warning animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-warning">
                            {partialSegment.speaker || 'Speaker'}
                          </span>
                          <Sparkles className="w-3 h-3 text-warning animate-pulse" />
                        </div>
                        <span className="text-xs text-warning/70">
                          {formatSegmentTimestamp(partialSegment.startTime)}
                        </span>
                      </div>
                      <p className="text-white/90 leading-relaxed">
                        {partialSegment.text}
                        <span className="inline-block w-2 h-4 ml-1 bg-white/50 animate-pulse" />
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Completed Segments */}
          {transcriptSegments.length === 0 && !partialSegment ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <MessageSquare className="w-16 h-16 text-white/10 mb-4" />
              <p className="text-white/40 text-center">
                {isRecording 
                  ? '等待说话...' 
                  : '开始录音以查看实时语音识别'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transcriptSegments.map((segment, index) => {
                const segmentNumber = transcriptSegments.length - index;
                const key = `${segment.startTime ?? 'segment'}-${index}`;
                const speakerColor = getSpeakerColor(segment.speaker);

                return (
                  <div 
                    key={key}
                    className={`bg-gradient-to-r ${speakerColor} rounded-xl p-4 border transition-all duration-300 hover:scale-[1.02]`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white/70 font-medium">
                            {segment.speaker ? segment.speaker.slice(-1) : segmentNumber}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-white/70">
                            {segment.speaker || `Segment ${segmentNumber}`}
                          </span>
                          <span className="text-xs text-white/50">
                            {formatSegmentTimestamp(segment.startTime)}
                          </span>
                        </div>
                        <p className="text-white/90 leading-relaxed">
                          {segment.text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default LiveTranscript;
