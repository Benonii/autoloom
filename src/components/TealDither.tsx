import { Dithering } from '@paper-design/shaders-react';

import { usePrefersReducedMotion } from '@/lib/hooks';
import { cn } from '@/lib/utils';

import type { DitheringShape } from '@paper-design/shaders';

interface TealDitherProps {
  shape?: DitheringShape;
  className?: string;
}

export function TealDither({ shape = 'warp', className }: TealDitherProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  return (
    <Dithering
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 size-full', className)}
      colorBack='#00000000'
      colorFront='#99f6e4'
      shape={shape}
      type='4x4'
      size={2}
      speed={prefersReducedMotion ? 0 : 0.35}
    />
  );
}
