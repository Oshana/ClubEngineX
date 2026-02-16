export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  CLUB_ADMIN = 'club_admin',
  SESSION_MANAGER = 'session_manager',
}

export interface User {
  id: number;
  club_id?: number;
  username: string;
  email?: string;
  is_email_verified: boolean;
  full_name: string;
  role: UserRole;
  is_super_admin: boolean;  // Deprecated, use role instead
  is_admin: boolean;  // Deprecated, use role instead
  is_active: boolean;
  created_at: string;
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIAL = 'trial',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
}

export interface Club {
  id: number;
  name: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
  subscription_status: SubscriptionStatus;
  subscription_start_date?: string;
  subscription_end_date?: string;
  max_players: number;
  max_sessions_per_month: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  UNSPECIFIED = 'unspecified',
}

export interface Player {
  id: number;
  user_id?: number;
  full_name: string;
  gender: Gender;
  rank_system?: string;
  rank_value?: string;
  numeric_rank?: number;
  skill_tier?: number;
  level?: string;
  is_active: boolean;
  is_temp?: boolean;
  created_at: string;
}

export enum SessionStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ENDED = 'ended',
}

export interface Session {
  id: number;
  name: string;
  date: string;
  match_duration_minutes: number;
  number_of_courts: number;
  status: SessionStatus;
  created_at: string;
  ended_at?: string;
}

export enum AttendanceStatus {
  PRESENT = 'present',
  LEFT = 'left',
}

export interface Attendance {
  id: number;
  session_id: number;
  player_id: number;
  status: AttendanceStatus;
  check_in_time: string;
}

export enum MatchType {
  MM = 'MM',
  MF = 'MF',
  FF = 'FF',
  OTHER = 'OTHER',
}

export interface CourtAssignment {
  id: number;
  round_id: number;
  court_number: number;
  team_a_player1_id?: number;
  team_a_player2_id?: number;
  team_b_player1_id?: number;
  team_b_player2_id?: number;
  match_type: MatchType;
  locked: boolean;
}

export interface Round {
  id: number;
  session_id: number;
  round_index: number;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  court_assignments: CourtAssignment[];
}

export interface AutoAssignmentPreferences {
  desired_mm: number;
  desired_mf: number;
  desired_ff: number;
  prioritize_waiting: number;
  prioritize_equal_matches: number;
  avoid_repeat_partners: number;
  avoid_repeat_opponents: number;
  balance_skill: number;
}

export interface PlayerSessionStats {
  player_id: number;
  player_name: string;
  matches_played: number;
  rounds_sitting_out: number;
  waiting_time_minutes: number;
  partners: string[];
  opponents: string[];
  match_type_counts: Record<string, number>;
  courts_played: number[];  // Court numbers this player has used
}

export interface SessionStats {
  session_id: number;
  total_rounds: number;
  player_stats: PlayerSessionStats[];
  fairness_score: number;
  avg_matches_per_player: number;
  avg_waiting_time: number;
}

export interface PlayerProfileStats {
  player_id: number;
  player_name: string;
  total_matches: number;
  total_sessions: number;
  match_type_counts: Record<string, number>;
  frequent_partners: Array<{ name: string; count: number }>;
  frequent_opponents: Array<{ name: string; count: number }>;
  recent_sessions: Array<{
    session_id: number;
    session_name: string;
    date: string;
    matches_played: number;
  }>;
}
