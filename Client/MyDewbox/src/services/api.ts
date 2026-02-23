import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000',
});

// Helper to ensure no double slashes in endpoint
function cleanUrl(url: string) {
  return url.replace(/([^:]\/)\/+/g, '$1');
}

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Check if the error is from the login endpoint itself
      const isLoginRequest = error.config?.url?.includes('/auth/login');

      if (!isLoginRequest) {
        // Token expired or invalid - redirect to login
        localStorage.removeItem('token');
        window.location.href = '/signin';
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const apiService = {
  // Auth
  login: async (mobile: string, password: string) => {
    // Backend expects mobile, not email
    const response = await api.post(cleanUrl('/auth/login'), { mobile, password });
    return response.data;
  },
  register: async (registerData: any) => {
    try {
      const response = await api.post(cleanUrl('/auth/register'), registerData);
      // Store JWT token after successful registration
      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw error.response.data;
      } else {
        throw error;
      }
    }
  },
  checkAuth: async () => {
    const response = await api.get(cleanUrl('/auth/check'));
    return response.data;
  },

  // User
  getCurrentUser: () => api.get('/users/me'), // Get current user info
  getSubscriber: () => api.get('/users/subscriber'), // Get full subscriber profile  
  getWallet: async () => {
    // Fetch wallet data - this might need to be implemented on backend
    try {
      const response = await api.get('/wallets/me');
      return response.data;
    } catch (error) {
      // If wallet endpoint doesn't exist, return subscriber balance
      const subscriber = await api.get('/users/subscriber');
      return { data: { wallet: { balance: subscriber.data.subscriber.balance } } };
    }
  },
  getBalance: () => api.get('/users/balance'), // Get user balance
  updateProfile: (data: any) => api.patch('/users/profile', data),

  // Transactions
  getTransactions: async () => {
    // Backend mounts transaction routes at /users/transactions
    const response = await api.get('/users/transactions/me');
    return response.data;
  },
  createTransaction: async (data: any) => {
    const response = await api.post('/users/transactions', data);
    return response.data;
  },
  verifyTransaction: async (reference: string) => {
    const response = await api.get(`/users/transactions/verify/${reference}`);
    return response.data;
  },
  contribute: async (data: any) => {
    const response = await api.post('/contributions', data);
    return response.data;
  },
  verifyContribution: async (reference: string) => {
    const response = await api.get(`/contributions/verify/${reference}`);
    return response.data;
  },
  getContributionInfo: async () => {
    const response = await api.get('/contributions/info');
    return response.data;
  },
  getContributionHistory: async () => {
    const response = await api.get('/contributions/history');
    return response.data;
  },
  withdrawPiggyToWallet: async (amount: number) => {
    const response = await api.post('/contributions/piggy/withdraw', { amount });
    return response.data;
  },
  updateContributionMode: async (mode: string) => {
    const response = await api.patch('/contributions/settings', { mode });
    return response.data;
  },

  // Banks
  getBanks: async () => {
    const response = await api.get(cleanUrl('/banks'));
    return response.data; // Paystack returns {status: true, data: [...]}
  },
  verifyBankAccount: async (data: any) => {
    const response = await api.post(cleanUrl('/banks/verify-account'), data);
    return response.data;
  },

  // Locations
  getCountries: async () => {
    const response = await api.get(cleanUrl('/locations/countries'));
    return response.data;
  },
  getStates: async (country: string) => {
    const response = await api.get(cleanUrl(`/locations/states?country=${encodeURIComponent(country)}`));
    return response.data;
  },
  getCities: async (country: string, state: string) => {
    const response = await api.get(cleanUrl(`/locations/cities?country=${encodeURIComponent(country)}&state=${encodeURIComponent(state)}`));
    return response.data;
  },
  getLGAs: async (country: string, state: string) => {
    const url = cleanUrl(`/locations/lgas?country=${encodeURIComponent(country)}&state=${encodeURIComponent(state)}`);
    const response = await api.get(url);
    return response.data;
  },
};

export const checkAuth = apiService.checkAuth;
export const login = apiService.login;
export const register = apiService.register;

export default apiService;
