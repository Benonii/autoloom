import { StepKindIcon } from '@/components/StepKindIcon';
import { formatTimestamp } from '@/lib/steps';
import { cn } from '@/lib/utils';

import type { PublicStep } from '@/types';

interface ChapterListProps {
  steps: PublicStep[];
  activeStepID: string | null;
  onSelect: (step: PublicStep) => void;
}

export function ChapterList({ steps, activeStepID, onSelect }: ChapterListProps) {
  return (
    <ol className='flex flex-col'>
      {steps.map((step) => (
        <li key={step.id}>
          <button
            type='button'
            onClick={() => onSelect(step)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted',
              step.id === activeStepID && 'bg-tint text-tint-foreground hover:bg-tint'
            )}
          >
            <span className='w-9 shrink-0 text-xs tabular text-muted-foreground'>
              {formatTimestamp(step.startSeconds)}
            </span>
            <StepKindIcon kind={step.kind} />
            <span className='font-semibold'>{step.title}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
