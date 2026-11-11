'use client';

import { useState, useEffect } from 'react';
import { postWithCsrf } from '@/lib/security/csrf-client';

/** Whether the current session is an admin's (admins log in at /login), and a logout. */
export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        setIsAuthenticated(data.authenticated && data.user?.role === 'admin');
      } catch (err) {
        console.error('Session check error:', err);
      }
    }
    checkSession();
  }, []);

  const logout = async () => {
    try {
      const response = await postWithCsrf('/api/auth/logout');
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return { isAuthenticated, logout };
}
