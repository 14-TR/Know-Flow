import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cssPath = path.join(root, 'client/src/pages/Dashboard.css');
const tsxPath = path.join(root, 'client/src/pages/Dashboard.tsx');

const css = fs.readFileSync(cssPath, 'utf8');
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
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'm'));
  return match?.[1] ?? '';
}

function mediaRule(maxWidth, selector) {
  const mediaStart = css.indexOf(`@media (max-width: ${maxWidth}px)`);
  if (mediaStart === -1) return '';

  const nextMedia = css.indexOf('@media (max-width:', mediaStart + 1);
  const block = css.slice(mediaStart, nextMedia === -1 ? undefined : nextMedia);
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = block.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'm'));
  return match?.[1] ?? '';
}

const attentionRow = rule('.dash-attention-row');
const attentionReason = rule('.dash-attention-reason');
const attentionListMobile = mediaRule(768, '.dash-attention-list');
const attentionRowNarrow = mediaRule(400, '.dash-attention-row');

assert(tsx.includes('aria-label="Needs attention"'), 'attention section must remain accessible by name');
assert(tsx.includes('className="dash-attention-reason"'), 'attention reason text must be rendered');

assert(attentionRow.includes('align-items: flex-start;'), 'attention rows must top-align multi-line reason text');
assert(/min-height:\s*9[0-9]px;/.test(attentionRow), 'attention rows need stable height for two-line reasons');

assert(attentionReason.includes('white-space: normal;'), 'reason text must wrap instead of staying on one line');
assert(!attentionReason.includes('white-space: nowrap;'), 'reason text must not use nowrap');
assert(attentionReason.includes('overflow: visible;'), 'reason text must not be hidden');
assert(attentionReason.includes('overflow-wrap: anywhere;'), 'reason text needs long-token wrapping');

assert(attentionListMobile.includes('grid-template-columns: 1fr;'), 'mobile attention list must collapse to one column');
assert(attentionRowNarrow.includes('align-items: flex-start;'), 'narrow rows must keep top alignment');

console.log('dashboard attention layout check passed');
