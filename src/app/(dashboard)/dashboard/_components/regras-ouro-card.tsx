import { Sparkles, Trophy } from "lucide-react";
import type { CSSProperties } from "react";

const REGRAS = [
  { text: "Lead não atendido = lead perdido.", tip: "3 minutos", emoji: "⏰" },
  { text: "Ferramenta é lei. Fora delas não existe.", tip: "Sem atalho", emoji: "📱" },
  { text: "A roleta é sagrada.", tip: "Distribuição justa", emoji: "🎰" },
  { text: "Ação sem relatório = dinheiro fora.", tip: "Registre tudo", emoji: "💸" },
  { text: "Estande sujo = venda perdida.", tip: "Ambiente vende", emoji: "🧹" },
  { text: "Motive, treine, cobre, reconheça.", tip: "Liderança diária", emoji: "💪" },
  { text: "Números não mentem.", tip: "Olhe o funil", emoji: "📊" },
  { text: "Segunda: resetar e atacar.", tip: "Semana nova", emoji: "🚀" },
  { text: "Vocês são donos do empreendimento.", tip: "Fiquem em cima", emoji: "🏠" },
];

export function RegrasOuroCard() {
  return (
    <section className="regras-ouro regras-ouro--alive" aria-label="Regras de ouro">
      <div className="regras-ouro-banner">
        <div className="regras-ouro-banner-ico" aria-hidden>
          <Trophy size={22} strokeWidth={2} />
        </div>
        <div className="regras-ouro-banner-body">
          <div className="regras-ouro-banner-eyebrow">Innegociáveis</div>
          <div className="regras-ouro-banner-title">
            Regras de Ouro · <em>operação comercial</em>
          </div>
          <p className="regras-ouro-banner-text">
            Os princípios que sustentam o stand — marque-os na cabeça e cobrem o time todo dia.
          </p>
        </div>
        <div className="regras-ouro-banner-chip" aria-hidden>
          <Sparkles size={14} strokeWidth={2.25} />
          <span>{REGRAS.length}</span>
          <small>regras</small>
        </div>
      </div>

      <ol className="regras-ouro-list">
        {REGRAS.map((regra, i) => (
          <li
            key={i}
            className="regra-ouro-item"
            style={{ ["--ck-i" as string]: i } as CSSProperties}
          >
            <span className="regra-ouro-num" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="regra-ouro-emoji" aria-hidden>
              {regra.emoji}
            </span>
            <div className="regra-ouro-copy">
              <span className="regra-ouro-text">{regra.text}</span>
              <span className="regra-ouro-tip">{regra.tip}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
