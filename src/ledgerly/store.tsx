import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { initialState } from '@/ledgerly/data';

import type { LedgerlyState, Toast } from '@/ledgerly/types';
import type { ReactNode } from 'react';

const storageKey = 'ledgerly-state';

interface LedgerlyContextValue {
  state: LedgerlyState;
  update: (change: (state: LedgerlyState) => LedgerlyState) => void;
  toasts: Toast[];
  notify: (message: string) => void;
  reset: () => void;
}

const LedgerlyContext = createContext<LedgerlyContextValue | null>(null);

function readStoredState(): LedgerlyState {
  try {
    const stored = window.sessionStorage.getItem(storageKey);
    return stored ? (JSON.parse(stored) as LedgerlyState) : initialState;
  } catch {
    return initialState;
  }
}

export function LedgerlyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LedgerlyState>(initialState);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setState(readStoredState());
  }, []);

  const update = useCallback((change: (state: LedgerlyState) => LedgerlyState) => {
    setState((current) => {
      const next = change(current);
      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const notify = useCallback((message: string) => {
    const id = Date.now();
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3500);
  }, []);

  const reset = useCallback(() => update(() => initialState), [update]);

  const value = useMemo(() => ({ state, update, toasts, notify, reset }), [state, update, toasts, notify, reset]);
  return <LedgerlyContext.Provider value={value}>{children}</LedgerlyContext.Provider>;
}

export function useLedgerly(): LedgerlyContextValue {
  const context = useContext(LedgerlyContext);
  if (!context) throw new Error('useLedgerly must be used inside LedgerlyProvider');
  return context;
}
