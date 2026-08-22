import { User } from '../types/auth';

export const hasRole = (user: User | null, roleSlug: string): boolean => {
  if (!user || !user.roles) return false;
  return user.roles.some((role) => {
    if (typeof role === 'string') {
      return role === roleSlug;
    }
    return role.slug === roleSlug;
  });
};

export const hasAnyRole = (user: User | null, roleSlugs: string[]): boolean => {
  if (!user || !user.roles) return false;
  return roleSlugs.some((slug) => hasRole(user, slug));
};

export const hasPermission = (user: User | null, permissionSlug: string): boolean => {
  if (!user) return false;
  
  // Admin role override
  if (hasRole(user, 'admin')) return true;

  if (!user.permissions) return false;
  return user.permissions.some((perm) => {
    if (typeof perm === 'string') {
      return perm === permissionSlug;
    }
    return perm.slug === permissionSlug;
  });
};

export const hasAnyPermission = (user: User | null, permissionSlugs: string[]): boolean => {
  if (!user) return false;
  return permissionSlugs.some((slug) => hasPermission(user, slug));
};
