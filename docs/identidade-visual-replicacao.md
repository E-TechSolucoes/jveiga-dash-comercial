# Identidade Visual — Painel do Comercial · JDV

Guia completo para replicar a identidade visual deste dashboard em outro projeto.
Mantém a paleta, tipografia, ritmo de espaçamento, sombras, raios e o vocabulário
de componentes (KPI, cascata, tabs com acentos, chips, toast, etc.).

> Este documento é **agnóstico ao backend** e ao agrupamento de rotas Next.js.
> Você pode aplicar todo o sistema mesmo em React puro (Vite, Remix, Astro+React)
> ou continuar dentro do Next.js. As classes CSS estão centralizadas em
> [`src/app/globals.css`](../src/app/globals.css) e o markup é todo classe-CSS
> simples — não há dependência de Tailwind utilities para a identidade visual
> (Tailwind é incluído pelo `@import "tailwindcss"` mas o design system é CSS
> custom com variáveis).

---

## Sumário

- [1. Stack mínima](#1-stack-mínima)
- [2. Setup de fontes](#2-setup-de-fontes)
- [3. Design tokens (CSS variables)](#3-design-tokens-css-variables)
- [4. Estrutura macro da página](#4-estrutura-macro-da-página)
- [5. Header azul (`.dash-head`)](#5-header-azul-dash-head)
- [6. Filtros, chips e barra de progresso/XP](#6-filtros-chips-e-barra-de-progressoxp)
- [7. Tabs com acentos coloridos](#7-tabs-com-acentos-coloridos)
- [8. Cards KPI (padrão + hero)](#8-cards-kpi-padrão--hero)
- [9. Card de Cascata (funil)](#9-card-de-cascata-funil)
- [10. Seções secundárias e cartões temáticos](#10-seções-secundárias-e-cartões-temáticos)
- [11. Toast](#11-toast)
- [12. Responsividade](#12-responsividade)
- [13. Checklist de replicação](#13-checklist-de-replicação)
- [14. Footer](#14-footer)

---

## 1. Stack mínima

| Dependência    | Versão usada                       | Para quê                                |
| -------------- | ---------------------------------- | --------------------------------------- |
| Next.js        | 16.2.4                             | App Router, fonts, layout               |
| React          | 19.2.x                             | Componentes                             |
| Tailwind CSS   | v4 (`@import "tailwindcss"`)       | Reset + utilitários ocasionais          |
| `lucide-react` | atual                              | Todos os ícones — strokeWidth 1.75–2.25 |
| Fontes Google  | Outfit / Fraunces / JetBrains Mono | Tipografia                              |

> **Importante:** A identidade visual **não depende** de Tailwind. Se for
> portar para outro stack (Remix, Vite, etc.), basta copiar `globals.css` e
> remover/ajustar a linha `@import "tailwindcss";`. O reset (`* { box-sizing }`,
> scrollbar, `html/body`) já está dentro do `globals.css`.

```bash
npm i next@16 react@19 react-dom@19 lucide-react
npm i -D tailwindcss@4 @tailwindcss/postcss
```

---

## 2. Setup de fontes

Três famílias declaradas via `next/font/google` em
[`src/app/layout.tsx`](../src/app/layout.tsx):

```tsx
import { Fraunces, JetBrains_Mono, Outfit } from "next/font/google";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export default function RootLayout({ children }) {
  return (
    <html
      lang="pt-BR"
      className={`${outfit.variable} ${fraunces.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
```

| Família            | Var CSS            | Uso                                            |
| ------------------ | ------------------ | ---------------------------------------------- |
| **Outfit**         | `--font-outfit`    | Default — todo texto, números (`tabular-nums`) |
| **Fraunces**       | `--font-fraunces`  | Reservado para títulos editoriais              |
| **JetBrains Mono** | `--font-jetbrains` | Tabelas/códigos quando necessário              |

`html, body` aplicam: `font-size: 14px`, `line-height: 1.55`,
`-webkit-font-smoothing: antialiased`, `font-feature-settings: "ss01", "cv11"`.

**Em outro stack** (sem `next/font`): inclua o `<link>` do Google Fonts e defina
manualmente `--font-outfit: "Outfit", system-ui, sans-serif;` etc.

---

## 3. Design tokens (CSS variables)

Bloco mestre que abre [`src/app/globals.css`](../src/app/globals.css). **Copie
este bloco como ponto de partida** — toda a identidade visual decorre dele.

```css
:root {
  /* ----- Neutros (tom de tinta) ----- */
  --ink: #0f172a; /* texto principal */
  --ink-soft: #334155; /* texto secundário */
  --ink-mute: #64748b; /* labels, sub-textos */
  --ink-dim: #94a3b8; /* placeholders, separadores */

  /* ----- Superfícies ----- */
  --bg: #eef3fa; /* fundo da página (azul-cinza muito claro) */
  --card: #ffffff;
  --line: #e9edf4; /* bordas padrão */
  --line-soft: #f1f4f9; /* bordas/fundos suaves */
  --line-strong: #d8dfe9; /* hover de bordas */

  /* ----- Acentos (escala 50/600/700) ----- */
  --rose-50: #fff1f2;
  --rose-600: #fb7185;
  --rose-700: #be123c;
  --amber-50: #fff7ed;
  --amber-600: #fbbf24;
  --amber-700: #b45309;
  --emerald-50: #ecfdf5;
  --emerald-600: #34d399;
  --emerald-700: #047857;
  --blue-50: #eff6ff;
  --blue-100: #dbeafe;
  --blue-600: #3b82f6;
  --blue-700: #1d4ed8;
  --blue-800: #1e40af;
  --violet-50: #f5f3ff;
  --violet-600: #a78bfa;
  --violet-700: #6d28d9;
  --sky-50: #f0f9ff;
  --sky-600: #38bdf8;
  --teal-50: #f0fdfa;
  --teal-600: #2dd4bf;
  --teal-700: #0f766e;
  --pink-50: #fdf2f8;
  --pink-600: #ec4899;
  --pink-700: #be185d;

  /* ----- Raios ----- */
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;

  /* ----- Sombras ----- */
  --shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-sm: 0 4px 12px rgba(15, 23, 42, 0.04);
  --shadow-md: 0 10px 28px -12px rgba(15, 23, 42, 0.18);
}
```

Bridge para Tailwind v4 (opcional — só se quiser usar `bg-background`):

```css
@theme inline {
  --color-background: var(--bg);
  --color-foreground: var(--ink);
  --font-sans: var(--font-outfit);
  --font-serif: var(--font-fraunces);
  --font-mono: var(--font-jetbrains);
}
```

Reset / base:

```css
* {
  box-sizing: border-box;
}

html,
body {
  background: var(--bg);
  color: var(--ink);
  font-family:
    var(--font-outfit),
    "Outfit",
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  font-feature-settings: "ss01", "cv11";
}

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
```

### Convenções de uso

- **Atributos `data-accent`** dirigem variantes coloridas em vez de classes
  separadas: `<article class="kpi" data-accent="blue">`. Suporta:
  `blue | violet | amber | emerald | rose | sky | teal | pink`.
- **Atributos `data-st`** marcam status semântico em estágios/insights:
  `ok | warn | bad`.
- **Números** sempre usam `font-variant-numeric: tabular-nums` (alinhamento de
  colunas em tabelas/KPI).
- **Letter-spacing negativo** em headings: `-0.01em` a `-0.025em`.

---

## 4. Estrutura macro da página

```html
<div class="app">
  <!-- gradient sutil de fundo -->
  <div class="shell">
    <!-- container max-width 1440px -->
    <div class="dash-head">
      <!-- header azul (panel) -->
      <header class="topbar">…</header>
      <div class="chips">…</div>
    </div>

    <div class="progress-strip">…</div>
    <!-- XP / nível -->
    <div class="tabs">…</div>
    <!-- nav com acentos -->

    <div class="tc" data-active="true">
      <!-- conteúdo da aba ativa -->
      <section class="cascade">…</section>
      <div class="section-head">…</div>
      <div class="kpi-row">…</div>
    </div>
  </div>
</div>
```

CSS de fundação:

```css
.app {
  min-height: 100vh;
  background:
    radial-gradient(1200px 600px at 85% -10%, rgba(59, 130, 246, 0.04), transparent 70%),
    radial-gradient(900px 500px at -10% 0%, rgba(167, 139, 250, 0.035), transparent 70%), var(--bg);
}
.shell {
  max-width: 1440px;
  margin: 0 auto;
  padding: 26px 28px 48px;
}
```

> O fundo da página recebe **dois radial-gradients** sutis (azul no topo
> direito, violeta no topo esquerdo) sobre o `--bg`. Esse é o "ar" do design.

### Animação de transição entre abas

```css
.tc {
  display: none;
}
.tc[data-active="true"] {
  display: block;
  animation: fadeUp 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 5. Header azul (`.dash-head`)

A "cara" do painel é o header **#1226aa** que invade as bordas laterais
(margem negativa) e fecha em raio inferior 24px. Tudo dentro herda branco.

```css
.dash-head {
  position: relative;
  margin: -26px 0 26px; /* compensa o padding do .shell */
  padding: 24px 28px 18px;
  background: #1226aa; /* AZUL DA MARCA */
  color: #fff;
  border-radius: 0 0 24px 24px;
  overflow: hidden;
}

/* Brand */
.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.dash-head .brand-title {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.015em;
}
.dash-head .brand-sub {
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  margin-top: 2px;
}

/* Avatar com gradiente clarinho dentro do header azul */
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.01em;
}
.dash-head .avatar {
  background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
  color: var(--blue-700);
  box-shadow:
    0 6px 14px -4px rgba(15, 23, 42, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
```

### Markup mínimo do header

```tsx
<div className="dash-head">
  <header className="topbar">
    <div className="topbar-row">
      <div className="brand">
        <div className="avatar" aria-hidden>
          JV
        </div>
        <div>
          <div className="brand-title">Painel do Comercial</div>
          <div className="brand-sub">JERÔNIMO DA VEIGA · JVENDAS</div>
        </div>
      </div>
      {/* botão de avatar/menu fica à direita */}
    </div>

    <div className="topbar-filters">
      <select className="select">…</select>
      <select className="select">…</select>
      <div className="date-pill">
        <Calendar size={15} strokeWidth={2} />
        <span>01/03/2026 → 31/03/2026</span>
      </div>
      <input className="input" placeholder="Nome do Comercial" />
    </div>
  </header>

  <div className="chips">
    <span className="chip chip--active">Semana 17 do ano</span>
    <span className="chip chip--accent">
      <Swords size={14} /> Skins <span className="chip-count">1/7</span>
    </span>
    <span className="chip">
      <Target size={14} /> Meta <span className="chip-count">3/8</span>
    </span>
  </div>
</div>
```

Detalhes que dão a "cor" certa aos selects/inputs **dentro** do header azul:

```css
.dash-head .select,
.dash-head .input,
.dash-head .date-pill {
  background-color: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.22);
  color: #fff;
}
.dash-head .input::placeholder {
  color: rgba(255, 255, 255, 0.65);
}
.dash-head .select:focus-visible,
.dash-head .input:focus-visible {
  border-color: #fff;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.18);
}
```

---

## 6. Filtros, chips e barra de progresso/XP

### `.select`, `.input`, `.date-pill` (versão default sobre fundo branco)

```css
.select {
  appearance: none;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 9px 36px 9px 14px;
  color: var(--ink);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  /* chevron embutido em SVG inline */
  background-image: url("data:image/svg+xml;utf8,<svg ...><polyline points='6 9 12 15 18 9'/></svg>");
  background-repeat: no-repeat;
  background-position: right 12px center;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.select:focus-visible {
  border-color: var(--blue-600);
  box-shadow: 0 0 0 3px var(--blue-50);
}

.input {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 9px 14px;
  color: var(--ink);
  font-size: 13px;
  font-weight: 500;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.input:focus-visible {
  border-color: var(--blue-600);
  box-shadow: 0 0 0 3px var(--blue-50);
}

.date-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 9px 14px;
  font-size: 13px;
  color: var(--ink-soft);
}
.date-pill svg {
  color: var(--blue-700);
}
```

Grid de filtros do header (12 colunas):

```css
.topbar-filters {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 10px;
}
.topbar-filters > :nth-child(1) {
  grid-column: span 4;
}
.topbar-filters > :nth-child(2) {
  grid-column: span 2;
}
.topbar-filters > :nth-child(3) {
  grid-column: span 3;
}
.topbar-filters > :nth-child(4) {
  grid-column: span 3;
}
```

### Chips

```css
.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 22px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--ink-soft);
}
.chip .chip-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--line-soft);
  color: var(--ink);
  font-size: 11px;
  font-weight: 600;
}
.chip--active {
  background: var(--blue-600);
  border-color: var(--blue-600);
  color: #fff;
  box-shadow: 0 6px 14px -6px rgba(37, 99, 235, 0.55);
}
.chip--accent {
  background: var(--amber-50);
  border-color: #fde68a;
  color: var(--amber-700);
}
```

### Strip de XP / Nível

```tsx
<div className="progress-strip">
  <div className="lvl">
    <Flame size={14} strokeWidth={2} /> Nível
    <span className="lvl-badge">3</span>
  </div>
  <div className="bar">
    <span style={{ width: "42%" }} />
  </div>
  <div className="pct">42%</div>
</div>
```

```css
.progress-strip {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  margin-bottom: 22px;
}
.progress-strip .lvl-badge {
  min-width: 26px;
  height: 22px;
  padding: 0 8px;
  border-radius: 6px;
  background: var(--blue-50);
  color: var(--blue-700);
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.progress-strip .bar {
  flex: 1;
  height: 6px;
  background: var(--line-soft);
  border-radius: 999px;
  overflow: hidden;
}
.progress-strip .bar > span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--blue-600), var(--violet-600));
  border-radius: 999px;
  transition: width 0.5s ease;
}
.progress-strip .pct {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  min-width: 46px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
```

---

## 7. Tabs com acentos coloridos

Cada aba tem sua cor de identidade. Inativa, é cinza com o ícone colorido.
Ativa, fica em destaque com fundo translúcido e linha inferior coloridos.

```tsx
<div className="tabs" role="tablist">
  <button role="tab" aria-selected="true" className="tab" data-accent="blue">
    <LayoutDashboard size={16} strokeWidth={2.25} /> Resumo
  </button>
  <button role="tab" className="tab" data-accent="emerald">
    <CheckCircle2 size={16} strokeWidth={1.75} /> A Fazer
  </button>
  {/* … */}
</div>
```

Mapa de acentos usados na navegação:

| Aba          | accent    |
| ------------ | --------- |
| Resumo       | `blue`    |
| A Fazer      | `emerald` |
| Recepção     | `violet`  |
| Pastas       | `amber`   |
| Armas        | `rose`    |
| Outbound     | `sky`     |
| Imobiliárias | `teal`    |
| Conhecimento | `pink`    |

```css
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  border-bottom: 1px solid var(--line);
  padding: 0 2px;
  margin-bottom: 24px;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink-mute);
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  margin-bottom: -1px;
  cursor: pointer;
  transition:
    color 0.15s,
    background-color 0.15s,
    border-color 0.15s;
}
.tab:hover {
  color: var(--ink-soft);
  background: rgba(15, 23, 42, 0.04);
}
.tab[aria-selected="true"] {
  font-weight: 600;
}
.tab svg {
  transition: transform 0.15s ease;
}
.tab:hover svg {
  transform: scale(1.08);
}

/* Ícone com cor mesmo na aba inativa */
.tab[data-accent="blue"] svg {
  color: #3b82f6;
}
.tab[data-accent="emerald"] svg {
  color: #10b981;
}
.tab[data-accent="violet"] svg {
  color: #8b5cf6;
}
.tab[data-accent="amber"] svg {
  color: #f59e0b;
}
.tab[data-accent="rose"] svg {
  color: #f43f5e;
}
.tab[data-accent="sky"] svg {
  color: #0ea5e9;
}
.tab[data-accent="teal"] svg {
  color: #14b8a6;
}
.tab[data-accent="pink"] svg {
  color: #ec4899;
}

/* Aba ativa: texto + fundo translúcido + border-bottom colorida */
.tab[aria-selected="true"][data-accent="blue"] {
  color: #1d4ed8;
  background: rgba(59, 130, 246, 0.12);
  border-bottom-color: #3b82f6;
}
/* repita o padrão para os outros 7 acentos — ver globals.css linhas 589–628 */
```

---

## 8. Cards KPI (padrão + hero)

KPI = bloco branco arredondado, com **barra fina colorida no topo** (`::before`),
ícone à esquerda em "icon-box" tonalizado, número grande em tabular-nums,
label e sub-texto.

### Estrutura

```tsx
<div className="kpi-row">
  <article className="kpi" data-accent="blue">
    <div className="kpi-head">
      <div className="icon-box">
        <Radio />
      </div>
      <span className="status-dot" aria-hidden />
    </div>
    <div className="kpi-val">1.284</div>
    <div className="kpi-label">Leads</div>
    <div className="kpi-sub">Captados no período</div>
  </article>

  {/* Hero: card de destaque com gradiente verde-teal */}
  <article className="kpi kpi-hero">
    <div className="kpi-head">
      <div className="icon-box">
        <Trophy />
      </div>
      <span className="status-dot" aria-hidden />
    </div>
    <div className="kpi-val">
      7<span className="muted">/ 24</span>
    </div>
    <div className="kpi-label">Vendas</div>
    <div className="kpi-sub">29% do histórico (Reservas) · meta 8: 87%</div>
  </article>
</div>
```

### CSS

```css
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
@media (max-width: 1040px) {
  .kpi-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 560px) {
  .kpi-row {
    grid-template-columns: 1fr;
  }
}

.kpi {
  position: relative;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 18px 20px 20px;
  overflow: hidden;
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    border-color 0.2s;
}
.kpi::before {
  content: "";
  position: absolute;
  top: 0;
  left: 14px;
  right: 14px;
  height: 2.5px;
  border-radius: 0 0 4px 4px;
  background: var(--line);
  transition: background 0.2s;
}
.kpi:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
  border-color: var(--line-strong);
}

.kpi-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
}
.icon-box {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--line-soft);
  color: var(--ink-mute);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.icon-box svg {
  width: 20px;
  height: 20px;
  stroke-width: 1.75;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ink-dim);
  margin-top: 8px;
}

.kpi-val {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.025em;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.kpi-val .muted {
  font-size: 18px;
  font-weight: 500;
  color: var(--ink-dim);
}
.kpi-label {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink);
  margin-top: 10px;
}
.kpi-sub {
  font-size: 12px;
  color: var(--ink-mute);
  margin-top: 4px;
  line-height: 1.45;
}

/* Acento — repete o padrão "barra superior + icon-box + cor do número" */
.kpi[data-accent="blue"]::before {
  background: var(--blue-600);
}
.kpi[data-accent="blue"] .icon-box {
  background: var(--blue-50);
  color: var(--blue-700);
}
.kpi[data-accent="blue"] .status-dot {
  background: var(--blue-600);
}
.kpi[data-accent="blue"] .kpi-val {
  color: var(--blue-600);
}
/* faça o mesmo para rose, amber, emerald, violet, sky — globals.css linhas 813–895 */

/* Hero (verde-teal, sem barra superior, com glow) */
.kpi-hero {
  position: relative;
  background: linear-gradient(140deg, #34d399 0%, #0d9488 100%);
  color: #fff;
  border-radius: var(--radius-md);
  padding: 18px 20px 20px;
  overflow: hidden;
  border: none;
}
.kpi-hero::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(200px 120px at 100% 0%, rgba(255, 255, 255, 0.22), transparent 65%),
    radial-gradient(240px 160px at 0% 100%, rgba(255, 255, 255, 0.08), transparent 65%);
  pointer-events: none;
}
.kpi-hero .icon-box {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}
.kpi-hero .kpi-val {
  color: #fff;
  font-size: 34px;
}
.kpi-hero .kpi-val .muted {
  color: rgba(255, 255, 255, 0.65);
  font-size: 20px;
}
.kpi-hero .kpi-label {
  color: rgba(255, 255, 255, 0.95);
}
.kpi-hero .kpi-sub {
  color: rgba(255, 255, 255, 0.7);
}
```

---

## 9. Card de Cascata (funil)

Bloco branco grande com **glow discreto** azul/verde no fundo, título com
"title-ico" colorido e linha de estágios separados por chevrons, cada um com
status-color (`ok | warn | bad`).

```tsx
<section className="cascade">
  <div className="cascade-head">
    <div>
      <div className="cascade-title">
        <span className="title-ico"><Target size={18} /></span>
        Cascata da Meta — Semana 1
      </div>
      <div className="cascade-sub">
        Conversões: 15% lead→visita · 20% visita→pasta · 50% pasta→venda
      </div>
    </div>
    <div className="meta-edit">
      <label>Meta de vendas</label>
      <input type="number" min={1} value={meta} onChange={…} />
    </div>
  </div>

  <div className="cascade-row">
    <Stage label="Leads"   real={120} target={200} />
    <div className="stage-arrow"><ChevronRight size={20} /></div>
    <Stage label="Visitas" real={ 24} target={ 30} />
    <div className="stage-arrow"><ChevronRight size={20} /></div>
    <Stage label="Pastas"  real={  6} target={ 10} />
    <div className="stage-arrow"><ChevronRight size={20} /></div>
    <Stage label="Vendas"  real={  3} target={  8} />
  </div>

  <div className="cascade-insight" data-st="warn">
    <ShieldAlert size={17} />
    <span>Atenção em <strong>visitas</strong>: faltam 6 para bater a meta</span>
  </div>
</section>
```

```css
.cascade {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 22px 24px 24px;
  margin-bottom: 18px;
  position: relative;
  overflow: hidden;
}
.cascade::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(600px 260px at 90% -50%, rgba(37, 99, 235, 0.06), transparent 60%),
    radial-gradient(500px 240px at 0% -20%, rgba(16, 185, 129, 0.05), transparent 65%);
  pointer-events: none;
}
.cascade > * {
  position: relative;
  z-index: 1;
}

.cascade-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -0.01em;
}
.cascade-title .title-ico {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--blue-50);
  color: var(--blue-700);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.cascade-row {
  display: grid;
  grid-template-columns: 1fr; /* mobile: empilhado */
  gap: 0;
  align-items: stretch;
}
@media (min-width: 760px) {
  .cascade-row {
    grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
  }
}

.stage {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}
.stage::before {
  content: "";
  position: absolute;
  top: 0;
  left: 16px;
  right: 16px;
  height: 2.5px;
  border-radius: 0 0 4px 4px;
  background: var(--line);
}
.stage[data-st="ok"]::before {
  background: var(--emerald-600);
}
.stage[data-st="warn"]::before {
  background: var(--amber-600);
}
.stage[data-st="bad"]::before {
  background: var(--rose-600);
}

/* o ícone, ponto, barra e status-text de cada stage trocam de cor por data-st —
   ver globals.css linhas 1136–1185 */

.cascade-insight {
  margin-top: 18px;
  padding: 14px 18px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid var(--line);
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 12px;
}
.cascade-insight[data-st="ok"] {
  background: var(--emerald-50);
  border-color: #bbf7d0;
  color: var(--emerald-700);
}
.cascade-insight[data-st="warn"] {
  background: var(--amber-50);
  border-color: #fde68a;
  color: var(--amber-700);
}
.cascade-insight[data-st="bad"] {
  background: var(--rose-50);
  border-color: #fecdd3;
  color: var(--rose-700);
}
```

A regra de cor do estágio é função simples do %:

```ts
function stageStatus(real: number, target: number) {
  const p = target > 0 ? (real / target) * 100 : 0;
  if (p >= 80) return "ok";
  if (p >= 50) return "warn";
  return "bad";
}
```

---

## 10. Seções secundárias e cartões temáticos

Padrões reutilizáveis. Toque a CSS-source para o detalhe.

### `.section-head` — cabeçalho de seção

```tsx
<div className="section-head">
  <div>
    <h2>
      <BarChart3 size={18} /> Funil do período
    </h2>
    <div className="sh-sub">Volume e conversão por etapa</div>
  </div>
  <div className="sh-meta">Período atual · 1.284 leads</div>
</div>
```

### `.regras-ouro` — card editorial com lista numerada

Fundo branco, glow âmbar/azul no canto, lista 2-col em desktop com numeração
em "pílula" amarela com gradiente — usado como assinatura de manifesto/regras.

```tsx
<section className="regras-ouro">
  <div className="regras-ouro-head">
    <span className="regras-ouro-ico">
      <ScrollText size={18} />
    </span>
    <div>
      <div className="regras-ouro-h1">Regras de Ouro</div>
      <div className="regras-ouro-sub">Os princípios inegociáveis…</div>
    </div>
  </div>
  <ol className="regras-ouro-list">
    <li className="regra-ouro-item">
      <span className="regra-ouro-num">1</span>
      <span className="regra-ouro-text">Lead não atendido = lead perdido. 3 minutos ⏰</span>
    </li>
    {/* … */}
  </ol>
</section>
```

### `.skin-unlock` — banner de gamificação

```css
.skin-unlock {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--violet-50), #fff);
  border: 1px solid #ddd6fe;
}
.skin-unlock[data-unlocked="true"] {
  background: linear-gradient(135deg, var(--emerald-50), #fff);
  border-color: #bbf7d0;
}
```

### `.val-strip` — strip de validação (ok/idle)

Card com **barra lateral de 4px** colorida (indicador de status) + ícone +
título/sub + botão verde de ação à direita.

```tsx
<div className="val-strip" data-state="idle">
  <div className="val-strip-left">
    <div className="val-strip-ico">
      <AlertCircle size={20} />
    </div>
    <div>
      <div className="val-strip-title">Aguardando validação do gestor</div>
      <div className="val-strip-sub">Entregue até sexta para liberar XP</div>
    </div>
  </div>
  <button className="val-btn">
    <CheckCircle2 size={15} /> Validar
  </button>
</div>
```

```css
.val-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 22px;
  background: linear-gradient(135deg, var(--emerald-600), #047857);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 600;
  box-shadow: 0 10px 20px -12px rgba(5, 150, 105, 0.6);
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}
.val-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 24px -12px rgba(5, 150, 105, 0.7);
}
```

### `.seg` — sub-tabs em pílula

Pílula branca com 4px de padding interno; o botão ativo recebe gradiente
colorido (`emerald | blue | violet | amber`) e sombra direcional.

```tsx
<div className="seg" role="tablist">
  <button className="seg-btn seg-btn--blue" aria-selected="true">
    Diário
  </button>
  <button className="seg-btn">Semanal</button>
  <button className="seg-btn">Mensal</button>
</div>
```

### `.info-banner` — aviso azul

```tsx
<div className="info-banner">
  <Info size={16} />
  <div>
    Algumas <strong>conversões históricas</strong> dependem de envio ao Sienge…
  </div>
</div>
```

### `.ck-card`, `.ck-item`, `.ck-progress` — checklist

Cards de checklist com checkbox arredondada, progresso animado em gradiente.
Item completo migra background para o tom do `data-accent` (`emerald | blue |
amber`) e aplica `text-decoration: line-through` colorido.

### `.prem-card` — cartão de premiação/categoria

Mesmo arquétipo do KPI (barra superior `::before`, hover translateY) com
"prem-valor" em pílula tonalizada (azul/âmbar/esmeralda/violeta).

### Botão padrão e outros menores

- `.icon-btn` — botão de 40×40 redondo branco (ou translúcido no header) com
  `dot` para badge de notificação.
- `.meta-edit` — pílula com label + input numérico embutido (azul).
- `.rk-pos`, `.nivel-badge` — chips de ranking/nível com `data-top="true"` ou
  `data-accent`.
- `.skins-grid` / `.sk-mini` — grid de skins desbloqueáveis (gradiente
  violeta→azul quando `data-state="unlocked"`).

---

## 11. Toast

Componente client-only renderizado em **portal no `<body>`**. Variantes
`success | error` (cor verde/vermelha), barra de progresso animada que decai
em `--toast-duration` ms.

```tsx
<Toast kind="success" message="Salvo!" durationMs={3000} onDismiss={…} />
```

Ver [`src/app/(dashboard)/dashboard/_components/toast.tsx`](<../src/app/(dashboard)/dashboard/_components/toast.tsx>).
A animação fica em `globals.css` na seção `.toast` (≈linha 2700+).

---

## 12. Responsividade

Breakpoints usados em todo o projeto:

| Breakpoint | Alvo                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| `≤ 1080px` | Tablet — `shell` reduz padding, filtros viram 2-col                    |
| `≤ 760px`  | Mobile — header slim, cascade empilha, KPI 2-col, tabs menores         |
| `≤ 560px`  | KPI 1-col                                                              |
| `≤ 480px`  | Tight mobile — `font-size 13.5px`, `shell` pad 14/12, header pad 16/14 |

Trecho representativo:

```css
@media (max-width: 760px) {
  .app {
    background:
      radial-gradient(700px 360px at 90% -10%, rgba(59, 130, 246, 0.05), transparent 70%),
      radial-gradient(560px 320px at -10% 0%, rgba(167, 139, 250, 0.04), transparent 70%), var(--bg);
  }
  .shell {
    padding: 16px 14px 36px;
  }
  .dash-head {
    margin: -16px 0 18px;
    padding: 18px 16px 14px;
    border-radius: 0 0 18px 18px;
  }
}

@media (max-width: 480px) {
  html,
  body {
    font-size: 13.5px;
  }
  .kpi-val {
    font-size: 26px;
  }
  .kpi-hero .kpi-val {
    font-size: 28px;
  }
  .stage-real {
    font-size: 20px;
  }
  .tab {
    padding: 10px 12px;
    font-size: 12.5px;
  }
  .brand-title {
    font-size: 15px;
  }
  .avatar {
    width: 38px;
    height: 38px;
    font-size: 13px;
  }
}
```

> O bloco completo de responsividade está em
> [`src/app/globals.css`](../src/app/globals.css) a partir da linha ~5050.

---

## 13. Checklist de replicação

Para nascer um novo painel mantendo a identidade, siga nesta ordem:

1. **Instale** `next@16 react@19 lucide-react` (e Tailwind v4 se quiser).
2. **Importe as 3 fontes** Google em `app/layout.tsx`: Outfit, Fraunces,
   JetBrains Mono — declare as variáveis `--font-outfit / --font-fraunces /
--font-jetbrains` e aplique no `<html>`.
3. **Copie o `globals.css`** desta repo (ou ao menos o bloco "DESIGN TOKENS"
   - reset + `.app` + `.shell`) — é o coração da identidade.
4. **Estruture a página** na hierarquia
   `.app > .shell > .dash-head > .topbar + .chips`. Sem `.dash-head`, o painel
   perde a "assinatura" azul.
5. **Construa nav e abas** com `.tabs` + `data-accent` por aba.
6. **Compose blocos** usando os componentes da seção 8–10:
   `.kpi-row` para métricas, `.cascade` para funis, `.regras-ouro` para
   manifestos, `.val-strip` para CTAs de validação, `.seg` para sub-tabs.
7. **Padronize ícones** com `lucide-react`, `strokeWidth` 1.75 (default) /
   2.0 (botões/headers) / 2.25 (selecionado).
8. **Use `data-accent`** (em vez de classes utility de cor) para variar
   cards/chips/checklist — mantém a consistência cromática.
9. **Números em `tabular-nums`**, headings com `letter-spacing: -0.01em` a
   `-0.025em`. Never use cores hex soltas no markup — ancore em variáveis.
10. **Valide a responsividade** nos 4 breakpoints (1080 / 760 / 560 / 480).

### Mapa rápido: arquivos-fonte de referência

| Conceito             | Arquivo                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Tokens + reset       | [`src/app/globals.css`](../src/app/globals.css) (linhas 1–120)                                |
| Layout root          | [`src/app/layout.tsx`](../src/app/layout.tsx)                                                 |
| Casca da página      | [`dashboard-shell.tsx`](<../src/app/(dashboard)/dashboard/_components/dashboard-shell.tsx>)   |
| Header azul          | [`topbar.tsx`](<../src/app/(dashboard)/dashboard/_components/topbar.tsx>)                     |
| Tabs                 | [`tabs-nav.tsx`](<../src/app/(dashboard)/dashboard/_components/tabs-nav.tsx>)                 |
| XP strip             | [`xp-bar.tsx`](<../src/app/(dashboard)/dashboard/_components/xp-bar.tsx>)                     |
| KPI + Hero           | [`funnel-section.tsx`](<../src/app/(dashboard)/dashboard/_components/funnel-section.tsx>)     |
| Cascade              | [`cascade-card.tsx`](<../src/app/(dashboard)/dashboard/_components/cascade-card.tsx>)         |
| Regras editoriais    | [`regras-ouro-card.tsx`](<../src/app/(dashboard)/dashboard/_components/regras-ouro-card.tsx>) |
| Menu de usuário      | [`user-menu.tsx`](<../src/app/(dashboard)/dashboard/_components/user-menu.tsx>)               |
| Toast                | [`toast.tsx`](<../src/app/(dashboard)/dashboard/_components/toast.tsx>)                       |
| Tipos compartilhados | [`types.ts`](<../src/app/(dashboard)/dashboard/_components/types.ts>)                         |

---

## 14. Footer

A ideia central do painel é um sistema de **superfícies brancas sobre um
fundo azul-cinza claro com glows radiais**, ancorado por um **header azul
intenso (`#1226aa`)** que dá personalidade e contraste. Todo o resto orbita
em torno de:

- **Quatro raios** (10/14/20px) e **três sombras** (`xs/sm/md`).
- **Oito acentos cromáticos** (blue, emerald, violet, amber, rose, sky, teal,
  pink) — cada um com 50/600/700 — aplicados via `data-accent`.
- **Três pesos de tinta** (`--ink / --ink-soft / --ink-mute / --ink-dim`).
- **Outfit** para tudo, `tabular-nums` para números.
- **Lucide-react** (stroke fino, 1.75–2.25) para todos os ícones.

Mantendo esses cinco pilares, qualquer tela nova "parece JDV" sem esforço.
