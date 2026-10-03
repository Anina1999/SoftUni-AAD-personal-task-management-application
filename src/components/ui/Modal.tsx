"use client";

/**
 * Accessible modal dialog built on the native `<dialog>` element.
 *
 * The browser provides the hard parts: focus is trapped inside the dialog,
 * the rest of the page is inert, and Escape closes it. On top of that this
 * component closes on a backdrop click and returns focus to the element
 * that opened the dialog. The element marked with `data-autofocus` (or,
 * failing that, the browser's default choice) receives focus on open.
 *
 * The dialog is portalled to <body> so containment/overflow styles on the
 * component that opens it (e.g. a list card) can never clip it.
 *
 * Usage: render it only while it should be open (`{open && <Modal …/>}`),
 * so its contents (e.g. form state) start fresh every time.
 */
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./Modal.module.css";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** `alertdialog` for confirmations that need a decision (e.g. delete). */
  role?: "dialog" | "alertdialog";
  size?: "md" | "sm";
}

export function Modal({ title, onClose, children, role = "dialog", size = "md" }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement as HTMLElement | null;
    if (dialog && !dialog.open) dialog.showModal();
    // React's autoFocus runs before showModal(), which then moves focus to the
    // first focusable element (the close button), so focus explicitly instead.
    dialog?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      // Return focus to the button that opened the dialog (if it still exists).
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      role={role}
      aria-labelledby={titleId}
      className={`${styles.dialog} ${size === "sm" ? styles.small : ""}`}
      // Escape key: let React state drive closing instead of the browser.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // A click on the dialog element itself (not its content) is a backdrop click.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.content}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        {children}
      </div>
    </dialog>,
    document.body,
  );
}
