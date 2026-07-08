import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ section?: string }>;
};

export default async function AcoesOfflineRedirectPage({ searchParams }: Props) {
  const { section } = await searchParams;
  if (section === "resultado") {
    redirect("/dashboard/gestao-acoes?section=resultado");
  }
  redirect("/dashboard/gestao-acoes");
}
