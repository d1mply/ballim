'use client';

import { useState, useEffect } from 'react';

type StockAddModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: StockAddData) => void;
  filament: {
    id: string;
    code: string;
    name: string;
    type: string;
    color: string;
    brand: string;
    remainingWeight: number;
  } | null;
};

export interface StockAddData {
  filamentId: string;
  amount: number;
  price: number;
  supplier: string;
  purchaseDate: string;
  notes?: string;
}

export default function StockAddModal({ 
  isOpen, 
  onClose, 
  onSave, 
  filament 
}: StockAddModalProps) {
  const [formData, setFormData] = useState<StockAddData>({
    filamentId: '',
    amount: 1000,
    price: 0,
    supplier: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (filament) {
      setFormData(prev => ({
        ...prev,
        filamentId: filament.id
      }));
    }
  }, [filament]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    let processedValue: any = value;
    if (type === 'number') {
      processedValue = parseFloat(value) || 0;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.price) {
      alert('Miktar ve fiyat gerekli alanlar!');
      return;
    }
    
    onSave(formData);
  };

  const calculatePricePerGram = () => {
    if (formData.amount && formData.price) {
      return (formData.price / formData.amount).toFixed(3);
    }
    return '0.000';
  };

  const calculateNewTotal = () => {
    if (filament) {
      return filament.remainingWeight + formData.amount;
    }
    return 0;
  };

  if (!isOpen || !filament) return null;

  return (
    <div className="modal">
      <div className="modal-content max-w-md">
        <div className="modal-header">
          <h2 className="text-lg font-semibold">
            {filament.type} {filament.color} - Stok Ekle
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
          <div className="space-y-4">
            {/* Mevcut Bilgiler */}
            <div className="bg-muted p-3 rounded">
              <div className="text-sm space-y-1">
                <div><strong>Filament:</strong> {filament.code}</div>
                <div><strong>Mevcut Stok:</strong> {filament.remainingWeight}gr</div>
              </div>
            </div>
            
            {/* Yeni Stok Bilgileri */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium mb-1">
                  Eklenecek Miktar (gr)*
                </label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.1"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="price" className="block text-sm font-medium mb-1">
                  Alım Fiyatı (₺)*
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="supplier" className="block text-sm font-medium mb-1">
                  Tedarikçi
                </label>
                <input
                  id="supplier"
                  name="supplier"
                  type="text"
                  value={formData.supplier}
                  onChange={handleChange}
                  placeholder="Filament Dünyası"
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="purchaseDate" className="block text-sm font-medium mb-1">
                  Alım Tarihi*
                </label>
                <input
                  id="purchaseDate"
                  name="purchaseDate"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  required
                  className="w-full"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">
                Notlar
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                placeholder="İsteğe bağlı notlar..."
                className="w-full"
              />
            </div>
            
            {/* Hesaplama Özeti */}
            <div className="bg-success/10 p-3 rounded text-sm">
              <div className="space-y-1">
                <div><strong>Gram Başına Fiyat:</strong> {calculatePricePerGram()}₺</div>
                <div><strong>Yeni Toplam Stok:</strong> {calculateNewTotal()}gr</div>
              </div>
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
              Stok Ekle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 