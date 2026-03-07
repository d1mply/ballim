import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { QuoteItem, WholesalePricingMode, KdvType } from '../hooks/useTeklifCalculations';

export interface PdfExportParams {
  quoteItems: QuoteItem[];
  quoteNumber: string;
  wholesalePricingMode: WholesalePricingMode;
  wholesaleDiscountRate: number;
  wholesaleGramPrice: number;
  kdvType: KdvType;
  normalTotal: number;
  wholesaleTotal: number;
  basePrice: number;
  kdvAmount: number;
  totalWithKdv: number;
}

function el(tag: string, styles: Partial<CSSStyleDeclaration> = {}, html?: string): HTMLElement {
  const node = document.createElement(tag);
  Object.assign(node.style, styles);
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function buildHeader(quoteNumber: string, isProforma: boolean): HTMLElement {
  const header = el('div', { borderBottom: '3px solid #2563eb', paddingBottom: '20px', marginBottom: '30px' });
  const row = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center' });

  const left = el('div');
  left.appendChild(el('h1', { fontSize: '28px', fontWeight: 'bold', color: '#1e40af', margin: '0' }, 'ULUDAG3D'));
  left.appendChild(el('div', { fontSize: '18px', color: '#64748b', marginTop: '5px' }, 'Teklif Formu'));

  const right = el('div', { textAlign: 'right' });
  right.appendChild(el('div', { fontSize: '14px', color: '#374151', marginBottom: '5px' },
    `Tarih: ${new Date().toLocaleDateString('tr-TR')}`));
  right.appendChild(el('div', { fontSize: '14px', color: '#374151' },
    isProforma ? `Proforma No: ${quoteNumber}` : `Teklif No: ${quoteNumber}`));

  row.appendChild(left);
  row.appendChild(right);
  header.appendChild(row);
  return header;
}

function buildPriceInfo(p: PdfExportParams): HTMLElement {
  const box = el('div', {
    backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: '8px', padding: '15px', marginBottom: '25px'
  });
  const info = p.wholesalePricingMode === 'discount'
    ? `<strong>Fiyatlama Sistemi:</strong> İskonto Sistemi<br><strong>İskonto Oranı:</strong> %${p.wholesaleDiscountRate}`
    : `<strong>Fiyatlama Sistemi:</strong> Gram Başı Sabit Fiyat<br><strong>Gram Başı Fiyat:</strong> ${p.wholesaleGramPrice}₺/gr`;

  box.appendChild(el('div', { fontSize: '16px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }, 'Fiyatlama Bilgileri'));
  box.appendChild(el('div', { fontSize: '14px', color: '#6b7280' }, info));
  return box;
}

function buildTable(p: PdfExportParams): HTMLElement {
  const table = el('table', {
    width: '100%', borderCollapse: 'collapse', marginTop: '10px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  });

  const headers = p.wholesalePricingMode === 'gram'
    ? ['Ürün', 'Adet', 'Ağırlık', 'Adet Fiyatı', 'Toplam Fiyat']
    : ['Ürün', 'Adet', 'Ağırlık', 'Normal Fiyat', 'İskonto Fiyatı'];

  const headerRow = el('tr');
  headers.forEach((text, i) => {
    const th = el('th', {
      border: '1px solid #d1d5db', padding: '12px 8px', backgroundColor: '#f9fafb',
      fontWeight: 'bold', fontSize: '14px', color: '#374151',
      textAlign: i === 0 ? 'left' : 'center'
    }, text);
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  p.quoteItems.forEach(item => {
    if (!item.productId) return;
    const rowData = p.wholesalePricingMode === 'gram'
      ? [item.productName, item.quantity.toString(),
         `${item.productWeight}gr (Toplam: ${item.productWeight * item.quantity}gr)`,
         `${(item.productWeight * p.wholesaleGramPrice).toFixed(2)}₺`,
         `${item.wholesalePrice.toFixed(2)}₺`]
      : [item.productName, item.quantity.toString(),
         `${item.productWeight}gr (Toplam: ${item.productWeight * item.quantity}gr)`,
         `${item.normalPrice.toFixed(2)}₺`,
         `${item.wholesalePrice.toFixed(2)}₺`];

    const row = el('tr', { backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb' });
    rowData.forEach((text, i) => {
      const td = el('td', {
        border: '1px solid #d1d5db', padding: '10px 8px', fontSize: '13px',
        color: i > 2 ? '#059669' : '#374151',
        fontWeight: i > 2 ? 'bold' : 'normal',
        textAlign: i === 0 ? 'left' : 'center'
      }, text);
      row.appendChild(td);
    });
    table.appendChild(row);
  });

  return table;
}

function buildKdvBox(p: PdfExportParams, bgColor: string, borderColor: string, textColor: string): HTMLElement {
  const box = el('div', {
    backgroundColor: bgColor, border: `2px solid ${borderColor}`,
    borderRadius: '8px', padding: '20px', textAlign: 'center'
  });
  const label = p.kdvType === 'plus' ? 'KDV TUTARI' : 'KDV DAHİL';
  const detail = p.kdvType === 'plus'
    ? `KDV Hariç: ${p.basePrice.toFixed(2)}₺`
    : `KDV Dahil: ${p.totalWithKdv.toFixed(2)}₺`;
  let html = `
    <div style="font-size:16px;font-weight:bold;color:${textColor};margin-bottom:8px;">${label}</div>
    <div style="font-size:24px;font-weight:bold;color:#92400e;">${p.kdvAmount.toFixed(2)}₺</div>
    <div style="font-size:12px;color:#92400e;margin-top:5px;">${detail}</div>`;
  if (p.kdvType === 'plus') {
    html += `<div style="font-size:16px;font-weight:bold;color:${textColor};margin-top:8px;border-top:1px solid ${borderColor};padding-top:8px;">TOPLAM: ${p.totalWithKdv.toFixed(2)}₺</div>`;
  }
  box.innerHTML = html;
  return box;
}

function buildTotals(p: PdfExportParams): HTMLElement {
  const section = el('div', { marginTop: '30px', borderTop: '2px solid #e5e7eb', paddingTop: '20px' });
  const grid = el('div', { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' });

  if (p.wholesalePricingMode === 'gram') {
    const totalBox = el('div', {
      backgroundColor: '#f0fdf4', border: '2px solid #16a34a',
      borderRadius: '8px', padding: '20px', textAlign: 'center'
    });
    totalBox.innerHTML = `
      <div style="font-size:18px;font-weight:bold;color:#15803d;margin-bottom:8px;">TOPLAM FİYAT</div>
      <div style="font-size:32px;font-weight:bold;color:#166534;">${p.kdvType === 'plus' ? p.totalWithKdv.toFixed(2) : p.wholesaleTotal.toFixed(2)}₺</div>
      <div style="font-size:14px;color:#16a34a;margin-top:8px;">Gram Başı Fiyat: ${p.wholesaleGramPrice}₺/gr</div>`;
    grid.appendChild(totalBox);
    if (p.kdvType !== 'no-invoice') grid.appendChild(buildKdvBox(p, '#fef3c7', '#f59e0b', '#d97706'));
  } else {
    const normalBox = el('div', {
      backgroundColor: '#eff6ff', border: '2px solid #3b82f6',
      borderRadius: '8px', padding: '15px', textAlign: 'center'
    });
    normalBox.innerHTML = `
      <div style="font-size:14px;font-weight:bold;color:#1d4ed8;margin-bottom:5px;">PERAKENDE TOPLAM</div>
      <div style="font-size:24px;font-weight:bold;color:#1e40af;">${p.normalTotal.toFixed(2)}₺</div>`;

    const discountBox = el('div', {
      backgroundColor: '#f0fdf4', border: '2px solid #16a34a',
      borderRadius: '8px', padding: '15px', textAlign: 'center'
    });
    discountBox.innerHTML = `
      <div style="font-size:14px;font-weight:bold;color:#15803d;margin-bottom:5px;">İSKONTOLU TOPLAM</div>
      <div style="font-size:24px;font-weight:bold;color:#166534;">${p.kdvType === 'plus' ? p.totalWithKdv.toFixed(2) : p.wholesaleTotal.toFixed(2)}₺</div>`;

    grid.appendChild(normalBox);
    grid.appendChild(discountBox);
    if (p.kdvType !== 'no-invoice') grid.appendChild(buildKdvBox(p, '#fef3c7', '#f59e0b', '#d97706'));

    const savingsBox = el('div', {
      backgroundColor: '#fef3c7', border: '2px solid #f59e0b',
      borderRadius: '8px', padding: '15px', textAlign: 'center', marginTop: '15px'
    });
    savingsBox.innerHTML = `
      <div style="font-size:16px;font-weight:bold;color:#d97706;">TOPLAM TASARRUF: ${(p.normalTotal - p.wholesaleTotal).toFixed(2)}₺</div>
      <div style="font-size:14px;color:#92400e;margin-top:5px;">%${(((p.normalTotal - p.wholesaleTotal) / p.normalTotal) * 100).toFixed(1)} indirim</div>`;
    section.appendChild(grid);
    section.appendChild(savingsBox);
    return section;
  }

  section.appendChild(grid);
  return section;
}

function buildFooter(isProforma: boolean): HTMLElement {
  return el('div', {
    marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e5e7eb',
    textAlign: 'center', fontSize: '12px', color: '#6b7280'
  }, `<div style="margin-bottom:10px;"><strong>ULUDAG3D</strong> - Profesyonel 3D Baskı Hizmetleri</div>
      <div>${isProforma ? 'Bu proforma 30 gün geçerlidir.' : 'Bu teklif 30 gün geçerlidir.'}</div>`);
}

function buildSignature(): HTMLElement {
  const section = el('div', { marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' });

  const warning = el('div', { flex: '1', textAlign: 'left' });
  warning.innerHTML = `
    <div style="color:#dc2626;font-weight:bold;font-size:14px;margin-bottom:5px;">⚠️ Bu belge fatura yerine geçmez</div>
    <div style="color:#6b7280;font-size:12px;">Bu proforma 30 gün geçerlidir.</div>`;

  const sigBox = el('div', {
    width: '300px', height: '150px', textAlign: 'center',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  });
  const img = document.createElement('img');
  img.src = '/signatures/stamp-with-signature.png';
  img.style.maxWidth = '100%';
  img.style.maxHeight = '100%';
  img.style.objectFit = 'contain';
  img.onerror = () => { sigBox.innerHTML = '<div style="color:#6b7280;font-size:14px;">İmza ve Kaşe</div>'; };
  sigBox.appendChild(img);

  section.appendChild(warning);
  section.appendChild(sigBox);
  return section;
}

export async function exportToPDF(params: PdfExportParams, isProforma = false) {
  try {
    const container = el('div', {
      padding: '30px', fontFamily: 'Arial, sans-serif',
      backgroundColor: 'white', width: '800px', lineHeight: '1.4'
    });

    container.appendChild(buildHeader(params.quoteNumber, isProforma));
    container.appendChild(buildPriceInfo(params));
    container.appendChild(buildTable(params));
    container.appendChild(buildTotals(params));
    container.appendChild(buildFooter(isProforma));
    if (isProforma) container.appendChild(buildSignature());

    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      scale: 3, useCORS: true, allowTaint: true, backgroundColor: '#ffffff',
      width: container.scrollWidth, height: container.scrollHeight, scrollX: 0, scrollY: 0
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png', 1.0);
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    const fileName = isProforma
      ? `proforma_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.pdf`
      : `teklif_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.pdf`;
    pdf.save(fileName);

    document.body.removeChild(container);
  } catch (error) {
    console.error('PDF oluşturulurken hata:', error);
    alert('PDF oluşturulurken bir hata oluştu.');
  }
}
