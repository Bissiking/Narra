"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getProjectFormat } from "@/lib/editor-profiles";

interface ProjectNavProps {
  projectId: string;
  projectType: string;
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

export default function ProjectNav({ projectId, projectType }: ProjectNavProps) {
  const pathname = usePathname();
  const format = getProjectFormat(projectType);
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
    <nav className="flex w-full shrink-0 flex-col border-b border-narra-border bg-narra-surface md:w-56 md:border-b-0 md:border-r">
      <div className="border-b border-narra-border px-4 py-3 md:p-4">
        <Link href="/library" className="text-narra-muted hover:text-narra-text text-sm">
          ← Bibliothèque
        </Link>
      </div>

      <div className="flex overflow-x-auto p-2 md:block md:flex-1 md:overflow-x-visible md:overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const href = `/project/${projectId}${item.href}`;
          const isActive = pathname === href || (item.href === "" && pathname === `/project/${projectId}`);

          const classes = [
            "block shrink-0 border-b-2 px-3 py-2 text-sm transition-colors md:border-b-0 md:border-l-2",
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
              {labels[item.href] || item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
