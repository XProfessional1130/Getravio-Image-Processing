import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Helper function to get CSRF token from cookies
function getCookie(name: string): string | null {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add CSRF token and auth token
api.interceptors.request.use(
  (config) => {
    // Add CSRF token for Django
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
      console.log('CSRF Token found and added to headers:', csrfToken);
    } else {
      console.warn('No CSRF token found in cookies');
    }

    // Add auth token if available (Token Authentication)
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  token: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
  token: string;
}

// Auth API calls
export const authAPI = {
  // Get CSRF token from backend
  getCSRFToken: async (): Promise<void> => {
    await api.get('/auth/csrf');
  },

  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (data: RegisterData): Promise<RegisterResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
};

// Job API calls
export interface Job {
  id: string;
  region: string;
  scenario: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  message?: string;
  original_image_url?: string;
  simulation1_url?: string;
  simulation2_url?: string;
  created_at: string;
  updated_at: string;
}

export const jobAPI = {
  createJob: async (formData: FormData): Promise<Job> => {
    const response = await api.post('/jobs/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getJobs: async (): Promise<Job[]> => {
    const response = await api.get('/jobs/');
    return response.data.results || response.data;
  },

  getJob: async (id: string): Promise<Job> => {
    const response = await api.get(`/jobs/${id}/`);
    return response.data;
  },

  updateJob: async (id: string, data: Partial<Job>): Promise<Job> => {
    const response = await api.patch(`/jobs/${id}/`, data);
    return response.data;
  },

  deleteJob: async (id: string): Promise<void> => {
    await api.delete(`/jobs/${id}/`);
  },
};

export default api;
