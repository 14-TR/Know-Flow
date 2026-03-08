import { useState } from 'react';

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
}

export default function OnboardingBanner({ onDismiss }: OnboardingBannerProps) {
  return (
    <div className="onboarding-banner" role="region" aria-label="Getting started">
      <div className="onboarding-banner-header">
        <span className="onboarding-banner-title">👋 Welcome to ProjectIQ</span>
        <button
          className="btn btn-icon btn-secondary btn-sm"
          onClick={onDismiss}
          aria-label="Dismiss welcome banner"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
      <p className="onboarding-banner-desc">
        ProjectIQ models your work as <strong>Processes</strong> (reusable workflow templates) and{' '}
        <strong>Projects</strong> (tracked instances of those workflows).
      </p>
      <ol className="onboarding-steps">
        <li>
          <span className="onboarding-step-num">1</span>
          <div>
            <strong>Create a Process</strong> — define the steps, decisions, and flow for a type of work.
          </div>
        </li>
        <li>
          <span className="onboarding-step-num">2</span>
          <div>
            <strong>Start a Project</strong> — instantiate the process to track real work through it.
          </div>
        </li>
        <li>
          <span className="onboarding-step-num">3</span>
          <div>
            <strong>Track progress</strong> — mark nodes complete, log decisions, and follow the flow.
          </div>
        </li>
      </ol>
    </div>
  );
}
