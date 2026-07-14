import axios from 'axios';

/**
 * Shared Axios instance for the Family Tree API.
 *
 * This client is intentionally decoupled from React context so it can be used
 * both inside and outside of components (e.g. in AuthContext bootstrapping).
 * It reads the bearer token from localStorage on every request, so the latest
 * token is always used even if the instance was created before login.
 */
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ft_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
