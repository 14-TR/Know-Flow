import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cssPath = path.join(root, 'client/src/pages/ProjectTracker.css');
const tsxPath = path.join(root, 'client/src/pages/ProjectTracker.tsx');

const css = fs.readFileSync(cssPath, 'utf8');
const tsx = fs.readFileSync(tsxPath, 'utf8');

function fail(message) {
  console.error(`project tracker mobile layout check failed: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function rule(selector) {
  const blocks = css.matchAll(/([^{}]+)\{([^}]*)\}/gm);
  let combined = '';

  for (const match of blocks) {
    const selectors = match[1].split(',').map((value) => value.trim());
    if (selectors.includes(selector)) combined += `\n${match[2]}`;
  }

  return combined;
}

function mediaRule(maxWidth, selector) {
  const marker = `@media (max-width: ${maxWidth}px)`;
  let searchStart = 0;
  let combined = '';

  while (true) {
    const mediaStart = css.indexOf(marker, searchStart);
    if (mediaStart === -1) break;

    const nextMedia = css.indexOf('@media (max-width:', mediaStart + marker.length);
    const block = css.slice(mediaStart, nextMedia === -1 ? undefined : nextMedia);
    const mediaBody = block.slice(block.indexOf('{') + 1);
    const blocks = mediaBody.matchAll(/([^{}]+)\{([^}]*)\}/gm);

    for (const match of blocks) {
      const selectors = match[1].split(',').map((value) => value.trim());
      if (selectors.includes(selector)) combined += `\n${match[2]}`;
    }

    searchStart = mediaStart + marker.length;
  }

  return combined;
}

assert(
  tsx.includes('className="panel toolbar tracker-toolbar"'),
  'tracker toolbar must keep the stable class used by mobile styles'
);
assert(
  tsx.includes('className="tracker-toolbar-row tracker-action-row"'),
  'tracker action row must keep the stable class used by phone CTA rules'
);
assert(
  tsx.includes('className="tracker-highlight-grid"'),
  'tracker highlights must keep their grid container'
);
assert(
  tsx.includes('className="tracker-split-grid"'),
  'tracker detail sections must keep their split-grid container'
);
assert(
  tsx.includes('className="tracker-legend-grid"'),
  'tracker legend must keep its grid container'
);
assert(
  tsx.includes('className="tracker-progress-caption"'),
  'tracker progress caption must remain present for mobile wrapping'
);

const toolbar = rule('.tracker-toolbar');
const toolbarRow = rule('.tracker-toolbar-row');
const commandTitle = rule('.tracker-command-title');
const progressRow = rule('.tracker-progress-row');
const progressCaption = rule('.tracker-progress-caption');
const chipList = rule('.tracker-chip-list');
const actionRow = rule('.tracker-action-row');

const highlightGridTablet = mediaRule(900, '.tracker-highlight-grid');
const splitGridTablet = mediaRule(900, '.tracker-split-grid');
const legendGridTablet = mediaRule(900, '.tracker-legend-grid');
const toolbarTablet = mediaRule(900, '.tracker-toolbar');

const toolbarMobile = mediaRule(640, '.tracker-toolbar');
const commandCardMobile = mediaRule(640, '.tracker-command-card');
const glassSectionMobile = mediaRule(640, '.tracker-glass-section');
const commandTitleMobile = mediaRule(640, '.tracker-command-title');
const progressCaptionMobile = mediaRule(640, '.tracker-progress-caption');

const toolbarPhone = mediaRule(480, '.tracker-toolbar');
const toolbarToplinePhone = mediaRule(480, '.tracker-toolbar-topline');
const chipPhone = mediaRule(480, '.tracker-process-chip');
const actionButtonPhone = mediaRule(480, '.tracker-action-row .btn');
const minimapPhone = mediaRule(480, '.react-flow__minimap');

assert(toolbar.includes('width: min(28rem, calc(100vw - 2rem));'), 'desktop toolbar must stay viewport-contained');
assert(toolbarRow.includes('flex-wrap: wrap;'), 'toolbar rows must wrap before controls collide');
assert(commandTitle.includes('line-height: 1.05;'), 'project title must keep compact wrapping');
assert(progressRow.includes('flex-wrap: wrap;'), 'progress row must allow stacked labels');
assert(progressCaption.includes('flex: 1;'), 'progress caption must stretch before mobile stacking');
assert(chipList.includes('display: grid;'), 'focus chip list must remain a grid');
assert(actionRow.includes('flex-wrap: wrap;'), 'action row must wrap controls instead of clipping them');

assert(toolbarTablet.includes('width: min(26rem, calc(100vw - 1.5rem));'), 'tablet toolbar must tighten width');
assert(highlightGridTablet.includes('grid-template-columns: 1fr;'), 'tablet highlights must collapse to one column');
assert(splitGridTablet.includes('grid-template-columns: 1fr;'), 'tablet split sections must collapse to one column');
assert(legendGridTablet.includes('grid-template-columns: 1fr;'), 'tablet legend must collapse to one column');

assert(toolbarMobile.includes('width: min(100vw - 1rem, 100%);'), 'mobile toolbar must fit the viewport');
assert(toolbarMobile.includes('padding: 0.75rem;'), 'mobile toolbar must tighten padding');
assert(commandCardMobile.includes('padding: 0.8rem;'), 'mobile cards must reduce padding');
assert(glassSectionMobile.includes('padding: 0.8rem;'), 'mobile detail sections must reduce padding');
assert(commandTitleMobile.includes('font-size: 1.25rem;'), 'mobile title must shrink for narrow screens');
assert(progressCaptionMobile.includes('flex-basis: 100%;'), 'mobile progress caption must stack below the label');

assert(minimapPhone.includes('display: none !important;'), 'phone layout must hide the minimap');
assert(toolbarPhone.includes('max-width: calc(100vw - 0.75rem);'), 'phone toolbar must stay inside the viewport');
assert(toolbarPhone.includes('padding: 0.625rem;'), 'phone toolbar must use compact padding');
assert(toolbarToplinePhone.includes('gap: 0.45rem;'), 'phone topline must tighten spacing');
assert(chipPhone.includes('font-size: 0.625rem;'), 'phone metadata chips must shrink to avoid overflow');
assert(actionButtonPhone.includes('font-size: 0.75rem;'), 'phone action buttons must shrink text');
assert(actionButtonPhone.includes('padding: 0.3rem 0.5rem;'), 'phone action buttons must tighten padding');

console.log('project tracker mobile layout check passed');
