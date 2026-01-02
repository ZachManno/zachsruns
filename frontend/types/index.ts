export interface Location {
  id: string;
  name: string;
  address: string;
  description?: string;
  image_url?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  badge?: 'regular' | 'plus_one' | null;
  referred_by?: string;
  referrer?: {
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
  };
  runs_attended_count?: number;
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
  location_id: string;
  location_name?: string;
  location_address?: string;
  location_data?: Location;  // Full location object
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
  guest_attendees?: string[];
  participants?: {
    confirmed?: Array<{username: string; first_name?: string; last_name?: string; badge?: string; attended?: boolean; no_show?: boolean}>;
    interested?: Array<{username: string; first_name?: string; last_name?: string; badge?: string; attended?: boolean; no_show?: boolean}>;
    out?: Array<{username: string; first_name?: string; last_name?: string; badge?: string; attended?: boolean; no_show?: boolean}>;
    no_show?: Array<{username: string; first_name?: string; last_name?: string; badge?: string; attended?: boolean; no_show?: boolean}>;
    attended?: Array<{username: string; first_name?: string; last_name?: string; badge?: string; attended?: boolean}>;
  };
  participant_counts?: {
    confirmed?: number;
    interested?: number;
    out?: number;
    no_show?: number;
    attended?: number;
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

