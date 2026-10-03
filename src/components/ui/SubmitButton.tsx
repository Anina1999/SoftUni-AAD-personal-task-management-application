"use client";

/**
 * Submit button that shows a pending label and disables itself while the
 * parent <form> is submitting, which prevents double submissions.
 */
import { useFormStatus } from "react-dom";

interface SubmitButtonProps {
  children: React.ReactNode;
  /** Label shown while the form is submitting. */
  pendingLabel: string;
  variant?: "primary" | "danger";
}

export function SubmitButton({ children, pendingLabel, variant = "primary" }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={`btn btn-${variant}`}
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
