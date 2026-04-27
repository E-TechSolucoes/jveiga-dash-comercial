# Auth Module — Integração Front

Guia para integrar o front com o módulo de autenticação por senha
(registro, login, refresh, logout). Este doc cobre o fluxo "password
auth"; o login Google está em [auth-google.md](auth-google.md) e o
bypass de dev em [auth-dev-bypass-frontend.md](auth-dev-bypass-frontend.md).

- Base URL: `${VITE_API_URL}/api/v1`
- Content-Type: `application/json`
- Token nas rotas protegidas: `Authorization: Bearer <access_token>`

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
    "last_login_at": null
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
    "last_login_at": "2026-04-26T12:00:00Z"
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
  "user": { "id": "...", "email": "...", "name": "...", "is_admin": false, "last_login_at": "..." },
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

### Cliente HTTP (exemplo TS/fetch)

```ts
// api/auth.ts
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
  return r.json() as Promise<LoginResponse>;
}

export async function refresh(refresh_token: string) {
  const r = await fetch(`${API}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  });
  if (!r.ok) throw await r.json();
  return r.json() as Promise<LoginResponse>;
}

export async function logout(access_token: string) {
  await fetch(`${API}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}` },
  });
}

export async function me(access_token: string) {
  const r = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!r.ok) throw await r.json();
  return r.json();
}
```

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

### Auto-refresh (interceptor)

```ts
// Antes de cada request: se access_token expirou, refresca primeiro.
// Se um request retornar 401, tenta refresh + retry uma única vez.
async function authedFetch(input: string, init: RequestInit = {}) {
  let access = getAccessToken();
  if (isExpiringSoon(access)) {
    access = await doRefresh(); // chama /auth/refresh, atualiza storage
  }
  const r = await fetch(input, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${access}` },
  });
  if (r.status === 401 && !init.headers?.["X-Retried"]) {
    access = await doRefresh();
    return fetch(input, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${access}`, "X-Retried": "1" },
    });
  }
  return r;
}
```

### Boot da aplicação

1. Lê `access_token` do storage.
2. Se ausente → tela de login.
3. Se presente mas expirando → chama `/auth/refresh`.
4. Chama `GET /auth/me` para validar e popular usuário/dashboards.
5. Se qualquer passo retornar `401` → limpa storage e vai pro login.

### Logout

```ts
async function doLogout() {
  try {
    await logout(getAccessToken());
  } finally {
    clearStorage();
    location.assign("/login");
  }
}
```

Importante: chamar logout do backend **antes** de limpar o storage, para
revogar a família no servidor. Mesmo se a chamada falhar, limpe o
storage local.

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
