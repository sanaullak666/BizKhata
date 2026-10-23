import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check existing session token on startup
  useEffect(() => {
    async function initAuth() {
      const token = localStorage.getItem('khataflow_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.user);
        } catch (err) {
          console.error('Session expired or invalid:', err);
          localStorage.removeItem('khataflow_token');
          setUser(null);
        }
      }
      setLoading(false);
    }

    initAuth();
  }, []);

  const login = async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password });
    localStorage.setItem('khataflow_token', res.token);
    setUser(res.user);
    return res.user;
  };

  const registerBusiness = async (registrationData) => {
    const res = await api.post('/auth/register-business', registrationData);
    localStorage.setItem('khataflow_token', res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('khataflow_token');
    setUser(null);
    navigate('/login', { replace: true });
  };

  const hasPermission = (permName) => {
    if (!user) return false;
    if (user.role === 'owner') return true;
    if (user.permissions && user.permissions[permName] === 1) return true;
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        registerBusiness,
        logout,
        hasPermission,
        isOwner: user?.role === 'owner',
        isSalesman: user?.role === 'salesman',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
