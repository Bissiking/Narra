"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { getProjectFormat } from "@/lib/editor-profiles";

interface ProjectNavProps {
  projectId: string;
  projectType: string;
  role?: "owner" | "editor" | "viewer";
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  accent?: boolean;
  requiresWrite?: boolean;
}

function Icon({ children }: { children: React.ReactNode }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "", label: "Vue d'ensemble", icon: <Icon><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></Icon> },
  { href: "/read", label: "Lire", accent: true, icon: <Icon><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></Icon> },
  { href: "/edit", label: "Éditer", accent: true, requiresWrite: true, icon: <Icon><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></Icon> },
  { href: "/structure", label: "Structure", icon: <Icon><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><path d="M6 9v12" /></Icon> },
  { href: "/characters", label: "Personnages", icon: <Icon><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon> },
  { href: "/locations", label: "Lieux", icon: <Icon><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></Icon> },
  { href: "/organizations", label: "Organisations", icon: <Icon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icon> },
  { href: "/lore", label: "Lore", icon: <Icon><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></Icon> },
  { href: "/timeline", label: "Timeline", icon: <Icon><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Icon> },
  { href: "/media", label: "Médias", icon: <Icon><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></Icon> },
  { href: "/analysis", label: "Répétitions", icon: <Icon><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Icon> },
  { href: "/presentation", label: "Page histoire", requiresWrite: true, icon: <Icon><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></Icon> },
  { href: "/share", label: "Partager", requiresWrite: true, icon: <Icon><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></Icon> },
  { href: "/search", label: "Recherche", icon: <Icon><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Icon> },
  { href: "/settings", label: "Paramètres", requiresWrite: true, icon: <Icon><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></Icon> },
];

export default function ProjectNav({ projectId, projectType, role }: ProjectNavProps) {
  const pathname = usePathname();
  const format = getProjectFormat(projectType);
  const [collapsed, setCollapsed] = useState(false);
  const canEdit = role === "owner" || role === "editor";
  const labels: Record<string, string> = {
    "/read": format.nav.read,
    "/edit": format.nav.edit,
    "/structure": format.nav.structure,
    "/lore": format.nav.lore,
    "/timeline": format.nav.timeline,
    "/analysis": format.nav.analysis,
    "/presentation": format.nav.presentation,
  };

  if (pathname === `/project/${projectId}/read`) return null;

  return (
    <nav className={`flex w-full shrink-0 flex-col border-b border-narra-border bg-narra-surface md:border-b-0 md:border-r ${collapsed ? "md:w-16" : "md:w-56"}`}>
      <div className="border-b border-narra-border px-4 py-3 md:p-4">
        <Link href="/library" className="text-narra-muted hover:text-narra-text text-sm">
          {collapsed ? "←" : "← Bibliothèque"}
        </Link>
      </div>

      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="hidden md:flex items-center justify-center border-b border-narra-border px-2 py-2 text-narra-muted hover:text-narra-text text-xs gap-1"
        aria-label={collapsed ? "Développer la sidebar" : "Réduire la sidebar"}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          {collapsed
            ? <><line x1="3" y1="12" x2="21" y2="12" /><polyline points="15 18 21 12 15 6" /></>
            : <><line x1="3" y1="12" x2="21" y2="12" /><polyline points="9 18 3 12 9 6" /></>
          }
        </svg>
        {!collapsed && <span>Réduire</span>}
      </button>

      <div className="flex overflow-x-auto p-2 md:block md:flex-1 md:overflow-x-visible md:overflow-y-auto">
        {NAV_ITEMS.filter((item) => !item.requiresWrite || canEdit).map((item) => {
          const href = `/project/${projectId}${item.href}`;
          const isActive = pathname === href || (item.href === "" && pathname === `/project/${projectId}`);

          const classes = [
            "flex items-center gap-2.5 border-b-2 px-3 py-2 text-sm transition-colors md:border-b-0 md:border-l-2",
          ];

          if (isActive) {
            classes.push("bg-narra-accent/10 text-narra-accent border-narra-accent");
          } else if (item.accent) {
            classes.push("text-narra-accent/80 hover:text-narra-accent hover:bg-narra-accent/5 border-transparent");
          } else {
            classes.push("text-narra-muted hover:text-narra-text hover:bg-narra-border/30 border-transparent");
          }

          if (collapsed) {
            classes.push("justify-center md:px-0");
          }

          return (
            <Link key={item.href} href={href} className={classes.join(" ")} title={item.label}>
              {item.icon}
              {!collapsed && <span>{labels[item.href] || item.label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
