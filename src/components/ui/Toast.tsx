"use client";

/**
 * Lightweight toast notifications ("Task created.", "Task deleted.").
 *
 * `ToastProvider` wraps the app (see `app/layout.tsx`); any client component
 * calls `useToast()(message)` to show a message. Messages are announced to
 * screen readers through a polite live region and disappear after a few
 * seconds or when dismissed.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import styles from "./Toast.module.css";

const TOAST_DURATION_MS = 4000;

type ShowToast = (message: string) => void;

const ToastContext = createContext<ShowToast | null>(null);

interface ToastMessage {
  id: number;
  text: string;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const nextId = useRef(0);

  const show = useCallback<ShowToast>((text) => {
    nextId.current += 1;
    setToast({ id: nextId.current, text });
  }, []);

  // Auto-hide; a new toast restarts the timer because its id changes.
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className={styles.toast}>
            <span>{toast.text}</span>
            <button
              type="button"
              className={styles.dismiss}
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

/** Returns a function that shows a toast message. */
export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>.");
  return show;
}
