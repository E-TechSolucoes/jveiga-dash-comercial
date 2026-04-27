import {
  BadgeCheck,
  Bell,
  BookOpenCheck,
  Calculator,
  Cast,
  ClipboardList,
  Coffee,
  FileText,
  Flag,
  Handshake,
  KeyRound,
  LayoutGrid,
  MapPin,
  PartyPopper,
  QrCode,
  Rotate3d,
  SignalHigh,
  SquareMenu,
  Table,
  TableProperties,
  Target,
  Trophy,
  Tv,
  Users,
  Wifi,
  type LucideIcon,
} from "lucide-react";

export type CheckItem = {
  id: string;
  label: string;
  Icon: LucideIcon;
};

// Base do Estande — infra + ritual do comercial
export const CHECK_BASE: CheckItem[] = [
  { id: "banner", label: "Banner do empreendimento + logos", Icon: Flag },
  { id: "maquete", label: "Maquete / planta humanizada", Icon: LayoutGrid },
  { id: "tv", label: "TV com ranking rodando", Icon: Tv },
  { id: "mesa", label: "Mesa + cadeiras", Icon: TableProperties },
  { id: "tabela", label: "Tabela de preços atualizada", Icon: Table },
  { id: "book", label: "Book de vendas completo", Icon: BookOpenCheck },
  { id: "wifi", label: "Wi-Fi funcionando", Icon: Wifi },
  { id: "fichas", label: "Fichas de visita (backup)", Icon: ClipboardList },
  { id: "folhetos", label: "Folhetos + QR Code", Icon: QrCode },
  { id: "simulador", label: "Simulador Caixa no tablet", Icon: Calculator },
  { id: "placa", label: "Placa unidades disponíveis", Icon: SquareMenu },
  { id: "cafe", label: "Kit café / água", Icon: Coffee },
  { id: "cafeteira", label: "Cafeteira + bolo + suco + flores", Icon: Coffee },
  { id: "kids", label: "Espaço Kids montado", Icon: Users },
  { id: "escala", label: "Escala de plantão publicada", Icon: FileText },
  { id: "roleta", label: "Roleta configurada", Icon: Rotate3d },
  { id: "grupo", label: "Grupo WhatsApp ativo", Icon: SignalHigh },
  { id: "regras", label: "Regras assinadas", Icon: BadgeCheck },
  { id: "sino", label: "Sino da venda", Icon: Bell },
  { id: "chave", label: "Chave simbólica + confetes", Icon: KeyRound },
  { id: "contador", label: "Contador de vendas", Icon: Target },
  { id: "ambientacao", label: "Ambientação de evento", Icon: PartyPopper },
];

// Diário — as 4 cobranças do comercial todo dia
export const CHECK_DIARIO: CheckItem[] = [
  { id: "ranking_tv", label: "Ranking atualizado na TV / lousa", Icon: Cast },
  {
    id: "cobrar_recep",
    label: "Cobrar recepcionista (visitas + plantão + corretores)",
    Icon: Users,
  },
  {
    id: "verificar_funil",
    label: "Verificar funil: leads → visitas → pastas → vendas",
    Icon: Target,
  },
  { id: "acompanhar_acoes", label: "Acompanhar ações do dia no arsenal", Icon: ClipboardList },
];

// Paleta para os cards de premiação
export type PremiacaoCategory = {
  id: string;
  categoria: string;
  criterio: string;
  valor: string;
  exemplos: string;
  regra: string;
  Icon: LucideIcon;
  accent: "blue" | "amber" | "emerald" | "violet";
};

export const PREMIACOES: PremiacaoCategory[] = [
  {
    id: "indicacoes",
    categoria: "Indicações",
    criterio: "Mais indicações da semana — visitas espontâneas não contam",
    valor: "~R$ 50",
    exemplos: "Carregador portátil, fone Bluetooth, voucher Uber",
    regra: "Prêmio nas bexigas — corretor estoura para descobrir. Toda terça antes do treino.",
    Icon: Handshake,
    accent: "blue",
  },
  {
    id: "pastas",
    categoria: "Pastas",
    criterio: "Mais pastas subidas na semana",
    valor: "~R$ 100",
    exemplos: "Mixer, cafeteira, voucher Riachuelo",
    regra: "Desempate: pasta que virou venda tem prioridade. Toda terça.",
    Icon: FileText,
    accent: "amber",
  },
  {
    id: "vendas",
    categoria: "Vendas",
    criterio: "Mais vendas da semana",
    valor: "~R$ 150",
    exemplos: "Cesta personalizada, voucher Outback",
    regra: "Maior reconhecimento público. Toda terça.",
    Icon: Trophy,
    accent: "emerald",
  },
  {
    id: "corujao",
    categoria: "Corujão",
    criterio: "Mais agendamentos no corujão (terças e quintas)",
    valor: "Simbólico",
    exemplos: "Bijuteria, creme, sabonete, caneca com bombom",
    regra: "No final de cada corujão — terças e quintas.",
    Icon: MapPin,
    accent: "violet",
  },
];

export type ChecklistType = "base" | "diario" | "premiacao";

export const CHECKLIST_META: Record<
  ChecklistType,
  { label: string; description: string; accent: "emerald" | "blue" | "amber" }
> = {
  base: {
    label: "Base (Estande)",
    description: "Infraestrutura e ambientação do stand — tudo pronto para receber o cliente.",
    accent: "emerald",
  },
  diario: {
    label: "Diário",
    description: "Rotina que o comercial executa todos os dias no stand.",
    accent: "blue",
  },
  premiacao: {
    label: "Premiação",
    description: "Ritual de reconhecimento de terça-feira — prêmios, bexigas, cerimônia.",
    accent: "amber",
  },
};

export const SKIN_ARQUITETO_THRESHOLD = 18;

export type ValidationLogEntry = {
  id: string;
  date: string;
  by: string;
  type: ChecklistType;
  count: number;
  total: number;
};
