import type { NavItem } from "@/components/ui/bottom-nav";

export type { NavItem };

export const navItems: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: "home" },
  { label: "Courses", href: "/courses", icon: "map" },
  { label: "Rounds", href: "/rounds", icon: "clipboard" },
  { label: "Shot Tracker", href: "/rounds/tracker", icon: "target" },
  { label: "Op 36", href: "/op36", icon: "op36" },
  { label: "Chat", href: "/chat", icon: "chat" },
  { label: "Profile", href: "/profile", icon: "user" },
];
