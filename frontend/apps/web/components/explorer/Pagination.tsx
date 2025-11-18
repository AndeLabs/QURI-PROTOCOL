/**
 * Modular Pagination Component
 * Handles large datasets with efficient pagination
 */

import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  showPageSize?: boolean;
  pageSizeOptions?: number[];
}

export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  showPageSize = true,
  pageSizeOptions = [12, 24, 48, 96],
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const generatePageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white border rounded-sm">
      {/* Items Info */}
      <div className="text-sm text-gray-600">
        Showing <strong>{startItem.toLocaleString()}</strong> to{' '}
        <strong>{endItem.toLocaleString()}</strong> of{' '}
        <strong>{totalItems.toLocaleString()}</strong> results
      </div>

      {/* Page Controls */}
      <div className="flex items-center gap-2">
        {/* First Page */}
        <Button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>

        {/* Previous Page */}
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Page Numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {generatePageNumbers().map((page, idx) => {
            if (page === 'ellipsis') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                  ...
                </span>
              );
            }

            return (
              <Button
                key={page}
                onClick={() => onPageChange(page)}
                variant={currentPage === page ? 'primary' : 'outline'}
                size="sm"
                className="min-w-[40px]"
              >
                {page}
              </Button>
            );
          })}
        </div>

        {/* Mobile: Current Page Indicator */}
        <div className="sm:hidden px-4 py-2 text-sm font-medium">
          Page {currentPage} of {totalPages}
        </div>

        {/* Next Page */}
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Last Page */}
        <Button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
          title="Last Page"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Page Size Selector */}
      {showPageSize && onPageSizeChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
            className="border border-gray-300 rounded-sm px-3 py-1 text-sm"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for managing pagination state
 */
export function usePagination(totalItems: number, initialPageSize: number = 24) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  const totalPages = Math.ceil(totalItems / pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const paginateItems = <T,>(items: T[]): T[] => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return items.slice(startIndex, endIndex);
  };

  return {
    currentPage,
    pageSize,
    totalPages,
    handlePageChange,
    handlePageSizeChange,
    paginateItems,
  };
}

// Add React import at the top
import React from 'react';
