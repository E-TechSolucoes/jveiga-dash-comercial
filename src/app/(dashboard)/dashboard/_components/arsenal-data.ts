import {
  Bell,
  Coffee,
  GraduationCap,
  Megaphone,
  PartyPopper,
  PhoneCall,
  Smartphone,
  Sparkles,
  Sword,
  Swords,
  Target,
  Theater,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type ArsenalKind = "treinamento" | "acao";

export type ArsenalItem = {
  id: string;
  nome: string;
  tipo: ArsenalKind;
  descricao: string;
  resultado: string;
  custo?: string;
  detalhe: string;
  Icon: LucideIcon;
  accent: "blue" | "violet" | "rose" | "amber" | "emerald" | "sky" | "teal" | "pink";
};

export const ARSENAL: ArsenalItem[] = [
  {
    id: "corujao",
    nome: "Corujão",
    tipo: "treinamento",
    descricao:
      "Sessão de estudo do produto em profundidade com convidados especiais (construtora, arquitetos, gerentes).",
    resultado: "Conhecimento técnico profundo",
    detalhe:
      "Terças e quintas, 18h às 20h. Tema definido com 1 semana de antecedência. Convidar construtora, arquitetos, gerentes comerciais. Formato: apresentação + perguntas + role-play. Premiação final: bijuteria, creme, caneca.",
    Icon: GraduationCap,
    accent: "blue",
  },
  {
    id: "alvo",
    nome: "Alvo do Dia",
    tipo: "treinamento",
    descricao: "Meta curta (ex: 5 ligações, 2 agendamentos) com bônus imediato para quem cumpre.",
    resultado: "Foco + execução",
    detalhe:
      "Definir alvo ao iniciar o turno (9h). Ex: 5 ligações para leads frios, 3 agendamentos até 12h, 2 follow-ups de pastas. Quem cumpre primeiro toca o sino. Bônus: chocolate, reconhecimento no grupo.",
    Icon: Target,
    accent: "sky",
  },
  {
    id: "duelo",
    nome: "Duelos",
    tipo: "treinamento",
    descricao:
      "Competição 1v1: quem agenda mais visitas em 1h, quem liga mais em 30min, quem envia mais propostas.",
    resultado: "Adrenalina + ranking",
    detalhe:
      "Definir competição (ex: quem liga mais em 30min). Timer no relógio do stand. Empate: próximo a agendar decide. Todos aplaudem o vencedor.",
    Icon: Swords,
    accent: "violet",
  },
  {
    id: "sino",
    nome: "Sino",
    tipo: "treinamento",
    descricao:
      "Toca o sino toda vez que alguém agenda visita, sobe pasta ou fecha venda. Reforço positivo coletivo.",
    resultado: "Energia + reconhecimento",
    detalhe:
      "Sino fica no centro do stand. Todos aplaudem quando toca. No fim do dia, contador: quantos sinos hoje? Meta: 10 sinos/dia.",
    Icon: Bell,
    accent: "amber",
  },
  {
    id: "role",
    nome: "Roleplay Objeções",
    tipo: "treinamento",
    descricao: "Dois corretores encenam: cliente difícil × vendedor. Resto assiste e dá feedback.",
    resultado: "Preparo para objeções reais",
    detalhe:
      "Terças e quintas, 15min antes do corujão. Sortear objeções (está caro, vou pensar, não tenho entrada, etc). Gravar celular para revisão.",
    Icon: Theater,
    accent: "pink",
  },
  {
    id: "panfleta",
    nome: "Panfletagem",
    tipo: "acao",
    descricao:
      "Distribuição ativa de panfletos em pontos de alto tráfego com abordagem qualificada.",
    resultado: "Leads frios de baixo custo",
    custo: "R$ 200 a R$ 400",
    detalhe:
      "Local: feira, saída de supermercado, estação. Horário: 7h às 9h ou 17h às 19h. Equipe: 2 a 3 corretores. Captura: nome, telefone, interesse. Meta: 30 a 50 leads.",
    Icon: Megaphone,
    accent: "emerald",
  },
  {
    id: "portaria",
    nome: "Portaria",
    tipo: "acao",
    descricao:
      "Plantão presencial em condomínios vizinhos com termo de uso autorizado pelo síndico.",
    resultado: "Leads próximos / moradores em busca",
    custo: "R$ 150 a R$ 300",
    detalhe:
      "Negociar com síndico com 1 semana de antecedência. Termo simples autorizando 2h de presença. Equipe: 1 corretor + 1 recepcionista. Meta: 5 a 15 leads.",
    Icon: Sword,
    accent: "teal",
  },
  {
    id: "blitz",
    nome: "Blitz Digital",
    tipo: "acao",
    descricao: "Impulsionamento pago dos posts dos corretores e da página do empreendimento.",
    resultado: "Volume de leads digitais",
    custo: "Budget mínimo R$ 500/sem",
    detalhe:
      "Selecionar melhores posts da semana. Público: raio de 5 a 15km + faixa de renda + interesse. Budget mínimo R$ 20/dia por post. Resultado: 20 a 50 leads/semana.",
    Icon: Smartphone,
    accent: "violet",
  },
  {
    id: "evento",
    nome: "Evento Stand",
    tipo: "acao",
    descricao: "Café premium, sorteio de brindes, música ao vivo, convidados especiais.",
    resultado: "Experiência memorável → indicações",
    custo: "≈ R$ 500",
    detalhe:
      "Definir tema com 1 semana de antecedência. Enviar convite via WhatsApp. Montar cenário instagramável. Sorteio de brindes (cadastro = novo lead).",
    Icon: Coffee,
    accent: "amber",
  },
  {
    id: "reativa",
    nome: "Mutirão de Reativação",
    tipo: "acao",
    descricao: "Sessão coordenada de ligações para leads frios da base do CRM.",
    resultado: "Agendamentos de custo zero",
    custo: "R$ 0",
    detalhe:
      "Filtrar leads com mais de 7 dias sem contato. Distribuir 10 a 15 leads por corretor. Taxa de reativação esperada: 5 a 10%.",
    Icon: PhoneCall,
    accent: "sky",
  },
  {
    id: "celebra",
    nome: "Celebração",
    tipo: "acao",
    descricao: "Ritual pós-venda: chave simbólica, confetes, fotos, sino, rasgar a folha.",
    resultado: "Indicações + moral da equipe",
    custo: "≈ R$ 15",
    detalhe:
      "Após assinatura: chave simbólica, confetes, fotos, sino, contador de vendas atualizado. Objetivo: prova social, gerar indicações.",
    Icon: PartyPopper,
    accent: "rose",
  },
];

// ============= OBJEÇÕES =============
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

// ============= REGRAS DE OURO =============
export const REGRAS: string[] = [
  "Lead não atendido = lead perdido. 15 minutos.",
  "CRM é lei. Fora do CV não existe.",
  "A roleta é sagrada.",
  "Ação sem relatório = dinheiro fora.",
  "Estande sujo = venda perdida.",
  "Motive, treine, cobre, reconheça.",
  "Números não mentem.",
  "Segunda: resetar e atacar.",
];

// ============= MOCKS — substituir por Base JV =============
export type Corretor = {
  id: string;
  nome: string;
  imob: string;
  cel?: string;
  ind: number;
  vis: number;
  pas: number;
  pasA: number;
  vendas: number;
};

export const CORRETORES_MOCK: Corretor[] = [
  {
    id: "ana",
    nome: "Ana Souza",
    imob: "JVENDAS",
    cel: "(11) 99999-0001",
    ind: 4,
    vis: 8,
    pas: 3,
    pasA: 1,
    vendas: 1,
  },
  {
    id: "bia",
    nome: "Bia Martins",
    imob: "VENDEU",
    cel: "(11) 99999-0002",
    ind: 2,
    vis: 6,
    pas: 4,
    pasA: 2,
    vendas: 2,
  },
  {
    id: "carlos",
    nome: "Carlos Lima",
    imob: "TOPX",
    cel: "(11) 99999-0003",
    ind: 3,
    vis: 5,
    pas: 2,
    pasA: 0,
    vendas: 0,
  },
  {
    id: "bruno",
    nome: "Bruno Reis",
    imob: "JVENDAS",
    cel: "(11) 99999-0004",
    ind: 1,
    vis: 4,
    pas: 1,
    pasA: 0,
    vendas: 0,
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
