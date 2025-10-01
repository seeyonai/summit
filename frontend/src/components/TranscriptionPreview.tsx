import { useRef, useEffect, useState } from 'react';

interface TranscriptionPreviewProps {
  transcription: string;
  className?: string;
}

function TranscriptionPreview({ transcription, className = '' }: TranscriptionPreviewProps) {
  const transcriptionRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const scrollAnimationRef = useRef<number | null>(null);

  // Auto-scroll effect for transcription preview
  useEffect(() => {
    if (!isHovering || !transcriptionRef.current) {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
        scrollAnimationRef.current = null;
      }
      // Reset scroll position when not hovering
      if (transcriptionRef.current && !isHovering) {
        transcriptionRef.current.scrollTop = 0;
      }
      return;
    }

    const element = transcriptionRef.current;
    const maxScroll = element.scrollHeight - element.clientHeight;
    
    if (maxScroll <= 0) return; // No need to scroll if content fits

    const scrollSpeed = 0.3; // pixels per frame (adjust for speed)
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      // Smooth scroll down
      const newScrollTop = Math.min((elapsed * scrollSpeed) / 16, maxScroll);
      if (element) {
        element.scrollTop = newScrollTop;
      }

      // Continue animation if not at bottom and still hovering
      if (newScrollTop < maxScroll && isHovering) {
        scrollAnimationRef.current = requestAnimationFrame(animate);
      }
    };

    scrollAnimationRef.current = requestAnimationFrame(animate);

    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
    };
  }, [isHovering]);

  return (
    <div 
      className={`relative p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden group ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div 
        ref={transcriptionRef}
        className="max-h-12 overflow-hidden transition-all duration-300"
        style={{
          maskImage: isHovering 
            ? 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)' 
            : 'none',
          WebkitMaskImage: isHovering 
            ? 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)' 
            : 'none'
        }}
      >
        <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {transcription}
        </p>
      </div>
      {/* Fade indicator at bottom when not hovering */}
      {!isHovering && transcription.length > 100 && (
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-gray-50 dark:from-gray-800/50 to-transparent pointer-events-none" />
      )}
    </div>
  );
}

export default TranscriptionPreview;
