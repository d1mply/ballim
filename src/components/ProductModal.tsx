'use client';

import { useState, useEffect } from 'react';
import { Icons } from '../utils/Icons';

type ProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProductData) => void;
  product?: ProductData | null;
  isNewProduct?: boolean;
};

export interface ProductData {
  id?: string;
  code: string;
  productType: string;
  image?: string;
  barcode?: string;
  capacity: number;
  dimensionX: number;
  dimensionY: number;
  dimensionZ: number;
  printTime: number;
  totalGram: number;
  pieceGram: number;
  filaments?: ProductFilament[];
  filePath?: string;
  notes?: string;
}

interface ProductFilament {
  type: string;
  color: string;
  brand: string;
  weight: number;
}

export default function ProductModal({ 
  isOpen, 
  onClose, 
  onSave, 
  product = null,
  isNewProduct = false
}: ProductModalProps) {
  const [formData, setFormData] = useState<ProductData>({
    code: '',
    productType: '',
    barcode: '',
    capacity: 0,
    dimensionX: 0,
    dimensionY: 0,
    dimensionZ: 0,
    printTime: 0,
    totalGram: 0,
    pieceGram: 0,
    filaments: [{ type: 'PLA', color: '', brand: '', weight: 0 }],
    filePath: '',
    notes: ''
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [filamentTypes, setFilamentTypes] = useState<string[]>([]);
  const [filamentDetails, setFilamentDetails] = useState<Record<string, { color: string; brand: string; remaining_weight: number }[]>>({});

  useEffect(() => {
    // Filament tiplerini API'den dinamik olarak çek
    const fetchFilamentTypes = async () => {
      try {
        const response = await fetch('/api/filaments/types');
        if (response.ok) {
          const types = await response.json();
          if (Array.isArray(types) && types.length > 0) {
            setFilamentTypes(types);
          } else {
            setFilamentTypes([]);
          }
        } else {
          setFilamentTypes([]);
        }
      } catch (error) {
        console.error('Filament tipleri yüklenirken hata:', error);
        setFilamentTypes([]);
      }
    };

    fetchFilamentTypes();
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({ ...product });
      if (product.image) {
        setImagePreview(product.image);
      }
    } else if (isNewProduct) {
      // Yeni ürün için benzersiz kod oluştur
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      const newProductCode = `URN${timestamp.toString().slice(-4)}${random.toString().padStart(3, '0')}`;
      const defaultType = filamentTypes.length > 0 ? filamentTypes[0] : '';
      setFormData(prev => ({
        ...prev,
        code: newProductCode,
        filaments: [{ type: defaultType, color: '', brand: '', weight: 0 }]
      }));
    }
  }, [product, isNewProduct, filamentTypes]);

  // Filament tipine göre detayları getir
  const fetchFilamentDetails = async (type: string) => {
    try {
      const response = await fetch(`/api/filaments/details?type=${encodeURIComponent(type)}`);
      if (response.ok) {
        const details = await response.json();
        setFilamentDetails(prev => ({
          ...prev,
          [type]: details
        }));
      }
    } catch (error) {
      console.error('Filament detayları yüklenirken hata:', error);
    }
  };

  // Her filament tipi değiştiğinde detayları getir
  useEffect(() => {
    formData.filaments?.forEach(filament => {
      if (filament.type) {
        fetchFilamentDetails(filament.type);
      }
    });
  }, [formData.filaments]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Sayısal değerleri dönüştür
    let numValue = value;
    if (type === 'number') {
      // Boş değer kontrolü
      numValue = value === '' ? 0 : parseFloat(value);
      
      // NaN kontrolü
      if (isNaN(numValue as number)) {
        numValue = 0;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: numValue
    }));

    // Parça gramajını otomatik hesapla
    if (name === 'totalGram' || name === 'capacity') {
      const totalGram = name === 'totalGram' ? (value === '' ? 0 : parseFloat(value)) : formData.totalGram;
      const capacity = name === 'capacity' ? (value === '' ? 0 : parseFloat(value)) : formData.capacity;
      
      if (totalGram && capacity && capacity > 0) {
        const pieceGram = totalGram / capacity;
        setFormData(prev => ({
          ...prev,
          pieceGram: Math.round(pieceGram * 100) / 100 // 2 ondalık basamak yuvarlama
        }));
      }
    }
  };

  // Filament değişikliklerini yönet
  const handleFilamentChange = async (index: number, field: string, value: string) => {
    const updatedFilaments = [...(formData.filaments || [])];
    
    if (field === 'type') {
      // Yeni tip seçildiğinde detayları getir ve diğer alanları sıfırla
      updatedFilaments[index] = {
        ...updatedFilaments[index],
        [field]: value,
        color: '',
        brand: '',
        weight: 0
      };
    } else {
      updatedFilaments[index] = {
        ...updatedFilaments[index],
        [field]: value
      };
    }
    
    setFormData(prev => ({
      ...prev,
      filaments: updatedFilaments
    }));
  };

  const addFilament = () => {
    const defaultType = filamentTypes.length > 0 ? filamentTypes[0] : '';
    setFormData(prev => ({
      ...prev,
      filaments: [...(prev.filaments || []), { type: defaultType, color: '', brand: '', weight: 0 }]
    }));
  };

  const removeFilament = (index: number) => {
    const updatedFilaments = [...(formData.filaments || [])];
    updatedFilaments.splice(index, 1);
    
    setFormData(prev => ({
      ...prev,
      filaments: updatedFilaments
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setFormData(prev => ({
          ...prev,
          image: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Eğer sistemde filament tipi yoksa uyarı ver
    if (filamentTypes.length === 0) {
      alert('Ürün eklemek için önce filament eklemeniz gerekiyor. Lütfen Filament Yönetimi sayfasından filament ekleyin.');
      return;
    }
    
    // Filament detaylarını kontrol et - boş tip olanları filtrele
    const validFilaments = (formData.filaments || []).filter(f => f.type && f.type.trim() !== '');
    
    if (validFilaments.length === 0) {
      alert('En az bir geçerli filament tipi seçmelisiniz.');
      return;
    }
    
    // Geçerli filamentlerle ürünü kaydet
    onSave({ ...formData, filaments: validFilaments });
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content max-w-4xl">
        <div className="modal-header">
          <h2 className="text-lg font-semibold">
            {product ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Sol Kolon - Temel Bilgiler */}
            <div className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium mb-1">
                  Ürün Kodu*
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  value={formData.code}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="productType" className="block text-sm font-medium mb-1">
                  Ürün Tipi*
                </label>
                <input
                  id="productType"
                  name="productType"
                  type="text"
                  value={formData.productType}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="barcode" className="block text-sm font-medium mb-1">
                  Barkod No
                </label>
                <input
                  id="barcode"
                  name="barcode"
                  type="text"
                  value={formData.barcode || ''}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label htmlFor="capacity" className="block text-sm font-medium mb-1">
                  Kapasite (1 Tabla)
                </label>
                <input
                  id="capacity"
                  name="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={handleChange}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="dimensionX" className="block text-sm font-medium mb-1">
                    Boyut X (mm)
                  </label>
                  <input
                    id="dimensionX"
                    name="dimensionX"
                    type="number"
                    value={formData.dimensionX}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="dimensionY" className="block text-sm font-medium mb-1">
                    Boyut Y (mm)
                  </label>
                  <input
                    id="dimensionY"
                    name="dimensionY"
                    type="number"
                    value={formData.dimensionY}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="dimensionZ" className="block text-sm font-medium mb-1">
                    Boyut Z (mm)
                  </label>
                  <input
                    id="dimensionZ"
                    name="dimensionZ"
                    type="number"
                    value={formData.dimensionZ}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="printTime" className="block text-sm font-medium mb-1">
                  Baskı Süresi (saat)
                </label>
                <input
                  id="printTime"
                  name="printTime"
                  type="number"
                  value={formData.printTime}
                  onChange={handleChange}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="totalGram" className="block text-sm font-medium mb-1">
                    Toplam Gramaj (g)
                  </label>
                  <input
                    id="totalGram"
                    name="totalGram"
                    type="number"
                    value={formData.totalGram}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="pieceGram" className="block text-sm font-medium mb-1">
                    Adet Baş Gramajı (g)
                  </label>
                  <input
                    id="pieceGram"
                    name="pieceGram"
                    type="number"
                    value={formData.pieceGram}
                    onChange={handleChange}
                    readOnly
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="filePath" className="block text-sm font-medium mb-1">
                  Dosya Konumu
                </label>
                <input
                  id="filePath"
                  name="filePath"
                  type="text"
                  value={formData.filePath || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            {/* Sağ Kolon - Görsel ve Filamentler */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Ürün Görseli (WEBP)
                </label>
                <div className="border border-dashed border-input rounded-md p-3">
                  {imagePreview ? (
                    <div className="relative w-full aspect-[3/2] mb-2">
                      <img 
                        src={imagePreview} 
                        alt="Ürün önizleme" 
                        className="w-full h-full object-contain rounded-md"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-[3/2] bg-muted flex items-center justify-center mb-2 rounded-md">
                      <span className="text-muted-foreground">Görsel Yok</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-primary file:text-primary-foreground"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">
                    Filament Detayları
                  </label>
                  {filamentTypes.length > 0 ? (
                    <button 
                      type="button" 
                      onClick={addFilament}
                      className="text-xs text-primary flex items-center gap-1"
                    >
                      <Icons.Plus /> Filament Ekle
                    </button>
                  ) : null}
                </div>
                
                {filamentTypes.length === 0 ? (
                  <div className="border border-warning/20 bg-warning/5 rounded-md p-3 text-center">
                    <p className="text-sm text-warning-foreground mb-2">
                      Sistemde henüz filament tipi tanımlanmamış.
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      Ürün eklemek için öncelikle filament eklemeniz gerekiyor.
                    </p>
                    <a 
                      href="/filament" 
                      className="text-xs text-primary hover:underline"
                    >
                      Filament Yönetimi Sayfası →
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.filaments?.map((filament, index) => (
                      <div key={index} className="flex gap-2 items-end border border-border p-2 rounded-md">
                        <div className="flex-1">
                          <label className="block text-xs mb-1">Tür</label>
                          <select
                            value={filament.type}
                            onChange={(e) => handleFilamentChange(index, 'type', e.target.value)}
                            className="w-full text-sm"
                          >
                            {filamentTypes.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="flex-1">
                          <label className="block text-xs mb-1">Renk ve Marka</label>
                          <select
                            value={filament.color && filament.brand ? `${filament.color}|${filament.brand}` : ""}
                            onChange={(e) => {
                              if (e.target.value === "") {
                                handleFilamentChange(index, "color", "");
                                handleFilamentChange(index, "brand", "");
                              } else {
                                const [color, brand] = e.target.value.split("|");
                                // İki değeri aynı anda güncelle
                                const updatedFilaments = [...(formData.filaments || [])];
                                updatedFilaments[index] = {
                                  ...updatedFilaments[index],
                                  color,
                                  brand
                                };
                                setFormData(prev => ({
                                  ...prev,
                                  filaments: updatedFilaments
                                }));
                              }
                            }}
                            className="w-full text-sm"
                            disabled={!filament.type}
                          >
                            <option value="">
                              {!filament.type ? "Önce tür seçin" : "Renk ve marka seçin"}
                            </option>
                            {filament.type && filamentDetails[filament.type]?.map((detail, idx) => (
                              <option 
                                key={idx} 
                                value={`${detail.color}|${detail.brand}`}
                              >
                                {detail.color} - {detail.brand} ({detail.remaining_weight}g)
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="flex-1">
                          <label className="block text-xs mb-1">Miktar (g)</label>
                          <input
                            type="number"
                            value={filament.weight}
                            onChange={(e) => handleFilamentChange(index, 'weight', e.target.value)}
                            className="w-full text-sm"
                          />
                        </div>
                        
                        <button 
                          type="button" 
                          onClick={() => removeFilament(index)}
                          className="p-1.5 text-danger text-sm"
                          disabled={formData.filaments?.length === 1}
                        >
                          Sil
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium mb-1">
                  Notlar
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleChange}
                  rows={4}
                  className="resize-none"
                ></textarea>
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
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 