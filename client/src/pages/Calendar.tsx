import { useState, useEffect, useRef } from 'react';
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

const STATUS_COLORS: Record<string, string> = {
  complete:    '#22c55e',
  in_progress: '#3b82f6',
  not_started: '#6b7280',
  skipped:     '#9ca3af',
};
const TYPE_ICONS: Record<string, string> = {
  task: '📋', decision: '⬡', milestone: '🏁', start: '▶', end: '⏹',
};

export default function Calendar() {
  const { id: projectId } = useParams<{ id: string }>();
  const [nodes, setNodes] = useState<CalNode[]>([]);
  const [project, setProject] = useState<any>(null);
  const [view, setView] = useState<ViewMode>('gantt');
  const [direction, setDirection] = useState<Direction>('forward');
  const [anchorDate, setAnchorDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [generating, setGenerating] = useState(false);
  const [selectedNode, setSelectedNode] = useState<CalNode | null>(null);
  const [editDays, setEditDays] = useState('');
  const [editDate, setEditDate] = useState('');
  const [monthOffset, setMonthOffset] = useState(0);
  const [error, setError] = useState('');

  // Drag-and-drop state
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [dropTargetDay, setDropTargetDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const dragNodeRef = useRef<string | null>(null);

  const load = async () => {
    try {
      const r = await fetch(`${API}/projects/${projectId}/calendar`);
      const d = await r.json();
      setProject(d.project);
      setNodes(d.nodes || []);
    } catch (e: any) { setError(e.message); }
  };

  useEffect(() => { load(); }, [projectId]);

  const generateSchedule = async () => {
    setGenerating(true);
    setError('');
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
    } catch (e: any) { setError(e.message); }
    setGenerating(false);
  };

  const pinDate = async () => {
    if (!selectedNode) return;
    await fetch(`${API}/projects/${projectId}/nodes/${selectedNode.node_id}/date`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        due_date: editDate || selectedNode.due_date,
        estimated_days: editDays ? parseInt(editDays) : selectedNode.estimated_days,
        pinned: true,
      }),
    });
    setSelectedNode(null);
    await load();
  };

  // Drag-and-drop reschedule: drop node onto a day cell
  const rescheduleNode = async (nodeId: string, newDate: string) => {
    const node = nodes.find(n => n.node_id === nodeId);
    if (!node) return;
    setSaving(true);
    try {
      await fetch(`${API}/projects/${projectId}/nodes/${nodeId}/date`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          due_date: newDate,
          estimated_days: node.estimated_days,
          pinned: true,
        }),
      });
      await load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const handleDragStart = (nodeId: string) => {
    setDragNodeId(nodeId);
    dragNodeRef.current = nodeId;
  };

  const handleDragEnd = () => {
    setDragNodeId(null);
    setDropTargetDay(null);
    dragNodeRef.current = null;
  };

  const handleDrop = (day: number) => {
    const nid = dragNodeRef.current;
    if (!nid) return;
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    const iso = d.toISOString().split('T')[0];
    rescheduleNode(nid, iso);
    setDragNodeId(null);
    setDropTargetDay(null);
    dragNodeRef.current = null;
  };

  const nodesWithDates = nodes.filter(n => n.due_date);
  const allDates = nodesWithDates.map(n => new Date(n.due_date!));
  const minDate = allDates.length ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date();
  const maxDate = allDates.length ? new Date(Math.max(...allDates.map(d => d.getTime()))) : new Date();
  const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000) + 1);

  // Month view helpers
  const now = new Date();
  const viewMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const firstDow = viewMonth.getDay();
  const monthNodes = (day: number) => {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    const ds = d.toISOString().split('T')[0];
    return nodesWithDates.filter(n => n.due_date === ds);
  };

  const isDragging = dragNodeId !== null;

  return (
    <div className="cal-page">
      {/* Header bar */}
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

      {/* Schedule Generator */}
      <div className="cal-scheduler">
        <div className="cal-scheduler-inner">
          <div className="cal-dir-toggle">
            <button className={direction === 'forward' ? 'active' : ''} onClick={() => setDirection('forward')}>
              ▶ Forward from start
            </button>
            <button className={direction === 'backward' ? 'active' : ''} onClick={() => setDirection('backward')}>
              ◀ Backward from deadline
            </button>
          </div>
          <label className="cal-date-label">
            {direction === 'forward' ? 'Project start:' : 'Must complete by:'}
          </label>
          <input type="date" value={anchorDate} onChange={e => setAnchorDate(e.target.value)} className="cal-date-input" />
          <button className="cal-gen-btn" onClick={generateSchedule} disabled={generating}>
            {generating ? '⏳ Generating...' : '⚡ Generate Schedule'}
          </button>
          {nodesWithDates.length > 0 && (
            <span className="cal-count">{nodesWithDates.length}/{nodes.length} nodes scheduled</span>
          )}
          {saving && <span className="cal-saving">Saving…</span>}
        </div>
        {error && <div className="cal-error">{error}</div>}
      </div>

      {/* Main view */}
      {view === 'gantt' ? (
        <div className="cal-gantt-wrap">
          {nodesWithDates.length === 0 ? (
            <div className="cal-empty">No dates scheduled yet. Hit ⚡ Generate Schedule above.</div>
          ) : (
            <div className="cal-gantt">
              {/* Date axis */}
              <div className="gantt-axis">
                {Array.from({ length: Math.min(totalDays, 180) }).map((_, i) => {
                  const d = new Date(minDate);
                  d.setDate(d.getDate() + i);
                  const label = d.getDate() === 1 || i === 0
                    ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : d.getDay() === 1 ? d.getDate().toString() : '';
                  return (
                    <div key={i} className={`gantt-tick ${d.getDay() === 0 || d.getDay() === 6 ? 'weekend' : ''}`}
                      style={{ left: `${(i / Math.min(totalDays, 180)) * 100}%` }}>
                      {label && <span>{label}</span>}
                    </div>
                  );
                })}
              </div>
              {/* Rows */}
              {nodesWithDates
                .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
                .map(node => {
                  const due = new Date(node.due_date!);
                  const start = subtractDays(due, node.estimated_days || 0);
                  const startOff = Math.max(0, Math.ceil((start.getTime() - minDate.getTime()) / 86400000));
                  const endOff   = Math.ceil((due.getTime() - minDate.getTime()) / 86400000);
                  const left = `${(startOff / Math.min(totalDays, 180)) * 100}%`;
                  const width = `${Math.max(0.5, ((endOff - startOff) / Math.min(totalDays, 180)) * 100)}%`;
                  const color = node.date_pinned ? '#f59e0b' : STATUS_COLORS[node.status] || '#6b7280';

                  return (
                    <div key={node.node_id} className="gantt-row" onClick={() => {
                      setSelectedNode(node);
                      setEditDays(String(node.estimated_days || ''));
                      setEditDate(node.due_date || '');
                    }}>
                      <div className="gantt-label">
                        <span>{TYPE_ICONS[node.type] || '•'}</span>
                        <span className="gantt-title">{node.title}</span>
                        {node.date_pinned ? <span className="pin-badge">📌</span> : null}
                      </div>
                      <div className="gantt-track">
                        <div className="gantt-bar" style={{ left, width, background: color }}>
                          <span className="gantt-bar-label">{node.due_date}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : (
        /* Month Grid — with drag-and-drop */
        <div className="cal-month-wrap">
          <div className="month-nav">
            <button onClick={() => setMonthOffset(o => o - 1)}>‹</button>
            <span>{viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => setMonthOffset(o => o + 1)}>›</button>
          </div>
          {isDragging && (
            <div className="month-drag-hint">
              Drop on a day to reschedule · release outside to cancel
            </div>
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
              const dayNodes = monthNodes(day);
              const isToday = new Date().toDateString() === new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day).toDateString();
              const isDropTarget = dropTargetDay === day;
              return (
                <div
                  key={day}
                  className={`month-cell${isToday ? ' today' : ''}${isDropTarget ? ' drop-target' : ''}`}
                  onDragOver={isDragging ? (e) => { e.preventDefault(); setDropTargetDay(day); } : undefined}
                  onDragLeave={isDragging ? () => setDropTargetDay(null) : undefined}
                  onDrop={isDragging ? (e) => { e.preventDefault(); handleDrop(day); } : undefined}
                >
                  <span className="month-day-num">{day}</span>
                  {dayNodes.map(n => (
                    <div
                      key={n.node_id}
                      className={`month-node${dragNodeId === n.node_id ? ' dragging' : ''}`}
                      style={{ background: n.date_pinned ? '#f59e0b' : STATUS_COLORS[n.status] || '#6b7280' }}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        handleDragStart(n.node_id);
                      }}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => {
                        if (dragNodeId) return;
                        e.stopPropagation();
                        setSelectedNode(n);
                        setEditDays(String(n.estimated_days || ''));
                        setEditDate(n.due_date || '');
                      }}
                      title="Drag to reschedule · click to edit"
                    >
                      <span className="month-node-drag-handle" aria-hidden>⠿</span>
                      {TYPE_ICONS[n.type]} {n.title}
                      {n.date_pinned ? <span className="month-node-pin">📌</span> : null}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unscheduled nodes — also draggable into month */}
      {nodes.filter(n => !n.due_date).length > 0 && (
        <div className="cal-unscheduled">
          <h3>
            Unscheduled ({nodes.filter(n => !n.due_date).length})
            {view === 'month' && <span className="unsched-hint"> · drag to month to schedule</span>}
          </h3>
          <div className="unsched-list">
            {nodes.filter(n => !n.due_date).map(n => (
              <div
                key={n.node_id}
                className={`unsched-node${dragNodeId === n.node_id ? ' dragging' : ''}`}
                draggable={view === 'month'}
                onDragStart={view === 'month' ? (e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  handleDragStart(n.node_id);
                } : undefined}
                onDragEnd={view === 'month' ? handleDragEnd : undefined}
                onClick={() => {
                  if (dragNodeId) return;
                  setSelectedNode(n);
                  setEditDays(String(n.estimated_days || ''));
                  setEditDate('');
                }}
                title={view === 'month' ? 'Drag to month grid to schedule' : 'Click to set date'}
              >
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
            <h3>{TYPE_ICONS[selectedNode.type]} {selectedNode.title}</h3>
            <div className="modal-field">
              <label>Due date</label>
              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
            </div>
            <div className="modal-field">
              <label>Estimated work days</label>
              <input type="number" min="0" value={editDays} onChange={e => setEditDays(e.target.value)} placeholder="days" />
            </div>
            <div className="modal-row">
              <span className="modal-status" style={{ background: STATUS_COLORS[selectedNode.status] }}>
                {selectedNode.status.replace('_', ' ')}
              </span>
              {selectedNode.date_pinned ? <span className="pin-badge">📌 Pinned</span> : <span className="auto-badge">⚡ Auto</span>}
            </div>
            <div className="modal-actions">
              <button className="btn-pin" onClick={pinDate}>📌 Save & Pin</button>
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
