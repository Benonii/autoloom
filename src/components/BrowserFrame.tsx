import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface BrowserFrameProps {
  url: string;
  isLive?: boolean;
  children: ReactNode;
  className?: string;
}

export function BrowserFrame({ url, isLive = false, children, className }: BrowserFrameProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-3xl border bg-white shadow-[0_18px_40px_-24px_rgb(24_24_27/0.35)]',
        className
      )}
    >
      <div className='flex items-center gap-3 border-b bg-muted px-4 py-2.5'>
        <div className='flex gap-1.5'>
          <span className='size-2.5 rounded-full bg-border' />
          <span className='size-2.5 rounded-full bg-border' />
          <span className='size-2.5 rounded-full bg-border' />
        </div>
        <div className='flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs text-muted-foreground'>
          <Lock className='size-3 shrink-0' />
          <span className='truncate'>{url}</span>
        </div>
        {isLive && (
          <span className='flex shrink-0 items-center gap-2 rounded-full bg-foreground px-3 py-1 text-sm font-bold text-white'>
            <span className='size-2 rounded-full bg-glow animate-[live-pulse_1.6s_ease-in-out_infinite]' />
            Live
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
