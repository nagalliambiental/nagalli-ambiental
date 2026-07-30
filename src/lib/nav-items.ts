import {
  LayoutDashboard,
  Building2,
  Settings,
  CalendarClock,
  Map,
  FileCheck2,
  Users,
  DollarSign,
  ClipboardList,
  FileText,
  FileSpreadsheet,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  children?: { label: string; href: string }[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    label: "Cadastros", icon: Building2,
    children: [
      { label: "Clientes", href: "/clientes" },
      { label: "Empreendimentos", href: "/empreendimentos" },
    ],
  },
  { label: "Processos", href: "/processos", icon: FileCheck2 },
  { label: "Exigências", href: "/exigencias", icon: ClipboardList },
  { label: "DMR", href: "/dmr", icon: FileSpreadsheet },
  { label: "Modelos", href: "/modelos", icon: FileText },
  { label: "Financeiro", href: "/financeiro", icon: DollarSign, adminOnly: true },
  { label: "Prazos", href: "/prazos", icon: CalendarClock },
  { label: "Tarefas", href: "/tarefas", icon: ClipboardList },
  { label: "Usuários", href: "/usuarios", icon: Users, adminOnly: true },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { label: "Configurações", href: "/configuracoes", icon: Settings, adminOnly: true },
];
