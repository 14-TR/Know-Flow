import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cssPath = path.join(root, 'client/src/pages/Calendar.css');
const tsxPath = path.join(root, 'client/src/pages/Calendar.tsx');

const css = fs.readFileSync(cssPath, 'utf8');
const tsx = fs.readFileSync(tsxPath, 'utf8');

function fail(message) {
  console.error(`calendar mobile layout check failed: ${message}`);
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
  const marker = `@media (max-width: ${maxWidth}px)`;
  let searchStart = 0;
  let combined = '';
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  while (true) {
    const mediaStart = css.indexOf(marker, searchStart);
    if (mediaStart === -1) break;

    const nextMedia = css.indexOf('@media (max-width:', mediaStart + marker.length);
    const block = css.slice(mediaStart, nextMedia === -1 ? undefined : nextMedia);
    const match = block.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'm'));
    if (match?.[1]) combined += `\n${match[1]}`;
    searchStart = mediaStart + marker.length;
  }

  return combined;
}

function mediaBlock(maxWidth) {
  const marker = `@media (max-width: ${maxWidth}px)`;
  let searchStart = 0;
  let combined = '';

  while (true) {
    const start = css.indexOf(marker, searchStart);
    if (start === -1) break;
    const nextMedia = css.indexOf('@media (max-width:', start + marker.length);
    combined += `${css.slice(start, nextMedia === -1 ? undefined : nextMedia)}\n`;
    searchStart = start + marker.length;
  }

  return combined;
}

function mediaBlockHas(maxWidth, selector, propertyPattern) {
  const block = mediaBlock(maxWidth);
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|,)\\s*${escaped}\\s*(?:,|\\{)[\\s\\S]*?${propertyPattern}`, 'm').test(block);
}

const mobile480Block = mediaBlock(480);

const header = rule('.cal-header');
const schedulerInner = rule('.cal-scheduler-inner');
const statsBar = rule('.cal-stats-bar');
const ganttWrap = rule('.cal-gantt-wrap');
const monthWrap = rule('.cal-month-wrap');
const mobileHeader = mediaRule(480, '.cal-header');
const mobileTitle = mediaRule(480, '.cal-title');
const mobileStatusFilter = mediaRule(480, '.cal-status-filter');
const mobileJumpToday = mediaRule(480, '.cal-jump-today-btn');
const mobileSaving = mediaRule(480, '.cal-saving');
const mobileStatsBar = mediaRule(480, '.cal-stats-bar');
const mobileGantt = mediaRule(480, '.cal-gantt');
const mobileGanttAxis = mediaRule(480, '.gantt-axis');
const mobileGanttLabel = mediaRule(480, '.gantt-label');
const mobileMonthNav = mediaRule(480, '.month-nav');
const mobileMonthNode = mediaRule(480, '.month-node');
const mobileUnscheduledNode = mediaRule(480, '.unsched-node');
const mobileSchedulerInner = mediaRule(480, '.cal-scheduler-inner');
const mobileDateInput = mediaRule(480, '.cal-date-input');
const mobileGenerateButton = mediaRule(480, '.cal-gen-btn');
const phoneContainmentHeader = mediaRule(480, '.cal-header');
const phoneContainmentWrap = mediaRule(480, '.cal-gantt-wrap');

assert(tsx.includes('className="cal-stats-bar"'), 'calendar must render the stats bar class used by mobile styles');
assert(tsx.includes('className="cal-scheduler-inner"'), 'calendar must render the scheduler container');
assert(tsx.includes('className="cal-status-filter"'), 'calendar must keep the status filter control');
assert(tsx.includes('className="cal-jump-today-btn"'), 'calendar must keep the jump-to-today control');

assert(header.includes('min-width: 0;'), 'header must stay shrinkable');
assert(schedulerInner.includes('flex-wrap: wrap;'), 'scheduler controls must wrap before phone breakpoint');
assert(statsBar.includes('flex-wrap: wrap;'), 'stats bar must wrap on wider screens');
assert(ganttWrap.includes('overflow-x: auto;'), 'gantt container must stay horizontally scrollable');
assert(monthWrap.includes('overflow: auto;'), 'month container must stay scrollable');

assert(mobileSchedulerInner.includes('flex-direction: column;'), 'phone scheduler controls must stack vertically');
assert(mobileSchedulerInner.includes('align-items: flex-start;'), 'phone scheduler controls must align from the left');
assert(/\.cal-dir-toggle,\s*\.cal-date-input,\s*\.cal-gen-btn\s*\{[\s\S]*?width:\s*100%;/m.test(mobile480Block), 'phone date and generation controls must fill the available width');
assert(/\.cal-status-filter,\s*\.cal-jump-today-btn,\s*\.cal-saving\s*\{[\s\S]*?width:\s*100%;/m.test(mobile480Block), 'phone filter, today CTA, and saving indicator must fill the row');

assert(mobileStatsBar.includes('overflow-x: auto;'), 'phone stats bar must remain horizontally scrollable');
assert(mobileStatsBar.includes('flex-wrap: nowrap;'), 'phone stats bar must avoid multi-line pill collisions');
assert(mobileGantt.includes('min-width: 680px;'), 'phone gantt view must preserve a minimum readable width');
assert(mobileGanttAxis.includes('margin-left: 96px;'), 'phone gantt axis must match the reduced label width');
assert(mobileGanttLabel.includes('width: 96px;'), 'phone gantt labels must shrink to preserve track space');
assert(mobileMonthNav.includes('justify-content: space-between;'), 'phone month nav must distribute controls edge to edge');
assert(mobileMonthNode.includes('display: block;'), 'phone month nodes must render as block pills');
assert(mobileMonthNode.includes('max-width: 100%;'), 'phone month nodes must not overflow their cell');
assert(mobileUnscheduledNode.includes('flex: 1 1 100%;'), 'phone unscheduled chips must stack full width');

assert(mobileTitle.includes('flex-wrap: wrap;'), 'phone title row must wrap instead of truncating everything');
assert(phoneContainmentHeader.includes('align-items: flex-start;'), 'phone header must top-align wrapped content');
assert(/\.cal-gantt-wrap,\s*\.cal-month-wrap\s*\{[\s\S]*?padding:\s*0\.75rem;/m.test(mobile480Block), 'phone content wrappers must tighten padding');

console.log('calendar mobile layout check passed');
