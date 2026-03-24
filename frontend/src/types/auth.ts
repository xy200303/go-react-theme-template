export interface AuthUser {
  id: number;
  username: string;
  phone: string;
  email?: string;
  avatar_url?: string;
  signature?: string;
  gender?: string;
  age?: number;
  is_active?: boolean;
  roles: string[];
  created_at?: string;
  updated_at?: string;
}

export interface AuthToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginResponse {
  token: AuthToken;
  user: AuthUser;
}

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}
