export type Dashboard = {
  id: string;
  slug: string;
  name: string;
  description: string;
  is_active: boolean;
  display_order: number;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  picture: string;
  is_admin: boolean;
  last_login_at: string | null;
};

export type Session = {
  user: AuthUser;
  dashboards: Dashboard[];
} | null;
