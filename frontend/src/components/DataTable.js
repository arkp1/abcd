import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const ROWS_PER_PAGE = 20;

const DataTable = ({ columns, data, rowsPerPage = ROWS_PER_PAGE }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const sortedData = useMemo(() => {
    if (!sortColumn || !data) return data || [];
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [data, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const pageData = sortedData.slice(startIdx, startIdx + rowsPerPage);

  const formatCell = (value, column) => {
    if (value === null || value === undefined) return '—';
    if (column.format) return column.format(value);
    if (typeof value === 'number') return value.toFixed(1);
    return String(value);
  };

  return (
    <div className="data-table-wrapper">
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`data-table-th ${col.sortable !== false ? 'data-table-th--sortable' : ''}`}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  style={{ width: col.width || 'auto' }}
                >
                  <span className="data-table-th-content">
                    {col.label}
                    {sortColumn === col.key && (
                      <span className="data-table-sort-icon">
                        {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="data-table-empty">
                  No data available
                </td>
              </tr>
            ) : (
              pageData.map((row, rowIdx) => (
                <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'data-table-row--even' : 'data-table-row--odd'}>
                  {columns.map((col) => (
                    <td key={col.key} className={`data-table-td ${col.className || ''}`}>
                      {formatCell(row[col.key], col)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="data-table-pagination">
          <span className="data-table-pagination-info">
            Showing {startIdx + 1}–{Math.min(startIdx + rowsPerPage, sortedData.length)} of {sortedData.length} records
          </span>
          <div className="data-table-pagination-controls">
            <button
              className="data-table-pagination-btn"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="data-table-pagination-page">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="data-table-pagination-btn"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
