import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  videoURL: string | null;
  title: string;
  isRevealed?: boolean;
  onTimeChange?: (seconds: number) => void;
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(function VideoPlayer(
  { videoURL, title, isRevealed = false, onTimeChange },
  reference
) {
  return (
    <div
      className={cn(
        'relative z-10 overflow-hidden rounded-3xl bg-foreground p-1.5 shadow-[0_24px_48px_-28px_rgb(24_24_27/0.55)]',
        isRevealed && 'animate-[reel-reveal_700ms_cubic-bezier(0.16,1,0.3,1)_both]'
      )}
    >
      {videoURL ? (
        <video
          ref={reference}
          src={videoURL}
          controls
          playsInline
          preload='metadata'
          aria-label={title}
          onTimeUpdate={(event) => onTimeChange?.(event.currentTarget.currentTime)}
          className='aspect-video w-full rounded-[1.25rem] bg-black'
        />
      ) : (
        <div className='grid aspect-video w-full place-items-center rounded-[1.25rem] bg-black/60 text-white/80'>
          Making your video
        </div>
      )}
    </div>
  );
});
