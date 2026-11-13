"use client";
import { useId, useState, type ReactNode } from "react";
import Modal from "./modal";

export default function HelpPopup({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label={"Aide : "+title} aria-haspopup="dialog" className="inline-flex min-h-8 min-w-8 items-center justify-center text-narra-muted hover:text-narra-accent">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .6-1.5 1-1.5 2.5M12 16v1"/></svg>
    </button>
    <Modal open={open} onClose={() => setOpen(false)} labelledBy={id}>
      <header className="flex items-center justify-between gap-4 border-b border-narra-border p-4"><h2 id={id} className="font-semibold">{title}</h2><button type="button" className="btn-ghost min-h-11" onClick={() => setOpen(false)}>Fermer</button></header>
      <div className="space-y-3 p-5 text-sm leading-relaxed text-narra-muted">{children}</div>
    </Modal>
  </>;
}
