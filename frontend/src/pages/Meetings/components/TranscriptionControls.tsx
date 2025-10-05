import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Square, Wifi, AlertCircle } from 'lucide-react';

interface TranscriptionControlsProps {
  isListening: boolean;
  isConnected: boolean;
  status: string;
  message: string;
  onStartListening: () => void;
  onStopListening: () => void;
  onConnect: () => void;
}

function TranscriptionControls({
  isListening,
  isConnected,
  status,
  message,
  onStartListening,
  onStopListening,
  onConnect
}: TranscriptionControlsProps) {
  return (
    <Card className="bg-black/40 backdrop-blur-xl border-white/10">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Transcription Controls</h3>
        
        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${
            status === 'error' 
              ? 'bg-destructive/20 border border-destructive/30' 
              : 'bg-primary/20 border border-primary/30'
          }`}>
            <AlertCircle className={`w-4 h-4 mt-0.5 ${
              status === 'error' ? 'text-destructive' : 'text-primary'
            }`} />
            <p className={`text-sm ${
              status === 'error' ? 'text-destructive' : 'text-primary'
            }`}>
              {message}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {!isConnected ? (
            <Button 
              onClick={onConnect}
              className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white"
            >
              <Wifi className="w-4 h-4 mr-2" />
              Connect Transcription Service
            </Button>
          ) : !isListening ? (
            <Button 
              onClick={onStartListening}
              disabled={status !== 'ready'}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Mic className="w-4 h-4 mr-2" />
              Start Transcription
            </Button>
          ) : (
            <Button 
              onClick={onStopListening}
              className="w-full bg-muted-foreground hover:bg-muted-foreground/90 text-background"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Transcription
            </Button>
          )}
        </div>

      </CardContent>
    </Card>
  );
}

export default TranscriptionControls;
