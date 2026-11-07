import {
  AbsoluteFill,
  Audio,
  Easing,
  Freeze,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from 'remotion';

import type { WalkthroughProps, WalkthroughSegment } from '../types';

const zoomScale = 1.45;
const zoomEase = Easing.bezier(0.16, 1, 0.3, 1);

function readZoom(segments: WalkthroughSegment[], seconds: number, viewport: WalkthroughProps['viewport']) {
  for (const segment of segments) {
    if (!segment.box || !segment.text) continue;
    const start = segment.outputStartSeconds;
    const end = start + segment.outputDurationSeconds;
    if (seconds < start || seconds > end) continue;
    const zoomIn = interpolate(seconds, [start, start + 0.6], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: zoomEase
    });
    const zoomOut = interpolate(seconds, [end - 0.5, end], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: zoomEase
    });
    const amount = Math.min(zoomIn, zoomOut);
    const originX = Math.min(Math.max(segment.box.x + segment.box.width / 2, 0), viewport.width);
    const originY = Math.min(Math.max(segment.box.y + segment.box.height / 2, 0), viewport.height);
    return { scale: 1 + (zoomScale - 1) * amount, originX, originY };
  }
  return { scale: 1, originX: viewport.width / 2, originY: viewport.height / 2 };
}

export function Walkthrough({ takeFile, viewport, segments }: WalkthroughProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scale, originX, originY } = readZoom(segments, frame / fps, viewport);
  return (
    <AbsoluteFill style={{ backgroundColor: '#0b3b38' }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: `${originX}px ${originY}px` }}>
        {segments.map((segment) => {
          const outputStartFrame = Math.round(segment.outputStartSeconds * fps);
          const outputFrames = Math.max(1, Math.round(segment.outputDurationSeconds * fps));
          const takeStartFrame = Math.round(segment.takeStartSeconds * fps);
          const takeFrames = Math.max(
            1,
            Math.min(outputFrames, Math.round((segment.takeEndSeconds - segment.takeStartSeconds) * fps))
          );
          return (
            <Sequence
              key={`video-${segment.outputStartSeconds}`}
              from={outputStartFrame}
              durationInFrames={outputFrames}
            >
              <Sequence durationInFrames={takeFrames}>
                <OffthreadVideo src={staticFile(takeFile)} startFrom={takeStartFrame} muted />
              </Sequence>
              {outputFrames > takeFrames && (
                <Sequence from={takeFrames}>
                  <Freeze frame={takeStartFrame + takeFrames - 1}>
                    <OffthreadVideo src={staticFile(takeFile)} muted />
                  </Freeze>
                </Sequence>
              )}
            </Sequence>
          );
        })}
      </AbsoluteFill>
      {segments.map((segment) =>
        segment.text ? (
          <Sequence
            key={`caption-${segment.outputStartSeconds}`}
            from={Math.round(segment.outputStartSeconds * fps)}
            durationInFrames={Math.max(1, Math.round(segment.outputDurationSeconds * fps))}
          >
            {segment.audioFile && <Audio src={staticFile(segment.audioFile)} />}
            <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40 }}>
              <div
                style={{
                  maxWidth: '82%',
                  background: 'rgba(24,24,27,0.88)',
                  color: 'white',
                  fontSize: 30,
                  lineHeight: 1.3,
                  fontFamily: 'Comfortaa, ui-rounded, system-ui, sans-serif',
                  fontWeight: 700,
                  padding: '14px 26px',
                  borderRadius: 22,
                  textAlign: 'center'
                }}
              >
                {segment.text}
              </div>
            </AbsoluteFill>
          </Sequence>
        ) : null
      )}
    </AbsoluteFill>
  );
}
