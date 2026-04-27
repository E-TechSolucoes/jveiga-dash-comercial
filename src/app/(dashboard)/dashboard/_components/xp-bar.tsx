import { Flame } from "lucide-react";

type Props = {
  level: number;
  pct: number;
};

export function XpBar({ level, pct }: Props) {
  return (
    <div className="progress-strip" aria-label="Progresso de nível">
      <div className="lvl">
        <Flame size={14} strokeWidth={2} />
        Nível
        <span className="lvl-badge">{level}</span>
      </div>
      <div className="bar" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="pct">{pct}%</div>
    </div>
  );
}
