import { Bot, Film, Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

interface AppShellProps {
  children: ReactNode;
  isCreateHidden?: boolean;
}

export function AppShell({ children, isCreateHidden = false }: AppShellProps) {
  return (
    <div className='min-h-dvh text-sm'>
      <header className='mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8 sm:py-6'>
        <a href='/library' className='flex items-center gap-2 text-xs font-bold sm:text-xs tracking-tight'>
          <span className='grid size-8 place-items-center rounded-xl bg-primary text-white'>
            <svg aria-hidden='true' width='14' height='14' viewBox='0 0 14 14'>
              <path d='M3 2l9 5-9 5z' fill='currentColor' />
            </svg>
          </span>
          Autoloom
        </a>
        <nav className='flex items-center gap-1 sm:gap-2'>
          <Button variant='ghost' size='lg' render={<a href='/connect' />} aria-label='Agents'>
            <Bot />
            <span className='hidden sm:inline'>Agents</span>
          </Button>
          <Button variant='ghost' size='lg' render={<a href='/library' />} aria-label='Videos'>
            <Film />
            <span className='hidden sm:inline'>Videos</span>
          </Button>
          {!isCreateHidden && (
            <Button variant='outline' size='lg' render={<a href='/' />}>
              <Plus />
              <span className='hidden sm:inline'>New video</span>
            </Button>
          )}
        </nav>
      </header>
      <main className='mx-auto max-w-6xl px-4 pb-24 sm:px-8 sm:pb-16'>{children}</main>
    </div>
  );
}
