import { useAction, useQuery } from 'convex/react';
import { Bot, Check, Copy, KeyRound } from 'lucide-react';
import { useState } from 'react';

import { AppShell } from '@/components/AppShell';
import { PageTitle } from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/convexApi';
import { readErrorMessage } from '@/lib/errors';
import { useDeviceID } from '@/lib/hooks';

const examplePrompt = 'Can you record a video of the invoice flow on autoloom-app.vercel.app/ledgerly using Autoloom?';

interface CopyBlockProps {
  label: string;
  text: string;
}

function CopyBlock({ label, text }: CopyBlockProps) {
  const [isCopied, setIsCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-[0.7rem] font-bold'>{label}</span>
        <Button variant='outline' size='sm' onClick={copy} aria-label={`Copy ${label}`}>
          {isCopied ? <Check /> : <Copy />}
          {isCopied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <code className='block overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-muted p-3.5 font-mono text-[0.7rem] leading-relaxed'>
        {text}
      </code>
    </div>
  );
}

export function ConnectScreen() {
  const deviceID = useDeviceID();
  const hasKey = useQuery(api.agents.hasKey, deviceID ? { deviceID } : 'skip');
  const createKey = useAction(api.agents.createKey);
  const [agentKey, setAgentKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function makeKey() {
    setIsCreating(true);
    setErrorMessage(null);
    try {
      setAgentKey(await createKey({ deviceID }));
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  }

  const serverURL = typeof window === 'undefined' ? '' : `${window.location.origin}/api/mcp`;

  return (
    <AppShell>
      <PageTitle
        title='Let your AI agent make videos'
        description='Connect Autoloom to Claude or any MCP client. Then just ask for a video, and your agent asks what it needs, records it, and sends you the link.'
      />
      <div className='mx-auto flex max-w-2xl flex-col gap-6'>
        <section className='flex flex-col gap-4 rounded-3xl border bg-card p-4 sm:p-7'>
          <h2 className='flex items-center gap-2 text-xs font-bold'>
            <KeyRound className='size-5 text-primary' />
            1. Make a key
          </h2>
          {!agentKey && (
            <>
              <p className='text-xs leading-relaxed text-muted-foreground'>
                Videos your agent makes show up in Your videos on this browser.
                {hasKey && ' You already have a key. Making a new one turns the old one off.'}
              </p>
              <Button
                size='xl'
                onClick={makeKey}
                disabled={isCreating || !deviceID}
                className='rounded-2xl font-bold sm:self-start'
              >
                {isCreating ? 'Making key' : hasKey ? 'Make a new key' : 'Make a key'}
              </Button>
            </>
          )}
          {agentKey && (
            <>
              <CopyBlock label='Your key' text={agentKey} />
              <p className='text-[0.7rem] text-muted-foreground'>This is the only time it is shown. Keep it private.</p>
            </>
          )}
          {errorMessage && (
            <p role='alert' className='text-[0.7rem] font-semibold text-destructive'>
              {errorMessage}
            </p>
          )}
        </section>
        {agentKey && (
          <section className='flex flex-col gap-5 rounded-3xl border bg-card p-4 sm:p-7'>
            <h2 className='flex items-center gap-2 text-xs font-bold'>
              <Bot className='size-5 text-primary' />
              2. Add it to your agent
            </h2>
            <CopyBlock
              label='Claude Code'
              text={`claude mcp add --transport http autoloom ${serverURL} --header "Authorization: Bearer ${agentKey}"`}
            />
            <CopyBlock label='Claude.ai and other apps (connector address)' text={`${serverURL}?key=${agentKey}`} />
          </section>
        )}
        <section className='flex flex-col gap-3 rounded-3xl bg-muted p-4 sm:p-7'>
          <h2 className='text-xs font-bold'>{agentKey ? '3. Ask for a video' : 'Then ask for a video'}</h2>
          <p className='text-xs italic leading-relaxed'>“{examplePrompt}”</p>
          <p className='text-[0.7rem] leading-relaxed text-muted-foreground'>
            If the app needs a login, your agent sends you a secure link to type it in. Passwords never pass through the
            AI.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
