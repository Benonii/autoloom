import { PulsingBorder } from '@paper-design/shaders-react';

import { usePrefersReducedMotion } from '@/lib/hooks';
import { tealBorderColors } from '@/lib/shaderPalette';

export function LiveGlow() {
  const prefersReducedMotion = usePrefersReducedMotion();
  return (
    <PulsingBorder
      aria-hidden
      className='pointer-events-none absolute inset-0 -z-10'
      aspectRatio='auto'
      colorBack='#00000000'
      colors={tealBorderColors}
      roundness={0.12}
      thickness={0.06}
      softness={0.8}
      intensity={0.22}
      bloom={0.3}
      spots={4}
      spotSize={0.45}
      pulse={0.25}
      smoke={0.35}
      smokeSize={0.5}
      marginLeft={0.012}
      marginRight={0.012}
      marginTop={0.018}
      marginBottom={0.018}
      scale={1}
      speed={prefersReducedMotion ? 0 : 0.6}
    />
  );
}
