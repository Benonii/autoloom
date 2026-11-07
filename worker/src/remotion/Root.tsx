import { Composition } from 'remotion';

import { Launch } from './Launch';
import { Walkthrough } from './Walkthrough';
import { launchTiming } from './launchTiming';

import type { LaunchProps, WalkthroughProps } from '../types';

const fps = 30;

const defaultProps: WalkthroughProps = {
  takeFile: 'take.webm',
  viewport: { width: 1280, height: 720 },
  segments: [],
  totalSeconds: 1
};

const defaultLaunchProps: LaunchProps = {
  takeFile: 'take.webm',
  musicFile: null,
  viewport: { width: 1280, height: 720 },
  hostname: 'acme.com',
  headline: 'Send invoices in seconds',
  closingLine: 'Try it today',
  scenes: [],
  finalFrameSeconds: 0
};

function readLaunchSeconds(props: LaunchProps): number {
  return launchTiming.introSeconds + props.scenes.length * launchTiming.sceneSeconds + launchTiming.outroSeconds;
}

export function RemotionRoot() {
  return (
    <>
      <Composition
        id='Launch'
        component={Launch}
        fps={fps}
        width={1280}
        height={720}
        durationInFrames={fps}
        defaultProps={defaultLaunchProps}
        calculateMetadata={({ props }) => ({ durationInFrames: Math.ceil(readLaunchSeconds(props) * fps) })}
      />
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
    </>
  );
}
