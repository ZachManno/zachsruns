import { getToken, removeToken } from './auth';
import { User, Run, Announcement, ApiError } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Unauthorized - clear token and redirect to login
    removeToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error((data as ApiError).error || 'An error occurred');
  }

  return data as T;
}

// Auth endpoints
export const authApi = {
  signup: async (username: string, email: string, password: string, first_name: string, last_name: string) => {
    return fetchApi<{ message: string; token: string; user: User }>(
      '/api/auth/signup',
      {
        method: 'POST',
        body: JSON.stringify({ username, email, password, first_name, last_name }),
      }
    );
  },

  login: async (username: string, password: string) => {
    return fetchApi<{ message: string; token: string; user: User }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }
    );
  },

  getMe: async () => {
    return fetchApi<{ user: User }>('/api/auth/me');
  },
};

// Runs endpoints
export const runsApi = {
  getAll: async () => {
    return fetchApi<{ runs: Run[] }>('/api/runs');
  },

  getById: async (id: string) => {
    return fetchApi<{ run: Run }>(`/api/runs/${id}`);
  },

  create: async (runData: Partial<Run>) => {
    return fetchApi<{ message: string; run: Run }>('/api/runs', {
      method: 'POST',
      body: JSON.stringify(runData),
    });
  },

  update: async (id: string, runData: Partial<Run>) => {
    return fetchApi<{ message: string; run: Run }>(`/api/runs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(runData),
    });
  },

  delete: async (id: string) => {
    return fetchApi<{ message: string }>(`/api/runs/${id}`, {
      method: 'DELETE',
    });
  },

  updateRsvp: async (runId: string, status: 'confirmed' | 'interested' | 'out') => {
    return fetchApi<{ message: string; run: Run }>(`/api/runs/${runId}/rsvp`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },
};

// Users endpoints
export const usersApi = {
  getProfile: async () => {
    return fetchApi<{ user: User }>('/api/users/me');
  },

  updateProfile: async (data: Partial<User>) => {
    return fetchApi<{ message: string; user: User }>('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getMyRuns: async () => {
    return fetchApi<{ upcoming: Run[]; history: Run[] }>('/api/users/me/runs');
  },
};

// Admin endpoints
export const adminApi = {
  getUsers: async () => {
    return fetchApi<{ users: User[] }>('/api/admin/users');
  },

  verifyUser: async (userId: string, isVerified: boolean) => {
    return fetchApi<{ message: string; user: User }>(
      `/api/admin/users/${userId}/verify`,
      {
        method: 'PUT',
        body: JSON.stringify({ is_verified: isVerified }),
      }
    );
  },

  getAnnouncement: async () => {
    return fetchApi<{ announcement: Announcement | null }>(
      '/api/admin/announcements'
    );
  },

  createAnnouncement: async (message: string) => {
    return fetchApi<{ message: string; announcement: Announcement }>(
      '/api/admin/announcements',
      {
        method: 'POST',
        body: JSON.stringify({ message }),
      }
    );
  },

  importRuns: async (runsData: any) => {
    return fetchApi<{
      message: string;
      imported_count: number;
      errors: string[];
    }>('/api/admin/runs/import', {
      method: 'POST',
      body: JSON.stringify(runsData),
    });
  },
};

