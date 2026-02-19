import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../api/client';
import { ApiResponse, User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on page load if a token exists.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<ApiResponse<{ user: User }>>('/auth/me')
      .then((res) => setUser(res.data.data.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const handleAuth = (token: string, authedUser: User) => {
    localStorage.setItem('token', token);
    setUser(authedUser);
  };

  const login = async (email: string, password: string) => {
    const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/login', {
      email,
      password,
    });
    handleAuth(res.data.data.token, res.data.data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/register', {
      name,
      email,
      password,
    });
    handleAuth(res.data.data.token, res.data.data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('workspaceId');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
