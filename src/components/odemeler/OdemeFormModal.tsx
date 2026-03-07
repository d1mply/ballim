'use client';

import type { Odeme, OdemeCustomer, OdemeSiparis, OdemeFormData } from '../../types';
import { ODEME_YONTEMLERI, formatCurrency } from '../../hooks/useOdemelerData';

interface OdemeFormModalProps {
  isOpen: boolean;
  selectedOdeme: Odeme | null;
  formData: OdemeFormData;
  customers: OdemeCustomer[];
  siparisler: OdemeSiparis[];
  onClose: () => void;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onMusteriChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onSave: () => void;
}

const inputClass = 'w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50';

export default function OdemeFormModal({
  isOpen, selectedOdeme, formData, customers, siparisler,
  onClose, onFormChange, onMusteriChange, onSave,
}: OdemeFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        <div className="bg-white rounded-lg shadow-xl transform transition-all max-w-lg w-full p-6 z-10">
          <h3 className="text-lg font-medium mb-4">
            {selectedOdeme ? 'Ödemeyi Düzenle' : 'Yeni Ödeme Ekle'}
          </h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="form-musteri" className="block text-sm font-medium mb-1">Müşteri</label>
              <select id="form-musteri" name="musteri_id" className={inputClass} value={formData.musteri_id} onChange={onMusteriChange} required>
                <option value="">Müşteri Seçin</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {formData.musteri_id && (
              <div>
                <label htmlFor="form-siparis" className="block text-sm font-medium mb-1">Sipariş (İsteğe bağlı)</label>
                <select id="form-siparis" name="siparis_id" className={inputClass} value={formData.siparis_id} onChange={onFormChange}>
                  <option value="">Sipariş Seçin</option>
                  {siparisler.map(s => (
                    <option key={s.id} value={s.id}>
                      SIP-{s.id.padStart(3, '0')} ({formatCurrency(s.total_amount)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="form-tarih" className="block text-sm font-medium mb-1">Ödeme Tarihi</label>
              <input type="date" id="form-tarih" name="odeme_tarihi" className={inputClass} value={formData.odeme_tarihi} onChange={onFormChange} required />
            </div>

            <div>
              <label htmlFor="form-tutar" className="block text-sm font-medium mb-1">Tutar (₺)</label>
              <input type="number" step="0.01" id="form-tutar" name="tutar" className={inputClass} value={formData.tutar} onChange={onFormChange} required />
            </div>

            <div>
              <label htmlFor="form-odeme-yontemi" className="block text-sm font-medium mb-1">Ödeme Yöntemi</label>
              <select id="form-odeme-yontemi" name="odeme_yontemi" className={inputClass} value={formData.odeme_yontemi} onChange={onFormChange} required>
                {ODEME_YONTEMLERI.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="form-vade" className="block text-sm font-medium mb-1">Vade (Ay) - İsteğe bağlı</label>
              <input type="number" id="form-vade" name="vade_ay" className={inputClass} value={formData.vade_ay} onChange={onFormChange} min="0" placeholder="Vade yoksa boş bırakın" />
            </div>

            <div>
              <label htmlFor="form-durum" className="block text-sm font-medium mb-1">Ödeme Durumu</label>
              <select id="form-durum" name="durum" className={inputClass} value={formData.durum} onChange={onFormChange} required>
                <option value="Ödendi">Ödendi</option>
                <option value="Beklemede">Beklemede</option>
                <option value="İptal Edildi">İptal Edildi</option>
              </select>
            </div>

            <div>
              <label htmlFor="form-aciklama" className="block text-sm font-medium mb-1">Açıklama</label>
              <textarea id="form-aciklama" name="aciklama" rows={3} className={inputClass} value={formData.aciklama} onChange={onFormChange} placeholder="Ödeme ile ilgili notlar..." />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button type="button" className="btn-secondary" onClick={onClose}>İptal</button>
            <button type="button" className="btn-primary" onClick={onSave}>
              {selectedOdeme ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
