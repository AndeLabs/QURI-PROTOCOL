/**
 * DataTable Pattern Component
 * Reusable table with sorting, pagination, and selection
 */

'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  sortable?: boolean;
  selectable?: boolean;
  onRowClick?: (row: T) => void;
  onSelectionChange?: (selected: string[]) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  sortable = false,
  selectable = false,
  onRowClick,
  onSelectionChange,
  loading = false,
  emptyMessage = 'No data available',
  className = '',
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Handle sorting
  const handleSort = (columnKey: string) => {
    if (!sortable) return;

    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0;

    const aVal = a[sortColumn];
    const bVal = b[sortColumn];

    if (aVal === bVal) return 0;

    const comparison = aVal > bVal ? 1 : -1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Handle selection
  const toggleRow = (rowKey: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowKey)) {
      newSelected.delete(rowKey);
    } else {
      newSelected.add(rowKey);
    }
    setSelectedRows(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  const toggleAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    } else {
      const allKeys = new Set(data.map(keyExtractor));
      setSelectedRows(allKeys);
      onSelectionChange?.(Array.from(allKeys));
    }
  };

  // Render sort icon
  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <ChevronsUpDown className="h-4 w-4 text-museum-dark-gray opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-gold-600" />
    ) : (
      <ChevronDown className="h-4 w-4 text-gold-600" />
    );
  };

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse">
        {/* Header */}
        <thead>
          <tr className="border-b border-museum-light-gray bg-museum-cream">
            {selectable && (
              <th className="p-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={selectedRows.size === data.length && data.length > 0}
                  onChange={toggleAll}
                  className="rounded border-museum-light-gray"
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ width: column.width }}
                className={`
                  p-3 text-${column.align || 'left'}
                  ${sortable && column.sortable !== false ? 'cursor-pointer group' : ''}
                `}
                onClick={() => column.sortable !== false && handleSort(column.key)}
              >
                <div className="flex items-center gap-2 font-semibold text-sm text-museum-black">
                  <span>{column.label}</span>
                  {sortable && column.sortable !== false && getSortIcon(column.key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="p-12 text-center">
                <div className="flex items-center justify-center gap-2 text-museum-dark-gray">
                  <div className="h-5 w-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading...</span>
                </div>
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="p-12 text-center text-museum-dark-gray">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row) => {
              const rowKey = keyExtractor(row);
              const isSelected = selectedRows.has(rowKey);

              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick?.(row)}
                  className={`
                    border-b border-museum-light-gray transition-colors
                    ${onRowClick ? 'cursor-pointer hover:bg-museum-cream' : ''}
                    ${isSelected ? 'bg-gold-50' : 'bg-museum-white'}
                  `}
                >
                  {selectable && (
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(rowKey)}
                        className="rounded border-museum-light-gray"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`p-3 text-${column.align || 'left'} text-sm text-museum-black`}
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
