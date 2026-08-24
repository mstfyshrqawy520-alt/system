/**
 * Utility to export tabular data to a UTF-8 encoded CSV file with Arabic support (BOM).
 */
export interface CsvExportOptions {
  filename?: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
}

export const exportToCsv = ({
  filename = `export_${new Date().toISOString().slice(0, 10)}.csv`,
  headers,
  rows,
}: CsvExportOptions): void => {
  const sanitizeCell = (cell: string | number | boolean | null | undefined): string => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent =
    '\uFEFF' +
    [
      headers.map(sanitizeCell).join(','),
      ...rows.map((row) => row.map(sanitizeCell).join(',')),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default exportToCsv;
