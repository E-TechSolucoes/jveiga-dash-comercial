import { ScrollText } from "lucide-react";

const REGRAS = [
  "Lead não atendido = lead perdido. 3 minutos ⏰",
  "Ferramente é lei. Fora delas não existe 📱",
  "A roleta é sagrada 🎰",
  "Ação sem relatório = dinheiro fora 💸",
  "Estande sujo = venda perdida 🧹",
  "Motive, treine, cobre, reconheça 💪",
  "Números não mentem 📊",
  "Segunda: resetar e atacar 🚀",
  "Vocês sao donos do empreendimento. Fiquem em cima",
];

export function RegrasOuroCard() {
  return (
    <section className="regras-ouro" aria-label="Regras de ouro">
      <div className="regras-ouro-head">
        <span className="regras-ouro-ico" aria-hidden>
          <ScrollText size={18} strokeWidth={2} />
        </span>
        <div>
          <div className="regras-ouro-h1">Regras de Ouro</div>
          <div className="regras-ouro-sub">Os princípios inegociáveis da operação comercial</div>
        </div>
      </div>

      <ol className="regras-ouro-list">
        {REGRAS.map((regra, i) => (
          <li key={i} className="regra-ouro-item">
            <span className="regra-ouro-num" aria-hidden>
              {i + 1}
            </span>
            <span className="regra-ouro-text">{regra}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
