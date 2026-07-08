import { redirect } from "next/navigation";

export default function OutboundRedirectPage() {
  redirect("/dashboard/gestao-acoes?section=resultado");
}
