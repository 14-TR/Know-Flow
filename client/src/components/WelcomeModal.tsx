import { useState } from 'react';
import './WelcomeModal.css';

const WELCOME_KEY = 'piq_welcome_seen_v2';

export function useWelcomeSeen(): [boolean, () => void] {
  const [seen, setSeen] = useState<boolean>(
    () => localStorage.getItem(WELCOME_KEY) === '1'
  );

  const markSeen = () => {
    localStorage.setItem(WELCOME_KEY, '1');
    setSeen(true);
  };

  return [seen, markSeen];
}

interface WelcomeModalProps {
  onClose: () => void;
  onGoToProcesses?: () => void;
  onGoToProjects?: () => void;
}

const STEPS = [
  {
    id: 'welcome',
    icon: '🎲',
    title: 'Welcome to ProjectIQ',
    subtitle: 'AI-powered project intelligence',
    body: (
      <>
        <p>
          ProjectIQ models your work as structured workflows — so you always know
          where a project stands, what decisions were made, and what comes next.
        </p>
        <p>
          We've loaded a few demo projects so you can explore right away. No setup needed.
        </p>
      </>
    ),
  },
  {
    id: 'processes',
    icon: '🔀',
    title: 'Start with Processes',
    subtitle: 'Define reusable workflow templates',
    body: (
      <>
        <p>
          A <strong>Process</strong> is a node graph that defines the steps, decisions,
          and paths for a type of work — like "onboarding a client" or "shipping a feature."
        </p>
        <p>
          Build it once. Run it as many times as you need. Each run becomes a tracked
          <strong> Project</strong>.
        </p>
        <div className="welcome-tip">
          <span className="welcome-tip-icon">💡</span>
          Try opening the <strong>ProjectIQ Development Roadmap</strong> process to see
          a real example.
        </div>
      </>
    ),
  },
  {
    id: 'projects',
    icon: '📋',
    title: 'Track Projects',
    subtitle: 'Follow real work through the process',
    body: (
      <>
        <p>
          When you start a <strong>Project</strong>, it's a live instance of a process.
          Click any node to mark it complete, log decisions, fill forms, or add notes.
        </p>
        <p>
          The progress bar tracks completion automatically, and edges light up
          as you move through the flow.
        </p>
        <div className="welcome-tip">
          <span className="welcome-tip-icon">💡</span>
          Open <strong>ProjectIQ v1.0 Development</strong> in Projects to see tracked progress.
        </div>
      </>
    ),
  },
  {
    id: 'ready',
    icon: '🚀',
    title: "You're all set",
    subtitle: 'Explore, experiment, build',
    body: (
      <>
        <p>
          The demo data is yours to explore. Create processes, spin up projects,
          mark nodes complete — nothing here is precious.
        </p>
        <ul className="welcome-checklist">
          <li>
            <span className="welcome-check">✓</span>
            <span>Open a process and explore the node graph</span>
          </li>
          <li>
            <span className="welcome-check">✓</span>
            <span>Click a node in a project to update its status</span>
          </li>
          <li>
            <span className="welcome-check">✓</span>
            <span>Press <kbd>?</kbd> anytime to see keyboard shortcuts</span>
          </li>
          <li>
            <span className="welcome-check">✓</span>
            <span>Use the Graph Explorer to search across all processes</span>
          </li>
        </ul>
      </>
    ),
  },
];

export default function WelcomeModal({ onClose, onGoToProcesses, onGoToProjects }: WelcomeModalProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) setStep(step - 1);
  };

  return (
    <div className="welcome-overlay" role="dialog" aria-modal="true" aria-label="Welcome to ProjectIQ">
      <div className="welcome-modal">
        {/* Progress dots */}
        <div className="welcome-progress">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              className={`welcome-dot${i === step ? ' active' : i < step ? ' done' : ''}`}
              onClick={() => setStep(i)}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="welcome-icon">{current.icon}</div>
        <h2 className="welcome-title">{current.title}</h2>
        <p className="welcome-subtitle">{current.subtitle}</p>
        <div className="welcome-body">{current.body}</div>

        {/* Actions */}
        <div className="welcome-actions">
          {!isFirst && (
            <button className="welcome-btn welcome-btn-ghost" onClick={handleBack}>
              ← Back
            </button>
          )}
          <div style={{ flex: 1 }} />

          {/* Contextual shortcut buttons */}
          {step === 1 && onGoToProcesses && (
            <button
              className="welcome-btn welcome-btn-secondary"
              onClick={() => { onGoToProcesses(); onClose(); }}
            >
              View Processes
            </button>
          )}
          {step === 2 && onGoToProjects && (
            <button
              className="welcome-btn welcome-btn-secondary"
              onClick={() => { onGoToProjects(); onClose(); }}
            >
              View Projects
            </button>
          )}

          <button className="welcome-btn welcome-btn-primary" onClick={handleNext}>
            {isLast ? 'Get Started' : 'Next →'}
          </button>
        </div>

        {/* Skip link */}
        {!isLast && (
          <button className="welcome-skip" onClick={onClose}>
            Skip tour
          </button>
        )}
      </div>
    </div>
  );
}
