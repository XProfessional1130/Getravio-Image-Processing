import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, User, LoginCredentials, RegisterData } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error loading user from localStorage:', error);
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authAPI.login(credentials);

      // Store user in state and localStorage
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('isAuthenticated', 'true');
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const user = await authAPI.register(data);

      // After registration, automatically log in
      await login({
        email: data.email,
        password: data.password,
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('authToken');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
