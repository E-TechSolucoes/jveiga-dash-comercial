import { AcoesOfflineShell } from "./_components/acoes-offline-shell";
import type { SubTabId } from "./_components/acoes-offline-tab";

type Props = {
  searchParams: Promise<{ section?: string }>;
};

function initialSubFromSection(section: string | undefined): SubTabId {
  return section === "resultado" ? "resultado" : "cadastro";
}

export default async function AcoesOfflinePage({ searchParams }: Props) {
  const { section } = await searchParams;

  return <AcoesOfflineShell initialSub={initialSubFromSection(section)} />;
}
