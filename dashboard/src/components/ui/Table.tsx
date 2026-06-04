import React from 'react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyState?: React.ReactNode;
  rowKey?: (row: T, index: number) => string | number;
}

export function Table<T>({
  columns,
  data,
  emptyState,
  rowKey,
}: TableProps<T>) {
  const getRowKey = (row: T, index: number) => {
    if (rowKey) return rowKey(row, index);
    const anyRow = row as any;
    if (anyRow && (typeof anyRow.id === 'string' || typeof anyRow.id === 'number')) {
      return anyRow.id;
    }
    return index;
  };

  return (
    <div className="w-full overflow-x-auto border border-gray-200 dark:border-[#1d1c26] rounded-lg shadow-sm font-sans">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 dark:bg-[#12111a]/60 border-b border-gray-200 dark:border-[#1d1c26]/60">
            {columns.map((column, index) => (
              <th
                key={column.key || index}
                className={`px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-wider ${column.className || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-[#1d1c26]/30 bg-white dark:bg-[#12111a] transition-colors">
          {data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr
                key={getRowKey(row, rowIndex)}
                className="hover:bg-gray-50 dark:hover:bg-[#1c1a29]/30 transition-colors"
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={column.key || colIndex}
                    className={`px-6 py-4 text-sm text-gray-600 dark:text-gray-300 ${column.className || ''}`}
                  >
                    {column.render ? column.render(row, rowIndex) : (row as any)[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12">
                {emptyState || (
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                    No data available
                  </div>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
