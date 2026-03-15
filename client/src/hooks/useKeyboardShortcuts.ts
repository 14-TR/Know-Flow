import { useEffect, useRef } from 'react';

export interface Shortcut {
  key: string;       // e.g. 'n', '?', '/'
  meta?: boolean;    // Cmd/Ctrl
  shift?: boolean;
  description: string;
  group: string;
  handler: () => void;
}

/**
 * Register keyboard shortcuts. Shortcuts are ignored when focus is inside
 * an input, textarea, or select element (unless `allowInInput` is true).
 */
export function useKeyboardShortcuts(
  shortcuts: Shortcut[],
  allowInInput = false,
) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isEditable =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        (e.target as HTMLElement)?.isContentEditable;

      if (!allowInInput && isEditable) return;

      for (const shortcut of shortcutsRef.current) {
        const metaMatch = shortcut.meta
          ? e.metaKey || e.ctrlKey
          : !e.metaKey && !e.ctrlKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const keyMatch = e.key === shortcut.key;

        if (metaMatch && shiftMatch && keyMatch) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [allowInInput]);
}

/**
 * Sequence shortcut hook for two-key combos like "g p" (press g, then p).
 * First key must be pressed within `timeoutMs` of the second.
 */
export function useSequenceShortcuts(
  sequences: Array<{
    keys: [string, string];
    description: string;
    group: string;
    handler: () => void;
  }>,
  timeoutMs = 1000,
) {
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(sequences);
  seqRef.current = sequences;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isEditable =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        (e.target as HTMLElement)?.isContentEditable;
      if (isEditable) return;

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (pending.current) {
        // Check for completion
        for (const seq of seqRef.current) {
          if (seq.keys[0] === pending.current && seq.keys[1] === e.key) {
            e.preventDefault();
            if (timer.current) clearTimeout(timer.current);
            pending.current = null;
            seq.handler();
            return;
          }
        }
        pending.current = null;
        if (timer.current) clearTimeout(timer.current);
      }

      // Check if this key could start a sequence
      const startsSeq = seqRef.current.some(seq => seq.keys[0] === e.key);
      if (startsSeq) {
        pending.current = e.key;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          pending.current = null;
        }, timeoutMs);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [timeoutMs]);
}
