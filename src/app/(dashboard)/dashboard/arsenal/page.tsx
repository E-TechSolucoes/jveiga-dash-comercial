import { redirect } from "next/navigation";

export default function ArsenalPage() {
  redirect("/dashboard/acoes-offline?section=cadastro");
}
