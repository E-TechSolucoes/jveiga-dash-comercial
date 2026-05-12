export type SalesPlanItem = {
  empreendimento_id: number;
  empreendimento_name: string;
  planned_sales: number;
};

export type SalesPlanByMonth = {
  year: number;
  month: number;
  total_planned_sales: number;
  items: SalesPlanItem[];
};
