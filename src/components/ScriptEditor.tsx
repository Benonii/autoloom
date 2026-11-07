import { useMutation } from 'convex/react';
import { useState } from 'react';

import { StepKindIcon } from '@/components/StepKindIcon';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/convexApi';
import { readErrorMessage } from '@/lib/errors';
import { useDeviceID } from '@/lib/hooks';
import { formatTimestamp } from '@/lib/steps';
import { cn } from '@/lib/utils';

import type { PublicStep } from '@/types';

interface ScriptEditorProps {
  steps: PublicStep[];
  isDisabled: boolean;
}

export function ScriptEditor({ steps, isDisabled }: ScriptEditorProps) {
  return (
    <ol className='flex flex-col gap-2'>
      {steps.map((step) => (
        <ScriptLine key={step.id} step={step} isDisabled={isDisabled} />
      ))}
    </ol>
  );
}

interface ScriptLineProps {
  step: PublicStep;
  isDisabled: boolean;
}

function ScriptLine({ step, isDisabled }: ScriptLineProps) {
  const deviceID = useDeviceID();
  const updateNarration = useMutation(api.videos.updateNarration);
  const [draft, setDraft] = useState(step.narration);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEdited = draft.trim() !== step.narration;

  async function save() {
    if (!isEdited) return;
    try {
      await updateNarration({ deviceID, stepID: step.id, narration: draft });
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    }
  }

  return (
    <li
      className={cn(
        'rounded-2xl border bg-card p-3 transition-colors focus-within:border-primary',
        isEdited && 'border-primary/50 bg-tint/40'
      )}
    >
      <div className='mb-1.5 flex items-center gap-2 text-[0.7rem]'>
        <span className='tabular text-muted-foreground'>{formatTimestamp(step.startSeconds)}</span>
        <StepKindIcon kind={step.kind} />
        <span className='font-semibold'>{step.title}</span>
        {isEdited && <Badge className='ml-auto bg-tint text-tint-foreground'>Unsaved</Badge>}
      </div>
      <textarea
        aria-label={`Narration for ${step.title}`}
        value={draft}
        disabled={isDisabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        rows={1}
        className='w-full resize-none [field-sizing:content] bg-transparent text-xs leading-relaxed outline-none sm:text-xs'
      />
      {errorMessage && (
        <p role='alert' className='mt-1 text-[0.7rem] text-destructive'>
          {errorMessage}
        </p>
      )}
    </li>
  );
}
