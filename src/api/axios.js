import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const lang = localStorage.getItem('admin_lang') || 'en';
  config.headers['Accept-Language'] = lang;
  return config;
});

export default api;
