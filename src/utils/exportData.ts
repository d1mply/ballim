import Papa from 'papaparse';

const UTF8_BOM = '\uFEFF';

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  const csv = Papa.unparse(data);
  const blob = new Blob([UTF8_BOM + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

export async function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = 'Sheet1'
): Promise<void> {
  try {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    triggerDownload(
      blob,
      filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
    );
  } catch {
    throw new Error('xlsx kütüphanesi yüklü değil. Lütfen "npm install xlsx" çalıştırın.');
  }
}

export function formatDateForExport(date: string | Date): string {
  return new Date(date).toLocaleDateString('tr-TR');
}

export function formatCurrencyForExport(amount: number): string {
  return amount.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
