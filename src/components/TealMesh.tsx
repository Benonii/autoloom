import { MeshGradient } from '@paper-design/shaders-react';

import { usePrefersReducedMotion } from '@/lib/hooks';
import { tealMeshColors } from '@/lib/shaderPalette';
import { cn } from '@/lib/utils';

interface TealMeshProps {
  className?: string;
}

export function TealMesh({ className }: TealMeshProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  return (
    <MeshGradient
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 size-full', className)}
      colors={tealMeshColors}
      distortion={0.85}
      swirl={0.45}
      grainMixer={0.12}
      grainOverlay={0.08}
      speed={prefersReducedMotion ? 0 : 0.22}
    />
  );
}
