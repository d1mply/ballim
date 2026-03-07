'use client';

import { Icons } from '../../utils/Icons';
import { FilamentData } from '../FilamentModal';

interface FilamentsTableProps {
  filaments: FilamentData[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  typeFilter: string;
  setTypeFilter: (filter: string) => void;
  types: string[];
  isLoading: boolean;
  error: string | null;
  onAddStock: (filament: FilamentData) => void;
  onShowHistory: (filament: FilamentData) => void;
  onEdit: (filament: FilamentData) => void;
  onDelete: (filamentId: string) => void;
  calculateRemainingPercentage: (filament: FilamentData) => number;
  isStockCritical: (filament: FilamentData) => boolean;
  formatWeight: (grams: number) => string;
}

export default function FilamentsTable({
  filaments, searchTerm, setSearchTerm, typeFilter, setTypeFilter, types,
  isLoading, error, onAddStock, onShowHistory, onEdit, onDelete,
  calculateRemainingPercentage, isStockCritical, formatWeight,
}: FilamentsTableProps) {
  if (isLoading) {
    return (
      <div className="py-10 text-center">
        <div className="spinner mb-4"></div>
        <p>Filament verileri yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center text-danger">
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary mt-4">
          Yeniden Dene
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
        <div className="search-container flex-grow">
          <Icons.SearchIcon className="search-icon" />
          <input
            type="text"
            placeholder="Filament ara..."
            className="w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="sm:w-auto"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Tüm Türler</option>
          {types.map((type, index) => (
            <option key={index} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Filament</th>
              <th>Marka</th>
              <th>Tür / Renk</th>
              <th>Konum</th>
              <th>Kalan Miktar</th>
              <th>Adet</th>
              <th>Son Kullanım</th>
              <th>Satın Alım Fiyatı</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filaments.length > 0 ? (
              filaments.map((filament) => (
                <tr key={filament.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full" style={{ backgroundColor: filament.color.toLowerCase() }} />
                      <div>
                        <div className="font-medium">{filament.code}</div>
                        <div className="text-sm text-muted-foreground">{filament.name}</div>
                      </div>
                    </div>
                  </td>
                  <td>{filament.brand}</td>
                  <td>
                    <div>{filament.type}</div>
                    <div className="text-sm text-muted-foreground">{filament.color}</div>
                  </td>
                  <td>{filament.location}</td>
                  <td>
                    <div className="w-full">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">
                          {formatWeight(filament.remainingWeight)} / {formatWeight(filament.totalWeight)}
                        </span>
                        <span className="text-sm">
                          {Math.round(calculateRemainingPercentage(filament))}%
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-bar-value"
                          style={{
                            width: `${calculateRemainingPercentage(filament)}%`,
                            backgroundColor: isStockCritical(filament) ? 'var(--danger)' : 'var(--success)',
                          }}
                        />
                      </div>
                      {isStockCritical(filament) && (
                        <div className="text-xs text-danger mt-1">Kritik seviye!</div>
                      )}
                    </div>
                  </td>
                  <td>{filament.quantity} adet</td>
                  <td>{new Date().toLocaleDateString('tr-TR')}</td>
                  <td>{filament.pricePerGram}₺</td>
                  <td>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => onAddStock(filament)} className="action-btn action-btn-success" title="Stok Ekle">
                        ➕
                      </button>
                      <button onClick={() => onShowHistory(filament)} className="action-btn" title="Geçmiş">
                        🕘
                      </button>
                      <button onClick={() => onEdit(filament)} className="action-btn action-btn-edit" title="Düzenle">
                        <Icons.EditIcon />
                      </button>
                      <button onClick={() => onDelete(filament.id || '')} className="action-btn action-btn-delete" title="Sil">
                        <Icons.TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-8 text-center text-muted-foreground">
                  Filament bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
