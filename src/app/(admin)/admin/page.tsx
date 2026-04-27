import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

export default function AdminHomePage() {
  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1>Configurações</h1>
        <p>Selecione uma área de configuração no menu lateral.</p>
      </header>

      <div className="admin-cards">
        <Link href="/admin/stand-check" className="admin-card">
          <span className="admin-card-ico" aria-hidden>
            <ClipboardCheck size={20} strokeWidth={1.75} />
          </span>
          <span className="admin-card-body">
            <span className="admin-card-title">Base do Estande</span>
            <span className="admin-card-desc">
              Itens exibidos na aba Check &middot; sub-aba <em>Base do Estande</em>.
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
