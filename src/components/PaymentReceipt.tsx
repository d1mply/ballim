'use client';

import React, { useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PaymentReceiptProps {
  paymentData: {
    payment: {
      id: string;
      odeme_tarihi: string;
      tutar: number;
      odeme_yontemi: string;
      aciklama?: string;
      durum: string;
    };
    order?: {
      order_code: string;
      order_date: string;
      total_amount: number;
    };
    customer: {
      name: string;
      phone?: string;
      address?: string;
      email?: string;
    };
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

export default function PaymentReceipt({ paymentData, onClose }: PaymentReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        height: receiptRef.current.scrollHeight,
        width: receiptRef.current.scrollWidth,
        scrollX: 0,
        scrollY: 0
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 5;
      const imgWidth = pdfWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - margin * 2);

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - margin * 2);
      }

      const paymentDate = new Date(paymentData.payment.odeme_tarihi).toLocaleDateString('tr-TR').replace(/\./g, '-');
      pdf.save(`Odeme-Makbuzu-${paymentDate}.pdf`);
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      alert('PDF oluşturulurken bir hata oluştu!');
    }
  };

  return (
    <div className="modal">
      <div className="modal-content max-w-3xl">
        <div className="modal-header">
          <h2 className="text-lg font-semibold">💰 Ödeme Makbuzu</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div ref={receiptRef} style={{ 
            backgroundColor: '#ffffff', 
            padding: '32px', 
            color: '#000000',
            fontFamily: 'Arial, sans-serif',
            minHeight: '100vh'
          }}>
            
            {/* Üst Başlık */}
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '32px', 
              borderBottom: '3px solid #2563eb', 
              paddingBottom: '20px' 
            }}>
              <h1 style={{ 
                fontSize: '28px', 
                fontWeight: 'bold', 
                color: '#2563eb',
                margin: '0 0 8px 0'
              }}>🎯 {paymentData.companyInfo.name}</h1>
              <p style={{ 
                fontSize: '18px', 
                color: '#6b7280', 
                margin: '0',
                fontWeight: 'bold'
              }}>ÖDEME MAKBUZU</p>
            </div>

            {/* Ödeme Bilgileri */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '32px', 
              marginBottom: '32px' 
            }}>
              {/* Sol: Müşteri Bilgileri */}
              <div style={{ 
                border: '1px solid #d1d5db', 
                padding: '20px', 
                borderRadius: '8px',
                backgroundColor: '#f9fafb'
              }}>
                <h3 style={{ 
                  fontWeight: 'bold', 
                  fontSize: '18px', 
                  marginBottom: '16px', 
                  color: '#2563eb',
                  margin: '0 0 16px 0'
                }}>👤 MÜŞTERİ BİLGİLERİ</h3>
                <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                  <div style={{ marginBottom: '10px' }}><strong>Ad Soyad:</strong> {paymentData.customer.name}</div>
                  {paymentData.customer.phone && (
                    <div style={{ marginBottom: '10px' }}><strong>Telefon:</strong> {paymentData.customer.phone}</div>
                  )}
                  {paymentData.customer.email && (
                    <div style={{ marginBottom: '10px' }}><strong>E-posta:</strong> {paymentData.customer.email}</div>
                  )}
                  {paymentData.customer.address && (
                    <div style={{ marginBottom: '10px' }}><strong>Adres:</strong> {paymentData.customer.address}</div>
                  )}
                </div>
              </div>

              {/* Sağ: Ödeme Bilgileri */}
              <div style={{ 
                border: '1px solid #d1d5db', 
                padding: '20px', 
                borderRadius: '8px',
                backgroundColor: '#f9fafb'
              }}>  
                <h3 style={{ 
                  fontWeight: 'bold', 
                  fontSize: '18px', 
                  marginBottom: '16px', 
                  color: '#2563eb',
                  margin: '0 0 16px 0'
                }}>💰 ÖDEME BİLGİLERİ</h3>
                <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Ödeme Tarihi:</strong><br/>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563eb' }}>
                      {new Date(paymentData.payment.odeme_tarihi).toLocaleDateString('tr-TR', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Ödeme Yöntemi:</strong><br/>
                    <span style={{ fontSize: '16px' }}>{paymentData.payment.odeme_yontemi}</span>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Durum:</strong><br/>
                    <span style={{ 
                      fontSize: '16px', 
                      fontWeight: 'bold',
                      color: paymentData.payment.durum === 'Ödendi' ? '#16a34a' : '#dc2626'
                    }}>
                      {paymentData.payment.durum}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ödeme Tutarı */}
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '32px', 
              backgroundColor: '#2563eb', 
              color: '#ffffff',
              padding: '24px', 
              borderRadius: '12px' 
            }}>
              <div style={{ fontSize: '18px', marginBottom: '12px', fontWeight: 'bold' }}>
                ÖDENEN TUTAR
              </div>
              <div style={{ fontSize: '48px', fontWeight: 'bold', margin: '0' }}>
                {paymentData.payment.tutar.toFixed(2)} ₺
              </div>
            </div>

            {/* Sipariş Bilgisi (varsa) */}
            {paymentData.order && (
              <div style={{ 
                border: '1px solid #d1d5db', 
                padding: '20px', 
                borderRadius: '8px',
                marginBottom: '32px',
                backgroundColor: '#f9fafb'
              }}>
                <h3 style={{ 
                  fontWeight: 'bold', 
                  fontSize: '18px', 
                  marginBottom: '16px', 
                  color: '#2563eb',
                  margin: '0 0 16px 0'
                }}>📦 İLGİLİ SİPARİŞ</h3>
                <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Sipariş No:</strong> {paymentData.order.order_code}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Sipariş Tarihi:</strong> {new Date(paymentData.order.order_date).toLocaleDateString('tr-TR')}
                  </div>
                  <div>
                    <strong>Sipariş Tutarı:</strong> {paymentData.order.total_amount.toFixed(2)} ₺
                  </div>
                </div>
              </div>
            )}

            {/* Açıklama (varsa) */}
            {paymentData.payment.aciklama && (
              <div style={{ 
                border: '1px solid #d1d5db', 
                padding: '20px', 
                borderRadius: '8px',
                marginBottom: '32px',
                backgroundColor: '#f9fafb'
              }}>
                <h3 style={{ 
                  fontWeight: 'bold', 
                  fontSize: '18px', 
                  marginBottom: '12px', 
                  color: '#2563eb',
                  margin: '0 0 12px 0'
                }}>📝 AÇIKLAMA</h3>
                <p style={{ fontSize: '14px', lineHeight: '1.6', margin: '0' }}>
                  {paymentData.payment.aciklama}
                </p>
              </div>
            )}

            {/* İmza Bölümü */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '32px', 
              marginTop: '48px',
              marginBottom: '32px',
              pageBreakInside: 'avoid'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  marginBottom: '12px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#6b7280'
                }}>
                  MÜŞTERİ İMZASI
                </div>
                <div style={{ 
                  borderTop: '2px solid #d1d5db', 
                  paddingTop: '8px',
                  minHeight: '60px'
                }}>
                  {/* İmza alanı */}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  marginBottom: '12px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#6b7280'
                }}>
                  FİRMA İMZASI
                </div>
                <div style={{ 
                  borderTop: '2px solid #d1d5db', 
                  paddingTop: '8px',
                  minHeight: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img 
                    src="/signatures/stamp-with-signature.png" 
                    alt="Firma İmzası" 
                    style={{ 
                      maxWidth: '200px', 
                      maxHeight: '80px',
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      // İmza yüklenemezse gizle
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Alt Notlar */}
            <div style={{ 
              borderTop: '2px solid #d1d5db', 
              paddingTop: '16px', 
              fontSize: '12px', 
              color: '#6b7280',
              textAlign: 'center',
              pageBreakInside: 'avoid'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>📞 İLETİŞİM:</strong> {paymentData.companyInfo.phone} | {paymentData.companyInfo.email}
              </div>
              <div>
                <strong>🌐 WEB:</strong> {paymentData.companyInfo.website}
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

