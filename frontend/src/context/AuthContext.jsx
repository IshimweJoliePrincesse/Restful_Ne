import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuthStore } from '../stores/authStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { user, setSession, clearSession } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      api.get('/auth/me')
        .then((res) => setSession({
          user: res.data.data,
          accessToken: token,
          refreshToken: localStorage.getItem('refreshToken'),
        }))
        .catch(() => {
          clearSession();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: userData, accessToken, refreshToken, token } = res.data.data;
    setSession({ user: userData, accessToken: accessToken || token, refreshToken });
    return res.data;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  };

  const verifyOtp = async (email, otp) => {
    const res = await api.post('/auth/verify-otp', { email, otp });
    return res.data;
  };

  const forgotPassword = async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  };

  const resetPassword = async (data) => {
    const res = await api.post('/auth/reset-password', data);
    return res.data;
  };

  const changePassword = async (data) => {
    const res = await api.post('/auth/change-password', data);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') });
    } catch {
      // Local cleanup still happens even if the token was already expired.
    }
    clearSession();
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      verifyOtp,
      forgotPassword,
      resetPassword,
      changePassword,
      logout,
      isAdmin: user?.role === 'ADMIN',
      isInspector: user?.role === 'INSPECTOR',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
