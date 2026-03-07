import { sendEmail, sendAdminEmail } from './email';
import {
  orderCreatedTemplate,
  orderStatusChangedTemplate,
  paymentReceivedTemplate,
  lowStockAlertTemplate,
  overduePaymentTemplate,
  newCustomerTemplate,
} from './email-templates';

export async function notifyOrderCreated(
  orderCode: string,
  customerName: string,
  customerEmail: string,
  totalAmount: number,
  itemCount: number
): Promise<void> {
  try {
    const html = orderCreatedTemplate({ orderCode, customerName, totalAmount, itemCount });
    await sendEmail(customerEmail, `Sipariş Onayı - ${orderCode}`, html);
  } catch {}
}

export async function notifyOrderStatusChanged(
  orderCode: string,
  newStatus: string,
  customerName: string,
  customerEmail: string
): Promise<void> {
  try {
    const html = orderStatusChangedTemplate({ orderCode, newStatus, customerName });
    await sendEmail(customerEmail, `Sipariş Durumu Güncellendi - ${orderCode}`, html);
  } catch {}
}

export async function notifyPaymentReceived(
  customerName: string,
  customerEmail: string,
  amount: number,
  remainingBalance: number
): Promise<void> {
  try {
    const html = paymentReceivedTemplate({ customerName, amount, remainingBalance });
    await sendEmail(customerEmail, 'Ödeme Alındı', html);
  } catch {}
}

export async function notifyLowStock(
  products: Array<{ code: string; type: string; stock: number }>
): Promise<void> {
  try {
    const html = lowStockAlertTemplate({ products });
    await sendAdminEmail('Düşük Stok Uyarısı', html);
  } catch {}
}

export async function notifyOverduePayment(
  customerName: string,
  customerEmail: string,
  amount: number,
  dueDate: string
): Promise<void> {
  try {
    const html = overduePaymentTemplate({ customerName, amount, dueDate });
    await sendEmail(customerEmail, 'Vadesi Geçmiş Ödeme Hatırlatması', html);
  } catch {}
}

export async function notifyNewCustomer(
  customerName: string,
  customerCode: string,
  email: string
): Promise<void> {
  try {
    const html = newCustomerTemplate({ customerName, customerCode, email });
    await sendAdminEmail('Yeni Müşteri Kaydı', html);
  } catch {}
}
