import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">Acesso negado</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Você não tem permissão para acessar esta área.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          Voltar para o dashboard
        </Link>
      </div>
    </main>
  );
}
