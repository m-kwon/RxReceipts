import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rxreceipts_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('rxreceipts_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API methods
const apiMethods = {
  // Set auth token manually
  setAuthToken: (token) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  },

  // Clear auth token
  clearAuthToken: () => {
    delete api.defaults.headers.common['Authorization'];
  },

  // Auth endpoints
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    demoLogin: () => api.post('/auth/demo'),
    getMe: () => api.get('/auth/me'),
    logout: () => api.post('/auth/logout')
  },

  // Receipt endpoints
  receipts: {
    getAll: (params = {}) => api.get('/receipts', { params }),
    getById: (id) => api.get(`/receipts/${id}`),
    create: (receiptData) => api.post('/receipts', receiptData),
    update: (id, updates) => api.put(`/receipts/${id}`, updates),
    delete: (id) => api.delete(`/receipts/${id}`),
    getStats: () => api.get('/receipts/stats'),
    getCategories: () => api.get('/receipts/meta/categories')
  },

  // File upload endpoint
  upload: {
    receiptImage: (formData) => {
      return api.post('/receipts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    }
  },

  // Generic HTTP methods
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  delete: (url, config) => api.delete(url, config)
};

export default apiMethods;