import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@ballim.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL-DEV] To: ${to}, Subject: ${subject}`);
    return true;
  }
  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    return true;
  } catch (err) {
    console.error('Email send error:', err);
    return false;
  }
}

export async function sendAdminEmail(subject: string, html: string): Promise<boolean> {
  if (!ADMIN_EMAIL) return false;
  return sendEmail(ADMIN_EMAIL, subject, html);
}
