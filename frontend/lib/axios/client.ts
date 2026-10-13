
import axios from 'axios';

const apiClient = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',

  timeout: 10000,

  withCredentials: true,

  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('accessToken');

    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default apiClient;