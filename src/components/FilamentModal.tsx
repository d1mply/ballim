'use client';

import { useState, useEffect } from 'react';

type FilamentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FilamentData) => void;
  filament?: FilamentData | null;
};

export interface FilamentData {
  id?: string;
  code: string;
  name: string;
  type: string;
  brand: string;
  color: string;
  location: string;
  totalWeight: number;
  remainingWeight: number;
  quantity: number;
  criticalStock: number;
  tempRange?: string;
  cap?: string;
  pricePerGram?: number;
}

export default function FilamentModal({ 
  isOpen, 
  onClose, 
  onSave, 
  filament = null 
}: FilamentModalProps) {
  const [formData, setFormData] = useState<FilamentData>({
    code: '',
    name: '',
    type: 'PLA',
    brand: '',
    color: '',
    location: '',
    totalWeight: 1000,
    remainingWeight: 1000,
    quantity: 1,
    criticalStock: 200,
    tempRange: '190-220',
    cap: '1.75',
    pricePerGram: 0
  });

  useEffect(() => {
    if (filament) {
      setFormData({ ...filament });
    }
  }, [filament]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Sayısal değerleri dönüştür ve NaN kontrolü yap
    let numValue = type === 'number' ? parseFloat(value) : value;
    
    // NaN kontrolü
    if (type === 'number' && (isNaN(numValue) || numValue === undefined)) {
      numValue = 0;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: numValue
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content max-w-md">
        <div className="modal-header">
          <h2 className="text-lg font-semibold">
            {filament ? 'Filament Düzenle' : 'Yeni Filament'}
          </h2>
          <button 
            type="button" 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Filament Adı*
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="type" className="block text-sm font-medium mb-1">
                  Filament Tipi*
                </label>
                <input
                  id="type"
                  name="type"
                  type="text"
                  value={formData.type}
                  onChange={handleChange}
                  placeholder="Örn: PLA, PETG, ABS, TPU"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="brand" className="block text-sm font-medium mb-1">
                  Marka*
                </label>
                <input
                  id="brand"
                  name="brand"
                  type="text"
                  value={formData.brand}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="color" className="block text-sm font-medium mb-1">
                  Renk*
                </label>
                <input
                  id="color"
                  name="color"
                  type="text"
                  value={formData.color}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="location" className="block text-sm font-medium mb-1">
                  Konum*
                </label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  value={formData.location}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="cap" className="block text-sm font-medium mb-1">
                  Çap (mm)
                </label>
                <input
                  id="cap"
                  name="cap"
                  type="text"
                  value={formData.cap}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="tempRange" className="block text-sm font-medium mb-1">
                  Sıcaklık (°C)
                </label>
                <input
                  id="tempRange"
                  name="tempRange"
                  type="text"
                  value={formData.tempRange}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="totalWeight" className="block text-sm font-medium mb-1">
                  Ağırlık (g)
                </label>
                <input
                  id="totalWeight"
                  name="totalWeight"
                  type="number"
                  value={isNaN(formData.totalWeight) ? 0 : formData.totalWeight}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="remainingWeight" className="block text-sm font-medium mb-1">
                  Kalan Ağırlık
                </label>
                <input
                  id="remainingWeight"
                  name="remainingWeight"
                  type="number"
                  value={isNaN(formData.remainingWeight) ? 0 : formData.remainingWeight}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium mb-1">
                  Adet Sayısı
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  value={isNaN(formData.quantity) ? 0 : formData.quantity}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="criticalStock" className="block text-sm font-medium mb-1">
                  Kritik Stok Seviyesi (g)
                </label>
                <input
                  id="criticalStock"
                  name="criticalStock"
                  type="number"
                  value={isNaN(formData.criticalStock) ? 0 : formData.criticalStock}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="cap" className="block text-sm font-medium mb-1">
                  Çap (mm)
                </label>
                <input
                  id="cap"
                  name="cap"
                  type="text"
                  value={formData.cap}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="pricePerGram" className="block text-sm font-medium mb-1">
                Satın Alım Fiyatı (KDV Dahil) (₺)*
              </label>
              <input
                id="pricePerGram"
                name="pricePerGram"
                type="number"
                step="0.01"
                value={isNaN(formData.pricePerGram || 0) ? 0 : (formData.pricePerGram || 0)}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="modal-footer mt-5">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
            >
              İptal
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 