import axios from 'axios';

const client = axios.create({
  baseURL: '/',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token and tenant header from localStorage
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  const tenant = localStorage.getItem('tenant_slug');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  if (tenant) {
    config.headers['X-Tenant-Slug'] = tenant;
  }
  return config;
});

// Response interceptor to handle authorization errors globally
client.interceptors.response.use(
  response => response,
  error => {
    const resp = error.response;
    try {
      if (resp && resp.status === 403) {
        const msg = (resp.data && (resp.data.detail || resp.data.message)) || 'Vous n\'êtes pas autorisé(e) pour cette action.';
        if (typeof window !== 'undefined' && window.__notify) {
          window.__notify(msg, 'error');
        }
      }
      if (resp && resp.status === 401) {
        const msg = (resp.data && (resp.data.detail || resp.data.message)) || 'Authentification requise.';
        if (typeof window !== 'undefined' && window.__notify) {
          window.__notify(msg, 'warning');
        }
      }
    } catch (e) {
      // noop
    }
    return Promise.reject(error);
  }
);

export default client;
