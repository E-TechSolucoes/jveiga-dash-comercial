export type Dashboard = {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  is_active?: boolean;
  display_order?: number;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  picture: string;
  is_admin: boolean;
  last_login_at: string | null;
};

export type Tokens = {
  access_token: string;
  access_token_expires_at: string;
  refresh_token: string;
  refresh_token_expires_at: string;
};

export type LoginResponse = Tokens & {
  token_type: "Bearer";
  user: AuthUser;
  roles: string[];
  permissions: string[];
};

export type Session = {
  user: AuthUser;
  dashboards: Dashboard[];
  roles: string[];
  permissions: string[];
} | null;

export type ApiError = {
  error: string;
  code?: string;
  fields?: Record<string, string[]>;
};
