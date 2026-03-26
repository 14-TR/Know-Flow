import { useEffect } from 'react';

interface ShortcutEntry {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  group: string;
  shortcuts: ShortcutEntry[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    group: 'Navigation',
    shortcuts: [
      { keys: ['g', 'p'], description: 'Go to Processes' },
      { keys: ['g', 'j'], description: 'Go to Projects' },
      { keys: ['g', 'e'], description: 'Go to Explorer' },
    ],
  },
  {
    group: 'Actions',
    shortcuts: [
      { keys: ['n'], description: 'New process / New project' },
      { keys: ['/'], description: 'Focus search (Explorer)' },
    ],
  },
  {
    group: 'Editor',
    shortcuts: [
      { keys: ['Delete'], description: 'Delete selected node or edge' },
      { keys: ['Esc'], description: 'Deselect / close panel' },
      { keys: ['f'], description: 'Fit view' },
      { keys: ['⌘', 'L'], description: 'Auto-layout (vertical)' },
      { keys: ['⌘', '⇧', 'L'], description: 'Auto-layout (horizontal)' },
    ],
  },
  {
    group: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close modal / panel' },
    ],
  },
];

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

function KbdKey({ label }: { label: string }) {
  return <kbd className="kbd">{label}</kbd>;
}

function KeyCombo({ keys }: { keys: string[] }) {
  return (
    <span className="kbd-combo">
      {keys.map((k, i) => (
        <span key={i}>
          {i > 0 && <span className="kbd-then">then</span>}
          <KbdKey label={k} />
        </span>
      ))}
    </span>
  );
}

export default function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onClose]);

  return (
    <div className="ks-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div className="ks-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ks-header">
          <h2 className="ks-title">Keyboard Shortcuts</h2>
          <button className="ks-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="ks-body">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.group} className="ks-group">
              <h3 className="ks-group-title">{group.group}</h3>
              <div className="ks-list">
                {group.shortcuts.map((s, i) => (
                  <div key={i} className="ks-row">
                    <span className="ks-desc">{s.description}</span>
                    <KeyCombo keys={s.keys} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="ks-footer">
          Press <KbdKey label="?" /> anytime to open · <KbdKey label="Esc" /> to close
        </div>
      </div>
    </div>
  );
}
