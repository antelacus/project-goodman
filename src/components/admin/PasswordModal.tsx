'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * AdminPasswordTrigger Component
 *
 * Provides an easter egg for admin authentication via triple-click.
 * When the trigger element is triple-clicked, shows a password modal.
 * Session is managed via HttpOnly cookies (set by API).
 *
 * Usage:
 * ```tsx
 * const { triggerRef, isAuthenticated, logout } = useAdminAuth();
 *
 * return (
 *   <div ref={triggerRef}>[icon] Click me 3 times</div>
 *   {isAuthenticated && <AdminPanel />}
 * );
 * ```
 */
export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const triggerRef = useRef<HTMLDivElement>(null);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if already authenticated on mount via API
  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        if (data.authenticated && data.user?.role === 'admin') {
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('Session check error:', err);
      }
    }
    checkSession();
  }, []);

  // Triple-click detection
  useEffect(() => {
    const element = triggerRef.current;
    if (!element) return;

    const handleClick = () => {
      clickCountRef.current += 1;

      // Reset timer
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }

      // Set new timer (500ms window for triple-click)
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 500);

      // Check for triple-click
      if (clickCountRef.current === 3) {
        clickCountRef.current = 0;
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
        }
        setShowModal(true);
      }
    };

    element.addEventListener('click', handleClick);

    return () => {
      element.removeEventListener('click', handleClick);
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.valid) {
        // Session is managed via HTTP-only cookie (set by API)
        setIsAuthenticated(true);
        setShowModal(false);
        setPassword('');
      } else {
        setError('密码错误');
      }
    } catch (err) {
      setError('验证失败，请重试');
      console.error('Admin auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setPassword('');
    setError('');
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    setIsAuthenticated(false);
  };

  return {
    triggerRef,
    isAuthenticated,
    logout,
    modal: showModal ? (
      <AdminPasswordModal
        password={password}
        setPassword={setPassword}
        error={error}
        loading={loading}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    ) : null,
  };
}

interface AdminPasswordModalProps {
  password: string;
  setPassword: (value: string) => void;
  error: string;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

function AdminPasswordModal({
  password,
  setPassword,
  error,
  loading,
  onSubmit,
  onCancel,
}: AdminPasswordModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96">
        <h2 className="text-xl font-bold mb-4 text-gray-800">管理员模式</h2>

        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-2">
              输入密码
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-800"
              placeholder="请输入管理员密码"
              autoFocus
              disabled={loading}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !password}
              className="flex-1 bg-yellow-400 text-black px-4 py-2 rounded hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? '验证中...' : '解锁'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50 font-medium"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
