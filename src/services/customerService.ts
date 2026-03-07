import { query } from '@/lib/db';

export interface CreateCustomerData {
  customer_code: string;
  name: string;
  company?: string;
  tax_number?: string;
  phone: string;
  email?: string;
  address?: string;
  customer_type?: string;
  notes?: string;
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {}

export async function getCustomers(search?: string) {
  const baseQuery = `
    SELECT c.*,
      COALESCE((SELECT COUNT(*) FROM orders WHERE customer_id = c.id), 0) as order_count,
      COALESCE((SELECT SUM(total_amount) FROM orders WHERE customer_id = c.id), 0) as total_spent,
      (SELECT MAX(order_date) FROM orders WHERE customer_id = c.id) as last_order_date
    FROM customers c
  `;
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    const res = await query(
      baseQuery + ` WHERE c.name ILIKE $1 OR c.customer_code ILIKE $1 OR c.company ILIKE $1 ORDER BY c.name`,
      [term]
    );
    return res.rows;
  }
  const res = await query(baseQuery + ' ORDER BY c.name');
  return res.rows;
}

export async function getCustomerById(id: number) {
  const res = await query(
    `SELECT c.*,
      COALESCE((SELECT COUNT(*) FROM orders WHERE customer_id = c.id), 0) as order_count,
      COALESCE((SELECT SUM(total_amount) FROM orders WHERE customer_id = c.id), 0) as total_spent,
      (SELECT MAX(order_date) FROM orders WHERE customer_id = c.id) as last_order_date
     FROM customers c WHERE c.id = $1`,
    [id]
  );
  return res.rows[0] ?? null;
}

export async function createCustomer(data: CreateCustomerData) {
  const res = await query(
    `INSERT INTO customers (customer_code, name, company, tax_number, phone, email, address, customer_type, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.customer_code,
      data.name,
      data.company ?? null,
      data.tax_number ?? null,
      data.phone,
      data.email ?? null,
      data.address ?? null,
      data.customer_type ?? 'Bireysel',
      data.notes ?? null
    ]
  );
  return res.rows[0];
}

export async function updateCustomer(id: number, data: UpdateCustomerData) {
  const fields = ['customer_code', 'name', 'company', 'tax_number', 'phone', 'email', 'address', 'customer_type', 'notes'];
  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  let i = 1;
  for (const f of fields) {
    const v = (data as Record<string, unknown>)[f];
    if (v !== undefined) {
      updates.push(`${f} = $${i}`);
      values.push(v as string | number | null);
      i++;
    }
  }
  if (updates.length === 0) return getCustomerById(id);
  updates.push(`updated_at = NOW()`);
  values.push(id);
  await query(`UPDATE customers SET ${updates.join(', ')} WHERE id = $${i}`, values);
  return getCustomerById(id);
}

export async function getCustomerBalance(customerId: number) {
  const res = await query(
    `SELECT bakiye FROM cari_hesap WHERE musteri_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`,
    [customerId]
  );
  return res.rows[0] ? parseFloat(res.rows[0].bakiye) : 0;
}
