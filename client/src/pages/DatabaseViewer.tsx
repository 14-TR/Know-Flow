import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './DatabaseViewer.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface TableCounts {
  [key: string]: number;
}

interface TableData {
  table: string;
  rows: Record<string, unknown>[];
  total: number;
  limit: number;
  offset: number;
}

// Classify a cell value for styling
function getCellClass(col: string, value: unknown): string {
  if (value === null || value === undefined) return 'db-cell-null';
  if (col === 'id' || col.endsWith('_id')) return 'db-cell-id';
  if (typeof value === 'boolean') return value ? 'db-cell-bool-true' : 'db-cell-bool-false';
  if (typeof value === 'number') return 'db-cell-number';
  const str = String(value);
  if (str.startsWith('{') || str.startsWith('[')) return 'db-cell-json';
  return '';
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function truncateValue(value: string, maxLength = 60): string {
  if (value.length <= maxLength) return value;
  return value.substring(0, maxLength) + '…';
}

export default function DatabaseViewer() {
  const [tableCounts, setTableCounts] = useState<TableCounts>({});
  const [selectedTable, setSelectedTable] = useState<string>('processes');
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchTableCounts = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/debug/tables`);
      const data = await response.json();
      setTableCounts(data.tables);
    } catch (error) {
      console.error('Failed to fetch table counts:', error);
    }
  }, []);

  const fetchTableData = useCallback(async (table: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/debug/tables/${table}?limit=50`);
      const data = await response.json();
      setTableData(data);
    } catch (error) {
      console.error('Failed to fetch table data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTableCounts();
    fetchTableData(selectedTable);
  }, [fetchTableCounts, fetchTableData, selectedTable]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchTableCounts();
      fetchTableData(selectedTable);
    }, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedTable, fetchTableCounts, fetchTableData]);

  const columns = tableData?.rows.length ? Object.keys(tableData.rows[0]) : [];

  return (
    <div className="db-viewer">

      {/* Header */}
      <div className="db-header">
        <div className="db-header-left">
          <h1>Database</h1>
          <p>Inspect raw SQLite tables — read-only view</p>
        </div>
        <div className="db-header-actions">
          <label className="db-auto-refresh-label">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              fetchTableCounts();
              fetchTableData(selectedTable);
            }}
          >
            ↻ Refresh
          </button>
          <Link to="/" className="btn btn-secondary btn-sm">
            ← Back
          </Link>
        </div>
      </div>

      {/* Table tabs */}
      <div className="db-tabs">
        {Object.entries(tableCounts).map(([table, count]) => (
          <button
            key={table}
            className={`db-tab${selectedTable === table ? ' active' : ''}`}
            onClick={() => setSelectedTable(table)}
          >
            {table}
            <span className="db-tab-count">{count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="db-content">
        {tableData && (
          <div className="db-table-toolbar">
            <span className="db-table-name">{tableData.table}</span>
            <span className="db-row-count">
              {loading ? 'Loading…' : `${tableData.rows.length} of ${tableData.total} rows`}
            </span>
          </div>
        )}

        {loading && !tableData ? (
          <div className="empty-state">
            <p>Loading…</p>
          </div>
        ) : tableData ? (
          <>
            <div className="db-table-wrapper">
              <table className="db-table">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.length === 0 ? (
                    <tr className="db-empty-row">
                      <td colSpan={columns.length || 1}>No records in this table</td>
                    </tr>
                  ) : (
                    tableData.rows.map((row, idx) => (
                      <tr key={idx}>
                        {columns.map((col) => {
                          const value = row[col];
                          const formatted = formatValue(value);
                          const cellClass = getCellClass(col, value);
                          return (
                            <td
                              key={col}
                              className={cellClass}
                              title={formatted}
                            >
                              {truncateValue(formatted)}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="db-footer">
              <span>{tableData.table}</span>
              <span className="db-footer-dot">·</span>
              <span>{tableData.rows.length} of {tableData.total} rows</span>
              {tableData.total > tableData.limit && (
                <>
                  <span className="db-footer-dot">·</span>
                  <span>showing first {tableData.limit}</span>
                </>
              )}
              {autoRefresh && (
                <>
                  <span className="db-footer-dot">·</span>
                  <span style={{ color: 'var(--success)' }}>● live</span>
                </>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
