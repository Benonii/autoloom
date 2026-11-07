import { Composition } from 'remotion';

import { Walkthrough } from './Walkthrough';

import type { WalkthroughProps } from '../types';

const fps = 30;

const defaultProps: WalkthroughProps = {
  takeFile: 'take.webm',
  viewport: { width: 1280, height: 720 },
  segments: [],
  totalSeconds: 1
};

export function RemotionRoot() {
  return (
    <Composition
      id='Walkthrough'
      component={Walkthrough}
      fps={fps}
      width={1280}
      height={720}
      durationInFrames={fps}
      defaultProps={defaultProps}
      calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, Math.ceil(props.totalSeconds * fps)) })}
    />
  );
}
