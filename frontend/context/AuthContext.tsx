'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { authApi } from '@/lib/api';
import { getToken, setToken, removeToken } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string, first_name: string, last_name: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = getToken();
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, []);

  const refreshUser = async () => {
    try {
      const data = await authApi.getMe();
      setUser(data.user);
    } catch (error) {
      removeToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const data = await authApi.login(username, password);
    setToken(data.token);
    setUser(data.user);
  };

  const signup = async (username: string, email: string, password: string, first_name: string, last_name: string) => {
    const data = await authApi.signup(username, email, password, first_name, last_name);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

