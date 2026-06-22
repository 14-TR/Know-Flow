import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cssPath = path.join(root, 'client/src/pages/ProcessEditor.css');
const tsxPath = path.join(root, 'client/src/pages/ProcessEditor.tsx');

const css = fs.readFileSync(cssPath, 'utf8');
const tsx = fs.readFileSync(tsxPath, 'utf8');

function fail(message) {
  console.error(`process editor mobile layout check failed: ${message}`);
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

const processCommandBar = rule('.process-command-bar');
const commandActionsPanel = rule('.command-actions-panel');
const commandCenterPanel = rule('.command-center-panel');
const toolbarProcessName = rule('.toolbar-process-name');
const toolbarNodeButtons = rule('.toolbar-node-actions .btn');
const commandGridButtons = rule('.command-action-grid .btn');

const editorPanelPhone = mediaRule(480, '.process-editor-panel');
const buildPanelPhone = mediaRule(480, '.process-editor-build-panel');
const layoutPanelPhone = mediaRule(480, '.process-editor-layout-panel');
const commandBarPhone = mediaRule(480, '.process-command-bar');
const actionPanelPhone = mediaRule(480, '.command-actions-panel');
const inspectorPhone = mediaRule(480, '.command-center-panel');
const nodeActionsPhone = mediaRule(480, '.toolbar-node-actions');
const actionGridPhone = mediaRule(480, '.command-action-grid');
const nodeActionButtonsPhone = mediaRule(480, '.toolbar-node-actions .btn');
const actionGridButtonsPhone = mediaRule(480, '.command-action-grid .btn');

assert(
  tsx.includes('className="process-editor-panel process-editor-build-panel"'),
  'build toolbar Panel must expose a stable mobile class'
);
assert(
  tsx.includes('className="process-editor-panel process-editor-layout-panel"'),
  'layout toolbar Panel must expose a stable mobile class'
);

assert(processCommandBar.includes('max-width: calc(100vw - 2rem);'), 'build toolbar needs desktop viewport containment');
assert(commandActionsPanel.includes('max-width: calc(100vw - 2rem);'), 'layout toolbar needs desktop viewport containment');
assert(commandCenterPanel.includes('max-width: calc(100vw - 2rem);'), 'inspector panel needs viewport containment');
assert(toolbarProcessName.includes('overflow-wrap: anywhere;'), 'process names must wrap on narrow screens');
assert(toolbarNodeButtons.includes('white-space: normal;'), 'node action labels must wrap');
assert(commandGridButtons.includes('white-space: normal;'), 'layout/view labels must wrap');

assert(editorPanelPhone.includes('max-width: calc(100vw - 1.5rem);'), 'phone panels need narrow viewport containment');
assert(buildPanelPhone.includes('left: 0.75rem !important;'), 'phone build panel must pin inside the left edge');
assert(buildPanelPhone.includes('right: 0.75rem !important;'), 'phone build panel must pin inside the right edge');
assert(layoutPanelPhone.includes('top: 14.75rem !important;'), 'phone layout panel must stack below build controls');
assert(layoutPanelPhone.includes('right: 0.75rem !important;'), 'phone layout panel must stay inside the right edge');

assert(commandBarPhone.includes('width: calc(100vw - 1.5rem);'), 'phone build toolbar must match viewport width');
assert(actionPanelPhone.includes('width: calc(100vw - 1.5rem);'), 'phone layout toolbar must match viewport width');
assert(inspectorPhone.includes('left: 0.75rem;'), 'phone inspector must pin inside the left edge');
assert(inspectorPhone.includes('right: 0.75rem;'), 'phone inspector must pin inside the right edge');
assert(inspectorPhone.includes('max-height: min(68vh, calc(100vh - 1.5rem));'), 'phone inspector must leave canvas controls reachable');

assert(nodeActionsPhone.includes('grid-template-columns: repeat(2, minmax(0, 1fr));'), 'phone node actions must use stable two-column wrapping');
assert(actionGridPhone.includes('grid-template-columns: repeat(2, minmax(0, 1fr));'), 'phone layout/view actions must use stable two-column wrapping');
assert(nodeActionButtonsPhone.includes('width: 100%;'), 'phone node action buttons must fill their grid cells');
assert(actionGridButtonsPhone.includes('width: 100%;'), 'phone layout/view buttons must fill their grid cells');

console.log('process editor mobile layout check passed');
