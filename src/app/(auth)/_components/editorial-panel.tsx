export function EditorialPanel() {
  return (
    <aside
      className="relative hidden overflow-hidden text-white lg:col-span-5 lg:flex lg:flex-col"
      style={{
        background:
          "radial-gradient(900px 320px at 85% -30%, rgba(255,255,255,0.18), transparent 60%), radial-gradient(700px 280px at 0% 110%, rgba(99,102,241,0.35), transparent 60%), linear-gradient(135deg, #1e40af 0%, #2563eb 55%, #3b82f6 100%)",
      }}
    >
      {/* fine vertical grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "linear-gradient(to right, white 1px, transparent 1px)",
          backgroundSize: "84px 100%",
        }}
      />

      {/* horizontal hairlines */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "100% 200px",
        }}
      />

      {/* radial accent glow (top-right) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
        style={{
          background: "radial-gradient(closest-side, rgba(59,130,246,0.55), transparent 70%)",
        }}
      />

      {/* radial accent glow (bottom-left) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
        style={{
          background: "radial-gradient(closest-side, rgba(99,102,241,0.4), transparent 70%)",
        }}
      />

      {/* grain */}
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

        {/* sparkline ornament */}
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
              strokeDasharray="0 0"
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
