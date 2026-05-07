import { Sparkles, Trophy } from "lucide-react";

// ============= OBJEÇÕES =============
// Knowledge base (consumed by Conhecimento tab). No backend table backs this
// yet — keep here as static reference until/unless an objections endpoint exists.
export type ObjecaoTipo =
  | "Preço"
  | "Adiamento"
  | "Financeiro"
  | "Concorrência"
  | "Produto"
  | "Segurança";

export type Objecao = {
  id: string;
  objecao: string;
  tipo: ObjecaoTipo;
  contexto: string;
  resposta: string;
};

export const OBJECOES: Objecao[] = [
  {
    id: "caro",
    objecao: "Está caro",
    tipo: "Preço",
    contexto: "O cliente acha que o valor do imóvel está acima do que ele pode pagar.",
    resposta:
      "Compare o custo do aluguel atual com a parcela do financiamento. Mostre que o aluguel some, enquanto a parcela vira patrimônio. Use números: você paga R$ 1.500 de aluguel? Com essa entrada, sua parcela fica R$ 1.200 — e no final o imóvel é seu.",
  },
  {
    id: "pensar",
    objecao: "Vou pensar",
    tipo: "Adiamento",
    contexto: "O cliente gostou mas não quer decidir agora. Geralmente é medo de errar.",
    resposta:
      "Não confronte. Crie urgência real: entendo, é uma decisão importante. Só quero te avisar que essa condição é válida até sexta, e nesse andar só restam 3 unidades. Próximo passo leve: posso te mandar a simulação por WhatsApp?",
  },
  {
    id: "entrada",
    objecao: "Não tenho entrada",
    tipo: "Financeiro",
    contexto: "O cliente acredita que não tem condições financeiras para a entrada.",
    resposta:
      "FGTS como entrada, parcelamento da entrada em até 36x, condições facilitadas da construtora. Use exemplo real: o João usou o FGTS e parcelou o restante. Posso fazer uma simulação rápida sem compromisso?",
  },
  {
    id: "conjuge",
    objecao: "Preciso falar com meu cônjuge",
    tipo: "Adiamento",
    contexto: "O cliente está interessado mas não toma decisão sozinho.",
    resposta:
      "Envolva o cônjuge: que tal agendarmos uma visita juntos? Sábado temos um café especial, é uma ótima oportunidade. Mande material por WhatsApp para mostrar em casa.",
  },
  {
    id: "outros",
    objecao: "Estou olhando outros empreendimentos",
    tipo: "Concorrência",
    contexto: "O cliente está pesquisando e comparando.",
    resposta:
      "Não critique a concorrência. Que bom que você está pesquisando! Posso te mostrar um comparativo? Destaque: localização, preço por m², infraestrutura, condições de pagamento.",
  },
  {
    id: "loc",
    objecao: "A localização não é boa",
    tipo: "Produto",
    contexto: "O cliente não conhece bem a região.",
    resposta:
      "Mostre o mapa de desenvolvimento: obras de infraestrutura, novos comércios, transporte público, valorização. Dados: nos últimos 3 anos, os imóveis valorizaram 40%.",
  },
  {
    id: "planta",
    objecao: "Não confio em comprar na planta",
    tipo: "Segurança",
    contexto: "Medo de atraso, problemas com a construtora.",
    resposta:
      "Histórico da incorporadora, obras já entregues (com fotos), garantias contratuais, seguro de obra. Posso te levar para visitar um empreendimento que entregamos no ano passado.",
  },
  {
    id: "score",
    objecao: "Meu score está baixo",
    tipo: "Financeiro",
    contexto: "Cliente acredita que não será aprovado no financiamento.",
    resposta:
      "Temos parceiros que trabalham com diferentes perfis. Cada banco tem critérios diferentes. Vamos fazer uma simulação rápida — muitas vezes o resultado surpreende.",
  },
  {
    id: "pequeno",
    objecao: "O apartamento é pequeno",
    tipo: "Produto",
    contexto: "Cliente acha que a metragem não atende às necessidades.",
    resposta:
      "Planta humanizada com móveis planejados. Essa planta foi desenhada por arquitetos especializados em aproveitamento de espaço. Veja como a cozinha americana amplia a sala.",
  },
  {
    id: "esperar",
    objecao: "Vou esperar o preço baixar",
    tipo: "Adiamento",
    contexto: "Cliente acredita que imóveis ficam mais baratos com o tempo.",
    resposta:
      "Imóveis na planta funcionam ao contrário: quanto mais a obra avança, mais o preço sobe. Quem compra no lançamento pega o menor preço. A tabela é reajustada pelo INCC mensalmente.",
  },
];

// ============= PONTUAÇÃO =============
export const PONTOS = {
  treino: 5,
  acao: 5,
  acaoBonus: 10,
  acaoBonusMin: 3,
  indicacao: 3,
  visita: 5,
  pasta: 10,
  pastaAprov: 20,
  venda: 30,
} as const;

export type Nivel = "Soldado" | "Capitão" | "General" | "Lenda";

export function nivelOf(pts: number): Nivel {
  if (pts >= 150) return "Lenda";
  if (pts >= 100) return "General";
  if (pts >= 50) return "Capitão";
  return "Soldado";
}

export const DIAS_SEMANA: string[] = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// Marcas locais para reaproveitar nas tabs
export { Sparkles, Trophy };
