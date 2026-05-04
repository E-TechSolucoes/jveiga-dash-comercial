import * as Lucide from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type StandCheckItemDTO = {
  id: string;
  empreendimento_id: number;
  code: string;
  label: string;
  icon_name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function resolveLucideIcon(name: string): LucideIcon {
  const Icon = (Lucide as unknown as Record<string, LucideIcon | undefined>)[name];
  return Icon ?? Lucide.Box;
}
