"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./modal.module.css";

/** Native modal focus, Escape and inert background; outside clipped Studio panels. */
export default function Modal({ open, onClose, labelledBy, children, className = "" }: {
  open: boolean; onClose: () => void; labelledBy: string; children: ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previousOverflow = document.body.style.overflow;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; if (opener?.isConnected) opener.focus({preventScroll:true}); };
  }, [open]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(<dialog ref={ref} aria-labelledby={labelledBy} className={styles.modal+" "+className}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}>{children}</dialog>, document.fullscreenElement || document.body);
}
