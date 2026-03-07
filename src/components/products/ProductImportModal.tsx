'use client';

import { Icons } from '../../utils/Icons';

type ProductImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => void;
  isImporting: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
};

const CSV_COLUMNS =
  'code, productType, image, barcode, capacity, dimensionX, dimensionY, dimensionZ, printTime, totalGram, pieceGram, filePath, notes, filaments';

export default function ProductImportModal({
  isOpen,
  onClose,
  onImport,
  isImporting,
  fileInputRef,
}: ProductImportModalProps) {
  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImport(file);
  };

  return (
    <div className="modal">
      <div className="modal-content max-w-lg">
        <div className="modal-header">
          <h2 className="text-lg font-semibold">Ürünleri İçeri Aktar</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <Icons.XMarkIcon />
          </button>
        </div>
        <div className="modal-body space-y-4">
          <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md text-sm">
            <Icons.AlertCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">CSV Formatı</p>
              <p className="text-blue-700 dark:text-blue-300">
                Sütunlar: {CSV_COLUMNS}
              </p>
            </div>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isImporting}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer"
            />
          </div>
          {isImporting && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icons.RefreshIcon className="w-5 h-5 animate-spin" />
              İçe aktarılıyor...
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary" disabled={isImporting}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
