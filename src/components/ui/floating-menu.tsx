"use client";
import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";

/** The browser top layer keeps menus outside panel overflow while preserving theme inheritance. */
export default function FloatingMenu({ open, onClose, anchor, className, children }: {
  open: boolean; onClose: () => void; anchor: RefObject<HTMLElement>; className: string; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useLayoutEffect(() => {
    const menu = ref.current;
    if (!open || !menu) return;
    menu.setAttribute("popover", "auto");
    menu.showPopover();
    const position = () => {
      const button = anchor.current?.getBoundingClientRect();
      if (!button) return;
      const below = innerHeight - button.bottom - 12;
      const above = button.top - 12;
      const useAbove = below < Math.min(menu.scrollHeight, 320) && above > below;
      menu.style.position = "fixed";
      menu.style.margin = "0";
      menu.style.maxWidth = "calc(100vw - 24px)";
      menu.style.maxHeight = Math.max(80, useAbove ? above : below)+"px";
      menu.style.overflowY = "auto";
      menu.style.inset = "auto";
      menu.style.left = Math.max(12, Math.min(button.left, innerWidth-menu.offsetWidth-12))+"px";
      if (useAbove) menu.style.bottom = innerHeight-button.top+6+"px";
      else menu.style.top = button.bottom+6+"px";
    };
    const toggle = (event: Event) => { if ((event as ToggleEvent).newState === "closed") close.current(); };
    position(); menu.addEventListener("toggle", toggle);
    window.addEventListener("resize", position); window.addEventListener("scroll", position, true);
    return () => { menu.removeEventListener("toggle", toggle); menu.hidePopover(); window.removeEventListener("resize", position); window.removeEventListener("scroll", position, true); };
  }, [open, anchor]);
  return open ? <div ref={ref} className={className}>{children}</div> : null;
}
