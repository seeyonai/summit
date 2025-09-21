import { useState } from 'react';
import { apiUrl } from '@/services/api';

export const audioUrlFor = (filename: string) => apiUrl(`/files/${filename}`);

export function useAudioPlayback() {
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioRefs, setAudioRefs] = useState<{ [key: string]: HTMLAudioElement }>({});

  const toggleAudioPlayback = (recordingId: string, audioUrl: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (playingAudio === recordingId) {
      audioRefs[recordingId]?.pause();
      setPlayingAudio(null);
    } else {
      // Pause any currently playing audio
      if (playingAudio && audioRefs[playingAudio]) {
        audioRefs[playingAudio].pause();
      }
      
      // Create or get audio element
      if (!audioRefs[recordingId]) {
        const audio = new Audio(audioUrl);
        audio.onended = () => setPlayingAudio(null);
        setAudioRefs(prev => ({ ...prev, [recordingId]: audio }));
        audio.play();
      } else {
        audioRefs[recordingId].play();
      }
      
      setPlayingAudio(recordingId);
    }
  };

  const stopAllAudio = () => {
    if (playingAudio && audioRefs[playingAudio]) {
      audioRefs[playingAudio].pause();
      setPlayingAudio(null);
    }
  };

  return {
    playingAudio,
    toggleAudioPlayback,
    stopAllAudio
  };
}
