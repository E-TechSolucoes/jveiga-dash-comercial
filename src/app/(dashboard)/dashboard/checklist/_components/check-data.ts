import { type LucideIcon } from "lucide-react";

// Tipos e constantes UI compartilhadas entre os três sub-checklists
// (Base/Diário/Premiação). Os arrays de itens vêm do backend via
// stand-check-activity, check-items-daily-activity e premiacoes-categories;
// não há mais mocks aqui.

export type CheckItem = {
  id: string;
  label: string;
  Icon: LucideIcon;
  /** Só preenchido na Rotina Diária (morning | afternoon | evening). */
  period?: "morning" | "afternoon" | "evening";
};

export type ChecklistType = "base" | "diario" | "premiacao";

export const CHECKLIST_META: Record<
  ChecklistType,
  { label: string; description: string; accent: "emerald" | "blue" | "amber" }
> = {
  base: {
    label: "Base (Estande)",
    description: "Infraestrutura e ambientação do stand — tudo pronto para receber o cliente.",
    accent: "emerald",
  },
  diario: {
    label: "Diário",
    description: "Rotina que o comercial executa todos os dias no stand.",
    accent: "blue",
  },
  premiacao: {
    label: "Premiação",
    description: "Ritual de reconhecimento de terça-feira — prêmios, bexigas, cerimônia.",
    accent: "amber",
  },
};

export const SKIN_ARQUITETO_THRESHOLD = 18;

export type ValidationLogEntry = {
  id: string;
  date: string;
  by: string;
  type: ChecklistType;
  count: number;
  total: number;
};
