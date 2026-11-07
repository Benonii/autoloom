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

import { launchTiming } from './launchTiming';

import type { CSSProperties } from 'react';
import type { LaunchProps, LaunchScene } from '../types';

const fontFamily = 'Inter, "Helvetica Neue", Arial, sans-serif';
const accentColor = '#5eead4';
const outEase = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

function Backdrop() {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 40) * 8;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${50 + drift}% ${42 - drift / 2}%, #0f3d3a 0%, #071615 45%, #030707 100%)`
      }}
    />
  );
}

function Grain() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        opacity: 0.07,
        mixBlendMode: 'overlay',
        backgroundImage: 'repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 3px)',
        transform: `translateY(${(frame % 3) - 1}px)`
      }}
    />
  );
}

function Letterbox() {
  const barStyle: CSSProperties = { position: 'absolute', left: 0, right: 0, height: 44, background: '#000' };
  return (
    <AbsoluteFill>
      <div style={{ ...barStyle, top: 0 }} />
      <div style={{ ...barStyle, bottom: 0 }} />
    </AbsoluteFill>
  );
}

interface RevealWordsProps {
  text: string;
  startFrame: number;
  fontSize: number;
}

function RevealWords({ text, startFrame, fontSize }: RevealWordsProps) {
  const frame = useCurrentFrame();
  const words = text.split(' ').map((word, position) => ({ word, wordStart: startFrame + position * 4 }));
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `0 ${fontSize * 0.28}px` }}>
      {words.map(({ word, wordStart }) => {
        const progress = interpolate(frame, [wordStart, wordStart + 14], [0, 1], { ...clamp, easing: outEase });
        return (
          <span key={`${word}-${wordStart}`} style={{ display: 'inline-block', overflow: 'hidden', padding: '0 2px' }}>
            <span
              style={{
                display: 'inline-block',
                transform: `translateY(${(1 - progress) * 105}%)`,
                filter: `blur(${(1 - progress) * 8}px)`,
                opacity: progress,
                fontSize,
                fontWeight: 800,
                letterSpacing: '-0.04em',
                lineHeight: 1.05,
                color: 'white'
              }}
            >
              {word}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function Kicker({ text, startFrame }: { text: string; startFrame: number }) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [startFrame, startFrame + 12], [0, 1], { ...clamp, easing: outEase });
  return (
    <div
      style={{
        opacity: progress,
        letterSpacing: `${0.2 + (1 - progress) * 0.3}em`,
        textTransform: 'uppercase',
        fontSize: 18,
        fontWeight: 700,
        color: accentColor,
        marginBottom: 22
      }}
    >
      {text}
    </div>
  );
}

function Intro({ hostname, headline }: Pick<LaunchProps, 'hostname' | 'headline'>) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const introFrames = launchTiming.introSeconds * fps;
  const pushIn = interpolate(frame, [0, introFrames], [1, 1.06]);
  const exit = interpolate(frame, [introFrames - 6, introFrames], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily }}>
      <div style={{ transform: `scale(${pushIn})`, opacity: exit, textAlign: 'center', maxWidth: 1000 }}>
        <Kicker text={hostname} startFrame={2} />
        <RevealWords text={headline} startFrame={8} fontSize={84} />
      </div>
    </AbsoluteFill>
  );
}

interface SceneProps {
  scene: LaunchScene;
  index: number;
  takeFile: string;
  viewport: LaunchProps['viewport'];
}

function Scene({ scene, index, takeFile, viewport }: SceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sceneFrames = launchTiming.sceneSeconds * fps;
  const takeStartFrame = Math.round(scene.takeStartSeconds * fps);
  const takeFrames = Math.max(
    1,
    Math.min(sceneFrames, Math.round((scene.takeEndSeconds - scene.takeStartSeconds) * fps))
  );
  const direction = index % 2 === 0 ? 1 : -1;
  const entrance = interpolate(frame, [0, 16], [0, 1], { ...clamp, easing: outEase });
  const drift = interpolate(frame, [0, sceneFrames], [0, 1]);
  const rotateY = direction * (-22 + 14 * entrance + 4 * drift);
  const rotateX = 10 - 6 * entrance;
  const cardScale = 0.7 + 0.12 * entrance + 0.04 * drift;
  const zoom = interpolate(frame, [6, sceneFrames], [1, scene.box ? 1.55 : 1.12], { ...clamp, easing: outEase });
  const originX = scene.box ? scene.box.x + scene.box.width / 2 : viewport.width / 2;
  const originY = scene.box ? scene.box.y + scene.box.height / 2 : viewport.height / 2;
  const flash = interpolate(frame, [0, 4], [0.85, 0], clamp);
  const captionProgress = interpolate(frame, [5, 20], [0, 1], { ...clamp, easing: outEase });
  const captionExit = interpolate(frame, [sceneFrames - 5, sceneFrames], [1, 0], clamp);
  const sceneNumber = String(index + 1).padStart(2, '0');
  return (
    <AbsoluteFill style={{ fontFamily }}>
      <AbsoluteFill style={{ perspective: 1600, alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: viewport.width,
            height: viewport.height,
            transform: `translateX(${direction * -70}px) translateY(-36px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${cardScale})`,
            borderRadius: 28,
            overflow: 'hidden',
            boxShadow: `0 60px 120px -30px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.12), 0 0 80px -20px ${accentColor}55`
          }}
        >
          <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${originX}px ${originY}px` }}>
            <Sequence durationInFrames={takeFrames}>
              <OffthreadVideo src={staticFile(takeFile)} startFrom={takeStartFrame} muted />
            </Sequence>
            {sceneFrames > takeFrames && (
              <Sequence from={takeFrames}>
                <Freeze frame={takeStartFrame + takeFrames - 1}>
                  <OffthreadVideo src={staticFile(takeFile)} muted />
                </Freeze>
              </Sequence>
            )}
          </AbsoluteFill>
        </div>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          opacity: captionExit,
          background: `linear-gradient(to top, rgba(3,7,7,0.96) 0%, rgba(3,7,7,0.8) 22%, rgba(3,7,7,0) 48%), linear-gradient(to ${direction === 1 ? 'right' : 'left'}, rgba(3,7,7,0.7) 0%, rgba(3,7,7,0) 45%)`
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: direction === 1 ? 'flex-start' : 'flex-end',
          padding: '0 84px 92px',
          opacity: captionExit
        }}
      >
        <div style={{ overflow: 'hidden', textAlign: direction === 1 ? 'left' : 'right' }}>
          <div
            style={{
              transform: `translateX(${direction * -(1 - captionProgress) * 60}px)`,
              opacity: captionProgress,
              color: accentColor,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '0.2em',
              marginBottom: 6
            }}
          >
            {sceneNumber}
          </div>
          <div
            style={{
              transform: `translateY(${(1 - captionProgress) * 100}%)`,
              color: 'white',
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1,
              textShadow: '0 8px 40px rgba(0,0,0,0.7)'
            }}
          >
            {scene.caption}
          </div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'white', opacity: flash }} />
    </AbsoluteFill>
  );
}

function Outro({
  hostname,
  closingLine,
  takeFile,
  finalFrameSeconds
}: Omit<LaunchProps, 'scenes' | 'musicFile' | 'viewport' | 'headline'>) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const backgroundIn = interpolate(frame, [0, 20], [0, 0.45], clamp);
  const pillProgress = interpolate(frame, [18, 32], [0, 1], { ...clamp, easing: outEase });
  const flash = interpolate(frame, [0, 5], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ fontFamily }}>
      <AbsoluteFill style={{ opacity: backgroundIn, filter: 'blur(18px) saturate(1.3)', transform: 'scale(1.15)' }}>
        <Freeze frame={Math.round(finalFrameSeconds * fps)}>
          <OffthreadVideo src={staticFile(takeFile)} muted />
        </Freeze>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(circle, rgba(3,7,7,0.55) 0%, rgba(3,7,7,0.92) 70%)' }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ maxWidth: 1000 }}>
          <RevealWords text={closingLine} startFrame={4} fontSize={92} />
          <div
            style={{
              marginTop: 34,
              display: 'inline-block',
              opacity: pillProgress,
              transform: `translateY(${(1 - pillProgress) * 20}px)`,
              padding: '14px 30px',
              borderRadius: 999,
              background: accentColor,
              color: '#042f2e',
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '-0.01em'
            }}
          >
            {hostname}
          </div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'white', opacity: flash }} />
    </AbsoluteFill>
  );
}

export function Launch(props: LaunchProps) {
  const { fps } = useVideoConfig();
  const introFrames = launchTiming.introSeconds * fps;
  const sceneFrames = launchTiming.sceneSeconds * fps;
  const outroStart = introFrames + props.scenes.length * sceneFrames;
  return (
    <AbsoluteFill style={{ background: '#030707' }}>
      <Backdrop />
      {props.musicFile && <Audio src={staticFile(props.musicFile)} />}
      <Sequence durationInFrames={introFrames}>
        <Intro hostname={props.hostname} headline={props.headline} />
      </Sequence>
      {props.scenes.map((scene, index) => (
        <Sequence
          key={`${scene.takeStartSeconds}`}
          from={introFrames + index * sceneFrames}
          durationInFrames={sceneFrames}
        >
          <Scene scene={scene} index={index} takeFile={props.takeFile} viewport={props.viewport} />
        </Sequence>
      ))}
      <Sequence from={outroStart}>
        <Outro
          hostname={props.hostname}
          closingLine={props.closingLine}
          takeFile={props.takeFile}
          finalFrameSeconds={props.finalFrameSeconds}
        />
      </Sequence>
      <Grain />
      <Letterbox />
    </AbsoluteFill>
  );
}
