import { GestaoAcoesShell } from "./_components/gestao-acoes-shell";
import type { SubTabId } from "./_components/gestao-acoes-tab";

type Props = {
  searchParams: Promise<{ section?: string }>;
};

function initialSubFromSection(section: string | undefined): SubTabId {
  if (section === "resultado" || section === "outbound") return "resultado";
  return "planejamento";
}

export default async function GestaoAcoesPage({ searchParams }: Props) {
  const { section } = await searchParams;

  return <GestaoAcoesShell initialSub={initialSubFromSection(section)} />;
}
