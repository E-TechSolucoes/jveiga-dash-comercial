# Integração do Front com o Auth Google

Guia prático para conectar o front (React/Vue/etc.) ao backend de
autenticação descrito em `auth-google.md`.

## 1. Pré-requisitos

No `.env` do front:

```bash
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=000000000000-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

> O `VITE_GOOGLE_CLIENT_ID` é o **mesmo** valor configurado em
> `GOOGLE_OAUTH_CLIENT_ID` no backend. Ele é público — pode ir no
> bundle do front.

No Google Cloud Console (do client OAuth web), garantir que a URL do
front esteja em **Authorized JavaScript origins**:

- Dev: `http://localhost:5173` (Vite), `http://localhost:3000`, etc.
- Prod: `https://app.exemplo.com.br`

## 2. Carregar o Google Identity Services (GIS)

Adicione ao `index.html`:

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

Esse é o script oficial atual ("Sign in with Google" / GIS). Substitui
o antigo `gapi.auth2`, que está deprecated.

## 3. Renderizar o botão de login

Recomendado o "botão padrão" do Google (atende guidelines de marca):

```tsx
// LoginButton.tsx
import { useEffect, useRef } from "react";
import { useAuth } from "./AuthProvider";

declare global {
  interface Window {
    google: any;
  }
}

export function LoginButton() {
  const ref = useRef<HTMLDivElement>(null);
  const { loginWithGoogle } = useAuth();

  useEffect(() => {
    if (!window.google || !ref.current) return;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (resp: { credential: string }) => {
        await loginWithGoogle(resp.credential); // resp.credential é o id_token
      },
      ux_mode: "popup",
      auto_select: false,
    });

    window.google.accounts.id.renderButton(ref.current, {
      theme: "outline",
      size: "large",
      type: "standard",
      shape: "rectangular",
      text: "signin_with",
    });
  }, [loginWithGoogle]);

  return <div ref={ref} />;
}
```

Alternativa programática (botão custom seu chamando o popup):

```ts
window.google.accounts.id.prompt(); // dispara o "One Tap"
```

## 4. AuthProvider — context com sessão e helpers

Padrão recomendado para React. O provider:

- guarda `token`, `user` e `dashboards` no estado;
- persiste `token` em `localStorage` para sobreviver a reload;
- expõe `loginWithGoogle`, `logout`, `refresh`;
- redireciona para `/login` quando o token sumir/expirar.

```tsx
// AuthProvider.tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL;
const TOKEN_KEY = "auth.token";

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

type Session = { user: AuthUser; dashboards: Dashboard[] } | null;

type Ctx = {
  token: string | null;
  session: Session;
  loading: boolean;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);

  async function loginWithGoogle(idToken: string) {
    const r = await fetch(`${API}/api/v1/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
    });
    if (!r.ok) throw await r.json();
    const data = await r.json(); // { token, expires_at, user, dashboards }
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setSession({ user: data.user, dashboards: data.dashboards });
  }

  async function refresh() {
    if (!token) {
      setSession(null);
      setLoading(false);
      return;
    }
    const r = await fetch(`${API}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.status === 401 || r.status === 403) {
      logout();
      return;
    }
    const data = await r.json(); // { user, dashboards }
    setSession({ user: data.user, dashboards: data.dashboards });
    setLoading(false);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setSession(null);
    setLoading(false);
    window.google?.accounts.id.disableAutoSelect();
  }

  useEffect(() => {
    refresh(); /* on mount + when token muda */
  }, [token]);

  const value = useMemo(
    () => ({ token, session, loading, loginWithGoogle, logout, refresh }),
    [token, session, loading],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth fora de AuthProvider");
  return ctx;
}
```

## 5. Cliente HTTP que injeta o token

Wrapper único para todas as requests autenticadas. Trata 401/403 fazendo
logout automático (senão o usuário fica numa tela travada com token
inválido):

```ts
// api.ts
const API = import.meta.env.VITE_API_URL;
const TOKEN_KEY = "auth.token";

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const r = await fetch(`${API}${path}`, { ...init, headers });

  if (r.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "/login";
    throw new Error("unauthorized");
  }
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw err; // { error, code, fields? }
  }
  if (r.status === 204) return null;
  return r.json();
}
```

Use sempre via `apiFetch("/api/v1/items")` em vez de `fetch` direto.

## 6. Rota protegida (React Router)

```tsx
// RequireAuth.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export function RequireAuth({
  children,
  admin = false,
}: {
  children: JSX.Element;
  admin?: boolean;
}) {
  const { session, loading } = useAuth();
  const loc = useLocation();

  if (loading) return <div>Carregando...</div>;
  if (!session) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (admin && !session.user.is_admin) return <Navigate to="/forbidden" replace />;
  return children;
}
```

Exemplo de árvore:

```tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route
    path="/"
    element={
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    }
  >
    <Route path="dashboards/:slug" element={<DashboardPage />} />
    <Route
      path="admin"
      element={
        <RequireAuth admin>
          <AdminPage />
        </RequireAuth>
      }
    />
  </Route>
</Routes>
```

## 7. Renderizar a navegação a partir dos dashboards

A resposta de `/auth/me` já vem com a lista de dashboards que o usuário
pode ver. Não precisa filtrar no front:

```tsx
function Sidebar() {
  const { session } = useAuth();
  if (!session) return null;
  return (
    <nav>
      {session.dashboards.map((d) => (
        <Link key={d.id} to={`/dashboards/${d.slug}`}>
          {d.name}
        </Link>
      ))}
      {session.user.is_admin && <Link to="/admin">Administração</Link>}
    </nav>
  );
}
```

Para checar acesso a um dashboard específico (ex.: rota direta digitada
no navegador), basta verificar se o slug está na lista:

```ts
const canAccess = session.dashboards.some((d) => d.slug === slug) || session.user.is_admin; // admin acessa tudo
```

## 8. Painel administrativo — gerenciar usuários e permissões

Disponível só para admins. Endpoints prontos:

```ts
// Listar todos os usuários
const users = await apiFetch("/api/v1/users");

// Ativar/desativar ou promover a admin
await apiFetch(`/api/v1/users/${userId}`, {
  method: "PATCH",
  body: JSON.stringify({ is_active: false }),
});

// Listar dashboards liberados para um usuário
const granted = await apiFetch(`/api/v1/users/${userId}/dashboards`);

// Liberar acesso
await apiFetch(`/api/v1/users/${userId}/dashboards`, {
  method: "POST",
  body: JSON.stringify({ dashboard_id: dashboardId }),
});

// Revogar
await apiFetch(`/api/v1/users/${userId}/dashboards/${dashboardId}`, {
  method: "DELETE",
});

// Auditoria de logins (todos os usuários)
const history = await apiFetch("/api/v1/admin/login-history?limit=100");
```

## 9. Logout

```tsx
function LogoutButton() {
  const { logout } = useAuth();
  return <button onClick={logout}>Sair</button>;
}
```

Como o JWT é stateless, não há "endpoint de logout" no backend — basta
descartar o token no front. Para invalidar globalmente (suspeita de
vazamento), o backend permite desativar o usuário (`PATCH
/api/v1/users/{id}` com `is_active: false`); o middleware bloqueia o
próximo request. Para invalidar TODAS as sessões de uma vez, basta o
operador trocar `JWT_SECRET` no servidor.

## 10. Tratamento de erros — formato padrão

Toda resposta de erro do backend tem a forma:

```json
{ "error": "mensagem", "code": "MACHINE_CODE" }
```

Para 422 (validação) vem ainda `fields`:

```json
{
  "error": "validation failed",
  "code": "VALIDATION_ERROR",
  "fields": { "id_token": ["is required"] }
}
```

Helper sugerido:

```ts
function showError(err: any) {
  if (err?.fields) {
    // exibir por campo no formulário
    return;
  }
  toast.error(err?.error ?? "Erro inesperado");
}
```

## 11. Checklist final

- [ ] `VITE_GOOGLE_CLIENT_ID` no `.env` do front bate com `GOOGLE_OAUTH_CLIENT_ID` do back.
- [ ] URL do front cadastrada em "Authorized JavaScript origins" no Google Cloud.
- [ ] Script GIS carregado no `index.html`.
- [ ] `AuthProvider` envolvendo a árvore.
- [ ] Todas as chamadas autenticadas usam `apiFetch` (envia o Bearer).
- [ ] Rotas privadas com `<RequireAuth>`; rotas admin com `<RequireAuth admin>`.
- [ ] `logout()` limpa `localStorage` e desativa auto-select do Google.
- [ ] Em produção: `ALLOWED_ORIGINS` no back contém o domínio do front (CORS).

## 12. Troubleshooting rápido

| Sintoma                                   | Causa provável                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| `401 invalid google id_token`             | `GOOGLE_OAUTH_CLIENT_ID` do back ≠ do front, ou tempo do servidor muito fora do real |
| `403 user is inactive`                    | admin desativou o usuário no banco                                                   |
| `403 admin access required`               | usuário não é admin — a rota exige `is_admin = true`                                 |
| `CORS error` no devtools                  | adicionar a origem do front em `ALLOWED_ORIGINS`                                     |
| Login funciona, requests subsequentes 401 | token não está sendo enviado; conferir `apiFetch`                                    |
| `/auth/me` retorna 401 ao reload          | `JWT_EXPIRATION_HOURS` baixo, ou `JWT_SECRET` foi trocado no back                    |
