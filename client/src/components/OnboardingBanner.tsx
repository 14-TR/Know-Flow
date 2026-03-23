import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DISMISSED_KEY = 'piq_onboarding_dismissed';

export function useOnboardingDismissed(): [boolean, () => void] {
  const [dismissed, setDismissed] = useState<boolean>(
    () => localStorage.getItem(DISMISSED_KEY) === '1'
  );

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return [dismissed, dismiss];
}

interface OnboardingBannerProps {
  onDismiss?: () => void;
  firstProcessId?: string;
}

export default function OnboardingBanner({ onDismiss, firstProcessId }: OnboardingBannerProps) {
  const navigate = useNavigate();
  const [seedStatus, setSeedStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const handleLoadDemo = async () => {
    setSeedStatus('loading');
    try {
      const res = await fetch('/api/demo/seed', { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      setSeedStatus('done');
      // Reload page to show new data
      setTimeout(() => window.location.reload(), 800);
    } catch {
      setSeedStatus('error');
      setTimeout(() => setSeedStatus('idle'), 3000);
    }
  };

  return (
    <div className="onboarding-banner" role="region" aria-label="Getting started">
      <div className="onboarding-banner-header">
        <span className="onboarding-banner-title">👋 Getting started with ProjectIQ</span>
        <button
          className="btn btn-icon btn-secondary btn-sm"
          onClick={onDismiss}
          aria-label="Dismiss"
          title="Dismiss"
        >
          ✕
        </button>
      </div>

      <p className="onboarding-banner-desc">
        ProjectIQ models your work as <strong>Processes</strong> (reusable workflow templates)
        and <strong>Projects</strong> (tracked instances of those workflows).
      </p>

      <ol className="onboarding-steps">
        <li>
          <span className="onboarding-step-num">1</span>
          <div>
            <strong>Create a Process</strong> — define the steps, decisions, and flow for a type of work
          </div>
        </li>
        <li>
          <span className="onboarding-step-num">2</span>
          <div>
            <strong>Start a Project</strong> — instantiate the process to track real work through it
          </div>
        </li>
        <li>
          <span className="onboarding-step-num">3</span>
          <div>
            <strong>Track progress</strong> — mark nodes complete, log decisions, and follow the flow
          </div>
        </li>
      </ol>

      <div className="onboarding-banner-actions">
        {firstProcessId && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/process/${firstProcessId}`)}
          >
            Open a Process →
          </button>
        )}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate('/projects')}
        >
          View Projects
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleLoadDemo}
          disabled={seedStatus === 'loading' || seedStatus === 'done'}
          title="Load sample processes and projects to explore"
        >
          {seedStatus === 'loading' ? 'Loading…'
            : seedStatus === 'done' ? '✓ Demo loaded'
            : seedStatus === 'error' ? 'Load failed'
            : '⬇ Load Demo Data'}
        </button>
      </div>
    </div>
  );
}
