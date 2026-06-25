import type { WeeklyActionCategory } from "./api";

export type WeeklyActionCategoryKey = "campo" | "treino" | "premio" | "outro";

export type WeeklyActionCategoryDef = {
  key: WeeklyActionCategoryKey;
  label: string;
  options: string[];
};

export const WEEKLY_ACTION_CATEGORIES: readonly WeeklyActionCategoryDef[] = [
  {
    key: "campo",
    label: "Ações de Campo",
    options: [
      "Captação Ativa",
      "Mini Evento",
      "Carro de Som",
      "Vídeos/Fotos",
      "Blitz Digital",
      "Evento Stand",
      "Mutirão Reativação",
      "Celebração",
      "Corujão",
      "Panfletagem",
      "Portaria",
    ],
  },
  {
    key: "treino",
    label: "Treinamentos",
    options: [
      "Batalha de Pitch",
      "Alvo do Dia",
      "Caça ao Tesouro",
      "Sino do Dia",
      "Desafio Conhecimento",
      "Duelos Relâmpago",
      "1 Minuto de Ouro",
      "Roleplay Objeções",
    ],
  },
  {
    key: "premio",
    label: "Premiações",
    options: ["Premiação Indicações", "Premiação Pastas", "Premiação Vendas"],
  },
  {
    key: "outro",
    label: "Outros",
    options: ["Parceria", "Digital", "Outro"],
  },
];

export const UI_CATEGORY_TO_API: Record<WeeklyActionCategoryKey, WeeklyActionCategory> = {
  campo: "field",
  treino: "training",
  premio: "award",
  outro: "other",
};

export const API_CATEGORY_TO_UI: Record<WeeklyActionCategory, WeeklyActionCategoryKey> = {
  field: "campo",
  training: "treino",
  award: "premio",
  other: "outro",
};

export function categoryOfActionType(actionType: string): WeeklyActionCategoryKey {
  for (const cat of WEEKLY_ACTION_CATEGORIES) {
    if (cat.options.includes(actionType)) return cat.key;
  }
  return "outro";
}

export function scoreSlugForActionType(actionType: string): string {
  const folded = actionType.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
  const map: Record<string, string> = {
    panfletagem: "flyering",
    portaria: "lobby-outreach",
    "blitz digital": "digital-blitz",
    "evento stand": "stand-event",
    "mutirao reativacao": "reactivation-drive",
    "mutirao de reativacao": "reactivation-drive",
    celebracao: "sale-celebration",
    corujao: "night-study",
    "alvo do dia": "daily-target",
    "duelos relampago": "duels",
    duelos: "duels",
    "sino do dia": "bell",
    sino: "bell",
    "roleplay objecoes": "objection-roleplay",
  };
  return map[folded] ?? folded.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
