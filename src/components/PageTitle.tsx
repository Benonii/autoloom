import type { ReactNode } from 'react';

interface PageTitleProps {
  title: string;
  description?: ReactNode;
}

export function PageTitle({ title, description }: PageTitleProps) {
  return (
    <div className='mx-auto mb-6 max-w-2xl text-center sm:mb-10'>
      <h1 className='text-balance text-lg font-bold leading-[1.1] tracking-[-0.03em] sm:text-2xl'>{title}</h1>
      {description && <p className='mt-2 text-xs leading-relaxed text-muted-foreground sm:text-xs'>{description}</p>}
    </div>
  );
}
