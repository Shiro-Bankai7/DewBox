/**
 * API Configuration
 * Automatically switches between development and production endpoints
 */

// Get the environment mode from Vite
const isDevelopment = import.meta.env.MODE === 'development';
const isProduction = import.meta.env.MODE === 'production';

// API Base URLs
const API_URLS = {
  development: 'http://localhost:4000',
  production: import.meta.env.VITE_API_URL || 'https://your-production-api.railway.app', // Update with your Railway backend URL
};

// Select the appropriate API URL based on environment
export const API_BASE_URL = isDevelopment ? API_URLS.development : API_URLS.production;

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    REGISTER: `${API_BASE_URL}/auth/register`,
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    VERIFY_OTP: `${API_BASE_URL}/auth/verify-otp`,
    RESEND_OTP: `${API_BASE_URL}/auth/resend-otp`,
  },
  
  // User endpoints
  USERS: {
    PROFILE: `${API_BASE_URL}/users/profile`,
    UPDATE_PROFILE: `${API_BASE_URL}/users/profile`,
    BALANCE: `${API_BASE_URL}/users/balance`,
    TRANSACTIONS: `${API_BASE_URL}/users/transactions`,
  },
  
  // Transaction endpoints
  TRANSACTIONS: {
    CREATE: `${API_BASE_URL}/transactions/create`,
    HISTORY: `${API_BASE_URL}/transactions/history`,
    DETAILS: (id) => `${API_BASE_URL}/transactions/${id}`,
  },
  
  // Bank endpoints
  BANKS: {
    LIST: `${API_BASE_URL}/banks`,
    VERIFY_ACCOUNT: `${API_BASE_URL}/banks/verify-account`,
  },
  
  // Contribution endpoints
  CONTRIBUTIONS: {
    CREATE: `${API_BASE_URL}/contributions/create`,
    HISTORY: `${API_BASE_URL}/contributions/history`,
  },
};

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Helper function for API calls with error handling
export const apiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Log current environment and API URL

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  getAuthHeaders,
  apiCall,
};
