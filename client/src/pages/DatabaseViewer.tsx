import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const truncateValue = (value: string, maxLength: number = 50): string => {
    if (value.length <= maxLength) return value;
    return value.substring(0, maxLength) + '...';
  };

  return (
    <div className="main-content" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Database Viewer</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (2s)
          </label>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              fetchTableCounts();
              fetchTableData(selectedTable);
            }}
          >
            Refresh
          </button>
          <Link to="/" className="btn btn-primary btn-sm">
            Back to Home
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {Object.entries(tableCounts).map(([table, count]) => (
          <button
            key={table}
            className={`btn btn-sm ${selectedTable === table ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedTable(table)}
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            {table}
            <span style={{
              background: selectedTable === table ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
              padding: '0.125rem 0.375rem',
              borderRadius: '10px',
              fontSize: '0.75rem',
            }}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {loading && !tableData ? (
        <div className="empty-state">Loading...</div>
      ) : tableData ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.875rem',
            background: 'white',
            border: '1px solid #ddd',
          }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                {tableData.rows.length > 0 &&
                  Object.keys(tableData.rows[0]).map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: '0.5rem',
                        textAlign: 'left',
                        borderBottom: '2px solid #ddd',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {tableData.rows.length === 0 ? (
                <tr>
                  <td colSpan={100} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                    No records in this table
                  </td>
                </tr>
              ) : (
                tableData.rows.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    {Object.values(row).map((value, colIdx) => (
                      <td
                        key={colIdx}
                        style={{
                          padding: '0.5rem',
                          maxWidth: '300px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={formatValue(value)}
                      >
                        {truncateValue(formatValue(value))}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.875rem' }}>
            Showing {tableData.rows.length} of {tableData.total} records
          </div>
        </div>
      ) : null}
    </div>
  );
}
