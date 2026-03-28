import { useCallback, useEffect, useRef, useState } from 'react';

export interface SessionTimerResult {
  timeSpent: number;          // ms elapsed since session start
  savedThisSession: number;
  avgPerItem: number | null;  // ms per item; null until first save
  eta: number | null;         // ms to finish remaining items; null until first save
  onItemSaved: () => void;
}

export function useSessionTimer(itemsRemaining: number): SessionTimerResult {
  const sessionStart = useRef(Date.now());
  const [, setTick] = useState(0);
  const [savedThisSession, setSavedThisSession] = useState(0);

  // Drive a 1-second clock to re-render live
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const timeSpent = Date.now() - sessionStart.current;
  const avgPerItem = savedThisSession > 0 ? timeSpent / savedThisSession : null;
  const eta = avgPerItem !== null ? itemsRemaining * avgPerItem : null;

  const onItemSaved = useCallback(() => {
    setSavedThisSession(s => s + 1);
  }, []);

  return { timeSpent, savedThisSession, avgPerItem, eta, onItemSaved };
}
