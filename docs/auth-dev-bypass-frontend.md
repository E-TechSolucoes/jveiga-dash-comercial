# Dev Bypass — Como usar no Front

Guia rápido para o front consumir o bypass de autenticação enquanto o
login Google ainda não está liberado no Google Cloud.

> **Esse caminho é só para dev/staging.** Em produção, `DEV_AUTH_TOKEN`
> não pode estar setado — o endpoint `/auth/dev-login` deixa de existir
> e o middleware volta a exigir JWT Google. O front deve detectar isso
> via env, não via tentativa-e-erro.

## 1. Pré-requisito no backend

Backend precisa estar rodando com `DEV_AUTH_TOKEN` no `.env`:

```bash
DEV_AUTH_TOKEN=dev-bypass-troca-em-prod-12345
DEV_AUTH_EMAIL=edson.oliveira@etechsolucoes.com.br
```

Confirme no log do backend ao subir:

```
WARN  DEV_AUTH_TOKEN ENABLED — fixed bearer bypass active. DO NOT USE IN PRODUCTION
```

## 2. Variáveis no front

No `.env` do front, adicione uma flag e (opcionalmente) o token:

```bash
VITE_API_URL=http://localhost:3000

# Auth Google (futuro)
VITE_GOOGLE_CLIENT_ID=000000000000-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com

# Dev bypass — apaga ou comenta quando o Google estiver funcionando
VITE_DEV_AUTH_ENABLED=true
```

> **Não** coloque o `DEV_AUTH_TOKEN` aqui — peça ao backend via endpoint.
> Assim você não precisa sincronizar o valor entre dois `.env`.

## 3. Adapta o AuthProvider

Adicione um método `loginDev()` que chama `/auth/dev-login` e reusa toda
a infra existente (storage do token + carregamento da sessão).

```tsx
// AuthProvider.tsx — adições marcadas com <<<
const DEV_ENABLED = import.meta.env.VITE_DEV_AUTH_ENABLED === "true"; // <<<

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);

  async function loginWithGoogle(idToken: string) {
    /* ...inalterado... */
  }

  // <<< novo
  async function loginDev() {
    const r = await fetch(`${API}/api/v1/auth/dev-login`, { method: "POST" });
    if (!r.ok) throw await r.json();
    const data = await r.json(); // { token, expires_at, user, dashboards }
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setSession({ user: data.user, dashboards: data.dashboards });
  }

  /* ...resto inalterado: refresh, logout, useEffect, value... */

  const value = useMemo(
    () => ({
      token,
      session,
      loading,
      devEnabled: DEV_ENABLED,
      loginWithGoogle,
      loginDev,
      logout,
      refresh,
    }),
    [token, session, loading],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
```

E expõe no tipo do contexto:

```ts
type Ctx = {
  token: string | null;
  session: Session;
  loading: boolean;
  devEnabled: boolean; // <<<
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginDev: () => Promise<void>; // <<<
  logout: () => void;
  refresh: () => Promise<void>;
};
```

## 4. Botão de dev na tela de login

Renderiza só quando a flag está ligada — em prod ele simplesmente não
aparece:

```tsx
// LoginPage.tsx
import { LoginButton } from "./LoginButton";
import { useAuth } from "./AuthProvider";

export function LoginPage() {
  const { devEnabled, loginDev } = useAuth();

  return (
    <div style={{ display: "grid", gap: 16, placeContent: "center", minHeight: "100vh" }}>
      <h1>BI J. Veiga</h1>

      <LoginButton />

      {devEnabled && (
        <>
          <hr />
          <button
            onClick={() => loginDev().catch(console.error)}
            style={{ background: "#fee", padding: "8px 16px", border: "1px dashed #c33" }}
          >
            🛠️ Entrar como Dev (bypass — só dev/staging)
          </button>
        </>
      )}
    </div>
  );
}
```

## 5. Tudo o resto continua igual

`apiFetch` não muda. `RequireAuth` não muda. O painel admin não muda.
O usuário "Dev User (bypass)" entra como **admin**, então enxerga todos
os dashboards e acessa todos os endpoints `/users`, `/dashboards`,
`/admin/login-history`.

## 6. Atalho ainda mais rápido (sem UI)

Se quiser pular o botão e já entrar logado abrindo o navegador, no
console do devtools (uma vez):

```js
localStorage.setItem("auth.token", "dev-bypass-troca-em-prod-12345");
location.reload();
```

Funciona porque `apiFetch` lê o token do `localStorage`. Útil para
testar API endpoints isoladamente, sem precisar passar pela tela de
login.

> Esse caminho exige que você saiba o valor do `DEV_AUTH_TOKEN`. O
> caminho via `loginDev()` é melhor porque o token vive só no servidor.

## 7. Migrando para o login Google

Quando o consent screen Google estiver liberado:

1. Remove `DEV_AUTH_TOKEN` do `.env` do backend.
2. Remove (ou comenta) `VITE_DEV_AUTH_ENABLED=true` do `.env` do front.
3. Reinicia ambos.
4. O botão dev some sozinho. Tentativas de chamar `/auth/dev-login`
   passam a retornar 404. Sessões já abertas com o token de dev caem
   para 401 no próximo `apiFetch` → o cliente faz logout automático e
   redireciona para `/login`, onde só sobra o botão Google.

Não precisa mexer em mais nada do código do front.

## 8. Troubleshooting

| Sintoma                                           | Causa provável                                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `404 endpoint "dev-login" not found`              | Backend subiu sem `DEV_AUTH_TOKEN` setado. Cheque o `.env` e o log de WARN no startup.                  |
| Botão dev não aparece                             | `VITE_DEV_AUTH_ENABLED` ≠ "true" no `.env` do front, ou Vite não foi reiniciado.                        |
| `loginDev()` funciona mas `/api/v1/items` dá 401  | O token retornado não está sendo persistido — confira `localStorage.getItem("auth.token")` no devtools. |
| Quero esquecer o token e voltar pra tela de login | `localStorage.clear()` + reload.                                                                        |
