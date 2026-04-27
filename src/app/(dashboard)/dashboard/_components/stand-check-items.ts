import * as Lucide from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { CheckItem } from "./check-data";

export type StandCheckItemDTO = {
  id: string;
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

export function dtoToCheckItem(dto: StandCheckItemDTO): CheckItem {
  return {
    id: dto.code,
    label: dto.label,
    Icon: resolveLucideIcon(dto.icon_name),
  };
}

export async function fetchStandCheckItems(signal?: AbortSignal): Promise<CheckItem[]> {
  const res = await fetch("/api/admin/stand-check-items?is_active=true", {
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    throw new Error(`Falha ao carregar itens (${res.status})`);
  }
  const data = (await res.json()) as StandCheckItemDTO[];
  return data.map(dtoToCheckItem);
}
