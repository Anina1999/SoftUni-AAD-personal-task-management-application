"use client";

/**
 * Circled tick that marks a task as completed (filled green) or reopens it
 * (outline). The new state shows straight away; if the request fails it
 * reverts and the error is shown as a toast.
 */
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { setTaskCompleted } from "@/lib/tasks/api-client";
import type { Task } from "@/lib/tasks/types";
import styles from "./CompleteTaskToggle.module.css";

export function CompleteTaskToggle({ task }: { task: Task }) {
  const toast = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [completed, setOptimisticCompleted] = useOptimistic(task.completedAt !== null);

  function toggle() {
    // One request at a time, so responses can't arrive out of order.
    if (isPending) return;
    const next = !completed;
    startTransition(async () => {
      setOptimisticCompleted(next);
      const result = await setTaskCompleted(task.id, next);
      if (!result.ok) toast(result.error);
      // Also on a 404, so a task deleted elsewhere disappears from the list.
      startTransition(() => router.refresh());
    });
  }

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-pressed={completed}
      aria-busy={isPending || undefined}
      aria-label={`Mark “${task.title}” as completed`}
      title={completed ? "Completed — click to reopen" : "Mark as completed"}
    >
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <circle className={styles.circle} cx="12" cy="12" r="10" />
        <path className={styles.tick} d="m7.5 12.5 3 3 6-6.5" />
      </svg>
    </button>
  );
}
