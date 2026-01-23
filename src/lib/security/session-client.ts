export type SessionRole = 'admin' | 'user' | 'guest';

export type SessionResponse = {
  authenticated?: boolean;
  user?: { role?: SessionRole | string } | null;
  role?: SessionRole | string;
  limits?: {
    message?: { remaining: number; limit: number };
    upload?: { remaining: number; limit: number };
    extract?: { remaining: number; limit: number };
  };
};

export function resolveSessionRole(response: SessionResponse | null | undefined): SessionRole {
  const userRole = response?.user?.role;
  if (userRole === 'admin' || userRole === 'user' || userRole === 'guest') {
    return userRole;
  }

  const role = response?.role;
  if (role === 'admin' || role === 'user' || role === 'guest') {
    return role;
  }

  return 'guest';
}
