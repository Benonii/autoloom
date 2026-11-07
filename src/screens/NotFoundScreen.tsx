import { Film, Plus } from 'lucide-react';

import { AppShell } from '@/components/AppShell';
import { PageTitle } from '@/components/PageTitle';
import { Button } from '@/components/ui/button';

export function NotFoundScreen() {
  return (
    <AppShell>
      <PageTitle
        title='This page is not available'
        description='The link may be incomplete, or the video was deleted. Check the address, or head back to your videos.'
      />
      <div className='flex flex-col gap-3 sm:flex-row'>
        <Button size='xl' className='rounded-2xl font-bold' render={<a href='/library' />}>
          <Film />
          Your videos
        </Button>
        <Button size='xl' variant='outline' className='rounded-2xl font-bold' render={<a href='/' />}>
          <Plus />
          New video
        </Button>
      </div>
    </AppShell>
  );
}
