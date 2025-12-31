export interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  badge?: 'vip' | 'regular' | 'rookie' | 'plus_one' | null;
  referred_by?: string;
  referrer?: {
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
  };
  runs_attended_count?: number;
  no_shows_count?: number;
  attendance_rate?: number;
  is_admin: boolean;
  is_verified: boolean;
  created_at: string;
  run_count?: number;
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
  is_completed?: boolean;
  completed_at?: string;
  completed_by?: string;
  participants?: {
    confirmed: Array<{username: string; first_name?: string; last_name?: string; badge?: string; attended?: boolean; no_show?: boolean}>;
    interested: Array<{username: string; first_name?: string; last_name?: string; badge?: string; attended?: boolean; no_show?: boolean}>;
    out: Array<{username: string; first_name?: string; last_name?: string; badge?: string; attended?: boolean; no_show?: boolean}>;
    no_show?: Array<{username: string; first_name?: string; last_name?: string; badge?: string; attended?: boolean; no_show?: boolean}>;
  };
  participant_counts?: {
    confirmed: number;
    interested: number;
    out: number;
    no_show?: number;
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

