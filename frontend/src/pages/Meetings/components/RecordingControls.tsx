import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Mic, 
  Square, 
  Play,
  Wifi,
  AlertCircle
} from 'lucide-react';

interface RecordingControlsProps {
  isRecording: boolean;
  isConnected: boolean;
  status: string;
  message: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onConnect: () => void;
}

export function RecordingControls({
  isRecording,
  isConnected,
  status,
  message,
  onStartRecording,
  onStopRecording,
  onConnect
}: RecordingControlsProps) {
  return (
    <Card className="bg-black/40 backdrop-blur-xl border-white/10">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recording Controls</h3>
        
        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${
            status === 'error' 
              ? 'bg-red-500/20 border border-red-500/30' 
              : 'bg-blue-500/20 border border-blue-500/30'
          }`}>
            <AlertCircle className={`w-4 h-4 mt-0.5 ${
              status === 'error' ? 'text-red-400' : 'text-blue-400'
            }`} />
            <p className={`text-sm ${
              status === 'error' ? 'text-red-300' : 'text-blue-300'
            }`}>
              {message}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {!isConnected ? (
            <Button 
              onClick={onConnect}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
            >
              <Wifi className="w-4 h-4 mr-2" />
              Connect Recording System
            </Button>
          ) : !isRecording ? (
            <Button 
              onClick={onStartRecording}
              disabled={status !== 'ready'}
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white"
            >
              <Mic className="w-4 h-4 mr-2" />
              Start Recording
            </Button>
          ) : (
            <Button 
              onClick={onStopRecording}
              className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Recording
            </Button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
              disabled={!isRecording}
            >
              <Play className="w-4 h-4 mr-1" />
              Pause
            </Button>
            <Button
              variant="outline"
              className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
              disabled={!isRecording}
            >
              Mark Speaker
            </Button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">Audio Quality</span>
            <span className="text-green-400">High (48kHz)</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-white/50">Noise Reduction</span>
            <span className="text-green-400">Active</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
