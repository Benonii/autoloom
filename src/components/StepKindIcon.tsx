import { Keyboard, MousePointerClick, Navigation } from 'lucide-react';

import type { StepKind } from '@/types';

interface StepKindIconProps {
  kind: StepKind;
}

export function StepKindIcon({ kind }: StepKindIconProps) {
  if (kind === 'type') return <Keyboard aria-hidden className='size-4 shrink-0 opacity-70' />;
  if (kind === 'click') return <MousePointerClick aria-hidden className='size-4 shrink-0 opacity-70' />;
  return <Navigation aria-hidden className='size-4 shrink-0 opacity-70' />;
}
