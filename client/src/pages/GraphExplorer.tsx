import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
import { useToast } from '../components/Toast';

type ViewMode = 'search' | 'processes' | 'neighborhood' | 'paths' | 'context';

const VIEW_MODES: ViewMode[] = ['search', 'processes', 'neighborhood', 'paths', 'context'];

interface SearchResultNode extends ProcessNode {
  process_name: string;
  process_description: string | null;
}

const parseWorkingSet = (raw: string | null) =>
  new Set(
    (raw || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );

const normalizeViewMode = (raw: string | null): ViewMode =>
  VIEW_MODES.includes(raw as ViewMode) ? (raw as ViewMode) : 'search';

export function GraphExplorer() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>(() => normalizeViewMode(searchParams.get('view')));
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [searchType, setSearchType] = useState<string>(searchParams.get('type') || '');
  const [searchProcessId, setSearchProcessId] = useState<string>(searchParams.get('pid') || '');
  const [searchResults, setSearchResults] = useState<SearchResultNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Processes summary
  const [processes, setProcesses] = useState<ProcessSummary[]>([]);

  // Neighborhood view
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [neighborhoodDepth, setNeighborhoodDepth] = useState(2);
  const [neighborhood, setNeighborhood] = useState<NodeNeighborhood | null>(null);

  // Paths view
  const [sourceNodeId, setSourceNodeId] = useState<string>('');
  const [targetNodeId, setTargetNodeId] = useState<string>('');
  const [pathResults, setPathResults] = useState<PathResult | null>(null);

  // Context builder
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(() => parseWorkingSet(searchParams.get('ws')));
  const [contextResult, setContextResult] = useState<ContextBuildResult | null>(null);
  const [contextFormat, setContextFormat] = useState<'markdown' | 'text'>('markdown');

  // Ref for the search input to enable '/' shortcut
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCount = selectedNodes.size;
  const selectedNodeIds = useMemo(() => Array.from(selectedNodes), [selectedNodes]);
  const sourceContext = searchParams.get('source') || '';
  const processNameById = useMemo(
    () => new Map(processes.map((process) => [process.id, process.name])),
    [processes]
  );
  const activeProcessName = searchProcessId ? processNameById.get(searchProcessId) || 'Filtered process' : null;

  const updateExplorerParams = useCallback((updates: Record<string, string | null | undefined>) => {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });

    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Keyboard shortcut: '/' → focus search
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

  // Load processes on mount
  useEffect(() => {
    loadProcesses();
  }, []);

  const loadProcesses = async () => {
    try {
      const result = await getProcessesSummary();
      setProcesses(result.processes);
    } catch (err) {
      console.error('Failed to load processes:', err);
      toast('Failed to load process overview', 'error');
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
      updateExplorerParams({ q: q.trim() });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, searchType, searchProcessId, updateExplorerParams]);

  // Handle URL search param
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const nextType = searchParams.get('type') || '';
    const nextProcessId = searchParams.get('pid') || '';
    const nextViewMode = normalizeViewMode(searchParams.get('view'));
    const nextWorkingSet = parseWorkingSet(searchParams.get('ws'));

    if (q !== searchQuery) {
      setSearchQuery(q);
      if (q) {
        handleSearch(q);
      } else {
        setSearchResults([]);
      }
    }

    if (nextType !== searchType) setSearchType(nextType);
    if (nextProcessId !== searchProcessId) setSearchProcessId(nextProcessId);
    if (nextViewMode !== viewMode) setViewMode(nextViewMode);

    const currentWorkingSet = selectedNodeIds.join(',');
    const nextWorkingSetValue = Array.from(nextWorkingSet).join(',');
    if (currentWorkingSet !== nextWorkingSetValue) {
      setSelectedNodes(nextWorkingSet);
    }
  }, [handleSearch, searchParams, searchProcessId, searchQuery, searchType, selectedNodeIds, viewMode]);

  useEffect(() => {
    updateExplorerParams({
      type: searchType || null,
      pid: searchProcessId || null,
      view: viewMode !== 'search' ? viewMode : null,
      ws: selectedNodeIds.length ? selectedNodeIds.join(',') : null,
    });
  }, [searchType, searchProcessId, viewMode, selectedNodeIds, updateExplorerParams]);

  const handleViewNeighborhood = async (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setViewMode('neighborhood');
    updateExplorerParams({ view: 'neighborhood' });
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
      updateExplorerParams({ view: 'context' });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNodeSelection = (nodeId: string) => {
    setSelectedNodes(prev => {
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
      toast('Copied to clipboard', 'success');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast('Clipboard copy failed', 'error');
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
      case 'start': return '#34d399';    // --success
      case 'task': return '#6366f1';     // --accent
      case 'decision': return '#fbbf24'; // --warning
      case 'end': return '#f87171';      // --danger
      default: return '#52525b';         // --text-tertiary
    }
  };

  return (
    <div className="graph-explorer">
      <header className="explorer-header">
        <div className="explorer-header-copy">
          <h1>Graph Explorer</h1>
          <p>Search, navigate, and extract context from your knowledge graphs</p>
        </div>
        <div className="explorer-header-meta">
          <div className="meta-chip">
            <span className="meta-chip-label">Processes</span>
            <strong>{processes.length}</strong>
          </div>
          <div className="meta-chip">
            <span className="meta-chip-label">Selected</span>
            <strong>{selectedCount}</strong>
          </div>
          <div className="meta-chip">
            <span className="meta-chip-label">Last search</span>
            <strong>{searchResults.length}</strong>
          </div>
        </div>
      </header>

      {(sourceContext || selectedCount > 0 || activeProcessName) && (
        <section className="explorer-working-set-bar">
          <div className="explorer-working-set-copy">
            <span className="explorer-working-set-label">Working set</span>
            <div className="explorer-working-set-chips">
              {sourceContext && <span className="working-set-chip working-set-chip-source">From {sourceContext.replace('-', ' ')}</span>}
              {activeProcessName && <span className="working-set-chip">{activeProcessName}</span>}
              <span className="working-set-chip">{selectedCount} selected node{selectedCount === 1 ? '' : 's'}</span>
            </div>
          </div>
          <div className="explorer-working-set-actions">
            <button
              type="button"
              onClick={() => {
                setSelectedNodes(new Set());
                setContextResult(null);
                updateExplorerParams({ ws: null, source: null });
              }}
            >
              Clear working set
            </button>
            {searchProcessId && (
              <button type="button" onClick={() => navigate(`/process/${searchProcessId}`)}>
                Open process
              </button>
            )}
          </div>
        </section>
      )}

      <div className="explorer-tabs">
        <button
          className={`tab ${viewMode === 'search' ? 'active' : ''}`}
          onClick={() => setViewMode('search')}
        >
          Search
        </button>
        <button
          className={`tab ${viewMode === 'processes' ? 'active' : ''}`}
          onClick={() => setViewMode('processes')}
        >
          Processes
        </button>
        <button
          className={`tab ${viewMode === 'neighborhood' ? 'active' : ''}`}
          onClick={() => setViewMode('neighborhood')}
        >
          Neighborhood
        </button>
        <button
          className={`tab ${viewMode === 'paths' ? 'active' : ''}`}
          onClick={() => setViewMode('paths')}
        >
          Find Paths
        </button>
        <button
          className={`tab ${viewMode === 'context' ? 'active' : ''}`}
          onClick={() => setViewMode('context')}
        >
          Context Builder
        </button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <main className="explorer-content">
        {/* Search View */}
        {viewMode === 'search' && (
          <div className="search-view">
            <div className="search-intro">
              <div>
                <h2>Find the right node fast</h2>
                <p>Filter by type or process, then build context from the nodes you select.</p>
              </div>
              <span className="shortcut-pill">/ focuses search</span>
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

            <div className="search-results">
              {!searchQuery && !isLoading && (
                <div className="explorer-empty-state">
                  <h3>Start with a keyword, node title, or decision</h3>
                  <p>Try a process name, blocker, owner, or milestone. Search results stay selectable so you can build reusable context packs.</p>
                </div>
              )}

              {searchResults.length === 0 && searchQuery && !isLoading && (
                <div className="explorer-empty-state">
                  <h3>No nodes matched “{searchQuery}”</h3>
                  <p>Try broadening the query or clearing one of the filters above.</p>
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
                  <div className="result-meta">
                    <p className="result-process">Process: {node.process_name}</p>
                    <span className="result-node-id">{node.id}</span>
                  </div>
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
                      updateExplorerParams({ view: 'paths' });
                    }}>
                      Set as Path Start
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {selectedCount > 0 && (
              <div className="selection-bar">
                <span>{selectedCount} node(s) selected</span>
                <button onClick={handleBuildContext}>
                  Build Context
                </button>
                <button onClick={() => setViewMode('search')}>
                  Keep Exploring
                </button>
                <button onClick={() => setSelectedNodes(new Set())}>
                  Clear Selection
                </button>
              </div>
            )}
          </div>
        )}

        {/* Processes View */}
        {viewMode === 'processes' && (
          <div className="processes-view">
            <h2>Available Processes</h2>
            <div className="processes-grid">
              {processes.map((process) => (
                <div key={process.id} className="process-card">
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
          </div>
        )}

        {/* Neighborhood View */}
        {viewMode === 'neighborhood' && (
          <div className="neighborhood-view">
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

            {neighborhood && (
              <div className="neighborhood-result">
                <div className="center-node">
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
                      : neighborhood.neighbors.find(n => n.id === edge.source_node_id);
                    const targetNode = neighborhood.center.id === edge.target_node_id
                      ? neighborhood.center
                      : neighborhood.neighbors.find(n => n.id === edge.target_node_id);

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
          </div>
        )}

        {/* Paths View */}
        {viewMode === 'paths' && (
          <div className="paths-view">
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
          </div>
        )}

        {/* Context Builder View */}
        {viewMode === 'context' && (
          <div className="context-view">
            <div className="context-controls">
              <span>{selectedCount} node(s) selected</span>
              <select
                value={contextFormat}
                onChange={(e) => setContextFormat(e.target.value as 'markdown' | 'text')}
              >
                <option value="markdown">Markdown</option>
                <option value="text">Plain Text</option>
              </select>
              <button
                onClick={handleBuildContext}
                disabled={selectedCount === 0 || isLoading}
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

            {selectedCount > 0 && !contextResult && (
              <div className="selected-nodes">
                <h4>Selected Nodes:</h4>
                <ul>
                  {selectedNodeIds.map((id) => (
                    <li key={id}>
                      {id}
                      <button onClick={() => toggleNodeSelection(id)}>×</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
