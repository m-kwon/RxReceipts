import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

const IMAGE_SERVICE_URL = 'http://localhost:5001';

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

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rxreceipts_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const imageService = {
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${IMAGE_SERVICE_URL}/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    return response.json();
  },

  getImageUrl: (imageId) => {
    return `${IMAGE_SERVICE_URL}/image/${imageId}`;
  },

  verifyImage: async (imageId) => {
    try {
      const response = await fetch(`${IMAGE_SERVICE_URL}/image/${imageId}`, {
        method: 'HEAD'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
};

// API methods
const apiMethods = {
  setAuthToken: (token) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  },

  clearAuthToken: () => {
    delete api.defaults.headers.common['Authorization'];
  },

  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    demoLogin: () => api.post('/auth/demo'),
    getMe: () => api.get('/auth/me'),
    logout: () => api.post('/auth/logout')
  },

  receipts: {
    getAll: (params = {}) => api.get('/receipts', { params }),
    getById: (id) => api.get(`/receipts/${id}`),
    create: (receiptData) => api.post('/receipts', receiptData),
    createWithImageId: (receiptData) => api.post('/receipts', receiptData),
    update: (id, updates) => api.put(`/receipts/${id}`, updates),
    delete: (id) => api.delete(`/receipts/${id}`),
    getStats: () => api.get('/receipts/stats'),
    getCategories: () => api.get('/receipts/meta/categories'),
    processOCR: (imageId) => api.post('/receipts/ocr/parse', { image_id: imageId })
  },

  images: imageService,

  upload: {
    receiptImage: (formData) => {
      return api.post('/receipts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    }
  },

  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  delete: (url, config) => api.delete(url, config)
};

export default apiMethods;