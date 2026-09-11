import {
  LayoutDashboard,
  Layers,
  Users,
  Globe,
  Server,
  Mail,
  Share2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

/** A plain visual divider between nav groups — rendered as a line, no
 * label or link. Everything below it is a "subscription tools" item
 * (starting with Shared Hosting), kept visually distinct from the core
 * client-services group above. */
export interface NavDivider {
  type: "divider";
}

export type NavEntry = NavItem | NavDivider;

export const NAV_ITEMS: NavEntry[] = [
  { label: "Overview", to: "/", icon: LayoutDashboard },
  { type: "divider" },
  { label: "Client Overview", to: "/client-overview", icon: Layers },
  { label: "Clients", to: "/clients", icon: Users },
  { label: "Domains", to: "/domains", icon: Globe },
  { label: "Hosting", to: "/hosting", icon: Server },
  { label: "Email", to: "/emails", icon: Mail },
  { type: "divider" },
  { label: "Shared Hosting", to: "/shared-hosting", icon: Share2 },
];
