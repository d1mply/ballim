'use client';

import { Icons } from '../../utils/Icons';
import type { Customer, FilamentPrice } from '../../hooks/useCustomersData';

type FormChangeHandler = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomer: Customer | null;
  formData: Partial<Customer>;
  filamentInputs: FilamentPrice[];
  filamentTypes: string[];
  isSaving: boolean;
  onFormChange: FormChangeHandler;
  onFilamentChange: (index: number, field: 'type' | 'price', value: string) => void;
  onAddFilament: () => void;
  onRemoveFilament: (index: number) => void;
  onSave: () => void;
}

export default function CustomerFormModal({
  isOpen, onClose, selectedCustomer, formData, filamentInputs, filamentTypes,
  isSaving, onFormChange, onFilamentChange, onAddFilament, onRemoveFilament, onSave,
}: CustomerFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content max-w-2xl">
        <div className="modal-header">
          <h2 className="text-lg font-semibold">
            {selectedCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">&times;</button>
        </div>

        <div className="modal-body">
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Müşteri Tipi</label>
                <select name="type" value={formData.type || 'Bireysel'} onChange={onFormChange} className="w-full">
                  <option value="Bireysel">Bireysel</option>
                  <option value="Kurumsal">Kurumsal</option>
                </select>
              </div>
              <FormInput label="Ad Soyad*" name="name" value={formData.name} onChange={onFormChange} />
            </div>

            <CategorySection formData={formData} onFormChange={onFormChange} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Firma {formData.type === 'Kurumsal' ? '*' : '(İsteğe bağlı)'}
                </label>
                <input type="text" name="company" placeholder="Firma" value={formData.company || ''}
                  onChange={onFormChange} className="w-full" required={formData.type === 'Kurumsal'} />
              </div>
              {formData.type === 'Kurumsal' && (
                <FormInput label="Vergi Numarası*" name="taxNumber" value={formData.taxNumber} onChange={onFormChange} />
              )}
              <FormInput label="Telefon*" name="phone" type="tel" value={formData.phone} onChange={onFormChange} />
              <FormInput label="E-posta*" name="email" type="email" value={formData.email} onChange={onFormChange} />
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Adres</label>
                <textarea name="address" placeholder="Adres" rows={2} value={formData.address || ''}
                  onChange={onFormChange} className="w-full" />
              </div>
              <FormInput label="Kullanıcı Adı*" name="username" value={formData.username} onChange={onFormChange} />
              <FormInput label="Şifre*" name="password" type="password" value={formData.password} onChange={onFormChange} />
            </div>

            {formData.customerCategory === 'normal' && (
              <FilamentPricesSection filamentInputs={filamentInputs} filamentTypes={filamentTypes}
                onFilamentChange={onFilamentChange} onAddFilament={onAddFilament} onRemoveFilament={onRemoveFilament} />
            )}
            {formData.customerCategory === 'wholesale' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>Toptancı Fiyatlandırması:</strong> Gram aralığı bazında fiyatlandırma sistemi kullanılacaktır.
                </p>
              </div>
            )}
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-outline" disabled={isSaving}>İptal</button>
          <button type="button" onClick={onSave} className="btn-primary flex items-center gap-2" disabled={isSaving}>
            {isSaving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Kaydediliyor...</>
            ) : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormInput({ label, name, type = 'text', value, onChange }: {
  label: string; name: string; type?: string; value?: string; onChange: FormChangeHandler;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input type={type} name={name} placeholder={label.replace('*', '')} value={value || ''}
        onChange={onChange} className="w-full" required={label.includes('*')} />
    </div>
  );
}

function CategorySection({ formData, onFormChange }: { formData: Partial<Customer>; onFormChange: FormChangeHandler }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <label className="block text-sm font-medium mb-2">Müşteri Kategorisi</label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="radio" name="customerCategory" value="normal"
            checked={formData.customerCategory === 'normal'} onChange={onFormChange} className="text-blue-600" />
          <span className="text-sm">Normal Müşteri</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="radio" name="customerCategory" value="wholesale"
            checked={formData.customerCategory === 'wholesale'} onChange={onFormChange} className="text-blue-600" />
          <span className="text-sm">Toptancı</span>
        </label>
      </div>
      {formData.customerCategory === 'wholesale' && (
        <div className="mt-3">
          <label className="block text-sm font-medium mb-1">İskonto Oranı (%)*</label>
          <input type="number" name="discountRate" placeholder="60" value={formData.discountRate || ''}
            onChange={onFormChange} min="0" max="100" className="w-full" required />
          <p className="text-xs text-gray-400 mt-1">Örnek: %60 iskonto için 60 yazın</p>
        </div>
      )}
    </div>
  );
}

function FilamentPricesSection({ filamentInputs, filamentTypes, onFilamentChange, onAddFilament, onRemoveFilament }: {
  filamentInputs: FilamentPrice[]; filamentTypes: string[];
  onFilamentChange: (i: number, f: 'type' | 'price', v: string) => void;
  onAddFilament: () => void; onRemoveFilament: (i: number) => void;
}) {
  return (
    <div className="border-t border-border pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Filament Fiyatları</h3>
        <button type="button" onClick={onAddFilament}
          className="text-sm text-primary hover:text-primary/80 flex items-center gap-1">
          <Icons.PlusIcon /> Filament Ekle
        </button>
      </div>
      <div className="space-y-3">
        {filamentInputs.map((filament, index) => (
          <div key={index} className="flex gap-2 items-center">
            <div className="flex-1">
              <label className="block text-xs mb-1">Filament Tipi</label>
              <select value={filament.type} onChange={(e) => onFilamentChange(index, 'type', e.target.value)} className="w-full">
                {filamentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1">Fiyat (₺/g)</label>
              <input type="number" value={filament.price} onChange={(e) => onFilamentChange(index, 'price', e.target.value)}
                step="0.01" min="0" placeholder="0.00" className="w-full" />
            </div>
            <button type="button" onClick={() => onRemoveFilament(index)} disabled={filamentInputs.length <= 1}
              className="mt-6 p-1 text-danger opacity-70 hover:opacity-100 disabled:opacity-30" title="Filament Fiyatını Kaldır">
              <Icons.TrashIcon />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
