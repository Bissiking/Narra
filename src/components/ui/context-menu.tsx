"use client";
import { useLayoutEffect, useRef, type ReactNode } from "react";
/** A native popover keeps context actions above the Studio's clipped panels. */
export default function ContextMenu({
  point,
  onClose,
  children,
  className,
}: {
  point: { x: number; y: number };
  onClose: () => void;
  children: ReactNode;
  className: string;
}) {
  const ref = useRef<HTMLDivElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useLayoutEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    menu.setAttribute("popover", "auto");
    menu.showPopover();
    Object.assign(menu.style, {
      position: "fixed",
      margin: "0",
      inset: "auto",
      left:
        Math.max(8, Math.min(point.x, innerWidth - menu.offsetWidth - 8)) +
        "px",
      top:
        Math.max(8, Math.min(point.y, innerHeight - menu.offsetHeight - 8)) +
        "px",
      maxHeight: "calc(100dvh - 16px)",
      overflowY: "auto",
    });
    menu.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    const toggle = (e: Event) => {
      if ((e as ToggleEvent).newState === "closed") close.current();
    };
    menu.addEventListener("toggle", toggle);
    return () => {
      menu.removeEventListener("toggle", toggle);
      menu.hidePopover();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [point]);
  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Actions sur la sélection"
      className={className}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          const buttons = [
              ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
                "button:not(:disabled)",
              ),
            ],
            i = buttons.indexOf(document.activeElement as HTMLButtonElement);
          buttons[
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? buttons.length - 1
                : (i + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) %
                  buttons.length
          ]?.focus();
        }
      }}
    >
      {children}
    </div>
  );
}
