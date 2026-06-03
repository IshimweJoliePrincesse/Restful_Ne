import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

function readCookie(name) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken || localStorage.getItem('accessToken') || localStorage.getItem('token');
  const csrfToken = readCookie('csrfToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = decodeURIComponent(csrfToken);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken || localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken }, { withCredentials: true });
          const { accessToken, refreshToken: rotatedRefreshToken } = res.data.data;
          useAuthStore.getState().setSession({
            user: useAuthStore.getState().user || JSON.parse(localStorage.getItem('user') || 'null'),
            accessToken,
            refreshToken: rotatedRefreshToken,
          });
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          useAuthStore.getState().clearSession();
        }
      } else {
        useAuthStore.getState().clearSession();
      }

      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
