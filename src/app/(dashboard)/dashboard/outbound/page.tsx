import { redirect } from "next/navigation";

export default function OutboundPage() {
  redirect("/dashboard/acoes-offline?section=resultado");
}
