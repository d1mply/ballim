import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  hasAnyPermission,
  requirePermission,
  type AuthUser,
} from '../../src/lib/permissions';

const superAdmin: AuthUser = {
  id: 1,
  username: 'admin',
  role: 'super_admin',
  permissions: ['*'],
};
const salesUser: AuthUser = {
  id: 2,
  username: 'sales',
  role: 'sales',
  permissions: ['orders.read', 'orders.create', 'customers.read', 'products.read'],
};
const warehouseUser: AuthUser = {
  id: 3,
  username: 'warehouse',
  role: 'warehouse',
  permissions: ['inventory.*', 'filaments.*', 'orders.read'],
};

describe('hasPermission', () => {
  it('super_admin should have all permissions', () => {
    expect(hasPermission(superAdmin, 'orders.read')).toBe(true);
    expect(hasPermission(superAdmin, 'payments.read')).toBe(true);
    expect(hasPermission(superAdmin, 'inventory.create')).toBe(true);
  });

  it('sales user should have orders.read', () => {
    expect(hasPermission(salesUser, 'orders.read')).toBe(true);
  });

  it('sales user should NOT have payments.read', () => {
    expect(hasPermission(salesUser, 'payments.read')).toBe(false);
  });

  it('warehouse user with wildcard should have inventory.read', () => {
    expect(hasPermission(warehouseUser, 'inventory.read')).toBe(true);
  });

  it('warehouse user with wildcard should have inventory.create', () => {
    expect(hasPermission(warehouseUser, 'inventory.create')).toBe(true);
  });
});

describe('hasAnyPermission', () => {
  it('should return true if user has at least one permission', () => {
    expect(hasAnyPermission(salesUser, ['payments.read', 'orders.read'])).toBe(true);
  });

  it('should return false if user has none of the permissions', () => {
    expect(hasAnyPermission(salesUser, ['payments.read', 'payments.create'])).toBe(false);
  });
});

describe('requirePermission', () => {
  it('should return a function that checks permission', () => {
    const checkOrdersRead = requirePermission('orders.read');
    expect(checkOrdersRead(salesUser)).toBe(true);
    expect(checkOrdersRead(warehouseUser)).toBe(true);
    const checkPayments = requirePermission('payments.read');
    expect(checkPayments(salesUser)).toBe(false);
  });
});
