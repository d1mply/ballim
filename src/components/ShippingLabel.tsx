'use client';

import React, { useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ShippingLabelProps {
  orderData: {
    order: {
      order_code: string;
      customer_name: string;
      customer_phone: string;
      customer_address: string;
      customer_email: string;
      order_date: string;
      total_amount: number;
      status: string;
    };
    items: Array<{
      product_code: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      capacity: number;
             total_weight: number;
    }>;
    customerBalance: number;
    companyInfo: {
      name: string;
      address: string;
      phone: string;
      email: string;
      website: string;
    };
  };
  onClose: () => void;
}

export default function ShippingLabel({ orderData, onClose }: ShippingLabelProps) {
  const labelRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (!labelRef.current) return;

    try {
      const canvas = await html2canvas(labelRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        height: labelRef.current.scrollHeight,
        width: labelRef.current.scrollWidth,
        scrollX: 0,
        scrollY: 0
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = 210; // A4 genişliği mm
      const pdfHeight = 297; // A4 yüksekliği mm
      const margin = 5; // Kenar boşluğu
      const imgWidth = pdfWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = margin;

      // İlk sayfa
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - margin * 2);

      // Ek sayfalar gerekirse
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - margin * 2);
      }

      pdf.save(`Sevkiyat-Belgesi-${orderData.order.order_code}.pdf`);
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      alert('PDF oluşturulurken bir hata oluştu!');
    }
  };

  const totalQuantity = orderData.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  const totalWeight = orderData.items?.reduce((sum, item) => sum + (item.total_weight || 0), 0) || 0;
  
  // KDV hesaplamaları
  const subtotal = orderData.order?.total_amount || 0;
  const kdvRate = 0.20; // %20 KDV
  const kdvAmount = subtotal * kdvRate / (1 + kdvRate); // KDV dahil fiyattan KDV'yi çıkar
  const netAmount = subtotal - kdvAmount;

  return (
    <div className="modal">
      <div className="modal-content max-w-4xl">
        <div className="modal-header">
          <h2 className="text-lg font-semibold">📦 Sipariş Sevkiyat Belgesi</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* PDF İçeriği */}
          <div ref={labelRef} style={{ 
            backgroundColor: '#ffffff', 
            padding: '32px', 
            color: '#000000',
            fontFamily: 'Arial, sans-serif',
            pageBreakInside: 'avoid',
            minHeight: '100vh'
          }}>
            
            {/* Üst Başlık */}
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '24px', 
              borderBottom: '2px solid #d1d5db', 
              paddingBottom: '16px' 
            }}>
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#2563eb',
                margin: '0 0 8px 0'
              }}>🎯 {orderData.companyInfo.name}</h1>
              <p style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                margin: '0'
              }}>3D BASKI SİPARİŞ SERVİS FORMU</p>
            </div>

            {/* Üst Bilgiler */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '32px', 
              marginBottom: '24px' 
            }}>
              {/* Sol: Müşteri Bilgileri */}
              <div style={{ 
                border: '1px solid #d1d5db', 
                padding: '16px', 
                borderRadius: '8px' 
              }}>
                <h3 style={{ 
                  fontWeight: 'bold', 
                  fontSize: '18px', 
                  marginBottom: '12px', 
                  color: '#2563eb',
                  margin: '0 0 12px 0'
                }}>👤 MÜŞTERİ BİLGİLERİ</h3>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <div style={{ marginBottom: '8px' }}><strong>Ad Soyad:</strong> {orderData.order.customer_name}</div>
                  <div style={{ marginBottom: '8px' }}><strong>Telefon:</strong> {orderData.order.customer_phone || 'Belirtilmemiş'}</div>
                  <div style={{ marginBottom: '8px' }}><strong>E-posta:</strong> {orderData.order.customer_email || 'Belirtilmemiş'}</div>
                  <div style={{ marginBottom: '8px' }}><strong>Adres:</strong> {orderData.order.customer_address || 'Belirtilmemiş'}</div>
                </div>
              </div>

              {/* Sağ: Firma Bilgileri */}
              <div style={{ 
                border: '1px solid #d1d5db', 
                padding: '16px', 
                borderRadius: '8px' 
              }}>  
                <h3 style={{ 
                  fontWeight: 'bold', 
                  fontSize: '18px', 
                  marginBottom: '12px', 
                  color: '#2563eb',
                  margin: '0 0 12px 0'
                }}>🏢 FİRMA BİLGİLERİ</h3>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <div style={{ marginBottom: '8px' }}><strong>Firma:</strong> {orderData.companyInfo.name}</div>
                  <div style={{ marginBottom: '8px' }}><strong>Adres:</strong> {orderData.companyInfo.address}</div>
                  <div style={{ marginBottom: '8px' }}><strong>Telefon:</strong> {orderData.companyInfo.phone}</div>
                  <div style={{ marginBottom: '8px' }}><strong>E-posta:</strong> {orderData.companyInfo.email}</div>
                  <div style={{ marginBottom: '8px' }}><strong>Web:</strong> {orderData.companyInfo.website}</div>
                </div>
              </div>
            </div>

            {/* Sipariş Bilgileri */}
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '24px', 
              backgroundColor: '#f3f4f6', 
              padding: '16px', 
              borderRadius: '8px' 
            }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '32px', 
                fontSize: '14px' 
              }}>
                <div>
                  <strong style={{ color: '#2563eb' }}>📋 SİPARİŞ NO:</strong><br/>
                  <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{orderData.order.order_code}</span>
                </div>
                <div>
                  <strong style={{ color: '#2563eb' }}>📅 TARİH:</strong><br/>
                  <span style={{ fontSize: '18px' }}>{orderData.order.order_date}</span>
                </div>
              </div>
            </div>

            {/* Ürün Detayları */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontWeight: 'bold', 
                fontSize: '18px', 
                marginBottom: '12px', 
                color: '#2563eb',
                margin: '0 0 12px 0'
              }}>📦 SİPARİŞ DETAYLARI</h3>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse', 
                border: '1px solid #d1d5db', 
                fontSize: '14px',
                pageBreakInside: 'avoid'
              }}>
                                                 <thead style={{ backgroundColor: '#e5e7eb' }}>
                  <tr>
                    <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'left' }}>Ürün Kodu</th>
                    <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'left' }}>Ürün Adı</th>
                    <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center' }}>Adet</th>
                    <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center' }}>Ağırlık/Adet</th>
                    <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center' }}>Toplam Ağırlık</th>
                    <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right' }}>Birim Fiyat</th>
                    <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right' }}>Toplam</th>
                  </tr>
                </thead>
                                                 <tbody>
                  {orderData.items && orderData.items.length > 0 ? orderData.items.map((item, index) => {
                    // const itemKdv = item.total_price * kdvRate / (1 + kdvRate); // Şimdilik kullanılmıyor
                    // const itemNet = item.total_price - itemKdv; // Şimdilik kullanılmıyor
                    return (
                      <tr key={index} style={{ pageBreakInside: 'avoid' }}>
                        <td style={{ border: '1px solid #d1d5db', padding: '8px', fontWeight: 'bold' }}>
                          {item.product_code || `ÜRÜN-${index + 1}`}
                        </td>
                        <td style={{ border: '1px solid #d1d5db', padding: '8px' }}>
                          {item.product_name || 'Ürün Bilgisi Bulunamadı'}
                        </td>
                        <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity || 0}</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center' }}>{item.capacity || 5}gr</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{item.total_weight || 0}gr</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right' }}>{(item.unit_price || 0).toFixed(2)}₺</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{(item.total_price || 0).toFixed(2)}₺</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={7} style={{ border: '1px solid #d1d5db', padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                        Sipariş ürünü bulunamadı
                      </td>
                    </tr>
                  )}
                  {/* KDV Özet Satırı */}
                  <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                    <td colSpan={5} style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right' }}>TOPLAM:</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right' }}>Net: {netAmount.toFixed(2)}₺</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right' }}>KDV+Net: {subtotal.toFixed(2)}₺</td>
                  </tr>
                </tbody>
              </table>
            </div>

                        {/* Özet Bilgiler */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '32px', 
              marginBottom: '24px',
              pageBreakInside: 'avoid'
            }}>
              <div style={{ 
                border: '1px solid #d1d5db', 
                padding: '16px', 
                borderRadius: '8px' 
              }}>
                <h3 style={{ 
                  fontWeight: 'bold', 
                  fontSize: '18px', 
                  marginBottom: '12px', 
                  color: '#2563eb',
                  margin: '0 0 12px 0'
                }}>📊 SİPARİŞ ÖZETİ</h3>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Toplam Ürün Çeşidi:</span>
                    <strong>{orderData.items.length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Toplam Adet:</span>
                    <strong>{totalQuantity}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Toplam Ağırlık:</span>
                    <strong>{totalWeight}gr</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderTop: '1px solid #d1d5db', paddingTop: '8px' }}>
                    <span>Net Tutar:</span>
                    <strong>{netAmount.toFixed(2)}₺</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>KDV (%20):</span>
                    <strong>{kdvAmount.toFixed(2)}₺</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #d1d5db', paddingTop: '8px' }}>
                    <span>Toplam Tutar:</span>
                    <strong style={{ fontSize: '18px' }}>{orderData.order.total_amount.toFixed(2)}₺</strong>
                  </div>
                </div>
              </div>

              {/* Müşteri Bakiyesi (varsa) */}
              {orderData.customerBalance !== 0 && (
                <div style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '16px', 
                  borderRadius: '8px' 
                }}>
                  <h3 style={{ 
                    fontWeight: 'bold', 
                    fontSize: '18px', 
                    marginBottom: '12px', 
                    color: '#2563eb',
                    margin: '0 0 12px 0'
                  }}>💰 CARİ DURUM</h3>
                  <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Önceki Bakiye:</span>
                      <strong style={{ 
                        color: orderData.customerBalance > 0 ? '#dc2626' : '#16a34a' 
                      }}>
                        {orderData.customerBalance.toFixed(2)}₺
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #d1d5db', paddingTop: '8px' }}>
                      <span>Yeni Toplam:</span>
                      <strong style={{ fontSize: '18px' }}>
                        {(orderData.customerBalance + orderData.order.total_amount).toFixed(2)}₺
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Alt Notlar */}
            <div style={{ 
              borderTop: '2px solid #d1d5db', 
              paddingTop: '16px', 
              fontSize: '12px', 
              color: '#6b7280',
              pageBreakInside: 'avoid'
            }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '32px' 
              }}>
                <div>
                  <strong>📝 NOTLAR:</strong>
                  <ul style={{ 
                    marginTop: '8px', 
                    paddingLeft: '20px', 
                    listStyleType: 'disc' 
                  }}>
                    <li style={{ marginBottom: '4px' }}>Bu belge mali değer taşımaz</li>
                    <li style={{ marginBottom: '4px' }}>Sadece sipariş takip amaçlıdır</li>
                    <li style={{ marginBottom: '4px' }}>Ürün tesliminde kontrol ediniz</li>
                  </ul>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>📞 İLETİŞİM:</strong>
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ marginBottom: '4px' }}>{orderData.companyInfo.phone}</div>
                    <div style={{ marginBottom: '4px' }}>{orderData.companyInfo.email}</div>
                    <div style={{ marginBottom: '4px' }}>{orderData.companyInfo.website}</div>
                  </div>
                </div>
              </div>
            </div>


          </div>

          {/* Alt Butonlar */}
          <div className="modal-footer mt-6">
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                İptal
              </button>
              <button
                onClick={generatePDF}
                className="btn-primary"
              >
                📄 PDF İndir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 