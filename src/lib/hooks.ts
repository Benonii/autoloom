import { useEffect, useState, useSyncExternalStore } from 'react';

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
const deviceIDStorageKey = 'autoloom-device-id';

function subscribeToReducedMotion(callback: () => void): () => void {
  const mediaQuery = window.matchMedia(reducedMotionQuery);
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function readPrefersReducedMotion(): boolean {
  return window.matchMedia(reducedMotionQuery).matches;
}

function readServerPrefersReducedMotion(): boolean {
  return true;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeToReducedMotion, readPrefersReducedMotion, readServerPrefersReducedMotion);
}

function subscribeToNothing(): () => void {
  return () => undefined;
}

function readDeviceID(): string {
  try {
    const storedDeviceID = window.localStorage.getItem(deviceIDStorageKey);
    if (storedDeviceID) return storedDeviceID;
    const createdDeviceID = crypto.randomUUID();
    window.localStorage.setItem(deviceIDStorageKey, createdDeviceID);
    return createdDeviceID;
  } catch {
    return 'shared-device';
  }
}

let cachedDeviceID: string | null = null;

function readCachedDeviceID(): string {
  cachedDeviceID = cachedDeviceID ?? readDeviceID();
  return cachedDeviceID;
}

function readServerDeviceID(): string {
  return '';
}

export function useDeviceID(): string {
  return useSyncExternalStore(subscribeToNothing, readCachedDeviceID, readServerDeviceID);
}

export function useNow(intervalMilliseconds: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMilliseconds);
    return () => clearInterval(timer);
  }, [intervalMilliseconds]);
  return now;
}

function readEmptyText(): string {
  return '';
}

export function useSearchParameter(name: string): string {
  return useSyncExternalStore(
    subscribeToNothing,
    () => new URLSearchParams(window.location.search).get(name) ?? '',
    readEmptyText
  );
}
