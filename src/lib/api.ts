import axios from 'axios';
import { saveUser } from './store';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Optionally trigger a logout event here
    }
    return Promise.reject(error);
  }
);

export const sendVerificationCode = (phone: string) => {
  return api.post('/auth/send-code', { phone });
};

export const loginWithPhone = async (phone: string, code: string, isElderlyMode: boolean) => {
  const response = await api.post('/auth/login', { phone, code });
  const { token, user } = response.data;
  localStorage.setItem('token', token);
  saveUser({ ...user, isElderlyMode });
  return response.data;
};

export const loginWithOAuth = async (provider: 'wechat' | 'qq', authCode: string, isElderlyMode: boolean) => {
  const response = await api.post('/auth/oauth', { provider, authCode });
  const { token, user } = response.data;
  localStorage.setItem('token', token);
  saveUser({ ...user, isElderlyMode });
  return response.data;
};

export const fetchCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data.user;
};

export default api;
