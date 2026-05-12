import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '../components/Toast';
import { useParams, Link } from 'react-router-dom';
import './Calendar.css';

const API = import.meta.env.VITE_API_URL || '/api';

interface CalNode {
  node_id: string;
  title: string;
  type: string;
  estimated_days: number;
  due_date: string | null;
  date_pinned: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
}

type ViewMode = 'gantt' | 'month';
type Direction = 'forward' | 'backward';
type StatusFilter = 'all' | 'not_started' | 'in_progress' | 'complete' | 'skipped';

const STATUS_COLORS: Record<string, string> = {
  complete:    '#22c55e',
  in_progress: '#3b82f6',
  not_started: '#6b7280',
  skipped:     '#9ca3af',
};

// Text-safe status icons (ASCII/Unicode, no emoji that break JSX string literals)
const SI: Record<string, string> = {
  complete:    '✓',
  in_progress: '⏳',
  not_started: '○',
  skipped:     '↷',
};

const TYPE_ICONS: Record<string, string> = {
  task: '📋', decision: '⬡', milestone: '🏁', start: '▶', end: '⏹',
};

interface GanttDrag {
  nodeId: string;
  startX: number;
  originalDate: string;
  totalDays: number;
  trackWidth: number;
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayDateOnly(): string {
  return formatDateOnly(new Date());
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function isOverdue(node: CalNode): boolean {
  if (!node.due_date) return false;
  if (node.status === 'complete' || node.status === 'skipped') return false;
  return node.due_date < todayDateOnly();
}

export default function Calendar() {
  const { id: projectId } = useParams<{ id: string }>();
  const [nodes, setNodes] = useState<CalNode[]>([]);
  const [project, setProject] = useState<any>(null);
  const [view, setView] = useState<ViewMode>('gantt');
  const [direction, setDirection] = useState<Direction>('forward');
  const [anchorDate, setAnchorDate] = useState(() => todayDateOnly());
  const [generating, setGenerating] = useState(false);
  const [selectedNode, setSelectedNode] = useState<CalNode | null>(null);
  const [editDays, setEditDays] = useState('');
  const [editDate, setEditDate] = useState('');
  const [monthOffset, setMonthOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dropTargetDay, setDropTargetDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const dragNodeRef = useRef<string | null>(null);
  const [ganttDragNodeId, setGanttDragNodeId] = useState<string | null>(null);
  const [ganttPreviewDate, setGanttPreviewDate] = useState<string | null>(null);
  const [ganttTooltipPos, setGanttTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const ganttDragRef = useRef<GanttDrag | null>(null);
  const ganttWrapRef = useRef<HTMLDivElement>(null);
  const minDateRef = useRef<Date>(new Date());
  const todayLineRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const r = await fetch(`${API}/projects/${projectId}/calendar`);
      const d = await r.json();
      setProject(d.project);
      setNodes(d.nodes || []);
    } catch (e: any) { toast('Failed to load calendar data. Please refresh.', 'error'); }
  };

  useEffect(() => { load(); }, [projectId]);

  const generateSchedule = async () => {
    setGenerating(true);
    try {
      const body: any = { direction };
      if (direction === 'forward') body.startDate = anchorDate;
      else body.endDate = anchorDate;
      const r = await fetch(`${API}/projects/${projectId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || 'Schedule failed');
      await load();
      toast('Schedule generated!', 'success');
    } catch (e: any) { toast(e.message || 'Schedule generation failed', 'error'); }
    setGenerating(false);
  };

  const pinDate = async () => {
    if (!selectedNode) return;
    try {
      const res = await fetch(`${API}/projects/${projectId}/nodes/${selectedNode.node_id}/date`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          due_date: editDate || selectedNode.due_date,
          estimated_days: editDays ? parseInt(editDays) : selectedNode.estimated_days,
          pinned: true,
        }),
      });
      if (!res.ok) throw new Error('Failed to save date');
      setSelectedNode(null);
      await load();
      toast('Date pinned', 'success');
    } catch (e: any) { toast(e.message || 'Failed to pin date', 'error'); }
  };

  const rescheduleNode = async (nodeId: string, newDate: string) => {
    const node = nodes.find(n => n.node_id === nodeId);
    if (!node) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/projects/${projectId}/nodes/${nodeId}/date`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ due_date: newDate, estimated_days: node.estimated_days, pinned: true }),
      });
      if (!res.ok) throw new Error('Failed to save date');
      await load();
      toast('Date updated', 'success');
    } catch (e: any) { toast(e.message || 'Failed to reschedule', 'error'); }
    setSaving(false);
  };

  const handleDragStart = (nodeId: string) => { setDragNodeId(nodeId); dragNodeRef.current = nodeId; };
  const handleDragEnd = () => { setDragNodeId(null); setDropTargetDay(null); dragNodeRef.current = null; };

  const handleDrop = (day: number) => {
    const nid = dragNodeRef.current;
    if (!nid) return;
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    rescheduleNode(nid, formatDateOnly(d));
    setDragNodeId(null); setDropTargetDay(null); dragNodeRef.current = null;
  };

  const handleGanttMouseDown = useCallback((e: React.MouseEvent, node: CalNode, totalDays: number) => {
    e.stopPropagation();
    const wrap = ganttWrapRef.current;
    if (!wrap) return;
    const LABEL_W = 220;
    const trackWidth = wrap.clientWidth - LABEL_W;
    if (trackWidth <= 0) return;
    ganttDragRef.current = { nodeId: node.node_id, startX: e.clientX, originalDate: node.due_date!, totalDays, trackWidth };
    setGanttDragNodeId(node.node_id);
    setGanttPreviewDate(node.due_date);
    setGanttTooltipPos({ x: e.clientX, y: e.clientY - 36 });
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const drag = ganttDragRef.current;
      if (!drag) return;
      const deltaX = e.clientX - drag.startX;
      const daysShift = Math.round((deltaX / drag.trackWidth) * Math.min(drag.totalDays, 180));
      const orig = parseDateOnly(drag.originalDate);
      orig.setDate(orig.getDate() + daysShift);
      setGanttPreviewDate(formatDateOnly(orig));
      setGanttTooltipPos({ x: e.clientX, y: e.clientY - 36 });
    };
    const handleMouseUp = async (e: MouseEvent) => {
      const drag = ganttDragRef.current;
      if (!drag) return;
      const deltaX = e.clientX - drag.startX;
      const daysShift = Math.round((deltaX / drag.trackWidth) * Math.min(drag.totalDays, 180));
      ganttDragRef.current = null;
      setGanttDragNodeId(null); setGanttPreviewDate(null); setGanttTooltipPos(null);
      if (Math.abs(daysShift) === 0) return;
      const orig = parseDateOnly(drag.originalDate);
      orig.setDate(orig.getDate() + daysShift);
      await rescheduleNode(drag.nodeId, formatDateOnly(orig));
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, projectId]);

  const jumpToToday = () => {
    todayLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  // ── Derived values ────────────────────────────────────────────────────
  const nodesWithDates = nodes.filter(n => n.due_date);
  const allDates = nodesWithDates.map(n => parseDateOnly(n.due_date!));
  const minDate = allDates.length ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date();
  const maxDate = allDates.length ? new Date(Math.max(...allDates.map(d => d.getTime()))) : new Date();
  const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000) + 1);
  minDateRef.current = minDate;

  const todayOffset = Math.ceil((parseDateOnly(todayDateOnly()).getTime() - minDate.getTime()) / 86400000);
  const todayPct = Math.min(totalDays, 180) > 0 ? (todayOffset / Math.min(totalDays, 180)) * 100 : -1;
  const showTodayLine = todayPct >= 0 && todayPct <= 100;

  // Stats
  const overdueCount = nodesWithDates.filter(isOverdue).length;
  const statusCounts = nodes.reduce((acc, n) => {
    acc[n.status] = (acc[n.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter
  const filteredScheduledNodes = statusFilter === 'all' ? nodesWithDates : nodesWithDates.filter(n => n.status === statusFilter);
  const filteredUnscheduled = statusFilter === 'all'
    ? nodes.filter(n => !n.due_date)
    : nodes.filter(n => !n.due_date && n.status === statusFilter);

  // Month helpers
  const now = new Date();
  const viewMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const firstDow = viewMonth.getDay();
  const monthNodesFn = (day: number) => {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    return filteredScheduledNodes.filter(n => n.due_date === formatDateOnly(d));
  };

  const isDragging = dragNodeId !== null;

  return (
    <div className="cal-page">
      {/* Gantt drag tooltip */}
      {ganttTooltipPos && ganttPreviewDate && (
        <div className="gantt-drag-tooltip" style={{ left: ganttTooltipPos.x, top: ganttTooltipPos.y }}>
          📌 {ganttPreviewDate}
        </div>
      )}

      {/* Header */}
      <div className="cal-header">
        <div className="cal-title">
          <Link to={`/project/${projectId}`} className="cal-back">← Back</Link>
          <span>{project?.name || 'Loading...'}</span>
          <span className="cal-subtitle">Agentic Calendar</span>
        </div>
        <div className="cal-controls">
          <div className="cal-toggle">
            <button className={view === 'gantt' ? 'active' : ''} onClick={() => setView('gantt')}>Timeline</button>
            <button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>Month</button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {nodes.length > 0 && (
        <div className="cal-stats-bar">
          <div className="cal-stat-pill">
            <span className="cal-stat-dot" style={{ background: '#6b7280' }} />
            <span className="cal-stat-label">{statusCounts.not_started || 0} pending</span>
          </div>
          <div className="cal-stat-pill">
            <span className="cal-stat-dot" style={{ background: '#3b82f6' }} />
            <span className="cal-stat-label">{statusCounts.in_progress || 0} in progress</span>
          </div>
          <div className="cal-stat-pill">
            <span className="cal-stat-dot" style={{ background: '#22c55e' }} />
            <span className="cal-stat-label">{statusCounts.complete || 0} complete</span>
          </div>
          {overdueCount > 0 && (
            <div className="cal-stat-pill cal-stat-pill--overdue">
              <span className="cal-stat-dot" style={{ background: '#f87171' }} />
              <span className="cal-stat-label">{overdueCount} overdue</span>
            </div>
          )}
          <div className="cal-stat-divider" />
          <span className="cal-stat-label cal-stat-scheduled">{nodesWithDates.length}/{nodes.length} scheduled</span>
        </div>
      )}

      {/* Scheduler + filter bar */}
      <div className="cal-scheduler">
        <div className="cal-scheduler-inner">
          <div className="cal-dir-toggle">
            <button className={direction === 'forward' ? 'active' : ''} onClick={() => setDirection('forward')}>▶ Forward</button>
            <button className={direction === 'backward' ? 'active' : ''} onClick={() => setDirection('backward')}>◀ Backward</button>
          </div>
          <label className="cal-date-label">{direction === 'forward' ? 'Start:' : 'Deadline:'}</label>
          <input type="date" value={anchorDate} onChange={e => setAnchorDate(e.target.value)} className="cal-date-input" />
          <button className="cal-gen-btn" onClick={generateSchedule} disabled={generating}>
            {generating ? '⏳ Generating...' : '⚡ Generate Schedule'}
          </button>
          <select
            className="cal-status-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="not_started">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="complete">Complete</option>
            <option value="skipped">Skipped</option>
          </select>
          {view === 'gantt' && showTodayLine && (
            <button className="cal-jump-today-btn" onClick={jumpToToday} title="Jump to today">⊙ Today</button>
          )}
          {saving && <span className="cal-saving">Saving…</span>}
        </div>
      </div>

      {/* Gantt view */}
      {view === 'gantt' ? (
        <div className="cal-gantt-wrap" ref={ganttWrapRef}>
          {filteredScheduledNodes.length === 0 ? (
            <div className="cal-empty">
              {nodesWithDates.length === 0
                ? 'No dates scheduled yet. Hit ⚡ Generate Schedule above.'
                : 'No nodes match the current filter.'}
            </div>
          ) : (
            <div className={`cal-gantt${ganttDragNodeId ? ' gantt--dragging' : ''}`}>
              <div className="gantt-axis">
                {showTodayLine && (
                  <div className="gantt-today-line" style={{ left: `${todayPct}%` }} ref={todayLineRef}>
                    <span className="gantt-today-label">Today</span>
                  </div>
                )}
                {Array.from({ length: Math.min(totalDays, 180) }).map((_, i) => {
                  const d = new Date(minDate);
                  d.setDate(d.getDate() + i);
                  const label = d.getDate() === 1 || i === 0
                    ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : d.getDay() === 1 ? d.getDate().toString() : '';
                  return (
                    <div key={i}
                      className={`gantt-tick ${d.getDay() === 0 || d.getDay() === 6 ? 'weekend' : ''}`}
                      style={{ left: `${(i / Math.min(totalDays, 180)) * 100}%` }}>
                      {label && <span>{label}</span>}
                    </div>
                  );
                })}
              </div>
              {filteredScheduledNodes
                .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
                .map(node => {
                  const isDraggingThis = ganttDragNodeId === node.node_id;
                  const displayDate = isDraggingThis && ganttPreviewDate ? ganttPreviewDate : node.due_date!;
                  const due = parseDateOnly(displayDate);
                  const start = subtractDays(due, node.estimated_days || 0);
                  const startOff = Math.max(0, Math.ceil((start.getTime() - minDate.getTime()) / 86400000));
                  const endOff = Math.ceil((due.getTime() - minDate.getTime()) / 86400000);
                  const widthPct = Math.max(0.5, ((endOff - startOff) / Math.min(totalDays, 180)) * 100);
                  const overdue = isOverdue(node);
                  const barColor = overdue ? '#f87171' : (node.date_pinned ? '#f59e0b' : STATUS_COLORS[node.status] || '#6b7280');

                  return (
                    <div
                      key={node.node_id}
                      className={`gantt-row${isDraggingThis ? ' gantt-row--dragging' : ''}${overdue ? ' gantt-row--overdue' : ''}`}
                      onClick={() => {
                        if (ganttDragNodeId) return;
                        setSelectedNode(node);
                        setEditDays(String(node.estimated_days || ''));
                        setEditDate(node.due_date || '');
                      }}
                    >
                      <div className="gantt-label">
                        <span className="gantt-status-icon" style={{ color: STATUS_COLORS[node.status] }}>
                          {SI[node.status] || '○'}
                        </span>
                        <span className="gantt-type-icon">{TYPE_ICONS[node.type] || '•'}</span>
                        <span className="gantt-title">{node.title}</span>
                        {overdue && <span className="gantt-overdue-badge" title="Overdue">!</span>}
                        {node.date_pinned ? <span className="pin-badge">📌</span> : null}
                      </div>
                      <div className="gantt-track">
                        <div
                          className={`gantt-bar${isDraggingThis ? ' gantt-bar--active' : ''}${overdue ? ' gantt-bar--overdue' : ''}`}
                          style={{
                            left: `${(startOff / Math.min(totalDays, 180)) * 100}%`,
                            width: `${widthPct}%`,
                            background: barColor,
                          }}
                          onMouseDown={(e) => handleGanttMouseDown(e, node, totalDays)}
                          title={`${node.title} · ${displayDate}${overdue ? ' · OVERDUE' : ''}`}
                        >
                          <span className="gantt-bar-drag-handle" aria-hidden>⠿</span>
                          {widthPct > 8 && (
                            <span className="gantt-bar-status">{SI[node.status]}</span>
                          )}
                          <span className="gantt-bar-label">{displayDate}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : (
        /* Month view */
        <div className="cal-month-wrap">
          <div className="month-nav">
            <button onClick={() => setMonthOffset(o => o - 1)}>‹</button>
            <span>{viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => setMonthOffset(o => o + 1)}>›</button>
          </div>
          {isDragging && (
            <div className="month-drag-hint">Drop on a day to reschedule · release outside to cancel</div>
          )}
          <div className={`month-grid${isDragging ? ' month-grid--dragging' : ''}`}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="month-dow">{d}</div>
            ))}
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`empty-${i}`} className="month-cell empty" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayNodes = monthNodesFn(day);
              const cellDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
              const isToday = new Date().toDateString() === cellDate.toDateString();
              const isPast = cellDate < new Date(new Date().toDateString());
              const isDropTarget = dropTargetDay === day;
              const hasPastDue = dayNodes.some(n => isOverdue(n));
              return (
                <div
                  key={day}
                  className={`month-cell${isToday ? ' today' : ''}${isPast && !isToday ? ' past' : ''}${isDropTarget ? ' drop-target' : ''}${hasPastDue ? ' has-overdue' : ''}`}
                  onDragOver={isDragging ? (e) => { e.preventDefault(); setDropTargetDay(day); } : undefined}
                  onDragLeave={isDragging ? () => setDropTargetDay(null) : undefined}
                  onDrop={isDragging ? (e) => { e.preventDefault(); handleDrop(day); } : undefined}
                >
                  <span className="month-day-num">{day}</span>
                  {dayNodes.map(n => {
                    const over = isOverdue(n);
                    return (
                      <div
                        key={n.node_id}
                        className={`month-node${dragNodeId === n.node_id ? ' dragging' : ''}${over ? ' month-node--overdue' : ''}`}
                        style={{ background: over ? '#f87171' : (n.date_pinned ? '#f59e0b' : STATUS_COLORS[n.status] || '#6b7280') }}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; handleDragStart(n.node_id); }}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => {
                          if (dragNodeId) return;
                          e.stopPropagation();
                          setSelectedNode(n);
                          setEditDays(String(n.estimated_days || ''));
                          setEditDate(n.due_date || '');
                        }}
                        title={`${n.title}${over ? ' · OVERDUE' : ''} · drag to reschedule`}
                      >
                        <span className="month-node-drag-handle" aria-hidden>⠿</span>
                        <span className="month-node-status">{SI[n.status]}</span>
                        {TYPE_ICONS[n.type]} {n.title}
                        {n.date_pinned ? <span className="month-node-pin">📌</span> : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unscheduled */}
      {filteredUnscheduled.length > 0 && (
        <div className="cal-unscheduled">
          <h3>
            Unscheduled ({filteredUnscheduled.length})
            {view === 'month' && <span className="unsched-hint"> · drag to month to schedule</span>}
          </h3>
          <div className="unsched-list">
            {filteredUnscheduled.map(n => (
              <div
                key={n.node_id}
                className={`unsched-node${dragNodeId === n.node_id ? ' dragging' : ''}`}
                draggable={view === 'month'}
                onDragStart={view === 'month' ? (e) => { e.dataTransfer.effectAllowed = 'move'; handleDragStart(n.node_id); } : undefined}
                onDragEnd={view === 'month' ? handleDragEnd : undefined}
                onClick={() => { if (dragNodeId) return; setSelectedNode(n); setEditDays(String(n.estimated_days || '')); setEditDate(''); }}
                title={view === 'month' ? 'Drag to month grid to schedule' : 'Click to set date'}
              >
                <span className="unsched-status" style={{ color: STATUS_COLORS[n.status] }}>
                  {SI[n.status]}
                </span>
                {TYPE_ICONS[n.type]} {n.title}
                <span className="unsched-type">{n.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Node editor modal */}
      {selectedNode && (
        <div className="cal-modal-overlay" onClick={() => setSelectedNode(null)}>
          <div className="cal-modal" onClick={e => e.stopPropagation()}>
            <div className="cal-modal-header">
              <span className="cal-modal-type-icon">{TYPE_ICONS[selectedNode.type]}</span>
              <h3>{selectedNode.title}</h3>
              {isOverdue(selectedNode) && (
                <span className="cal-modal-overdue-badge">OVERDUE</span>
              )}
            </div>
            <div className="modal-status-row">
              <span className="modal-status" style={{ background: STATUS_COLORS[selectedNode.status] }}>
                {selectedNode.status.replace('_', ' ')}
              </span>
              {selectedNode.date_pinned ? <span className="pin-badge">📌 Pinned</span> : <span className="auto-badge">⚡ Auto</span>}
            </div>
            <div className="modal-field">
              <label>Due date</label>
              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
            </div>
            <div className="modal-field">
              <label>Estimated work days</label>
              <input type="number" min="0" value={editDays} onChange={e => setEditDays(e.target.value)} placeholder="days" />
            </div>
            <div className="modal-actions">
              <button className="btn-pin" onClick={pinDate}>📌 Save &amp; Pin</button>
              <button className="btn-cancel" onClick={() => setSelectedNode(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function subtractDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}
