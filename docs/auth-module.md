# Auth Module — Integração Front

Guia para integrar o front com o módulo de autenticação por senha
(registro, login, refresh, logout). Este doc cobre o fluxo "password
auth"; o login Google está em [auth-google.md](auth-google.md) e o
bypass de dev em [auth-dev-bypass-frontend.md](auth-dev-bypass-frontend.md).

- Base URL: `${VITE_API_URL}/api/v1`
- Content-Type: `application/json`
- **Toda chamada autenticada** envia o header
  `Authorization: Bearer <access_token>` — ver
  [Autorização em todas as chamadas](#autorização-em-todas-as-chamadas-da-api).

## Autorização em todas as chamadas da API

> **Regra**: exceto pelas rotas listadas em **Endpoints públicos**
> abaixo, **todo** request à API exige o header
> `Authorization: Bearer <access_token>`. Sem ele, o backend devolve
> `401 UNAUTHORIZED` antes mesmo de chegar ao handler.

### Endpoints públicos (sem token)

São os únicos que **não** exigem `Authorization`:

- `GET  /health`
- `GET  /api/v1/hello`
- `POST /api/v1/auth/google`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register` (quando `AUTH_ALLOW_SELF_REGISTER=true`)
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/password/forgot`
- `POST /api/v1/auth/password/reset`
- `POST /api/v1/auth/email/verify`
- `POST /api/v1/auth/dev-login` (apenas com `DEV_AUTH_TOKEN` setado)

### Endpoints protegidos (Bearer obrigatório)

**Todo o resto** — incluindo `/auth/me`, `/auth/logout`,
`/auth/password`, `/auth/api-tokens`, `/dashboards`, `/items`,
`/arsenal`, `/bq/*`, `/users/*`, `/admin/*`, etc. O middleware
(`AuthWithTokens` em [application/routes.go](../application/routes.go))
roda antes do handler e:

1. Lê o header `Authorization: Bearer <token>`.
2. Valida o JWT (assinatura HS256 + expiração) usando o segredo do `TokenService`.
3. Extrai claims: `user_id`, `session_id` (= family_id), `roles`, `permissions`.
4. Carrega o `*model.User` do banco e checa se está ativo.
5. Anexa user + claims ao `context.Request()` para os handlers usarem.

Falhas devolvem JSON com `code` no shape padrão:

| Situação                                    | Status | code           |
| ------------------------------------------- | ------ | -------------- |
| Header ausente ou mal-formado               | 401    | `UNAUTHORIZED` |
| JWT inválido / expirado / assinatura errada | 401    | `UNAUTHORIZED` |
| Usuário do token não existe mais            | 401    | `UNAUTHORIZED` |
| Usuário existe mas `is_active=false`        | 403    | `FORBIDDEN`    |
| Rota admin sem `is_admin=true`              | 403    | `FORBIDDEN`    |

### O que o front precisa fazer

- Após login (ou refresh), guardar o `access_token` recebido.
- Em **toda** chamada — listas, detalhes, mutações, uploads — incluir
  `Authorization: Bearer <access_token>`.
- Centralizar isso num cliente HTTP único (ver
  [Cliente HTTP autenticado](#cliente-http-autenticado-exemplo-tsfetch)
  e [Auto-refresh (interceptor)](#auto-refresh-interceptor)).
  **Não** espalhe `fetch` direto por componentes: uma única omissão do
  header gera 401 silencioso.

## Visão geral do fluxo

```
[Cadastro]                     [Login]                    [Sessão]
  POST /auth/register   →   POST /auth/login   →    GET  /auth/me
       (cria user)              (access+refresh)        (dados+roles)
                                     │
                            ┌────────┴────────┐
                            ▼                 ▼
                  POST /auth/refresh    POST /auth/logout
                   (rotaciona par)       (revoga família)
```

- **access_token** — JWT curto (default 15 min). Usado em
  `Authorization: Bearer`. Carrega `user_id`, `roles`, `permissions`,
  `session_id` (família do refresh).
- **refresh_token** — opaco, longo (default 30 dias). Usado **apenas**
  em `POST /auth/refresh` para renovar o par. Cada refresh rotaciona
  ambos os tokens (o anterior é invalidado). Reuso de um refresh já
  rotacionado revoga toda a família — usuário precisa logar de novo.
- **session_id = family_id** — todos os refresh emitidos a partir do
  mesmo login compartilham a mesma família. `POST /auth/logout` revoga
  a família inteira.

## Endpoints

### 1. Criar usuário — `POST /auth/register`

Disponível **somente quando** `AUTH_ALLOW_SELF_REGISTER=true` no
backend. Caso contrário, devolve `404 NOT_FOUND`.

**Request**

```json
{
  "email": "ana@etech.com.br",
  "name": "Ana Silva",
  "password": "senha-forte-123"
}
```

**Response 201**

```json
{
  "user": {
    "id": "9f8b...uuid",
    "email": "ana@etech.com.br",
    "name": "Ana Silva",
    "picture": "",
    "is_admin": false,
    "last_login_at": null,
    "project_ids": []
  },
  "email_verify_token": "abc123..."
}
```

- `email_verify_token` só aparece em **dev**. Em produção, vai por
  email — o front não deve depender dele.
- O usuário recém-criado **não está logado**. O front deve seguir com
  `POST /auth/login`.
- Role default (`user`) é atribuída automaticamente.

**Erros comuns**

| Status | code               | Quando                                    |
| ------ | ------------------ | ----------------------------------------- |
| 422    | `VALIDATION_ERROR` | email inválido / senha fraca / nome vazio |
| 409    | `CONFLICT`         | email já cadastrado                       |
| 404    | `NOT_FOUND`        | self-register desabilitado no backend     |

---

### 2. Login — `POST /auth/login`

**Request**

```json
{
  "email": "ana@etech.com.br",
  "password": "senha-forte-123",
  "mfa_code": "123456"
}
```

`mfa_code` é opcional — só obrigatório se o usuário tem MFA habilitado
(o backend devolve `401` com mensagem específica se faltar).

**Response 200**

```json
{
  "access_token": "eyJhbGciOi...",
  "access_token_expires_at": "2026-04-27T18:15:00Z",
  "refresh_token": "rt_a9f8...",
  "refresh_token_expires_at": "2026-05-27T18:00:00Z",
  "token_type": "Bearer",
  "user": {
    "id": "9f8b...",
    "email": "ana@etech.com.br",
    "name": "Ana Silva",
    "picture": "",
    "is_admin": false,
    "last_login_at": "2026-04-26T12:00:00Z",
    "project_ids": [19, 23]
  },
  "roles": ["user"],
  "permissions": ["dashboards:read", "api_tokens:manage"]
}
```

**Erros comuns**

| Status | code               | Quando                                              |
| ------ | ------------------ | --------------------------------------------------- |
| 401    | `UNAUTHORIZED`     | email/senha inválidos                               |
| 401    | `UNAUTHORIZED`     | MFA exigido / código MFA inválido                   |
| 403    | `FORBIDDEN`        | conta bloqueada (lockout após N falhas — default 5) |
| 403    | `FORBIDDEN`        | conta inativa (`is_active=false`)                   |
| 422    | `VALIDATION_ERROR` | email/password vazios                               |

> **Lockout** — após `AUTH_LOCKOUT_THRESHOLD` (5) tentativas falhas, a
> conta fica bloqueada por `AUTH_LOCKOUT_DURATION_MIN` (15 min). O
> contador zera após login bem-sucedido.

---

### 3. Refresh — `POST /auth/refresh`

Renova o par de tokens. Chamar quando o `access_token` está prestes a
expirar (ou após receber `401` em qualquer rota protegida).

**Request**

```json
{ "refresh_token": "rt_a9f8..." }
```

**Response 200** — mesmo shape do `/auth/login`. O refresh antigo é
invalidado; persistir os novos.

**Erros**

| Status | code           | Quando                                                                                      |
| ------ | -------------- | ------------------------------------------------------------------------------------------- |
| 401    | `UNAUTHORIZED` | refresh inválido, expirado, revogado **ou já rotacionado** (token reuse → família revogada) |

> Se o front receber `401` no refresh, deve limpar o estado local e
> mandar para `/login`.

---

### 4. Logout — `POST /auth/logout` (autenticado)

Revoga a família inteira de refresh tokens da sessão atual. O
`access_token` continua válido até expirar (TTL curto — aceitável).

**Headers**

```
Authorization: Bearer <access_token>
```

**Request body**: nenhum.

**Response 200**

```json
{ "status": "logged_out" }
```

Front deve limpar `access_token`, `refresh_token` e dados de usuário do
storage e redirecionar para o login.

---

### 5. Sessão atual — `GET /auth/me` (autenticado)

Útil no boot do app para revalidar o token e popular o estado.

**Response 200**

```json
{
  "token": "eyJ...",
  "expires_at": "2026-04-27T18:15:00Z",
  "user": {
    "id": "...",
    "email": "...",
    "name": "...",
    "is_admin": false,
    "last_login_at": "...",
    "project_ids": [19, 23]
  },
  "dashboards": [{ "id": "...", "name": "..." }]
}
```

> Esse endpoint vem do AuthService legado — é o mesmo formato do login
> Google. Aceita tokens do password auth também. Os campos `roles` e
> `permissions` **não vêm aqui** — extraia do `access_token` (claims
> JWT) ou recadastre durante o login/refresh.

---

### 6. Trocar senha — `POST /auth/password` (autenticado)

```json
{ "current_password": "antiga", "new_password": "nova-forte" }
```

Invalida todas as sessões EXCETO a atual. Resposta `200 {"status":"password_changed"}`.

---

### 7. Esqueci a senha — `POST /auth/password/forgot`

Sempre devolve `202` — não revela se o email existe (anti-enum).

```json
{ "email": "ana@etech.com.br" }
```

O backend emite token de reset com TTL `PASSWORD_RESET_TTL_MIN` (15
min). Em produção vai por email; em dev é descartado.

### 8. Resetar senha — `POST /auth/password/reset`

```json
{ "token": "<token recebido por email>", "new_password": "nova-forte" }
```

`200 {"status":"password_reset"}`. Token só pode ser usado uma vez.

### 9. Verificar email — `POST /auth/email/verify`

```json
{ "token": "<email_verify_token>" }
```

Quando `AUTH_REQUIRE_EMAIL_VERIFICATION=true`, login bloqueia até a
verificação. Resposta: `200 {"status":"email_verified"}`.

---

## Formato de erro

Todos os erros seguem o mesmo shape:

```json
{
  "error": "mensagem legível",
  "code": "UNAUTHORIZED",
  "fields": { "email": ["is required"] }
}
```

Códigos: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
`CONFLICT`, `VALIDATION_ERROR`, `INTERNAL_ERROR`. `fields` só aparece
em validação.

## Implementação no front

### Cliente HTTP autenticado (exemplo TS/fetch)

A regra é simples: **um único `apiFetch` para tudo**. Ele injeta o
`Authorization: Bearer ...` em toda chamada e faz refresh automático no
`401`. Endpoints públicos (login, register, refresh) usam um `fetch`
direto — só esses três.

```ts
// api/client.ts
const API = import.meta.env.VITE_API_URL + "/api/v1";

// Storage abstraído — troque por sessionStorage/cookie se preferir.
const tokenStore = {
  get access() {
    return localStorage.getItem("access_token") ?? "";
  },
  get refresh() {
    return localStorage.getItem("refresh_token") ?? "";
  },
  set(tokens: { access_token: string; refresh_token: string }) {
    localStorage.setItem("access_token", tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);
  },
  clear() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },
};

// Único refresh em voo — evita race quando várias requests batem 401 ao mesmo tempo.
let refreshing: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const r = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: tokenStore.refresh }),
    });
    if (!r.ok) {
      tokenStore.clear();
      location.assign("/login");
      throw new Error("session expired");
    }
    const data = await r.json();
    tokenStore.set(data);
    return data.access_token as string;
  })();
  try {
    return await refreshing;
  } finally {
    refreshing = null;
  }
}

// USE ISSO PARA TODA CHAMADA AUTENTICADA — listas, detalhes, mutações.
export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
  headers.set("Authorization", `Bearer ${tokenStore.access}`);

  let r = await fetch(`${API}${path}`, { ...init, headers });

  // 401 → tenta refresh uma única vez e refaz a request.
  if (r.status === 401 && tokenStore.refresh && !headers.has("X-Retried")) {
    const fresh = await doRefresh();
    headers.set("Authorization", `Bearer ${fresh}`);
    headers.set("X-Retried", "1");
    r = await fetch(`${API}${path}`, { ...init, headers });
  }
  return r;
}

export { tokenStore };
```

### Endpoints de auth (públicos — não usam apiFetch)

```ts
// api/auth.ts
import { tokenStore } from "./client";
const API = import.meta.env.VITE_API_URL + "/api/v1";

export type Tokens = {
  access_token: string;
  access_token_expires_at: string;
  refresh_token: string;
  refresh_token_expires_at: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  picture: string;
  is_admin: boolean;
  last_login_at: string | null;
  project_ids: number[]; // empreendimentos liberados — sempre array, nunca null
};

export type LoginResponse = Tokens & {
  token_type: "Bearer";
  user: AuthUser;
  roles: string[];
  permissions: string[];
};

export async function register(email: string, name: string, password: string) {
  const r = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, password }),
  });
  if (!r.ok) throw await r.json();
  return r.json() as Promise<{ user: AuthUser }>;
}

export async function login(email: string, password: string, mfa_code?: string) {
  const r = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, mfa_code }),
  });
  if (!r.ok) throw await r.json();
  const data = (await r.json()) as LoginResponse;
  tokenStore.set(data); // guarda os tokens
  return data;
}
```

### Demais endpoints — sempre via `apiFetch` (Bearer obrigatório)

```ts
// api/me.ts
import { apiFetch, tokenStore } from "./client";

export async function me() {
  const r = await apiFetch("/auth/me");
  if (!r.ok) throw await r.json();
  return r.json();
}

export async function logout() {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } finally {
    tokenStore.clear();
  }
}

export async function changePassword(current: string, next: string) {
  const r = await apiFetch("/auth/password", {
    method: "POST",
    body: JSON.stringify({ current_password: current, new_password: next }),
  });
  if (!r.ok) throw await r.json();
  return r.json();
}
```

```ts
// api/dashboards.ts — qualquer endpoint de domínio segue o mesmo padrão.
import { apiFetch } from "./client";

export async function listDashboards() {
  const r = await apiFetch("/dashboards");
  if (!r.ok) throw await r.json();
  return r.json();
}

export async function createItem(payload: unknown) {
  const r = await apiFetch("/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw await r.json();
  return r.json();
}
```

> Repare: nenhum desses arquivos toca em `Authorization` manualmente —
> o `apiFetch` injeta o Bearer e renova o token sozinho. Se você se
> pegar escrevendo `headers.Authorization = ...` num componente,
> reverta — está fora do padrão.

### Onde guardar os tokens

| Local                       | Prós                         | Contras                                             |
| --------------------------- | ---------------------------- | --------------------------------------------------- |
| `localStorage`              | simples, persiste entre abas | vulnerável a XSS                                    |
| `sessionStorage`            | limpa ao fechar aba          | XSS, perde sessão                                   |
| Cookie `HttpOnly`           | imune a XSS                  | exige backend setar (não fazemos hoje); requer CSRF |
| Memória + refresh em cookie | bom equilíbrio               | mais código                                         |

Recomendação atual: `localStorage` para `access_token` + `refresh_token`,
**desde que** o front esteja com CSP estrita e sem libs de terceiros
inseguras. Para apps sensíveis, considere mover o `refresh_token` para
cookie `HttpOnly` (requer mudança no backend).

### Auto-refresh (já incluído no `apiFetch`)

O `apiFetch` mostrado acima:

- Injeta o Bearer em **toda** chamada.
- Em `401`, dispara `doRefresh()` (chama `POST /auth/refresh`,
  atualiza o storage) e refaz a request **uma única vez**.
- Serializa refreshs concorrentes via `refreshing` (uma única promise
  em voo) — evita estouro de família quando 5 requests batem 401 ao
  mesmo tempo.
- Se o refresh falha (401 → família revogada/expirada), limpa storage
  e redireciona pra `/login`.

### Boot da aplicação

1. Lê `access_token` do storage. Ausente → vai pra `/login`.
2. Chama `apiFetch("/auth/me")`. O wrapper cuida sozinho de:
   - Renovar o token se expirado.
   - Redirecionar pra `/login` se o refresh falhar.
3. Popula store/contexto com `user`, `roles`, `permissions` e
   `dashboards` retornados.

### Logout

`logout()` já mostrado em `api/me.ts` chama `POST /auth/logout`
(revoga a família no backend) e em seguida `tokenStore.clear()`.
Chame na ordem certa: **primeiro** o backend (para invalidar a
família), **depois** limpe local — mesmo se a chamada do backend
falhar, sempre limpe o storage.

## Roles & Permissions

Os arrays `roles` e `permissions` no `LoginResponse` permitem renderizar
UI condicional sem nova chamada:

```ts
const canManageDashboards = perms.includes("dashboards:write");
const isAdmin = roles.includes("admin");
```

Lista de permissões seed-ada: `users:read|write|delete`,
`roles:read|write`, `dashboards:read|write`, `audit:read`,
`api_tokens:manage`. **Não confiar só no front** — o backend re-valida
em cada rota.

## Variáveis de ambiente relevantes (backend)

| Var                               | Default | Efeito no front                     |
| --------------------------------- | ------- | ----------------------------------- |
| `AUTH_ALLOW_SELF_REGISTER`        | `true`  | Habilita `/auth/register`           |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | `false` | Login bloqueia até verificar email  |
| `ACCESS_TOKEN_TTL_MIN`            | `15`    | Frequência de refresh               |
| `REFRESH_TOKEN_TTL_DAYS`          | `30`    | Tempo máximo de "lembrar de mim"    |
| `AUTH_LOCKOUT_THRESHOLD`          | `5`     | Tentativas falhas antes de bloquear |
| `AUTH_LOCKOUT_DURATION_MIN`       | `15`    | Tempo de bloqueio                   |
| `ALLOWED_ORIGINS`                 | `""`    | CORS — incluir a URL do front       |

## Referências

- [auth-google.md](auth-google.md) — login com Google Identity Services
- [auth-frontend-integration.md](auth-frontend-integration.md) — exemplo
  React do fluxo Google
- [auth-dev-bypass-frontend.md](auth-dev-bypass-frontend.md) — token
  fixo para desenvolvimento
- [db/sql/auth_security.sql](../db/sql/auth_security.sql) — schema
  completo (tabelas, índices, constraints)
