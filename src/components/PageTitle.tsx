import type { ReactNode } from 'react';

interface PageTitleProps {
  title: string;
  description?: ReactNode;
}

export function PageTitle({ title, description }: PageTitleProps) {
  return (
    <div className='mb-6 max-w-2xl sm:mb-10'>
      <h1 className='text-balance text-xl font-bold leading-[1.1] tracking-[-0.03em] sm:text-3xl'>{title}</h1>
      {description && (
        <p className='mt-2 text-[0.85rem] leading-relaxed text-muted-foreground sm:text-sm'>{description}</p>
      )}
    </div>
  );
}
