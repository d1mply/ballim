'use client';

import { useMemo } from 'react';
import { hasPermission, hasAnyPermission } from '@/lib/permissions';
import type { Permission } from '@/lib/permissions';

export interface LoggedUser {
  id: string | number;
  name?: string;
  username?: string;
  type: 'admin' | 'customer';
  role?: string;
  permissions?: string[];
}

function getStoredUser(): LoggedUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const json = localStorage.getItem('loggedUser');
    if (!json) return null;
    return JSON.parse(json) as LoggedUser;
  } catch {
    return null;
  }
}

export function usePermissions() {
  const user = useMemo(() => getStoredUser(), []);

  const isAdmin = user?.type === 'admin';
  const isCustomer = user?.type === 'customer';

  const hasPerm = useMemo(() => {
    if (!user?.permissions) return () => true;
    const authUser = {
      id: user.id,
      username: user.username ?? user.name ?? '',
      role: user.role ?? user.type,
      permissions: user.permissions,
    };
    return (perm: Permission) => hasPermission(authUser, perm);
  }, [user?.id, user?.username, user?.name, user?.role, user?.type, user?.permissions]);

  const hasAnyPerm = useMemo(() => {
    if (!user?.permissions) return () => true;
    const authUser = {
      id: user.id,
      username: user.username ?? user.name ?? '',
      role: user.role ?? user.type,
      permissions: user.permissions,
    };
    return (perms: Permission[]) => hasAnyPermission(authUser, perms);
  }, [user?.id, user?.username, user?.name, user?.role, user?.type, user?.permissions]);

  return {
    user,
    isAdmin,
    isCustomer,
    hasPermission: hasPerm,
    hasAnyPermission: hasAnyPerm,
  };
}
