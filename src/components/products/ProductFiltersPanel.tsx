'use client';

import { ProductFilters } from '@/hooks/useProductFilters';

interface ProductFiltersPanelProps {
  filters: ProductFilters;
  setFilters: React.Dispatch<React.SetStateAction<ProductFilters>>;
  filamentTypes: string[];
  filamentColors: string[];
  onReset: () => void;
  onClose: () => void;
}

export function ProductFiltersPanel({
  filters,
  setFilters,
  filamentTypes,
  filamentColors,
  onReset,
  onClose,
}: ProductFiltersPanelProps) {
  return (
    <div className="mt-4 p-4 bg-secondary/50 rounded-lg border border-border space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-muted-foreground">
            Baskı Süresi (saat)
          </label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Min"
                value={filters.printTimeMin}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    printTimeMin: e.target.value === '' ? '' : parseFloat(e.target.value),
                  }))
                }
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                aria-label="Minimum baskı süresi"
              />
              <span className="text-muted-foreground">-</span>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Max"
                value={filters.printTimeMax}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    printTimeMax: e.target.value === '' ? '' : parseFloat(e.target.value),
                  }))
                }
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                aria-label="Maksimum baskı süresi"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-muted-foreground">
            Filament Tipi
          </label>
          <select
            value={filters.filamentType}
            onChange={(e) => setFilters((prev) => ({ ...prev, filamentType: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            aria-label="Filament tipi filtresi"
          >
            <option value="">Tümü</option>
            {filamentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-muted-foreground">
            Stok Durumu
          </label>
          <select
            value={filters.stockStatus}
            onChange={(e) => setFilters((prev) => ({ ...prev, stockStatus: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            aria-label="Stok durumu filtresi"
          >
            <option value="">Tümü</option>
            <option value="stokta-var">Stokta Var</option>
            <option value="stokta-yok">Stokta Yok</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-muted-foreground">Renk</label>
          <select
            value={filters.filamentColor}
            onChange={(e) => setFilters((prev) => ({ ...prev, filamentColor: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            aria-label="Renk filtresi"
          >
            <option value="">Tümü</option>
            {filamentColors.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-muted-foreground">
            Toplam Gramaj (g)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="Min"
              value={filters.totalGramMin}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  totalGramMin: e.target.value === '' ? '' : parseFloat(e.target.value),
                }))
              }
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              aria-label="Minimum gramaj"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="Max"
              value={filters.totalGramMax}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  totalGramMax: e.target.value === '' ? '' : parseFloat(e.target.value),
                }))
              }
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              aria-label="Maksimum gramaj"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-muted-foreground">
            Stok Adedi
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Min"
              value={filters.stockMin}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  stockMin: e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0,
                }))
              }
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              aria-label="Minimum stok adedi"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Max"
              value={filters.stockMax}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  stockMax: e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0,
                }))
              }
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              aria-label="Maksimum stok adedi"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg transition-colors"
        >
          Filtreleri Temizle
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm bg-card hover:bg-secondary border border-border rounded-lg transition-colors"
        >
          Filtreleri Gizle
        </button>
      </div>
    </div>
  );
}
