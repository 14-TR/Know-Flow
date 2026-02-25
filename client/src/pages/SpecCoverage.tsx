import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './SpecCoverage.css';

const API = import.meta.env.VITE_API_URL || '/api';

interface SpecNode {
  id: string; source: string; type: string; name: string;
  description: string | null; phase: number | null; agency: string | null;
  typical_days: number | null;
}

interface CoverageLink {
  spec_node_id: string; task_title: string; task_type: string;
  task_status: string; coverage_type: string; notes: string | null;
}

interface CoverageData {
  project: { id: string; name: string };
  source: string;
  total_spec_nodes: number;
  covered: number;
  gaps: number;
  coverage_pct: number;
  covered_nodes: (SpecNode & { links: CoverageLink[] })[];
  gap_nodes: SpecNode[];
}

interface ProjectNode {
  node_id: string; title: string; type: string;
}

const PHASE_LABELS: Record<number, string> = {
  1: 'Phase 1 — Pre-Application',
  2: 'Phase 2 — Entitlements',
  3: 'Phase 3 — Engineering Review',
  4: 'Phase 4 — Permits & Inspections',
  5: 'Phase 5 — Close-Out',
};

const COVERAGE_COLORS = {
  satisfies: '#22c55e',
  partially:  '#f59e0b',
  references: '#3b82f6',
};

export default function SpecCoverage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [projNodes, setProjNodes] = useState<ProjectNode[]>([]);
  const [linkModal, setLinkModal] = useState<{ gapNode: SpecNode } | null>(null);
  const [selectedTask, setSelectedTask] = useState('');
  const [coverageType, setCoverageType] = useState('satisfies');
  const [notes, setNotes] = useState('');
  const [tab, setTab] = useState<'gaps' | 'covered'>('gaps');

  const load = async () => {
    const [cov, proj] = await Promise.all([
      fetch(`${API}/projects/${projectId}/coverage`).then(r => r.json()),
      fetch(`${API}/projects/${projectId}/calendar`).then(r => r.json()),
    ]);
    setCoverage(cov);
    setProjNodes(proj.nodes || []);
  };

  useEffect(() => { load(); }, [projectId]);

  const addLink = async () => {
    if (!linkModal || !selectedTask) return;
    await fetch(`${API}/projects/${projectId}/nodes/${selectedTask}/spec-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spec_node_id: linkModal.gapNode.id, coverage_type: coverageType, notes }),
    });
    setLinkModal(null);
    setSelectedTask('');
    setNotes('');
    await load();
  };

  const removeLink = async (nodeId: string, specNodeId: string) => {
    await fetch(`${API}/projects/${projectId}/nodes/${nodeId}/spec-links/${specNodeId}`, { method: 'DELETE' });
    await load();
  };

  if (!coverage) return <div className="cov-loading">Loading coverage…</div>;

  // Group gap nodes by phase
  const gapsByPhase = new Map<number, SpecNode[]>();
  for (const n of coverage.gap_nodes) {
    const ph = n.phase || 0;
    if (!gapsByPhase.has(ph)) gapsByPhase.set(ph, []);
    gapsByPhase.get(ph)!.push(n);
  }

  return (
    <div className="cov-page">
      {/* Header */}
      <div className="cov-header">
        <Link to={`/project/${projectId}`} className="cov-back">← {coverage.project.name}</Link>
        <span className="cov-title">Spec Coverage</span>
        <span className="cov-source">📋 Cheyenne Development Permits</span>
      </div>

      {/* Coverage meter */}
      <div className="cov-meter-wrap">
        <div className="cov-meter">
          <div className="cov-arc">
            <div className="cov-pct">{coverage.coverage_pct}%</div>
            <div className="cov-pct-label">Coverage</div>
          </div>
          <div className="cov-stats">
            <div className="cov-stat">
              <span className="cov-num covered">{coverage.covered}</span>
              <span className="cov-lab">Covered</span>
            </div>
            <div className="cov-stat">
              <span className="cov-num gap">{coverage.gaps}</span>
              <span className="cov-lab">Gaps</span>
            </div>
            <div className="cov-stat">
              <span className="cov-num">{coverage.total_spec_nodes}</span>
              <span className="cov-lab">Total Requirements</span>
            </div>
          </div>
        </div>
        <div className="cov-bar-wrap">
          <div className="cov-prog-bar">
            <div className="cov-prog-fill" style={{ width: `${coverage.coverage_pct}%` }} />
          </div>
          <p className="cov-hint">
            {coverage.gaps > 0
              ? `${coverage.gaps} permit requirement${coverage.gaps !== 1 ? 's' : ''} not yet mapped to a project task.`
              : '✅ All requirements have at least one covering task!'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="cov-tabs">
        <button className={tab === 'gaps' ? 'active' : ''} onClick={() => setTab('gaps')}>
          ⚠ Gaps ({coverage.gaps})
        </button>
        <button className={tab === 'covered' ? 'active' : ''} onClick={() => setTab('covered')}>
          ✓ Covered ({coverage.covered})
        </button>
      </div>

      {/* Content */}
      <div className="cov-content">
        {tab === 'gaps' && (
          <div className="cov-gaps">
            {coverage.gaps === 0 && (
              <div className="cov-empty">🎉 No gaps — every requirement is covered!</div>
            )}
            {Array.from(gapsByPhase.entries()).sort().map(([phase, nodes]) => (
              <div key={phase} className="phase-group">
                <h3 className="phase-label">{PHASE_LABELS[phase] || `Phase ${phase}`}</h3>
                {nodes.map(n => (
                  <div key={n.id} className="gap-node">
                    <div className="gap-node-info">
                      <span className="gap-node-name">{n.name}</span>
                      {n.agency && <span className="gap-agency">{n.agency.replace(/_/g, ' ')}</span>}
                      {n.typical_days && <span className="gap-days">~{n.typical_days}d</span>}
                      {n.description && <p className="gap-desc">{n.description}</p>}
                    </div>
                    <button className="btn-link-spec"
                      onClick={() => { setLinkModal({ gapNode: n }); setSelectedTask(''); }}>
                      + Link task
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab === 'covered' && (
          <div className="cov-covered">
            {coverage.covered === 0 && (
              <div className="cov-empty">No requirements covered yet. Link tasks to spec requirements in the Gaps tab.</div>
            )}
            {coverage.covered_nodes.map(n => (
              <div key={n.id} className="covered-node">
                <div className="covered-node-head">
                  <span className="covered-node-name">{n.name}</span>
                  {n.agency && <span className="gap-agency">{n.agency.replace(/_/g, ' ')}</span>}
                </div>
                {n.links.map((l, i) => (
                  <div key={i} className="covered-link">
                    <span className="link-badge"
                      style={{ background: COVERAGE_COLORS[l.coverage_type as keyof typeof COVERAGE_COLORS] || '#6b7280' }}>
                      {l.coverage_type}
                    </span>
                    <span className="link-task">{l.task_title}</span>
                    <span className="link-status" style={{ color: l.task_status === 'complete' ? '#16a34a' : '#6b7280' }}>
                      {l.task_status?.replace('_', ' ')}
                    </span>
                    <button className="btn-unlink"
                      onClick={() => removeLink(
                        projNodes.find(pn => pn.title === l.task_title)?.node_id || '',
                        n.id
                      )}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Link modal */}
      {linkModal && (
        <div className="cov-modal-overlay" onClick={() => setLinkModal(null)}>
          <div className="cov-modal" onClick={e => e.stopPropagation()}>
            <h3>Link to spec requirement</h3>
            <div className="modal-spec-name">📋 {linkModal.gapNode.name}</div>
            <div className="modal-field">
              <label>Project task that covers this requirement</label>
              <select value={selectedTask} onChange={e => setSelectedTask(e.target.value)}>
                <option value="">— select a task —</option>
                {projNodes.filter(n => n.type !== 'start' && n.type !== 'end').map(n => (
                  <option key={n.node_id} value={n.node_id}>{n.title}</option>
                ))}
              </select>
            </div>
            <div className="modal-field">
              <label>Coverage type</label>
              <select value={coverageType} onChange={e => setCoverageType(e.target.value)}>
                <option value="satisfies">Fully satisfies</option>
                <option value="partially">Partially satisfies</option>
                <option value="references">References only</option>
              </select>
            </div>
            <div className="modal-field">
              <label>Notes (optional)</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. covers section 17.24.040" />
            </div>
            <div className="modal-actions">
              <button className="btn-confirm" onClick={addLink} disabled={!selectedTask}>Link</button>
              <button className="btn-cancel-modal" onClick={() => setLinkModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
