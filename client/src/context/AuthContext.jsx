import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoUsers, setDemoUsers] = useState([]);

  // Fetch initial user and demo accounts
  useEffect(() => {
    async function initAuth() {
      try {
        const demoRes = await api.get('/auth/demo-users');
        setDemoUsers(demoRes.demoUsers || []);

        const savedUserId = localStorage.getItem('khataflow_user_id');
        const token = localStorage.getItem('khataflow_token');

        if (savedUserId || token) {
          const res = await api.get('/auth/me');
          setUser(res.user);
        } else if (demoRes.demoUsers && demoRes.demoUsers.length > 0) {
          // Default to Owner if first visit
          const defaultUser = demoRes.demoUsers.find(u => u.role === 'owner') || demoRes.demoUsers[0];
          await switchUser(defaultUser.id);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  // Quick switch between users (Owner <-> Salesman Arshad / Rahim)
  const switchUser = async (userId) => {
    try {
      setLoading(true);
      localStorage.setItem('khataflow_user_id', userId);
      // Fetch user profile with permissions
      const res = await api.get('/auth/me', { headers: { 'x-user-id': userId } });
      setUser(res.user);
      return res.user;
    } catch (err) {
      console.error('Error switching user:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password });
    localStorage.setItem('khataflow_token', res.token);
    localStorage.setItem('khataflow_user_id', res.user.id);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('khataflow_token');
    localStorage.removeItem('khataflow_user_id');
    setUser(null);
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
        demoUsers,
        login,
        logout,
        switchUser,
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
