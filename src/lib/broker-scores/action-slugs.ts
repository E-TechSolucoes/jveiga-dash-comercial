/** Maps field_actions.code (PT slug) → broker_scores.action (EN slug). */
export const FIELD_ACTION_SCORE_SLUG: Record<string, string> = {
  panfleta: "flyering",
  portaria: "lobby-outreach",
  blitz: "digital-blitz",
  evento: "stand-event",
  reativa: "reactivation-drive",
  celebra: "sale-celebration",
  corujao: "night-study",
  alvo: "daily-target",
  duelo: "duels",
  sino: "bell",
  role: "objection-roleplay",
};

export function brokerScoreActionSlug(code: string): string {
  return FIELD_ACTION_SCORE_SLUG[code] ?? code;
}
