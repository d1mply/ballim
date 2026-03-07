export type Permission = string;

export interface AuthUser {
  id: string | number;
  username: string;
  role: string;
  permissions: Permission[];
  customerId?: number;
}

export function hasPermission(user: AuthUser, permission: Permission): boolean {
  if (user.permissions.includes('*')) return true;

  if (user.permissions.includes(permission)) return true;

  const [resource] = permission.split('.');
  if (user.permissions.includes(`${resource}.*`)) return true;

  return false;
}

export function hasAnyPermission(user: AuthUser, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

export function requirePermission(permission: Permission) {
  return (user: AuthUser): boolean => hasPermission(user, permission);
}

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Süper Admin',
  admin: 'Admin',
  sales: 'Satış Temsilcisi',
  warehouse: 'Depocu',
  accountant: 'Muhasebeci',
  customer: 'Müşteri',
};

export const MENU_PERMISSIONS: Record<string, Permission> = {
  products: 'products.read',
  orders: 'orders.read',
  customers: 'customers.read',
  inventory: 'inventory.read',
  filaments: 'filaments.read',
  payments: 'payments.read',
  reports: 'reports.read',
  settings: 'settings.read',
  users: 'users.read',
};
