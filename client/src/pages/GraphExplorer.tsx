import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  searchGraph,
  getProcessesSummary,
  getNodeNeighborhood,
  getProcessContext,
  findPaths,
  buildContext,
  type ProcessSummary,
  type NodeNeighborhood,
  type PathResult,
  type ContextBuildResult,
} from '../services/api';
import type { ProcessNode } from '../types';
import './GraphExplorer.css';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

type ViewMode = 'search' | 'processes' | 'neighborhood' | 'paths' | 'context';

interface SearchResultNode extends ProcessNode {
  process_name: string;
  process_description: string | null;
}

const VIEW_DETAILS: Array<{ id: ViewMode; label: string; description: string }> = [
  { id: 'search', label: 'Search', description: 'Find nodes by title, description, or content.' },
  { id: 'processes', label: 'Processes', description: 'Browse process health and export context packs.' },
  { id: 'neighborhood', label: 'Neighborhood', description: 'Inspect local graph structure around a node.' },
  { id: 'paths', label: 'Find Paths', description: 'Trace how two nodes connect through the graph.' },
  { id: 'context', label: 'Context Builder', description: 'Assemble a reusable context bundle from selected nodes.' },
];

export function GraphExplorer() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>('search');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState<string>('');
  const [searchProcessId, setSearchProcessId] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResultNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [processes, setProcesses] = useState<ProcessSummary[]>([]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [neighborhoodDepth, setNeighborhoodDepth] = useState(2);
  const [neighborhood, setNeighborhood] = useState<NodeNeighborhood | null>(null);

  const [sourceNodeId, setSourceNodeId] = useState<string>('');
  const [targetNodeId, setTargetNodeId] = useState<string>('');
  const [pathResults, setPathResults] = useState<PathResult | null>(null);

  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [contextResult, setContextResult] = useState<ContextBuildResult | null>(null);
  const [contextFormat, setContextFormat] = useState<'markdown' | 'text'>('markdown');

  const searchInputRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcuts([
    {
      key: '/',
      description: 'Focus search',
      group: 'Actions',
      handler: () => {
        setViewMode('search');
        setTimeout(() => searchInputRef.current?.focus(), 50);
      },
    },
  ]);

  useEffect(() => {
    loadProcesses();
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== searchQuery) {
      setSearchQuery(q);
      handleSearch(q);
    }
  }, [searchParams]);

  const loadProcesses = async () => {
    try {
      const result = await getProcessesSummary();
      setProcesses(result.processes);
    } catch (err) {
      console.error('Failed to load processes:', err);
    }
  };

  const handleSearch = useCallback(async (query?: string) => {
    const q = query ?? searchQuery;
    if (!q.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await searchGraph({
        q: q.trim(),
        type: searchType || undefined,
        process_id: searchProcessId || undefined,
        limit: 50,
      });
      setSearchResults(result.results);
      setSearchParams({ q: q.trim() });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, searchType, searchProcessId, setSearchParams]);

  const handleViewNeighborhood = async (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setViewMode('neighborhood');
    setIsLoading(true);
    setError(null);

    try {
      const result = await getNodeNeighborhood(nodeId, neighborhoodDepth);
      setNeighborhood(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindPaths = async () => {
    if (!sourceNodeId || !targetNodeId) {
      setError('Please select both source and target nodes');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await findPaths(sourceNodeId, targetNodeId, { max_paths: 10 });
      setPathResults(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuildContext = async () => {
    if (selectedNodes.size === 0) {
      setError('Please select at least one node');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await buildContext(Array.from(selectedNodes), {
        include_neighbors: true,
        format: contextFormat,
      });
      setContextResult(result);
      setViewMode('context');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNodeSelection = (nodeId: string) => {
    setSelectedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const exportContext = async (processId: string, format: 'markdown' | 'text') => {
    try {
      setIsLoading(true);
      const result = await getProcessContext(processId, { format, include_paths: true });
      if (result.context_text) {
        await copyToClipboard(result.context_text);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case 'start': return '#34d399';
      case 'task': return '#6366f1';
      case 'decision': return '#fbbf24';
      case 'end': return '#f87171';
      default: return '#52525b';
    }
  };

  const activeView = VIEW_DETAILS.find((view) => view.id === viewMode) ?? VIEW_DETAILS[0];
  const totalNodes = processes.reduce((sum, process) => sum + process.node_count, 0);
  const totalEdges = processes.reduce((sum, process) => sum + process.edge_count, 0);
  const totalProjects = processes.reduce((sum, process) => sum + process.project_count, 0);
  const selectedProcessName = searchProcessId
    ? processes.find((process) => process.id === searchProcessId)?.name ?? 'Filtered'
    : 'All processes';

  return (
    <div className="graph-explorer">
      <header className="explorer-header">
        <div>
          <span className="explorer-eyebrow">Knowledge graph workspace</span>
          <h1>Graph Explorer</h1>
          <p>Search, navigate, and extract context from your process graph without leaving the dashboard.</p>
        </div>

        <div className="explorer-hero-grid">
          <div className="explorer-hero-card explorer-hero-card-primary">
            <span className="hero-card-label">Current mode</span>
            <strong>{activeView.label}</strong>
            <p>{activeView.description}</p>
          </div>

          <div className="explorer-hero-card">
            <span className="hero-card-label">Coverage</span>
            <strong>{processes.length} processes</strong>
            <p>{totalNodes} nodes · {totalEdges} edges · {totalProjects} projects linked</p>
          </div>

          <div className="explorer-hero-card">
            <span className="hero-card-label">Selection tray</span>
            <strong>{selectedNodes.size} node{selectedNodes.size === 1 ? '' : 's'} ready</strong>
            <p>Search results and neighborhood nodes can be bundled straight into context.</p>
          </div>
        </div>
      </header>

      <div className="explorer-tabs">
        {VIEW_DETAILS.map((view) => (
          <button
            key={view.id}
            className={`tab ${viewMode === view.id ? 'active' : ''}`}
            onClick={() => setViewMode(view.id)}
          >
            <span>{view.label}</span>
            <small>{view.description}</small>
          </button>
        ))}
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <main className="explorer-content">
        {viewMode === 'search' && (
          <div className="search-view">
            <div className="panel-shell search-shell">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">Graph lookup</span>
                  <h2>Query the graph fast</h2>
                </div>
                <div className="section-badge-row">
                  <span className="info-chip">/ focuses search</span>
                  <span className="info-chip">Up to 50 results</span>
                </div>
              </div>

              <div className="search-bar">
                <input
                  type="text"
                  ref={searchInputRef}
                  placeholder="Search nodes by title, description, or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                >
                  <option value="">All types</option>
                  <option value="start">Start</option>
                  <option value="task">Task</option>
                  <option value="decision">Decision</option>
                  <option value="end">End</option>
                </select>
                <select
                  value={searchProcessId}
                  onChange={(e) => setSearchProcessId(e.target.value)}
                >
                  <option value="">All processes</option>
                  {processes.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button onClick={() => handleSearch()} disabled={isLoading}>
                  {isLoading ? 'Searching...' : 'Search'}
                </button>
              </div>

              <div className="search-summary-row">
                <div className="mini-stat-card">
                  <span className="mini-stat-label">Results</span>
                  <strong>{searchResults.length}</strong>
                </div>
                <div className="mini-stat-card">
                  <span className="mini-stat-label">Type filter</span>
                  <strong>{searchType || 'All nodes'}</strong>
                </div>
                <div className="mini-stat-card">
                  <span className="mini-stat-label">Process scope</span>
                  <strong>{selectedProcessName}</strong>
                </div>
              </div>
            </div>

            <div className="search-results">
              {searchResults.length === 0 && !searchQuery && !isLoading && (
                <div className="empty-state-card">
                  <span className="empty-state-icon">⌘</span>
                  <h3>Start with a graph search</h3>
                  <p>Look up a task, decision, milestone, or process phrase to jump into the knowledge graph.</p>
                </div>
              )}

              {searchResults.length === 0 && searchQuery && !isLoading && (
                <div className="empty-state-card compact">
                  <h3>No results found</h3>
                  <p>Try a broader keyword, remove filters, or switch to the processes view.</p>
                </div>
              )}

              {searchResults.map((node) => (
                <div key={node.id} className="result-card">
                  <div className="result-header">
                    <span
                      className="node-type-badge"
                      style={{ backgroundColor: getNodeTypeColor(node.type) }}
                    >
                      {node.type}
                    </span>
                    <h3>{node.title}</h3>
                    <input
                      type="checkbox"
                      checked={selectedNodes.has(node.id)}
                      onChange={() => toggleNodeSelection(node.id)}
                      title="Select for context"
                    />
                  </div>
                  <p className="result-process">Process: {node.process_name}</p>
                  {node.description && (
                    <p className="result-description">{node.description}</p>
                  )}
                  <div className="result-actions">
                    <button onClick={() => handleViewNeighborhood(node.id)}>
                      View Neighborhood
                    </button>
                    <button onClick={() => navigate(`/process/${node.process_id}`)}>
                      Open Process
                    </button>
                    <button onClick={() => {
                      setSourceNodeId(node.id);
                      setViewMode('paths');
                    }}>
                      Set as Path Start
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {selectedNodes.size > 0 && (
              <div className="selection-bar">
                <span>{selectedNodes.size} node(s) selected</span>
                <button onClick={handleBuildContext}>
                  Build Context
                </button>
                <button onClick={() => setSelectedNodes(new Set())}>
                  Clear Selection
                </button>
              </div>
            )}
          </div>
        )}

        {viewMode === 'processes' && (
          <div className="processes-view">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Process inventory</span>
                <h2>Available Processes</h2>
              </div>
              <div className="section-badge-row">
                <span className="info-chip">{processes.length} loaded</span>
                <span className="info-chip">One-click exports</span>
              </div>
            </div>

            <div className="processes-grid">
              {processes.map((process) => (
                <div key={process.id} className="process-card">
                  <div className="process-card-header">
                    <span className="process-card-chip">Process</span>
                  </div>
                  <h3>{process.name}</h3>
                  {process.description && (
                    <p className="process-description">{process.description}</p>
                  )}
                  <div className="process-stats">
                    <span>{process.node_count} nodes</span>
                    <span>{process.edge_count} edges</span>
                    <span>{process.decision_count} decisions</span>
                    <span>{process.project_count} projects</span>
                  </div>
                  <div className="process-actions">
                    <button onClick={() => navigate(`/process/${process.id}`)}>
                      Edit
                    </button>
                    <button onClick={() => exportContext(process.id, 'markdown')}>
                      Copy as Markdown
                    </button>
                    <button onClick={() => exportContext(process.id, 'text')}>
                      Copy as Text
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {processes.length === 0 && (
              <div className="empty-state-card compact">
                <h3>No processes available yet</h3>
                <p>Once processes are loaded, this view becomes the quick launch pad for editing and exports.</p>
              </div>
            )}
          </div>
        )}

        {viewMode === 'neighborhood' && (
          <div className="neighborhood-view">
            <div className="panel-shell">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">Local structure</span>
                  <h2>Neighborhood Explorer</h2>
                </div>
                <div className="section-badge-row">
                  <span className="info-chip">Depth 1–5</span>
                  <span className="info-chip">Selection-aware</span>
                </div>
              </div>

              <div className="neighborhood-controls">
                <label>
                  Node ID:
                  <input
                    type="text"
                    value={selectedNodeId || ''}
                    onChange={(e) => setSelectedNodeId(e.target.value)}
                    placeholder="Enter node ID"
                  />
                </label>
                <label>
                  Depth:
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={neighborhoodDepth}
                    onChange={(e) => setNeighborhoodDepth(parseInt(e.target.value) || 1)}
                  />
                </label>
                <button
                  onClick={() => selectedNodeId && handleViewNeighborhood(selectedNodeId)}
                  disabled={!selectedNodeId || isLoading}
                >
                  {isLoading ? 'Loading...' : 'Explore'}
                </button>
              </div>
            </div>

            {neighborhood && (
              <div className="neighborhood-result">
                <div className="center-node">
                  <span className="section-kicker">Center node</span>
                  <h3>
                    <span
                      className="node-type-badge"
                      style={{ backgroundColor: getNodeTypeColor(neighborhood.center.type) }}
                    >
                      {neighborhood.center.type}
                    </span>
                    {neighborhood.center.title}
                  </h3>
                  {neighborhood.center.description && (
                    <p>{neighborhood.center.description}</p>
                  )}
                </div>

                <h4>Connected Nodes ({neighborhood.neighbors.length})</h4>
                <div className="neighbors-list">
                  {neighborhood.neighbors.map((node) => (
                    <div key={node.id} className="neighbor-item">
                      <span
                        className="node-type-badge"
                        style={{ backgroundColor: getNodeTypeColor(node.type) }}
                      >
                        {node.type}
                      </span>
                      <span className="neighbor-title">{node.title}</span>
                      <span className="neighbor-depth">{node.depth} hop(s)</span>
                      <button onClick={() => handleViewNeighborhood(node.id)}>
                        Explore
                      </button>
                      <button onClick={() => toggleNodeSelection(node.id)}>
                        {selectedNodes.has(node.id) ? 'Deselect' : 'Select'}
                      </button>
                    </div>
                  ))}
                </div>

                <h4>Connections ({neighborhood.edges.length})</h4>
                <div className="edges-list">
                  {neighborhood.edges.map((edge) => {
                    const sourceNode = neighborhood.center.id === edge.source_node_id
                      ? neighborhood.center
                      : neighborhood.neighbors.find((n) => n.id === edge.source_node_id);
                    const targetNode = neighborhood.center.id === edge.target_node_id
                      ? neighborhood.center
                      : neighborhood.neighbors.find((n) => n.id === edge.target_node_id);

                    return (
                      <div key={edge.id} className="edge-item">
                        <span>{sourceNode?.title || edge.source_node_id}</span>
                        <span className="edge-arrow">→</span>
                        <span>{targetNode?.title || edge.target_node_id}</span>
                        {edge.label && <span className="edge-label">({edge.label})</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!neighborhood && !isLoading && (
              <div className="empty-state-card compact">
                <h3>Pick a node to explore</h3>
                <p>Paste a node ID or jump here from search results to inspect nearby edges and neighbors.</p>
              </div>
            )}
          </div>
        )}

        {viewMode === 'paths' && (
          <div className="paths-view">
            <div className="panel-shell">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">Route tracing</span>
                  <h2>Find Paths</h2>
                </div>
                <div className="section-badge-row">
                  <span className="info-chip">Max 10 paths</span>
                  <span className="info-chip">Useful for dependency checks</span>
                </div>
              </div>

              <div className="paths-controls">
                <label>
                  Source Node ID:
                  <input
                    type="text"
                    value={sourceNodeId}
                    onChange={(e) => setSourceNodeId(e.target.value)}
                    placeholder="Enter source node ID"
                  />
                </label>
                <label>
                  Target Node ID:
                  <input
                    type="text"
                    value={targetNodeId}
                    onChange={(e) => setTargetNodeId(e.target.value)}
                    placeholder="Enter target node ID"
                  />
                </label>
                <button
                  onClick={handleFindPaths}
                  disabled={!sourceNodeId || !targetNodeId || isLoading}
                >
                  {isLoading ? 'Finding...' : 'Find Paths'}
                </button>
              </div>
            </div>

            {pathResults && (
              <div className="paths-result">
                <h3>
                  Paths from "{pathResults.source.title}" to "{pathResults.target.title}"
                </h3>
                <p>Found {pathResults.total_paths} path(s)</p>

                {pathResults.paths.map((path, index) => (
                  <div key={index} className="path-card">
                    <h4>Path {index + 1} ({path.length} steps)</h4>
                    <div className="path-steps">
                      {path.node_titles.map((title, i) => (
                        <span key={i} className="path-step">
                          {title}
                          {i < path.labels.length && path.labels[i] && (
                            <span className="path-label">→ {path.labels[i]}</span>
                          )}
                          {i < path.node_titles.length - 1 && !path.labels[i] && (
                            <span className="path-arrow">→</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!pathResults && !isLoading && (
              <div className="empty-state-card compact">
                <h3>No path query running</h3>
                <p>Set a start and end node to uncover how information flows across the graph.</p>
              </div>
            )}
          </div>
        )}


        {viewMode === 'context' && (
          <div className="context-view">
            <div className="panel-shell">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">Context assembly</span>
                  <h2>Build a reusable context bundle</h2>
                </div>
                <div className="section-badge-row">
                  <span className="info-chip">{selectedNodes.size} selected</span>
                  <span className="info-chip">Markdown or plain text</span>
                </div>
              </div>

              <div className="context-controls">
                <span>{selectedNodes.size} node(s) selected</span>
                <select
                  value={contextFormat}
                  onChange={(e) => setContextFormat(e.target.value as 'markdown' | 'text')}
                >
                  <option value="markdown">Markdown</option>
                  <option value="text">Plain Text</option>
                </select>
                <button
                  onClick={handleBuildContext}
                  disabled={selectedNodes.size === 0 || isLoading}
                >
                  {isLoading ? 'Building...' : 'Build Context'}
                </button>
                <button
                  onClick={() => {
                    setSelectedNodes(new Set());
                    setContextResult(null);
                  }}
                >
                  Clear
                </button>
              </div>
            </div>

            {contextResult && (
              <div className="context-result">
                <div className="context-stats">
                  <span>{contextResult.node_count} nodes</span>
                  <span>{contextResult.edge_count} edges</span>
                  <button
                    onClick={() => copyToClipboard(contextResult.context_text)}
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <pre className="context-text">{contextResult.context_text}</pre>
              </div>
            )}

            {selectedNodes.size > 0 && !contextResult && (
              <div className="selected-nodes">
                <h4>Selected Nodes:</h4>
                <ul>
                  {Array.from(selectedNodes).map((id) => (
                    <li key={id}>
                      {id}
                      <button onClick={() => toggleNodeSelection(id)}>×</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedNodes.size === 0 && !contextResult && !isLoading && (
              <div className="empty-state-card compact">
                <h3>No nodes selected yet</h3>
                <p>Select nodes from search or neighborhood results, then build a context pack here.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
