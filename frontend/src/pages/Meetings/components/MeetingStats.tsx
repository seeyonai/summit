import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp,
  Clock,
  Users,
  MessageSquare,
  Activity
} from 'lucide-react';

interface MeetingStatsProps {
  transcriptionStats: {
    charCount: number;
    wordCount: number;
    segmentCount: number;
  };
  recordingTime: number;
  participantCount: number;
}

export function MeetingStats({ 
  transcriptionStats, 
  recordingTime, 
  participantCount 
}: MeetingStatsProps) {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const estimatedDuration = 3600; // 1 hour estimated meeting duration
  const progress = Math.min((recordingTime / estimatedDuration) * 100, 100);

  return (
    <Card className="bg-black/40 backdrop-blur-xl border-white/10">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Meeting Statistics</h3>
          <TrendingUp className="w-5 h-5 text-green-400" />
        </div>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/70">Meeting Progress</span>
              <span className="text-sm text-white/90">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-white/10">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </Progress>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-white/50">Duration</span>
              </div>
              <p className="text-lg font-semibold text-white">
                {formatTime(recordingTime)}
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-white/50">Participants</span>
              </div>
              <p className="text-lg font-semibold text-white">
                {participantCount}
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-green-400" />
                <span className="text-xs text-white/50">Words</span>
              </div>
              <p className="text-lg font-semibold text-white">
                {transcriptionStats.wordCount.toLocaleString()}
              </p>
            </div>

            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-white/50">Segments</span>
              </div>
              <p className="text-lg font-semibold text-white">
                {transcriptionStats.segmentCount}
              </p>
            </div>
          </div>

          {/* Activity Indicator */}
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-3 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm text-white/70">Speech Activity</span>
              </div>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 h-${Math.random() > 0.5 ? '4' : '2'} bg-green-400 rounded-full animate-pulse`}
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
