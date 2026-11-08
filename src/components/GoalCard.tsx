import { useState } from 'react';

import { Button } from '@/components/ui/button';

const longGoalLength = 140;

interface GoalCardProps {
  goal: string;
}

export function GoalCard({ goal }: GoalCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = goal.length > longGoalLength;
  return (
    <figure className='mx-auto mb-6 flex max-w-2xl flex-col gap-1.5 rounded-2xl border bg-card px-4 py-3 sm:mb-8'>
      <figcaption className='text-[0.7rem] font-bold text-muted-foreground'>Prompt</figcaption>
      <blockquote
        className={isLong && !isExpanded ? 'line-clamp-2 text-xs leading-relaxed' : 'text-xs leading-relaxed'}
      >
        {goal}
      </blockquote>
      {isLong && (
        <Button
          variant='link'
          size='xs'
          className='h-auto self-start px-0 text-xs font-bold text-primary sm:h-auto sm:text-xs'
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((wasExpanded) => !wasExpanded)}
        >
          {isExpanded ? 'Show less' : 'Show all'}
        </Button>
      )}
    </figure>
  );
}
