import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void): () => void {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

function readRoute(): string {
  return window.location.hash.replace(/^#\/?/, '') || 'dashboard';
}

function readServerRoute(): string {
  return 'dashboard';
}

export function useRoute(): string {
  return useSyncExternalStore(subscribe, readRoute, readServerRoute);
}

export function navigate(route: string): void {
  window.location.hash = `/${route}`;
}
