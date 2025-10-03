'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Product {
  id: number;
  code: string;
  productType: string;
  capacity: number;
}

interface FilamentType {
  type: string;
  price: number;
}

interface PriceRange {
  id: number;
  minGram: number;
  maxGram: number;
  price: number;
  isActive: boolean;
}

interface QuoteItem {
  id: string;
  productId: number | null;
  productName: string;
  productWeight: number;
  quantity: number;
  filamentType: string;
  normalPrice: number;
  wholesalePrice: number;
}

export default function TeklifPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filamentTypes, setFilamentTypes] = useState<FilamentType[]>([]);
  const [priceRanges, setPriceRanges] = useState<PriceRange[]>([]);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  
  // Teklif bilgileri
  const [quoteNumber, setQuoteNumber] = useState<string>(`TK-${Date.now().toString().slice(-6)}`);
  
  // Ayarlar
  const [wholesalePricingMode, setWholesalePricingMode] = useState<'discount' | 'gram'>('discount');
  const [wholesaleDiscountRate, setWholesaleDiscountRate] = useState<number>(50);
  const [wholesaleGramPrice, setWholesaleGramPrice] = useState<number>(5);
  const [kdvType, setKdvType] = useState<'plus' | 'included' | 'no-invoice'>('plus');

  // Veri yükleme
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Ürünler
      const productsRes = await fetch('/api/products');
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        const formattedProducts = productsData.map((p: any) => ({
          id: p.id,
          code: p.code || p.product_code || '',
          productType: p.productType || p.product_type || '',
          capacity: p.pieceGram || p.capacity || 5
        }));
        setProducts(formattedProducts);
      }

      // Filament tipleri
      setFilamentTypes([
        { type: 'PLA', price: 8 },
        { type: 'ABS', price: 10 },
        { type: 'PETG', price: 12 }
      ]);

      // Fiyat aralıkları
      const rangesRes = await fetch('/api/wholesale-price-ranges');
      if (rangesRes.ok) {
        const rangesData = await rangesRes.json();
        setPriceRanges(rangesData);
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    }
  };

  // KDV hesaplama
  const calculateKdv = (price: number) => {
    const kdvRate = 0.20; // %20 KDV
    
    switch (kdvType) {
      case 'plus':
        // +KDV: Fiyata KDV ekle
        return {
          basePrice: price,
          kdvAmount: price * kdvRate,
          totalPrice: price * (1 + kdvRate)
        };
      case 'included':
        // KDV Dahil: Fiyattan KDV çıkar
        const basePrice = price / (1 + kdvRate);
        return {
          basePrice: basePrice,
          kdvAmount: price - basePrice,
          totalPrice: price
        };
      case 'no-invoice':
        // Faturasız: KDV yok
        return {
          basePrice: price,
          kdvAmount: 0,
          totalPrice: price
        };
      default:
        return {
          basePrice: price,
          kdvAmount: 0,
          totalPrice: price
        };
    }
  };

  // Fiyat hesaplama
  const calculatePrices = (item: QuoteItem) => {
    if (!item.productId || item.quantity <= 0) {
      return { normalPrice: 0, wholesalePrice: 0 };
    }

    const totalGrams = item.productWeight * item.quantity;
    
    // Toptancı fiyatı
    let wholesalePrice = 0;
    let normalPrice = 0;
    
    if (wholesalePricingMode === 'gram') {
      // Gram başı fiyat modunda
      const filament = filamentTypes.find(f => f.type === item.filamentType);
      normalPrice = totalGrams * (filament?.price || 8); // Normal müşteri filament fiyatı
      wholesalePrice = totalGrams * wholesaleGramPrice; // Gram başı sabit fiyat
    } else {
      // İskonto sistemi modunda
      const range = priceRanges.find(r => 
        item.productWeight >= r.minGram && item.productWeight < r.maxGram
      );
      if (range) {
        normalPrice = range.price * item.quantity; // Aralık fiyatı (iskonto öncesi)
        wholesalePrice = normalPrice * (1 - wholesaleDiscountRate / 100); // İskonto sonrası
      } else {
        // Aralık bulunamadıysa filament fiyatı kullan
        const filament = filamentTypes.find(f => f.type === item.filamentType);
        normalPrice = totalGrams * (filament?.price || 8);
        wholesalePrice = 0;
      }
    }

    return { normalPrice, wholesalePrice };
  };

  // Yeni ürün ekleme
  const addQuoteItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      productId: null,
      productName: '',
      productWeight: 0,
      quantity: 1,
      filamentType: 'PLA',
      normalPrice: 0,
      wholesalePrice: 0
    };
    setQuoteItems([...quoteItems, newItem]);
  };

  // Ürün güncelleme
  const updateQuoteItem = (id: string, field: keyof QuoteItem, value: any) => {
    setQuoteItems(prevItems => {
      const updatedItems = prevItems.map(item => {
        if (item.id === id) {
          let updatedItem = { ...item, [field]: value };
          
          // Ürün seçildiğinde ürün bilgilerini güncelle
          if (field === 'productId') {
            const product = products.find(p => p.id === value);
            if (product) {
              updatedItem.productName = `${product.code} - ${product.productType}`;
              updatedItem.productWeight = product.capacity;
            } else {
              updatedItem.productName = '';
              updatedItem.productWeight = 0;
            }
          }

          // Fiyatları hesapla
          const prices = calculatePrices(updatedItem);
          updatedItem.normalPrice = prices.normalPrice;
          updatedItem.wholesalePrice = prices.wholesalePrice;

          return updatedItem;
        }
        return item;
      });
      
      return updatedItems;
    });
  };

  // Tüm fiyatları yeniden hesapla
  const recalculateAll = () => {
    setQuoteItems(prevItems => 
      prevItems.map(item => {
        const prices = calculatePrices(item);
        return {
          ...item,
          normalPrice: prices.normalPrice,
          wholesalePrice: prices.wholesalePrice
        };
      })
    );
  };

  // Ayar değişikliklerinde yeniden hesapla
  useEffect(() => {
    recalculateAll();
  }, [wholesalePricingMode, wholesaleDiscountRate, wholesaleGramPrice, kdvType]);

  // Ürün silme
  const removeQuoteItem = (id: string) => {
    setQuoteItems(quoteItems.filter(item => item.id !== id));
  };

  // Toplam hesaplama
  const getTotals = () => {
    const normalTotal = quoteItems.reduce((sum, item) => sum + item.normalPrice, 0);
    const wholesaleTotal = quoteItems.reduce((sum, item) => sum + item.wholesalePrice, 0);
    
    // KDV hesaplama
    const kdvCalculation = calculateKdv(wholesaleTotal);
    
    return { 
      normalTotal, 
      wholesaleTotal,
      basePrice: kdvCalculation.basePrice,
      kdvAmount: kdvCalculation.kdvAmount,
      totalWithKdv: kdvCalculation.totalPrice
    };
  };

  // PDF export
  const exportToPDF = async (isProforma = false) => {
    try {
      const { normalTotal, wholesaleTotal, basePrice, kdvAmount, totalWithKdv } = getTotals();
      
      const printContent = document.createElement('div');
      printContent.style.padding = '30px';
      printContent.style.fontFamily = 'Arial, sans-serif';
      printContent.style.backgroundColor = 'white';
      printContent.style.width = '800px';
      printContent.style.lineHeight = '1.4';
      
      // Header bölümü
      const header = document.createElement('div');
      header.style.borderBottom = '3px solid #2563eb';
      header.style.paddingBottom = '20px';
      header.style.marginBottom = '30px';
      
      // Logo ve başlık
      const titleSection = document.createElement('div');
      titleSection.style.display = 'flex';
      titleSection.style.justifyContent = 'space-between';
      titleSection.style.alignItems = 'center';
      
      const title = document.createElement('h1');
      title.textContent = 'ULUDAG3D';
      title.style.fontSize = '28px';
      title.style.fontWeight = 'bold';
      title.style.color = '#1e40af';
      title.style.margin = '0';
      
      const subtitle = document.createElement('div');
      subtitle.textContent = 'Teklif Formu';
      subtitle.style.fontSize = '18px';
      subtitle.style.color = '#64748b';
      subtitle.style.marginTop = '5px';
      
      const titleDiv = document.createElement('div');
      titleDiv.appendChild(title);
      titleDiv.appendChild(subtitle);
      
      // Tarih ve teklif no
      const dateSection = document.createElement('div');
      dateSection.style.textAlign = 'right';
      
      const date = document.createElement('div');
      date.textContent = `Tarih: ${new Date().toLocaleDateString('tr-TR')}`;
      date.style.fontSize = '14px';
      date.style.color = '#374151';
      date.style.marginBottom = '5px';
      
      const quoteNo = document.createElement('div');
      quoteNo.textContent = isProforma ? `Proforma No: ${quoteNumber}` : `Teklif No: ${quoteNumber}`;
      quoteNo.style.fontSize = '14px';
      quoteNo.style.color = '#374151';
      
      dateSection.appendChild(date);
      dateSection.appendChild(quoteNo);
      
      titleSection.appendChild(titleDiv);
      titleSection.appendChild(dateSection);
      header.appendChild(titleSection);
      printContent.appendChild(header);
      
      // Fiyatlama bilgisi
      const priceInfo = document.createElement('div');
      priceInfo.style.backgroundColor = '#f8fafc';
      priceInfo.style.border = '1px solid #e2e8f0';
      priceInfo.style.borderRadius = '8px';
      priceInfo.style.padding = '15px';
      priceInfo.style.marginBottom = '25px';
      
      const infoTitle = document.createElement('div');
      infoTitle.style.fontSize = '16px';
      infoTitle.style.fontWeight = 'bold';
      infoTitle.style.color = '#374151';
      infoTitle.style.marginBottom = '8px';
      
      if (wholesalePricingMode === 'discount') {
        infoTitle.textContent = 'Fiyatlama Bilgileri';
        const infoContent = document.createElement('div');
        infoContent.style.fontSize = '14px';
        infoContent.style.color = '#6b7280';
        infoContent.innerHTML = `
          <strong>Fiyatlama Sistemi:</strong> İskonto Sistemi<br>
          <strong>İskonto Oranı:</strong> %${wholesaleDiscountRate}
        `;
        priceInfo.appendChild(infoTitle);
        priceInfo.appendChild(infoContent);
      } else {
        infoTitle.textContent = 'Fiyatlama Bilgileri';
        const infoContent = document.createElement('div');
        infoContent.style.fontSize = '14px';
        infoContent.style.color = '#6b7280';
        infoContent.innerHTML = `
          <strong>Fiyatlama Sistemi:</strong> Gram Başı Sabit Fiyat<br>
          <strong>Gram Başı Fiyat:</strong> ${wholesaleGramPrice}₺/gr
        `;
        priceInfo.appendChild(infoTitle);
        priceInfo.appendChild(infoContent);
      }
      
      printContent.appendChild(priceInfo);
      
      // Tablo
      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.marginTop = '10px';
      table.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
      
      // Başlık satırı
      const headerRow = document.createElement('tr');
      const headers = wholesalePricingMode === 'gram' 
        ? ['Ürün', 'Adet', 'Ağırlık', 'Adet Fiyatı', 'Toplam Fiyat']
        : ['Ürün', 'Adet', 'Ağırlık', 'Normal Fiyat', 'İskonto Fiyatı'];
      headers.forEach((text, index) => {
        const th = document.createElement('th');
        th.textContent = text;
        th.style.border = '1px solid #d1d5db';
        th.style.padding = '12px 8px';
        th.style.backgroundColor = '#f9fafb';
        th.style.fontWeight = 'bold';
        th.style.fontSize = '14px';
        th.style.color = '#374151';
        th.style.textAlign = index === 0 ? 'left' : 'center';
        headerRow.appendChild(th);
      });
      table.appendChild(headerRow);
      
      // Veri satırları
      quoteItems.forEach(item => {
        if (item.productId) {
          const row = document.createElement('tr');
          const rowData = wholesalePricingMode === 'gram' 
            ? [
                item.productName,
                item.quantity.toString(),
                `${item.productWeight}gr (Toplam: ${item.productWeight * item.quantity}gr)`,
                `${(item.productWeight * wholesaleGramPrice).toFixed(2)}₺`,
                `${item.wholesalePrice.toFixed(2)}₺`
              ]
            : [
                item.productName,
                item.quantity.toString(),
                `${item.productWeight}gr (Toplam: ${item.productWeight * item.quantity}gr)`,
                `${item.normalPrice.toFixed(2)}₺`,
                `${item.wholesalePrice.toFixed(2)}₺`
              ];
          rowData.forEach((text, index) => {
            const td = document.createElement('td');
            td.textContent = text;
            td.style.border = '1px solid #d1d5db';
            td.style.padding = '10px 8px';
            td.style.fontSize = '13px';
            td.style.color = '#374151';
            td.style.textAlign = index === 0 ? 'left' : 'center';
            if (index > 2) { // Fiyat kolonları
              td.style.fontWeight = 'bold';
              td.style.color = '#059669';
            }
            row.appendChild(td);
          });
          row.style.backgroundColor = '#ffffff';
          row.style.borderBottom = '1px solid #e5e7eb';
          table.appendChild(row);
        }
      });
      
      printContent.appendChild(table);
      
      // Toplam bölümü
      const totalsSection = document.createElement('div');
      totalsSection.style.marginTop = '30px';
      totalsSection.style.borderTop = '2px solid #e5e7eb';
      totalsSection.style.paddingTop = '20px';
      
      if (wholesalePricingMode === 'gram') {
        const summaryBox = document.createElement('div');
        summaryBox.style.display = 'grid';
        summaryBox.style.gridTemplateColumns = '1fr 1fr';
        summaryBox.style.gap = '15px';
        
        const totalBox = document.createElement('div');
        totalBox.style.backgroundColor = '#f0fdf4';
        totalBox.style.border = '2px solid #16a34a';
        totalBox.style.borderRadius = '8px';
        totalBox.style.padding = '20px';
        totalBox.style.textAlign = 'center';
        totalBox.innerHTML = `
          <div style="font-size: 18px; font-weight: bold; color: #15803d; margin-bottom: 8px;">
            TOPLAM FİYAT
          </div>
          <div style="font-size: 32px; font-weight: bold; color: #166534;">
            ${kdvType === 'plus' ? totalWithKdv.toFixed(2) : wholesaleTotal.toFixed(2)}₺
          </div>
          <div style="font-size: 14px; color: #16a34a; margin-top: 8px;">
            Gram Başı Fiyat: ${wholesaleGramPrice}₺/gr
          </div>
        `;
        
        // KDV Bilgisi - Gram modunda da göster
        if (kdvType !== 'no-invoice') {
          const kdvBox = document.createElement('div');
          kdvBox.style.backgroundColor = '#fef3c7';
          kdvBox.style.border = '2px solid #f59e0b';
          kdvBox.style.borderRadius = '8px';
          kdvBox.style.padding = '20px';
          kdvBox.style.textAlign = 'center';
          kdvBox.innerHTML = `
            <div style="font-size: 16px; font-weight: bold; color: #d97706; margin-bottom: 8px;">
              ${kdvType === 'plus' ? 'KDV TUTARI' : 'KDV DAHİL'}
            </div>
            <div style="font-size: 24px; font-weight: bold; color: #92400e;">
              ${kdvAmount.toFixed(2)}₺
            </div>
            <div style="font-size: 12px; color: #92400e; margin-top: 5px;">
              ${kdvType === 'plus' ? 'KDV Hariç: ' + basePrice.toFixed(2) + '₺' : 'KDV Dahil: ' + totalWithKdv.toFixed(2) + '₺'}
            </div>
            ${kdvType === 'plus' ? `
            <div style="font-size: 16px; font-weight: bold; color: #d97706; margin-top: 8px; border-top: 1px solid #f59e0b; padding-top: 8px;">
              TOPLAM: ${totalWithKdv.toFixed(2)}₺
            </div>
            ` : ''}
          `;
          summaryBox.appendChild(totalBox);
          summaryBox.appendChild(kdvBox);
        } else {
          summaryBox.appendChild(totalBox);
        }
        
        totalsSection.appendChild(summaryBox);
      } else {
        const summaryBox = document.createElement('div');
        summaryBox.style.display = 'grid';
        summaryBox.style.gridTemplateColumns = '1fr 1fr';
        summaryBox.style.gap = '15px';
        
        const normalBox = document.createElement('div');
        normalBox.style.backgroundColor = '#eff6ff';
        normalBox.style.border = '2px solid #3b82f6';
        normalBox.style.borderRadius = '8px';
        normalBox.style.padding = '15px';
        normalBox.style.textAlign = 'center';
        normalBox.innerHTML = `
          <div style="font-size: 14px; font-weight: bold; color: #1d4ed8; margin-bottom: 5px;">
            PERAKENDE TOPLAM
          </div>
          <div style="font-size: 24px; font-weight: bold; color: #1e40af;">
            ${normalTotal.toFixed(2)}₺
          </div>
        `;
        
        const discountBox = document.createElement('div');
        discountBox.style.backgroundColor = '#f0fdf4';
        discountBox.style.border = '2px solid #16a34a';
        discountBox.style.borderRadius = '8px';
        discountBox.style.padding = '15px';
        discountBox.style.textAlign = 'center';
        discountBox.innerHTML = `
          <div style="font-size: 14px; font-weight: bold; color: #15803d; margin-bottom: 5px;">
            İSKONTOLU TOPLAM
          </div>
          <div style="font-size: 24px; font-weight: bold; color: #166534;">
            ${kdvType === 'plus' ? totalWithKdv.toFixed(2) : wholesaleTotal.toFixed(2)}₺
          </div>
        `;
        
        summaryBox.appendChild(normalBox);
        summaryBox.appendChild(discountBox);
        
        // KDV Bilgisi
        if (kdvType !== 'no-invoice') {
          const kdvBox = document.createElement('div');
          kdvBox.style.backgroundColor = '#fef3c7';
          kdvBox.style.border = '2px solid #f59e0b';
          kdvBox.style.borderRadius = '8px';
          kdvBox.style.padding = '15px';
          kdvBox.style.textAlign = 'center';
          kdvBox.innerHTML = `
            <div style="font-size: 14px; font-weight: bold; color: #d97706; margin-bottom: 5px;">
              ${kdvType === 'plus' ? 'KDV TUTARI' : 'KDV DAHİL'}
            </div>
            <div style="font-size: 20px; font-weight: bold; color: #92400e;">
              ${kdvAmount.toFixed(2)}₺
            </div>
            <div style="font-size: 12px; color: #92400e; margin-top: 5px;">
              ${kdvType === 'plus' ? 'KDV Hariç: ' + basePrice.toFixed(2) + '₺' : 'KDV Dahil: ' + totalWithKdv.toFixed(2) + '₺'}
            </div>
            ${kdvType === 'plus' ? `
            <div style="font-size: 16px; font-weight: bold; color: #d97706; margin-top: 8px; border-top: 1px solid #f59e0b; padding-top: 8px;">
              TOPLAM: ${totalWithKdv.toFixed(2)}₺
            </div>
            ` : ''}
          `;
          summaryBox.appendChild(kdvBox);
        }
        
        const savingsBox = document.createElement('div');
        savingsBox.style.backgroundColor = '#fef3c7';
        savingsBox.style.border = '2px solid #f59e0b';
        savingsBox.style.borderRadius = '8px';
        savingsBox.style.padding = '15px';
        savingsBox.style.textAlign = 'center';
        savingsBox.style.marginTop = '15px';
        savingsBox.innerHTML = `
          <div style="font-size: 16px; font-weight: bold; color: #d97706;">
            TOPLAM TASARRUF: ${(normalTotal - wholesaleTotal).toFixed(2)}₺
          </div>
          <div style="font-size: 14px; color: #92400e; margin-top: 5px;">
            %${(((normalTotal - wholesaleTotal) / normalTotal) * 100).toFixed(1)} indirim
          </div>
        `;
        
        totalsSection.appendChild(summaryBox);
        totalsSection.appendChild(savingsBox);
      }
      
      printContent.appendChild(totalsSection);
      
      // Footer
      const footer = document.createElement('div');
      footer.style.marginTop = '40px';
      footer.style.paddingTop = '20px';
      footer.style.borderTop = '1px solid #e5e7eb';
      footer.style.textAlign = 'center';
      footer.style.fontSize = '12px';
      footer.style.color = '#6b7280';
      
      footer.innerHTML = `
        <div style="margin-bottom: 10px;">
          <strong>ULUDAG3D</strong> - Profesyonel 3D Baskı Hizmetleri
        </div>
        <div>
          ${isProforma ? 'Bu proforma 30 gün geçerlidir.' : 'Bu teklif 30 gün geçerlidir.'}
        </div>
      `;
      
      printContent.appendChild(footer);
      
      // Proforma için imza ve kaşe ekleme
      if (isProforma) {
        const signatureSection = document.createElement('div');
        signatureSection.style.marginTop = '30px';
        signatureSection.style.display = 'flex';
        signatureSection.style.justifyContent = 'space-between';
        signatureSection.style.alignItems = 'center';
        
        // Uyarı metinleri (sol taraf)
        const warningText = document.createElement('div');
        warningText.style.flex = '1';
        warningText.style.textAlign = 'left';
        warningText.innerHTML = `
          <div style="color: #dc2626; font-weight: bold; font-size: 14px; margin-bottom: 5px;">
            ⚠️ Bu belge fatura yerine geçmez
          </div>
          <div style="color: #6b7280; font-size: 12px;">
            Bu proforma 30 gün geçerlidir.
          </div>
        `;
        
        // İmza ve kaşe görseli (sağ taraf)
        const signatureBox = document.createElement('div');
        signatureBox.style.width = '300px';
        signatureBox.style.height = '150px';
        signatureBox.style.textAlign = 'center';
        signatureBox.style.display = 'flex';
        signatureBox.style.alignItems = 'center';
        signatureBox.style.justifyContent = 'center';
        
        // İmza ve kaşe görseli ekleme
        const signatureImg = document.createElement('img');
        signatureImg.src = '/signatures/stamp-with-signature.png';
        signatureImg.style.maxWidth = '100%';
        signatureImg.style.maxHeight = '100%';
        signatureImg.style.objectFit = 'contain';
        signatureImg.onerror = () => {
          signatureBox.innerHTML = '<div style="color: #6b7280; font-size: 14px;">İmza ve Kaşe</div>';
        };
        
        signatureBox.appendChild(signatureImg);
        signatureSection.appendChild(warningText);
        signatureSection.appendChild(signatureBox);
        printContent.appendChild(signatureSection);
      }
      
      document.body.appendChild(printContent);
      
      const canvas = await html2canvas(printContent, {
        scale: 3, // Yüksek çözünürlük için 3x scale
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: printContent.scrollWidth,
        height: printContent.scrollHeight,
        scrollX: 0,
        scrollY: 0
      });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png', 1.0); // Maksimum kalite
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      const fileName = isProforma 
        ? `proforma_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.pdf`
        : `teklif_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.pdf`;
      pdf.save(fileName);
      
      document.body.removeChild(printContent);
    } catch (error) {
      console.error('PDF oluşturulurken hata:', error);
      alert('PDF oluşturulurken bir hata oluştu.');
    }
  };

  const { normalTotal, wholesaleTotal, basePrice, kdvAmount, totalWithKdv } = getTotals();

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Başlık */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">💰 Teklif Hesaplama</h1>
            <p className="text-gray-600">Basit ve güvenilir fiyat hesaplama</p>
          </div>

          {/* Ayarlar */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* Teklif Numarası */}
              <div>
                <label className="text-sm font-medium mr-2">Teklif No:</label>
                <input
                  type="text"
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  className="w-32 px-3 py-1 border rounded-lg text-center font-medium"
                  placeholder="TK-001"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mr-2">Toptancı Fiyatlama:</label>
                <select
                  value={wholesalePricingMode}
                  onChange={(e) => setWholesalePricingMode(e.target.value as 'discount' | 'gram')}
                  className="px-3 py-1 border rounded"
                >
                  <option value="discount">İskonto Sistemi</option>
                  <option value="gram">Gram Başı Fiyat</option>
                </select>
              </div>

              {wholesalePricingMode === 'discount' && (
                <div>
                  <label className="text-sm font-medium mr-2">İskonto Oranı:</label>
                  <input
                    type="number"
                    value={wholesaleDiscountRate}
                    onChange={(e) => setWholesaleDiscountRate(Number(e.target.value))}
                    className="w-20 px-2 py-1 border rounded text-center"
                    min="0"
                    max="100"
                  />
                  <span className="ml-1 text-sm">%</span>
                </div>
              )}

              {wholesalePricingMode === 'gram' && (
                <div>
                  <label className="text-sm font-medium mr-2">Gram Başı Fiyat:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={wholesaleGramPrice}
                    onChange={(e) => setWholesaleGramPrice(Number(e.target.value))}
                    className="w-20 px-2 py-1 border rounded text-center"
                    min="0"
                  />
                  <span className="ml-1 text-sm">₺/gr</span>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">KDV:</label>
                <select
                  value={kdvType}
                  onChange={(e) => setKdvType(e.target.value as 'plus' | 'included' | 'no-invoice')}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="plus">+KDV</option>
                  <option value="included">KDV Dahil</option>
                  <option value="no-invoice">Faturasız</option>
                </select>
              </div>

              <button
                onClick={addQuoteItem}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                + Ürün Ekle
              </button>

              {quoteItems.length > 0 && (
                <>
                  <button
                    onClick={() => exportToPDF(false)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    📄 PDF İndir
                  </button>
                  <button
                    onClick={() => exportToPDF(true)}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                  >
                    📋 Proforma Fatura
                  </button>
                </>
              )}
            </div>
          </div>

                      {/* Ürün Listesi */}
          <div className="space-y-4">
            {quoteItems.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
                  {/* Ürün Seçimi */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Ürün</label>
                    <select
                      value={item.productId || ''}
                      onChange={(e) => updateQuoteItem(item.id, 'productId', Number(e.target.value) || null)}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Ürün Seçin</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.code} - {product.productType} ({product.capacity}gr)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Adet */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Adet</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuoteItem(item.id, 'quantity', Number(e.target.value) || 1)}
                      className="w-full px-3 py-2 border rounded-lg"
                      min="1"
                    />
                  </div>



                  {/* Ağırlık Bilgisi */}
                  <div className="text-sm">
                    {item.productWeight > 0 && (
                      <>
                        <div className="font-medium">Ağırlık: {item.productWeight}gr</div>
                        <div className="text-gray-600">Toplam: {item.productWeight * item.quantity}gr</div>
                      </>
                    )}
                  </div>

                  {/* Normal Fiyat */}
                  {wholesalePricingMode === 'discount' && (
                    <div className="text-center">
                      <div className="text-sm font-medium text-blue-600">Normal Fiyat</div>
                      <div className="text-lg font-bold text-blue-700">{item.normalPrice.toFixed(2)}₺</div>
                      <div className="text-xs text-gray-500">Aralık fiyatı</div>
                    </div>
                  )}

                  {/* Adet Fiyatı - Sadece gram modunda */}
                  {wholesalePricingMode === 'gram' && (
                    <div className="text-center">
                      <div className="text-sm font-medium text-green-600">Adet Fiyatı</div>
                      <div className="text-lg font-bold text-green-700">
                        {(item.productWeight * wholesaleGramPrice).toFixed(2)}₺
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.productWeight}gr × {wholesaleGramPrice}₺/gr
                      </div>
                    </div>
                  )}

                  {/* Toptancı/Toplam Fiyat */}
                  <div className="text-center">
                    <div className="text-sm font-medium text-purple-600">
                      {wholesalePricingMode === 'discount' ? 'Toptancı (İskonto)' : 'Toplam Fiyat'}
                    </div>
                    <div className="text-lg font-bold text-purple-700">{item.wholesalePrice.toFixed(2)}₺</div>
                    {wholesalePricingMode === 'gram' && (
                      <div className="text-xs text-gray-500">{item.quantity} adet toplam</div>
                    )}
                  </div>

                  {/* Silme */}
                  <div className="text-center">
                    <button
                      onClick={() => removeQuoteItem(item.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      🗑️ Sil
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {quoteItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Ürün eklemek için "Ürün Ekle" butonuna tıklayın
              </div>
            )}
          </div>

          {/* Toplam Fiyatlar */}
          {quoteItems.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h3 className="text-xl font-semibold mb-4">Toplam Fiyatlar</h3>
              
              {wholesalePricingMode === 'discount' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <h4 className="text-lg font-semibold text-blue-800 mb-2">Normal Fiyat</h4>
                    <div className="text-3xl font-bold text-blue-900">{normalTotal.toFixed(2)}₺</div>
                    <div className="text-sm text-blue-700 mt-2">Aralık fiyatı (iskonto öncesi)</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                    <h4 className="text-lg font-semibold text-purple-800 mb-2">İskonto Fiyatı</h4>
                    <div className="text-3xl font-bold text-purple-900">{wholesaleTotal.toFixed(2)}₺</div>
                    <div className="text-sm text-purple-700 mt-2">%{wholesaleDiscountRate} iskonto uygulandı</div>
                  </div>
                                     <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                     <h4 className="text-lg font-semibold text-green-800 mb-2">KDV Bilgisi</h4>
                     <div className="text-2xl font-bold text-green-900">
                       {kdvType === 'plus' ? '+KDV' : kdvType === 'included' ? 'KDV Dahil' : 'Faturasız'}
                     </div>
                     <div className="text-sm text-green-700 mt-2">
                       {kdvType === 'plus' ? 'KDV eklenecek' : kdvType === 'included' ? 'KDV dahil' : 'KDV yok'}
                     </div>
                     {kdvType === 'plus' && (
                       <div className="mt-2 text-lg font-bold text-green-800">
                         Toplam: {totalWithKdv.toFixed(2)}₺
                       </div>
                     )}
                   </div>
                </div>
              )}

              {wholesalePricingMode === 'gram' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <h4 className="text-lg font-semibold text-blue-800 mb-2">Adet Fiyatı</h4>
                    <div className="text-3xl font-bold text-blue-900">
                      {quoteItems.length > 0 && quoteItems[0].productWeight 
                        ? (quoteItems[0].productWeight * wholesaleGramPrice).toFixed(2) 
                        : (20 * wholesaleGramPrice).toFixed(2)}₺
                    </div>
                    <div className="text-sm text-blue-700 mt-2">
                      {quoteItems.length > 0 && quoteItems[0].productWeight 
                        ? `${quoteItems[0].productWeight}gr × ${wholesaleGramPrice}₺/gr`
                        : `${wholesaleGramPrice}₺/gr sabit fiyat`}
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <h4 className="text-lg font-semibold text-green-800 mb-2">Toplam Fiyat</h4>
                    <div className="text-3xl font-bold text-green-900">{wholesaleTotal.toFixed(2)}₺</div>
                    <div className="text-sm text-green-700 mt-2">
                      {quoteItems.reduce((sum, item) => sum + item.quantity, 0)} adet toplam
                    </div>
                  </div>
                                     <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
                     <h4 className="text-lg font-semibold text-orange-800 mb-2">KDV Bilgisi</h4>
                     <div className="text-2xl font-bold text-orange-900">
                       {kdvType === 'plus' ? '+KDV' : kdvType === 'included' ? 'KDV Dahil' : 'Faturasız'}
                     </div>
                     <div className="text-sm text-orange-700 mt-2">
                       {kdvType === 'plus' ? 'KDV eklenecek' : kdvType === 'included' ? 'KDV dahil' : 'KDV yok'}
                     </div>
                     {kdvType === 'plus' && (
                       <div className="mt-2 text-lg font-bold text-orange-800">
                         Toplam: {totalWithKdv.toFixed(2)}₺
                       </div>
                     )}
                   </div>
                </div>
              )}

              {wholesalePricingMode === 'discount' && normalTotal > 0 && wholesaleTotal > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                  <div className="text-lg font-semibold text-gray-700">
                    Fiyat Farkı: {(normalTotal - wholesaleTotal).toFixed(2)}₺
                  </div>
                  <div className="text-sm text-gray-600">
                    Toptancı fiyatı %{(((normalTotal - wholesaleTotal) / normalTotal) * 100).toFixed(1)} daha uygun
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aralık Bilgisi */}
          {wholesalePricingMode === 'discount' && priceRanges.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">📊 Fiyat Aralıkları</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {priceRanges.map(range => (
                  <div key={range.id} className="bg-gray-50 border rounded-lg p-3">
                    <div className="font-medium">{range.minGram}-{range.maxGram}gr</div>
                    <div className="text-lg font-bold text-purple-600">{range.price}₺</div>
                    <div className="text-sm text-gray-600">
                      %{wholesaleDiscountRate} indirimle: {(range.price * (1 - wholesaleDiscountRate / 100)).toFixed(2)}₺
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}