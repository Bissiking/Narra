"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface ProjectNavProps {
  projectId: string;
}

interface NavItem {
  href: string;
  label: string;
  accent?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "", label: "Vue d'ensemble" },
  { href: "/read", label: "Lire", accent: true },
  { href: "/edit", label: "Éditer", accent: true },
  { href: "/structure", label: "Structure" },
  { href: "/characters", label: "Personnages" },
  { href: "/locations", label: "Lieux" },
  { href: "/organizations", label: "Organisations" },
  { href: "/lore", label: "Lore" },
  { href: "/timeline", label: "Timeline" },
  { href: "/media", label: "Médias" },
  { href: "/analysis", label: "Répétitions" },
  { href: "/presentation", label: "Page histoire" },
  { href: "/share", label: "Partager" },
  { href: "/search", label: "Recherche" },
  { href: "/settings", label: "Paramètres" },
];

export default function ProjectNav({ projectId }: ProjectNavProps) {
  const pathname = usePathname();

  if (pathname === `/project/${projectId}/read`) return null;

  return (
    <nav className="w-56 border-r border-narra-border bg-narra-surface flex flex-col">
      <div className="p-4 border-b border-narra-border">
        <Link href="/library" className="text-narra-muted hover:text-narra-text text-sm">
          ← Bibliothèque
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => {
          const href = `/project/${projectId}${item.href}`;
          const isActive = pathname === href || (item.href === "" && pathname === `/project/${projectId}`);

          const classes = [
            "block px-3 py-2 text-sm transition-colors border-l-2",
          ];

          if (isActive) {
            classes.push("bg-narra-accent/10 text-narra-accent border-narra-accent");
          } else if (item.accent) {
            classes.push("text-narra-accent/80 hover:text-narra-accent hover:bg-narra-accent/5 border-transparent");
          } else {
            classes.push("text-narra-muted hover:text-narra-text hover:bg-narra-border/30 border-transparent");
          }

          return (
            <Link key={item.href} href={href} className={classes.join(" ")}>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
