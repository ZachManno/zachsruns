export interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_admin: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface Run {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  address: string;
  description?: string;
  capacity?: number;
  cost?: number;
  is_variable_cost?: boolean;
  total_cost?: number;
  created_by: string;
  created_at: string;
  is_historical: boolean;
  participants?: {
    confirmed: Array<{username: string; first_name?: string; last_name?: string}>;
    interested: Array<{username: string; first_name?: string; last_name?: string}>;
    out: Array<{username: string; first_name?: string; last_name?: string}>;
  };
  participant_counts?: {
    confirmed: number;
    interested: number;
    out: number;
  };
  user_status?: 'confirmed' | 'interested' | 'out';
}

export interface Announcement {
  id: string;
  message: string;
  created_by: string;
  created_at: string;
  is_active: boolean;
}

export interface ApiError {
  error: string;
}

