import { Check, CircleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { StepStatus, WalkthroughStep } from '@/types';

interface StepListProps {
  steps: WalkthroughStep[];
}

export function StepList({ steps }: StepListProps) {
  if (steps.length === 0) {
    return <p className='rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground'>Planning the steps</p>;
  }
  return (
    <ol className='flex flex-col gap-1'>
      {steps.map((step, index) => (
        <li
          key={step.id}
          style={{ animationDelay: `${index * 70}ms` }}
          className={cn(
            'flex items-start gap-3 rounded-2xl px-3 py-2.5 sm:py-3 animate-[step-arrive_420ms_cubic-bezier(0.16,1,0.3,1)_both]',
            step.status === 'active' && 'bg-tint',
            step.status === 'stuck' && 'bg-[#fff1e8]'
          )}
        >
          <StepMarker status={step.status} position={index + 1} />
          <div className='min-w-0 pt-0.5'>
            <p
              className={cn(
                'text-[0.9rem] font-semibold sm:text-[0.95rem]',
                step.status === 'waiting' && 'text-muted-foreground',
                step.status === 'active' && 'text-tint-foreground',
                step.status === 'stuck' && 'text-destructive'
              )}
            >
              {step.title}
            </p>
            {step.status === 'active' && <p className='mt-1 text-sm text-tint-foreground/90'>Recording this step</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

interface StepMarkerProps {
  status: StepStatus;
  position: number;
}

function StepMarker({ status, position }: StepMarkerProps) {
  if (status === 'done') {
    return (
      <span className='grid size-7 shrink-0 place-items-center rounded-full bg-foreground text-white'>
        <Check className='size-4' />
      </span>
    );
  }
  if (status === 'stuck') {
    return (
      <span className='grid size-7 shrink-0 place-items-center rounded-full bg-destructive text-white'>
        <CircleAlert className='size-4' />
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className='grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white animate-[live-pulse_1.6s_ease-in-out_infinite]'>
        {position}
      </span>
    );
  }
  return (
    <span className='grid size-7 shrink-0 place-items-center rounded-full border text-sm font-semibold text-muted-foreground tabular'>
      {position}
    </span>
  );
}
