import {
  LayoutDashboard,
  Layers,
  Users,
  Globe,
  Server,
  Mail,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Overview", to: "/", icon: LayoutDashboard },
  { label: "Client Overview", to: "/client-overview", icon: Layers },
  { label: "Clients", to: "/clients", icon: Users },
  { label: "Domains", to: "/domains", icon: Globe },
  { label: "Hosting", to: "/hosting", icon: Server },
  { label: "Email", to: "/emails", icon: Mail },
];
