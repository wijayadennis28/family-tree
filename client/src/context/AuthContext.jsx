import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on boot
  useEffect(() => {
    const t = localStorage.getItem('ft_token');
    const u = localStorage.getItem('ft_user');
    if (t && u) {
      try {
        setToken(t);
        setUser(JSON.parse(u));
      } catch (_) {
        localStorage.removeItem('ft_token');
        localStorage.removeItem('ft_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((newToken, userInfo) => {
    setToken(newToken);
    setUser(userInfo);
    localStorage.setItem('ft_token', newToken);
    localStorage.setItem('ft_user', JSON.stringify(userInfo));
  }, []);

  const logout = useCallback(async (currentToken) => {
    try {
      const t = currentToken || token;
      if (t) {
        await axios.post(
          `${process.env.REACT_APP_API_BASE_URL}/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${t}` } }
        );
      }
    } catch (_) {}
    setToken(null);
    setUser(null);
    localStorage.removeItem('ft_token');
    localStorage.removeItem('ft_user');
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
