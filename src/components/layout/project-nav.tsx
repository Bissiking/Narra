"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface ProjectNavProps {
  projectId: string;
}

const NAV_ITEMS = [
  { href: "", label: "Vue d'ensemble" },
  { href: "/structure", label: "Structure" },
  { href: "/scenes", label: "Écriture" },
  { href: "/characters", label: "Personnages" },
  { href: "/locations", label: "Lieux" },
  { href: "/organizations", label: "Organisations" },
  { href: "/lore", label: "Lore" },
  { href: "/timeline", label: "Timeline" },
  { href: "/media", label: "Médias" },
  { href: "/analysis", label: "Répétitions" },
  { href: "/presentation", label: "Page histoire" },
  { href: "/search", label: "Recherche" },
  { href: "/settings", label: "Paramètres" },
];

export default function ProjectNav({ projectId }: ProjectNavProps) {
  const pathname = usePathname();

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

          return (
            <Link
              key={item.href}
              href={href}
              className={`block px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-narra-accent/10 text-narra-accent border-l-2 border-narra-accent"
                  : "text-narra-muted hover:text-narra-text hover:bg-narra-border/30"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
