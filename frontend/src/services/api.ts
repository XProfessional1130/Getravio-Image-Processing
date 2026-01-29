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

export interface UserProfile {
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  phone?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile?: UserProfile;
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  phone?: string;
  bio?: string;
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

  // Profile management
  getProfile: async (): Promise<User> => {
    const response = await api.get('/profile');
    return response.data;
  },

  updateProfile: async (data: ProfileUpdateData): Promise<User> => {
    const response = await api.patch('/profile', data);
    return response.data;
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
  selected_simulation?: 'simulation1' | 'simulation2';
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobFilters {
  status?: string;
  favorites?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
}

export interface JobListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Job[];
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

  getJobs: async (filters?: JobFilters): Promise<JobListResponse> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.favorites) params.append('favorites', 'true');
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());

    const response = await api.get(`/jobs/?${params.toString()}`);
    return response.data;
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

  // Job history
  getHistory: async (filters?: JobFilters): Promise<JobListResponse> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.favorites) params.append('favorites', 'true');
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());

    const response = await api.get(`/jobs/history/?${params.toString()}`);
    return response.data;
  },

  // Favorites
  getFavorites: async (): Promise<Job[]> => {
    const response = await api.get('/jobs/favorites/');
    return response.data;
  },

  toggleFavorite: async (id: string): Promise<{ message: string; is_favorite: boolean; job: Job }> => {
    const response = await api.post(`/jobs/${id}/favorite/`);
    return response.data;
  },

  // Result selection
  selectResult: async (id: string, selection: 'simulation1' | 'simulation2'): Promise<{ message: string; job: Job }> => {
    const response = await api.post(`/jobs/${id}/select/`, { selection });
    return response.data;
  },
};

export default api;
