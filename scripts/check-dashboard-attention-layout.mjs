import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cssPath = path.join(root, 'client/src/pages/Dashboard.css');
const globalCssPath = path.join(root, 'client/src/styles/index.css');
const tsxPath = path.join(root, 'client/src/pages/Dashboard.tsx');

const css = fs.readFileSync(cssPath, 'utf8');
const globalCss = fs.readFileSync(globalCssPath, 'utf8');
const allCss = `${css}\n${globalCss}`;
const tsx = fs.readFileSync(tsxPath, 'utf8');

function fail(message) {
  console.error(`dashboard attention layout check failed: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = allCss.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'm'));
  return match?.[1] ?? '';
}

function mediaRule(maxWidth, selector) {
  const marker = `@media (max-width: ${maxWidth}px)`;
  let searchStart = 0;
  let combined = '';
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  while (true) {
    const mediaStart = allCss.indexOf(marker, searchStart);
    if (mediaStart === -1) break;

    const nextMedia = allCss.indexOf('@media (max-width:', mediaStart + marker.length);
    const block = allCss.slice(mediaStart, nextMedia === -1 ? undefined : nextMedia);
    const match = block.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'm'));
    if (match?.[1]) combined += `\n${match[1]}`;
    searchStart = mediaStart + marker.length;
  }

  return combined;
}

const attentionRow = rule('.dash-attention-row');
const attentionReason = rule('.dash-attention-reason');
const setupButton = rule('.dash-setup-step .btn');
const quickAction = rule('.dash-action-btn');
const quickActionLabel = rule('.dash-action-label');
const onboardingActions = rule('.onboarding-banner-actions');
const onboardingActionButton = rule('.onboarding-banner-actions .btn');
const attentionListMobile = mediaRule(768, '.dash-attention-list');
const setupButtonMobile = mediaRule(640, '.dash-setup-step .btn');
const onboardingActionsMobile = mediaRule(640, '.onboarding-banner-actions');
const onboardingActionButtonMobile = mediaRule(640, '.onboarding-banner-actions .btn');
const attentionRowNarrow = mediaRule(400, '.dash-attention-row');
const quickActionNarrow = mediaRule(400, '.dash-action-btn');

assert(tsx.includes('aria-label="Needs attention"'), 'attention section must remain accessible by name');
assert(tsx.includes('className="dash-attention-reason"'), 'attention reason text must be rendered');

assert(attentionRow.includes('align-items: flex-start;'), 'attention rows must top-align multi-line reason text');
assert(/min-height:\s*9[0-9]px;/.test(attentionRow), 'attention rows need stable height for two-line reasons');

assert(attentionReason.includes('white-space: normal;'), 'reason text must wrap instead of staying on one line');
assert(!attentionReason.includes('white-space: nowrap;'), 'reason text must not use nowrap');
assert(attentionReason.includes('overflow: visible;'), 'reason text must not be hidden');
assert(attentionReason.includes('overflow-wrap: anywhere;'), 'reason text needs long-token wrapping');

assert(setupButton.includes('white-space: normal;'), 'setup CTA text must be allowed to wrap');
assert(setupButton.includes('max-width: 100%;'), 'setup CTAs must stay inside setup cards');
assert(setupButtonMobile.includes('width: 100%;'), 'mobile setup CTAs must fill their card');
assert(quickAction.includes('min-height:'), 'quick action tiles need stable height');
assert(quickActionLabel.includes('overflow-wrap: anywhere;'), 'quick action labels need long-token wrapping');
assert(onboardingActions.includes('flex-wrap: wrap;'), 'onboarding actions must wrap before mobile breakpoint');
assert(onboardingActionButton.includes('white-space: normal;'), 'onboarding action labels must wrap');
assert(onboardingActionsMobile.includes('flex-direction: column;'), 'mobile onboarding actions must stack');
assert(onboardingActionButtonMobile.includes('width: 100%;'), 'mobile onboarding actions must fill the banner');

assert(attentionListMobile.includes('grid-template-columns: 1fr;'), 'mobile attention list must collapse to one column');
assert(attentionRowNarrow.includes('align-items: flex-start;'), 'narrow rows must keep top alignment');
assert(quickActionNarrow.includes('min-height:'), 'narrow quick action tiles need stable height');

console.log('dashboard attention layout check passed');
