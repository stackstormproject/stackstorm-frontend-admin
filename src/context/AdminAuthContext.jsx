import React, { createContext, useContext, useState, useEffect } from 'react';

const AdminAuthContext = createContext(null);

export const DEFAULT_ADMIN_USER = {
  id: 'admin-001',
  name: 'Amarawickrama R.H.',
  email: 'admin@dickwellafashion.lk',
  role: 'admin',
  department: 'Executive Operations',
};

export function AdminAuthProvider({ children, initialUser = DEFAULT_ADMIN_USER, initialToken = 'jwt-admin-token-xyz' }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('stackstorm_admin_user');
      return saved ? JSON.parse(saved) : initialUser;
    } catch {
      return initialUser;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('stackstorm_admin_token') || initialToken;
    } catch {
      return initialToken;
    }
  });

  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem('stackstorm_admin_user', JSON.stringify(user));
      } catch {
        // ignore
      }
    } else {
      try {
        localStorage.removeItem('stackstorm_admin_user');
      } catch {
        // ignore
      }
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      try {
        localStorage.setItem('stackstorm_admin_token', token);
      } catch {
        // ignore
      }
    } else {
      try {
        localStorage.removeItem('stackstorm_admin_token');
      } catch {
        // ignore
      }
    }
  }, [token]);

  const login = (newUser, newToken = 'mock-admin-token') => {
    setUser(newUser);
    setToken(newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  const hasRole = (allowedRoles = ['admin', 'inventory_manager', 'inventory_staff']) => {
    if (!user || !user.role) return false;
    return allowedRoles.includes(user.role);
  };

  const value = {
    user,
    role: user?.role || null,
    token,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'admin',
    isInventoryManager: user?.role === 'inventory_manager' || user?.role === 'inventory_staff',
    hasRole,
    login,
    logout,
    setUser,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    // Defensive fallback if used outside provider
    return {
      user: DEFAULT_ADMIN_USER,
      role: 'admin',
      token: 'jwt-admin-token-xyz',
      isAuthenticated: true,
      isAdmin: true,
      isInventoryManager: true,
      hasRole: () => true,
      login: () => {},
      logout: () => {},
      setUser: () => {},
    };
  }
  return context;
}
