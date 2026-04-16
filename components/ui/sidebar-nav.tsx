"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./logo";
import type { NavItem } from "./bottom-nav";

interface SidebarNavProps {
  items: NavItem[];
}

/** 内联 SVG 图标（与 BottomNav 共用设计） */
function SidebarIcon({ icon, active }: { icon: NavItem["icon"]; active: boolean }) {
  const stroke = active ? "var(--color-accent)" : "var(--color-secondary)";

  switch (icon) {
    case "home":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "map":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
      );
    case "clipboard":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
      );
    case "user":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "chat":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "op36":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="700" fill={stroke} stroke="none" fontFamily="sans-serif">36</text>
        </svg>
      );
    case "target":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
  }
}

/** 桌面端左侧导航栏，仅在 >= 1024px 屏幕显示 */
export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function switchProfile() {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "profile" }),
    });
    router.push("/select-profile");
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-50 hidden lg:flex flex-col w-[240px] border-r border-divider" style={{ backgroundColor: "#FFFFFF" }}>
      {/* Logo */}
      <div className="px-4 pt-6 pb-5 border-b border-divider">
        <Link href="/">
          <Logo className="w-full h-auto" />
        </Link>
      </div>

      {/* 导航链接 */}
      <nav className="flex-1 px-3 pt-4">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3
                px-3 py-2.5 mb-1 rounded-lg
                text-[0.9375rem] font-medium
                transition-colors duration-150
                ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-secondary hover:bg-bg hover:text-text"
                }
              `}
            >
              <SidebarIcon icon={item.icon} active={active} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Switch Player */}
      <div className="px-3 pb-4">
        <button
          onClick={switchProfile}
          className="
            flex items-center gap-3
            w-full px-3 py-2.5 rounded-lg
            text-[0.875rem] font-medium text-secondary
            hover:bg-bg hover:text-text
            transition-colors duration-150
            cursor-pointer
          "
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
          </svg>
          <span>Switch Player</span>
        </button>
      </div>
    </aside>
  );
}
