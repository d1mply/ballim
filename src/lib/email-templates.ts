const HEADER_STYLE = 'background:#2563eb;color:#fff;padding:16px;font-size:18px;font-weight:bold;';
const BODY_STYLE = 'padding:20px;font-family:sans-serif;line-height:1.6;color:#333;';
const FOOTER_STYLE = 'padding:16px;font-size:12px;color:#666;border-top:1px solid #eee;';

function wrapEmail(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;">
<div style="${HEADER_STYLE}">Ballim B2B</div>
<div style="${BODY_STYLE}">${content}</div>
<div style="${FOOTER_STYLE}">Bu otomatik bir bildirimdir.</div>
</div>
</body>
</html>`.trim();
}

export function orderCreatedTemplate(data: {
  orderCode: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
}): string {
  const content = `
<p>Merhaba ${data.customerName},</p>
<p>Siparişiniz oluşturuldu.</p>
<p><strong>Sipariş Kodu:</strong> ${data.orderCode}</p>
<p><strong>Ürün Sayısı:</strong> ${data.itemCount}</p>
<p><strong>Toplam Tutar:</strong> ₺${data.totalAmount.toLocaleString('tr-TR')}</p>
  `.trim();
  return wrapEmail(content);
}

export function orderStatusChangedTemplate(data: {
  orderCode: string;
  newStatus: string;
  customerName: string;
}): string {
  const content = `
<p>Merhaba ${data.customerName},</p>
<p>Sipariş durumunuz güncellendi.</p>
<p><strong>Sipariş Kodu:</strong> ${data.orderCode}</p>
<p><strong>Yeni Durum:</strong> ${data.newStatus}</p>
  `.trim();
  return wrapEmail(content);
}

export function paymentReceivedTemplate(data: {
  customerName: string;
  amount: number;
  remainingBalance: number;
}): string {
  const content = `
<p>Merhaba ${data.customerName},</p>
<p>Ödemeniz alındı.</p>
<p><strong>Ödenen Tutar:</strong> ₺${data.amount.toLocaleString('tr-TR')}</p>
<p><strong>Kalan Bakiye:</strong> ₺${data.remainingBalance.toLocaleString('tr-TR')}</p>
  `.trim();
  return wrapEmail(content);
}

export function lowStockAlertTemplate(data: {
  products: Array<{ code: string; type: string; stock: number }>;
}): string {
  const rows = data.products
    .map(
      (p) =>
        `<tr><td>${p.code}</td><td>${p.type}</td><td>${p.stock}</td></tr>`
    )
    .join('');
  const content = `
<p>Düşük stok uyarısı.</p>
<table style="border-collapse:collapse;width:100%;">
<thead><tr style="background:#f3f4f6;"><th style="padding:8px;text-align:left;">Kod</th><th style="padding:8px;text-align:left;">Tip</th><th style="padding:8px;text-align:left;">Stok</th></tr></thead>
<tbody>${rows}</tbody>
</table>
  `.trim();
  return wrapEmail(content);
}

export function overduePaymentTemplate(data: {
  customerName: string;
  amount: number;
  dueDate: string;
}): string {
  const content = `
<p>Merhaba ${data.customerName},</p>
<p>Ödemenizin vadesi geçmiştir.</p>
<p><strong>Tutar:</strong> ₺${data.amount.toLocaleString('tr-TR')}</p>
<p><strong>Vade Tarihi:</strong> ${data.dueDate}</p>
  `.trim();
  return wrapEmail(content);
}

export function newCustomerTemplate(data: {
  customerName: string;
  customerCode: string;
  email: string;
}): string {
  const content = `
<p>Yeni müşteri kaydı oluşturuldu.</p>
<p><strong>Müşteri Adı:</strong> ${data.customerName}</p>
<p><strong>Müşteri Kodu:</strong> ${data.customerCode}</p>
<p><strong>E-posta:</strong> ${data.email}</p>
  `.trim();
  return wrapEmail(content);
}
