import type { BigQueryOptions } from "@google-cloud/bigquery";

// Com GOOGLE_APPLICATION_CREDENTIALS definida, usa o arquivo de chave (como
// sempre foi). Sem ela, o cliente cai nas Application Default Credentials —
// no Cloud Run, a service account do próprio serviço. trim() porque um
// espaço perdido na variável já apareceu em produção.
export function bigQueryOptions(projectId: string): BigQueryOptions {
  const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  return keyFilename ? { projectId, keyFilename } : { projectId };
}
