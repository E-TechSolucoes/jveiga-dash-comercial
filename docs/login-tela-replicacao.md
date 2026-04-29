# Tela de Login — Replicação Fiel

Documentação **pixel-fidelity** da tela `/login`. Permite reconstruir a tela
em outro projeto mantendo cores, espaçamentos, tipografia, gradientes, micro-
interações e acessibilidade idênticos ao original.

> **Arquivos-fonte de referência**
>
> - Página: [`src/app/(auth)/login/page.tsx`](<../src/app/(auth)/login/page.tsx>)
> - Painel esquerdo: [`src/app/(auth)/_components/editorial-panel.tsx`](<../src/app/(auth)/_components/editorial-panel.tsx>)
> - Layout root (fontes): [`src/app/layout.tsx`](../src/app/layout.tsx)
> - Tokens globais: [`src/app/globals.css`](../src/app/globals.css)

---

## Sumário

- [1. Visão geral](#1-visão-geral)
- [2. Pré-requisitos](#2-pré-requisitos)
- [3. Layout — grid 12 colunas (5/7)](#3-layout--grid-12-colunas-57)
- [4. Painel esquerdo (EditorialPanel)](#4-painel-esquerdo-editorialpanel)
- [5. Painel direito — formulário](#5-painel-direito--formulário)
- [6. Componente `FieldRow`](#6-componente-fieldrow)
- [7. Botão de envio (com sweep gradient)](#7-botão-de-envio-com-sweep-gradient)
- [8. Estados e fluxos](#8-estados-e-fluxos)
- [9. Tabela completa de tokens utilizados](#9-tabela-completa-de-tokens-utilizados)
- [10. Código-fonte completo](#10-código-fonte-completo)

---

## 1. Visão geral

```
┌──────────────────────────┬──────────────────────────────────────────┐
│  EditorialPanel (5/12)   │  Formulário (7/12)                       │
│  • Hidden < lg (1024px)  │  • Sempre visível                        │
│  • Gradient azul + glows │  • Fundo branco, grade vertical sutil    │
│  • Tipografia editorial  │  • Form com 2 (ou 3) campos + CTA preto  │
│  • Sparkline ornament    │                                          │
└──────────────────────────┴──────────────────────────────────────────┘
```

- **Mobile / tablet (`< 1024px`)**: o painel azul é ocultado (`hidden lg:flex`),
  o formulário ocupa 100% da viewport.
- **Desktop (`≥ 1024px`)**: split 5/7 (painel ↔ formulário) em `grid-cols-12`.
- Altura total: `min-h-svh` (svh para evitar bug de barra do iOS).

Estilo geral: **editorial técnico** — JetBrains Mono em micro-letras com
`tracking` largo (`0.32em` / `0.36em`) para "rótulos legais", Outfit em pesos
`light/semibold` para os displays grandes, paleta restrita a azul + slate +
rose (apenas para erro).

---

## 2. Pré-requisitos

```bash
npm i next react react-dom lucide-react
npm i -D tailwindcss@4 @tailwindcss/postcss
```

**Tipografia obrigatória** — garanta que estas três variáveis CSS estejam
disponíveis (vêm do `RootLayout` / `next/font`):

| Variável CSS       | Família                   | Uso na tela                               |
| ------------------ | ------------------------- | ----------------------------------------- |
| `--font-outfit`    | Outfit (300/600)          | Headings grandes, parágrafos              |
| `--font-jetbrains` | JetBrains Mono (300/500)  | Microtipografia em uppercase com tracking |
| `--font-fraunces`  | Fraunces (não usada aqui) | —                                         |

E os utilitários do Tailwind v4 mapeados:

```css
@theme inline {
  --color-background: var(--bg);
  --color-foreground: var(--ink);
  --font-sans: var(--font-outfit);
  --font-serif: var(--font-fraunces);
  --font-mono: var(--font-jetbrains);
}
```

> A tela é construída **inteiramente com classes utilitárias do Tailwind v4 e
> `style` inline** — não usa o design system custom de `globals.css`. Para
> portar para outro projeto, basta Tailwind v4 + as fontes corretas.

**Roteamento**: a página usa `next/link` para `"/"` e `"/register"`. Em outro
stack, troque por `<a href>` ou pelo equivalente de roteador.

**Auth**: o submit chama `useAuth().login(email, password, mfaCode?)`. Você
substitui pela sua função de login.

---

## 3. Layout — grid 12 colunas (5/7)

A `<main>` é o container raiz:

```tsx
<main className="grid min-h-svh grid-cols-1 bg-white text-slate-900 lg:grid-cols-12">
  <EditorialPanel /> {/* lg:col-span-5, hidden em mobile */}
  <section className="lg:col-span-7 … …">…</section>
</main>
```

| Classe                       | Resultado                                 |
| ---------------------------- | ----------------------------------------- |
| `grid min-h-svh grid-cols-1` | Empilhado em mobile, ocupa altura total   |
| `bg-white text-slate-900`    | Fundo branco, tinta slate-900 (`#0f172a`) |
| `lg:grid-cols-12`            | A partir de 1024px, vira 12 colunas       |

A coluna do form usa **padding responsivo**:

```
px-6 py-10                     ← mobile
sm:px-12                       ← ≥640px
lg:col-span-7 lg:px-16 lg:py-12 ← ≥1024px
```

---

## 4. Painel esquerdo (EditorialPanel)

Componente puramente decorativo, **escondido em telas `< lg`**. Compõe seis
camadas empilhadas (todas `pointer-events-none`):

1. **Background base** — gradient diagonal + dois glows radiais.
2. **Grade vertical** — linhas brancas a cada 84px, opacity 0.06.
3. **Grade horizontal** — linhas a cada 200px, opacity 0.05.
4. **Glow azul** — círculo blur-3xl no canto superior direito.
5. **Glow índigo** — círculo blur-3xl no canto inferior esquerdo.
6. **Grain SVG** — turbulência fractal em `mix-blend-overlay`, opacity 0.07.

### 4.1 `<aside>` raiz

```tsx
<aside
  className="relative hidden overflow-hidden text-white lg:col-span-5 lg:flex lg:flex-col"
  style={{
    background:
      "radial-gradient(900px 320px at 85% -30%, rgba(255,255,255,0.18), transparent 60%), " +
      "radial-gradient(700px 280px at 0% 110%, rgba(99,102,241,0.35), transparent 60%), " +
      "linear-gradient(135deg, #1e40af 0%, #2563eb 55%, #3b82f6 100%)",
  }}
>
```

**Cores exatas do gradient base** (de cima-esquerda para baixo-direita):

- `#1e40af` (blue-800) → 0%
- `#2563eb` (blue-600) → 55%
- `#3b82f6` (blue-500) → 100%

### 4.2 Camadas de textura (todas absolutas, todas `pointer-events-none`)

```tsx
{
  /* grade vertical */
}
<div
  aria-hidden
  className="pointer-events-none absolute inset-0 opacity-[0.06]"
  style={{
    backgroundImage: "linear-gradient(to right, white 1px, transparent 1px)",
    backgroundSize: "84px 100%",
  }}
/>;

{
  /* grade horizontal */
}
<div
  aria-hidden
  className="pointer-events-none absolute inset-0 opacity-[0.05]"
  style={{
    backgroundImage: "linear-gradient(to bottom, white 1px, transparent 1px)",
    backgroundSize: "100% 200px",
  }}
/>;

{
  /* glow superior direito */
}
<div
  aria-hidden
  className="pointer-events-none absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
  style={{
    background: "radial-gradient(closest-side, rgba(59,130,246,0.55), transparent 70%)",
  }}
/>;

{
  /* glow inferior esquerdo */
}
<div
  aria-hidden
  className="pointer-events-none absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
  style={{
    background: "radial-gradient(closest-side, rgba(99,102,241,0.4), transparent 70%)",
  }}
/>;

{
  /* grain (turbulência SVG) */
}
<div
  aria-hidden
  className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
  style={{
    backgroundImage:
      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>\")",
  }}
/>;
```

### 4.3 Header do painel — brand + status

```tsx
<header className="relative z-10 flex items-center justify-between px-12 pt-10">
  <div className="flex items-center gap-3">
    <div
      aria-hidden
      className="flex h-9 w-9 items-center justify-center rounded-sm border border-white/25 bg-white/10 font-sans text-[15px] font-semibold text-white"
    >
      JV
    </div>
    <div className="font-mono text-[10px] tracking-[0.36em] text-white/55">
      JDV &nbsp;·&nbsp; PAINEL COMERCIAL
    </div>
  </div>

  {/* ATIVO com bullet ping */}
  <div className="flex items-center gap-2.5 font-mono text-[10px] tracking-[0.36em] text-white/55">
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
    </span>
    ATIVO
  </div>
</header>
```

Detalhes:

- **Quadrado "JV"**: 36×36, `rounded-sm` (≈2px), borda `white/25`, fundo
  `white/10`, fonte sans (Outfit) `15px / 600`.
- **Microtipografia**: JetBrains Mono `10px`, `tracking-[0.36em]`, opacity 55%.
- **Bullet ATIVO**: dois `<span>` empilhados — o de trás faz `animate-ping`
  (Tailwind), o da frente é fixo. Cor `bg-emerald-400` (`#34d399`).

### 4.4 Bloco central — display "Jerônimo da Veiga"

```tsx
<div className="relative z-10 flex flex-1 flex-col justify-center px-12 py-10">
  <h2 className="font-sans text-[72px] leading-[0.95] tracking-tight text-white">
    <span className="font-semibold">Jerônimo</span>
    <span className="block font-light text-white/90">da Veiga</span>
  </h2>

  <div className="mt-9 flex items-center gap-4">
    <div className="h-px w-16 bg-white/35" />
    <p className="font-mono text-[10px] tracking-[0.36em] text-white/55">PAINEL DO COMERCIAL</p>
  </div>

  <p className="mt-7 max-w-md text-base leading-relaxed text-white/75">
    Acompanhe metas, funil e performance comercial em tempo real, com a precisão de quem decide pelo
    número.
  </p>

  {/* sparkline ornament — ver abaixo */}
</div>
```

- Heading **72px**, `leading-[0.95]`, `tracking-tight`. Primeira linha em
  `font-semibold` (Outfit 600), segunda linha em `font-light` (Outfit 300)
  com `text-white/90`.
- **Régua horizontal** entre o display e o subtítulo: traço de 1px × 64px
  (`h-px w-16 bg-white/35`).
- Parágrafo descritivo `text-base` (16px), `leading-relaxed`, `max-w-md`,
  `text-white/75`.

### 4.5 Sparkline ornamental (SVG inline)

```tsx
<div className="mt-12 flex items-end gap-6">
  <svg
    aria-hidden
    viewBox="0 0 480 80"
    className="h-14 w-full max-w-md text-blue-400"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path
      d="M0,62 C32,58 52,52 84,48 C118,44 138,60 174,52 C212,44 238,18 276,22 C312,26 338,52 374,42 C406,34 438,18 480,10"
      opacity="0.85"
    />
    <path
      d="M0,72 C40,70 60,66 96,62 C140,58 160,68 196,64 C238,60 262,42 304,46 C342,50 372,62 408,56 C432,52 460,40 480,32"
      opacity="0.35"
    />
    <circle cx="480" cy="10" r="3.2" fill="currentColor" />
  </svg>
</div>
```

- Duas curvas Bézier sobrepostas (uma "principal" 0.85 + uma "fantasma" 0.35).
- **Cor**: `text-blue-400` (`#60a5fa`).
- Ponto final preenchido (raio 3.2) para indicar "última leitura".
- Altura `h-14` (56px), largura responsiva `w-full max-w-md`.

### 4.6 Footer do painel

```tsx
<footer className="relative z-10 flex items-end justify-end px-12 pb-10">
  <div className="flex items-center gap-4 font-mono text-[10px] tracking-[0.36em] text-white/40">
    <span>v 1.0</span>
    <span className="h-3 w-px bg-white/20" />
    <span>BI · COMERCIAL</span>
  </div>
</footer>
```

Pequena assinatura à direita: versão + separador vertical (`1px × 12px`) +
"BI · COMERCIAL", todos em mono opacity 40%.

---

## 5. Painel direito — formulário

```tsx
<section className="relative flex flex-col px-6 py-10 sm:px-12 lg:col-span-7 lg:px-16 lg:py-12">
  {/* grade vertical sutil de fundo */}
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0"
    style={{
      backgroundImage: "linear-gradient(to right, rgba(15,23,42,0.04) 1px, transparent 1px)",
      backgroundSize: "120px 100%",
    }}
  />
  …
</section>
```

A coluna inteira recebe uma **grade vertical** de 1px a cada 120px, em
`rgba(15,23,42,0.04)` — o "papel quadriculado" sutil que assina a tela.

### 5.1 Header da coluna direita

```tsx
<header className="relative z-10 flex items-center justify-between">
  <Link
    href="/"
    className="font-mono text-[10px] tracking-[0.32em] text-slate-500 transition hover:text-slate-900"
  >
    ACESSO &nbsp;/&nbsp; ENTRAR
  </Link>
  <Link
    href="/register"
    className="group flex items-center gap-2 font-mono text-[10px] tracking-[0.32em] text-slate-500 transition hover:text-blue-700"
  >
    CRIAR CONTA
    <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" aria-hidden />
  </Link>
</header>
```

- Microtipografia idêntica à do painel esquerdo, mas em `text-slate-500`
  (`#64748b`).
- O link **CRIAR CONTA** usa `group` para que o ícone `ArrowRight` (12×12)
  translate em 4px no hover.
- Hover: esquerdo vira `slate-900`, direito vira `blue-700` (`#1d4ed8`).

### 5.2 Bloco central — display + parágrafo

```tsx
<div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-16">
  <h1 className="font-sans text-[56px] leading-[1] font-semibold tracking-tight text-slate-900 sm:text-[64px]">
    Faça seu
    <span className="block font-light text-blue-700">login.</span>
  </h1>
  <p className="mt-6 max-w-md text-base leading-relaxed text-slate-500">
    Use suas credenciais para entrar no painel. Os dados refletem em tempo real o funil, as metas e
    a performance comercial.
  </p>
  …
</div>
```

| Atributo               | Valor                                     |
| ---------------------- | ----------------------------------------- |
| Container              | `max-w-xl` (576px), centralizado, `py-16` |
| Título mobile          | `56px / line-height 1 / semibold / tight` |
| Título ≥ 640px         | `64px`                                    |
| Cor primária do título | `text-slate-900` (`#0f172a`)              |
| Cor da segunda linha   | `text-blue-700` (`#1d4ed8`), `font-light` |
| Subtítulo              | `text-base / text-slate-500 / max-w-md`   |

### 5.3 Form — espaçamento e inputs

```tsx
<form onSubmit={handleSubmit} className="mt-14 space-y-9">
  <FieldRow label="E-MAIL" htmlFor="email">
    <input id="email" type="email" required autoComplete="email" … className="…" />
  </FieldRow>

  <FieldRow label="SENHA" htmlFor="password">
    <div className="relative">
      <input id="password" type={showPassword ? "text" : "password"} … className="…" />
      <button type="button" onClick={() => setShowPassword((v) => !v)} … >
        {showPassword ? <EyeOff /> : <Eye />}
      </button>
    </div>
  </FieldRow>

  {showMfa && (
    <FieldRow label="CÓDIGO MFA" htmlFor="mfa">
      <input id="mfa" type="text" inputMode="numeric" autoComplete="one-time-code" … />
    </FieldRow>
  )}

  {error && <ErrorBanner>{error}</ErrorBanner>}

  <SubmitButton submitting={submitting} />
</form>
```

**Espaçamentos**: `mt-14` antes do form, `space-y-9` entre os campos.

### 5.4 Classe completa do `<input>` (idêntica para email/senha/MFA, com pequenas variações)

#### Email

```html
class="w-full rounded-md border border-blue-200 bg-blue-50/40 px-4 py-3 text-base text-slate-900
transition outline-none placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2
focus:ring-blue-600/25"
```

#### Senha (mesmo, mas `pr-14 pl-4` no lugar de `px-4` para o botão olho)

```html
class="w-full rounded-md border border-blue-200 bg-blue-50/40 py-3 pr-14 pl-4 text-base
text-slate-900 transition outline-none placeholder:text-slate-400 focus:border-blue-600
focus:bg-white focus:ring-2 focus:ring-blue-600/25"
```

#### MFA (mesmo, com `tracking-[0.5em]` para espaçar os dígitos)

```html
class="w-full rounded-md border border-blue-200 bg-blue-50/40 px-4 py-3 text-base tracking-[0.5em]
text-slate-900 transition outline-none placeholder:tracking-normal placeholder:text-slate-400
focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/25"
```

Decodificando:

| Token Tailwind                        | Resultado                       |
| ------------------------------------- | ------------------------------- |
| `rounded-md`                          | `border-radius: 6px`            |
| `border border-blue-200`              | borda 1px `#bfdbfe`             |
| `bg-blue-50/40`                       | fundo `rgba(239,246,255,0.4)`   |
| `px-4 py-3`                           | padding 16/12px                 |
| `text-base`                           | `font-size: 16px`               |
| `text-slate-900`                      | `#0f172a`                       |
| `placeholder:text-slate-400`          | placeholder `#94a3b8`           |
| `focus:border-blue-600`               | borda `#2563eb` no foco         |
| `focus:bg-white`                      | clareia o fundo no foco         |
| `focus:ring-2 focus:ring-blue-600/25` | halo `rgba(37,99,235,0.25)` 2px |

### 5.5 Botão de toggle do "olho" (Eye / EyeOff)

```tsx
<button
  type="button"
  onClick={() => setShowPassword((v) => !v)}
  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
  aria-pressed={showPassword}
  className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition hover:text-blue-700 focus:text-blue-700 focus:outline-none"
>
  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
</button>
```

- Posicionamento: `absolute top-1/2 right-3 -translate-y-1/2` (centro vertical
  - 12px de margem direita).
- Tamanho do ícone: `20×20`.
- Hover/focus: `text-blue-700`.
- Acessibilidade: `aria-label` dinâmico + `aria-pressed`.

### 5.6 Banner de erro

```tsx
{
  error && (
    <p
      role="alert"
      className="flex items-start gap-3 border-l-2 border-rose-500 bg-rose-50/60 py-3 pl-4 text-sm text-rose-700"
    >
      <span className="mt-0.5 font-mono text-[10px] tracking-[0.32em] text-rose-700/70">ERRO</span>
      <span className="text-rose-700">{error}</span>
    </p>
  );
}
```

| Atributo       | Valor                                         |
| -------------- | --------------------------------------------- |
| Borda esquerda | `2px solid rose-500` (`#f43f5e`)              |
| Fundo          | `bg-rose-50/60` = `rgba(255,241,242,0.6)`     |
| Padding        | `py-3 pl-4` (sem `pr` — encosta no fim)       |
| Tag "ERRO"     | mono `10px` `tracking-[0.32em]` `rose-700/70` |
| Mensagem       | `text-sm text-rose-700`                       |

### 5.7 Link inferior "SEM ACESSO?"

```tsx
<p className="mt-10 font-mono text-[10px] tracking-[0.32em] text-slate-500">
  SEM ACESSO?&nbsp;&nbsp;
  <Link
    href="/register"
    className="text-slate-900 underline-offset-[6px] transition hover:text-blue-700 hover:underline"
  >
    CRIAR CONTA
  </Link>
</p>
```

- Mesmo padrão tipográfico da microtipografia geral (mono / 10px / tracking
  0.32em / slate-500).
- O link **CRIAR CONTA** é `slate-900` por padrão e ganha sublinhado com
  `underline-offset-[6px]` no hover, virando `blue-700`.
- `mt-10` separa o parágrafo do form.

---

## 6. Componente `FieldRow`

Wrapper minimalista de um campo (label microtipográfico + filho):

```tsx
function FieldRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block font-mono text-[10px] tracking-[0.32em] text-slate-500"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
```

A label é **mono / 10px / tracking 0.32em / slate-500**, com margem inferior
de `8px` (`mb-2`).

---

## 7. Botão de envio (com sweep gradient)

A peça mais "marca" da tela: caixa preta com **sweep diagonal azul** no hover.

```tsx
<button
  type="submit"
  disabled={submitting}
  className="group relative flex w-full items-center justify-between overflow-hidden rounded-sm bg-slate-900 px-6 py-4 text-left text-white transition focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
>
  {/* sweep que entra da esquerda no hover */}
  <span
    aria-hidden
    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-[#1e40af] via-[#2563eb] to-[#3b82f6] transition-transform duration-500 group-hover:translate-x-0"
  />

  <span className="relative z-10 font-mono text-[11px] tracking-[0.36em]">
    {submitting ? "ENTRANDO…" : "ENTRAR"}
  </span>
  <ArrowRight className="relative z-10 h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
</button>
```

| Token                                                  | Resultado                                  |
| ------------------------------------------------------ | ------------------------------------------ |
| `rounded-sm bg-slate-900 px-6 py-4`                    | Caixa preta `#0f172a`, raio 2px, pad 24/16 |
| `flex w-full items-center justify-between text-left`   | Label à esquerda + seta à direita          |
| `overflow-hidden`                                      | Garante que o sweep fique contido          |
| Sweep: `-translate-x-full → 0 + duration-500`          | Cobre o botão da esquerda → direita        |
| Cores do sweep                                         | `#1e40af → #2563eb → #3b82f6`              |
| Label `font-mono text-[11px] tracking-[0.36em]`        | "ENTRAR" em mono uppercase                 |
| Seta `h-4 w-4` + `group-hover:translate-x-1`           | Translate sutil de 4px no hover            |
| `focus:ring-2 focus:ring-blue-700 focus:ring-offset-2` | Halo de foco                               |
| `disabled:cursor-not-allowed disabled:opacity-60`      | Estado disabled durante o submit           |

**Texto enquanto submetendo**: `ENTRANDO…` (com reticências unicode `…`).

---

## 8. Estados e fluxos

### 8.1 useState

```tsx
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);
const [mfaCode, setMfaCode] = useState("");
const [showMfa, setShowMfa] = useState(false);
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### 8.2 Redirecionamento se já logado

```tsx
useEffect(() => {
  if (!loading && session) router.replace("/dashboard");
}, [loading, session, router]);
```

### 8.3 Submit + tratamento de MFA

```tsx
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setError(null);
  setSubmitting(true);
  try {
    await login(email.trim(), password, showMfa ? mfaCode.trim() : undefined);
    router.replace("/dashboard");
  } catch (err: unknown) {
    const apiErr = err as ApiError;
    const code = apiErr?.code;
    const msg = errorMessage(err, "Falha ao entrar");
    if (code === "UNAUTHORIZED" && /mfa/i.test(msg)) {
      setShowMfa(true);
      setError("Informe o código MFA para continuar.");
    } else {
      setError(msg);
    }
  } finally {
    setSubmitting(false);
  }
};

function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "error" in err) {
    return String((err as ApiError).error) || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
```

Resumo:

1. Tenta logar com email/senha (e MFA se já estiver visível).
2. Se a API responder `code: "UNAUTHORIZED"` com mensagem contendo "mfa", o
   campo MFA é revelado e o usuário tenta de novo com o código.
3. Qualquer outro erro vira mensagem no banner rosa.
4. Sucesso → `router.replace("/dashboard")`.

---

## 9. Tabela completa de tokens utilizados

### 9.1 Cores

| Token Tailwind           | Hex                  | Onde aparece                                  |
| ------------------------ | -------------------- | --------------------------------------------- |
| `slate-900`              | `#0f172a`            | Tinta principal, botão submit                 |
| `slate-500`              | `#64748b`            | Microtipografia, parágrafos                   |
| `slate-400`              | `#94a3b8`            | Placeholder, ícone do toggle olho             |
| `blue-700`               | `#1d4ed8`            | Hover de links, "login." display, focus halo  |
| `blue-600`               | `#2563eb`            | Borda de input no foco, sweep gradient        |
| `blue-500`               | `#3b82f6`            | Final do sweep gradient                       |
| `blue-400`               | `#60a5fa`            | Sparkline                                     |
| `blue-200`               | `#bfdbfe`            | Borda dos inputs (estado normal)              |
| `blue-50`                | `#eff6ff`            | Fundo dos inputs (40% opacity)                |
| `blue-800`               | `#1e40af`            | Início do sweep gradient + gradient do painel |
| `indigo-500` (`#6366f1`) | `rgba(99,102,241,…)` | Glow inferior esquerdo do painel              |
| `emerald-400`            | `#34d399`            | Bullet "ATIVO"                                |
| `rose-500`               | `#f43f5e`            | Borda esquerda do banner de erro              |
| `rose-700`               | `#be123c`            | Texto do banner de erro                       |
| `rose-50`                | `#fff1f2`            | Fundo do banner de erro (60% opacity)         |
| `white`                  | `#ffffff`            | Painel direito; tinta do painel esquerdo      |

### 9.2 Tipografia — mapa de uso

| Onde                                 | Família        | Tamanho | Peso      | Tracking      |
| ------------------------------------ | -------------- | ------- | --------- | ------------- |
| Display "Jerônimo / da Veiga"        | Outfit (sans)  | 72px    | 600 / 300 | `tight`       |
| Display "Faça seu / login."          | Outfit (sans)  | 56–64px | 600 / 300 | `tight`       |
| Parágrafos                           | Outfit (sans)  | 16px    | 400       | normal        |
| Microlabels (form, header, footer)   | JetBrains Mono | 10–11px | 400/500   | `0.32–0.36em` |
| MFA input (dígitos)                  | Outfit (sans)  | 16px    | 400       | `0.5em`       |
| Botão submit                         | JetBrains Mono | 11px    | 400       | `0.36em`      |
| "JV" do brand-mark (painel esquerdo) | Outfit (sans)  | 15px    | 600       | normal        |

### 9.3 Espaçamentos verticais (mobile-first)

| Local                           | Espaço               |
| ------------------------------- | -------------------- |
| Padding da `<section>` form     | `py-10` → `lg:py-12` |
| Bloco central (form col)        | `py-16`              |
| Subtítulo após display          | `mt-6`               |
| Form após subtítulo             | `mt-14`              |
| Entre campos do form            | `space-y-9`          |
| Label → input                   | `mb-2`               |
| "SEM ACESSO?" após botão        | `mt-10`              |
| Painel esquerdo: header→display | `pt-10` + `py-10`    |
| Sparkline após parágrafo        | `mt-12`              |
| Régua + label após display      | `mt-9`               |
| Parágrafo após régua            | `mt-7`               |

### 9.4 Iconografia (lucide-react)

| Ícone        | Onde                 | Tamanho        | strokeWidth |
| ------------ | -------------------- | -------------- | ----------- |
| `ArrowRight` | Header "CRIAR CONTA" | `h-3 w-3` (12) | default     |
| `ArrowRight` | Botão submit         | `h-4 w-4` (16) | default     |
| `Eye`        | Toggle senha (off)   | `h-5 w-5` (20) | default     |
| `EyeOff`     | Toggle senha (on)    | `h-5 w-5` (20) | default     |

---

## 10. Código-fonte completo

Para colar diretamente em outro projeto. Ajuste os imports de `next/link`,
`useRouter` e `useAuth` conforme seu stack.

### 10.1 `EditorialPanel.tsx`

```tsx
export function EditorialPanel() {
  return (
    <aside
      className="relative hidden overflow-hidden text-white lg:col-span-5 lg:flex lg:flex-col"
      style={{
        background:
          "radial-gradient(900px 320px at 85% -30%, rgba(255,255,255,0.18), transparent 60%), radial-gradient(700px 280px at 0% 110%, rgba(99,102,241,0.35), transparent 60%), linear-gradient(135deg, #1e40af 0%, #2563eb 55%, #3b82f6 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "linear-gradient(to right, white 1px, transparent 1px)",
          backgroundSize: "84px 100%",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "100% 200px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
        style={{
          background: "radial-gradient(closest-side, rgba(59,130,246,0.55), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
        style={{
          background: "radial-gradient(closest-side, rgba(99,102,241,0.4), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>\")",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-12 pt-10">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-sm border border-white/25 bg-white/10 font-sans text-[15px] font-semibold text-white"
          >
            JV
          </div>
          <div className="font-mono text-[10px] tracking-[0.36em] text-white/55">
            JDV &nbsp;·&nbsp; PAINEL COMERCIAL
          </div>
        </div>
        <div className="flex items-center gap-2.5 font-mono text-[10px] tracking-[0.36em] text-white/55">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          ATIVO
        </div>
      </header>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-12 py-10">
        <h2 className="font-sans text-[72px] leading-[0.95] tracking-tight text-white">
          <span className="font-semibold">Jerônimo</span>
          <span className="block font-light text-white/90">da Veiga</span>
        </h2>
        <div className="mt-9 flex items-center gap-4">
          <div className="h-px w-16 bg-white/35" />
          <p className="font-mono text-[10px] tracking-[0.36em] text-white/55">
            PAINEL DO COMERCIAL
          </p>
        </div>
        <p className="mt-7 max-w-md text-base leading-relaxed text-white/75">
          Acompanhe metas, funil e performance comercial em tempo real, com a precisão de quem
          decide pelo número.
        </p>
        <div className="mt-12 flex items-end gap-6">
          <svg
            aria-hidden
            viewBox="0 0 480 80"
            className="h-14 w-full max-w-md text-blue-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M0,62 C32,58 52,52 84,48 C118,44 138,60 174,52 C212,44 238,18 276,22 C312,26 338,52 374,42 C406,34 438,18 480,10"
              opacity="0.85"
            />
            <path
              d="M0,72 C40,70 60,66 96,62 C140,58 160,68 196,64 C238,60 262,42 304,46 C342,50 372,62 408,56 C432,52 460,40 480,32"
              opacity="0.35"
            />
            <circle cx="480" cy="10" r="3.2" fill="currentColor" />
          </svg>
        </div>
      </div>

      <footer className="relative z-10 flex items-end justify-end px-12 pb-10">
        <div className="flex items-center gap-4 font-mono text-[10px] tracking-[0.36em] text-white/40">
          <span>v 1.0</span>
          <span className="h-3 w-px bg-white/20" />
          <span>BI · COMERCIAL</span>
        </div>
      </footer>
    </aside>
  );
}
```

### 10.2 `LoginPage.tsx`

```tsx
"use client";

import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth";
import type { ApiError } from "@/lib/auth";

import { EditorialPanel } from "../_components/editorial-panel";

function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "error" in err) {
    return String((err as ApiError).error) || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export default function LoginPage() {
  const { login, session, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [showMfa, setShowMfa] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) router.replace("/dashboard");
  }, [loading, session, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password, showMfa ? mfaCode.trim() : undefined);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const code = apiErr?.code;
      const msg = errorMessage(err, "Falha ao entrar");
      if (code === "UNAUTHORIZED" && /mfa/i.test(msg)) {
        setShowMfa(true);
        setError("Informe o código MFA para continuar.");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-svh grid-cols-1 bg-white text-slate-900 lg:grid-cols-12">
      <EditorialPanel />

      <section className="relative flex flex-col px-6 py-10 sm:px-12 lg:col-span-7 lg:px-16 lg:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(to right, rgba(15,23,42,0.04) 1px, transparent 1px)",
            backgroundSize: "120px 100%",
          }}
        />

        <header className="relative z-10 flex items-center justify-between">
          <Link
            href="/"
            className="font-mono text-[10px] tracking-[0.32em] text-slate-500 transition hover:text-slate-900"
          >
            ACESSO &nbsp;/&nbsp; ENTRAR
          </Link>
          <Link
            href="/register"
            className="group flex items-center gap-2 font-mono text-[10px] tracking-[0.32em] text-slate-500 transition hover:text-blue-700"
          >
            CRIAR CONTA
            <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" aria-hidden />
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-16">
          <h1 className="font-sans text-[56px] leading-[1] font-semibold tracking-tight text-slate-900 sm:text-[64px]">
            Faça seu
            <span className="block font-light text-blue-700">login.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-slate-500">
            Use suas credenciais para entrar no painel. Os dados refletem em tempo real o funil, as
            metas e a performance comercial.
          </p>

          <form onSubmit={handleSubmit} className="mt-14 space-y-9">
            <FieldRow label="E-MAIL" htmlFor="email">
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-blue-200 bg-blue-50/40 px-4 py-3 text-base text-slate-900 transition outline-none placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/25"
                placeholder="voce@empresa.com"
              />
            </FieldRow>

            <FieldRow label="SENHA" htmlFor="password">
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-blue-200 bg-blue-50/40 py-3 pr-14 pl-4 text-base text-slate-900 transition outline-none placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/25"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition hover:text-blue-700 focus:text-blue-700 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden />
                  )}
                </button>
              </div>
            </FieldRow>

            {showMfa && (
              <FieldRow label="CÓDIGO MFA" htmlFor="mfa">
                <input
                  id="mfa"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="w-full rounded-md border border-blue-200 bg-blue-50/40 px-4 py-3 text-base tracking-[0.5em] text-slate-900 transition outline-none placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/25"
                  placeholder="000000"
                />
              </FieldRow>
            )}

            {error && (
              <p
                role="alert"
                className="flex items-start gap-3 border-l-2 border-rose-500 bg-rose-50/60 py-3 pl-4 text-sm text-rose-700"
              >
                <span className="mt-0.5 font-mono text-[10px] tracking-[0.32em] text-rose-700/70">
                  ERRO
                </span>
                <span className="text-rose-700">{error}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="group relative flex w-full items-center justify-between overflow-hidden rounded-sm bg-slate-900 px-6 py-4 text-left text-white transition focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-[#1e40af] via-[#2563eb] to-[#3b82f6] transition-transform duration-500 group-hover:translate-x-0"
              />
              <span className="relative z-10 font-mono text-[11px] tracking-[0.36em]">
                {submitting ? "ENTRANDO…" : "ENTRAR"}
              </span>
              <ArrowRight
                className="relative z-10 h-4 w-4 transition group-hover:translate-x-1"
                aria-hidden
              />
            </button>
          </form>

          <p className="mt-10 font-mono text-[10px] tracking-[0.32em] text-slate-500">
            SEM ACESSO?&nbsp;&nbsp;
            <Link
              href="/register"
              className="text-slate-900 underline-offset-[6px] transition hover:text-blue-700 hover:underline"
            >
              CRIAR CONTA
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function FieldRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block font-mono text-[10px] tracking-[0.32em] text-slate-500"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
```

---

## Checklist de paridade

Use este checklist depois de portar:

- [ ] Fontes Outfit + JetBrains Mono carregando como `--font-outfit` e `--font-jetbrains`
- [ ] `min-h-svh` e `bg-white text-slate-900` no `<main>`
- [ ] Painel esquerdo aparece somente em `≥ 1024px` (`hidden lg:flex`)
- [ ] Gradient base do painel: `135deg, #1e40af → #2563eb (55%) → #3b82f6`
- [ ] Glow superior direito: `520×520`, blur-3xl, `rgba(59,130,246,0.55)`, opacity 50
- [ ] Glow inferior esquerdo: `420×420`, blur-3xl, `rgba(99,102,241,0.4)`, opacity 30
- [ ] Grade vertical (84px) + horizontal (200px) no painel, opacity 0.06 / 0.05
- [ ] Grain SVG (`feTurbulence baseFrequency 0.85`), `mix-blend-overlay`, opacity 0.07
- [ ] "Jerônimo" 600 + "da Veiga" 300, 72px, leading 0.95, tracking-tight
- [ ] Sparkline `text-blue-400`, strokeWidth 1.25, dois paths (0.85 + 0.35) + circle 3.2 no fim
- [ ] Bullet "ATIVO" com `animate-ping` em emerald-400
- [ ] "v 1.0 · BI · COMERCIAL" no rodapé do painel, mono / 10px / opacity 40
- [ ] Coluna direita com grade vertical de 120px em `rgba(15,23,42,0.04)`
- [ ] Header "ACESSO / ENTRAR" ↔ "CRIAR CONTA →"
- [ ] Display "Faça seu / login." 56px (mobile) → 64px (≥640px), segunda linha em `font-light text-blue-700`
- [ ] Inputs com `border-blue-200 bg-blue-50/40` → focus `border-blue-600 bg-white ring-blue-600/25`
- [ ] Toggle Eye/EyeOff `h-5 w-5`, posicionado `right-3 top-1/2 -translate-y-1/2`
- [ ] MFA input com `tracking-[0.5em]` e `inputMode="numeric"`
- [ ] Banner de erro: borda esquerda rose-500 2px, fundo rose-50/60, tag "ERRO" mono uppercase
- [ ] Botão submit preto com sweep gradient `#1e40af → #2563eb → #3b82f6`, label mono 11px tracking 0.36em
- [ ] "SEM ACESSO? · CRIAR CONTA" com underline-offset-[6px] no hover
- [ ] Submit altera label para "ENTRANDO…" e desabilita o botão (opacity 60)
- [ ] Fluxo MFA: erro UNAUTHORIZED contendo "mfa" abre o campo MFA e exibe a mensagem
- [ ] Redireciona para `/dashboard` ao detectar sessão ativa
