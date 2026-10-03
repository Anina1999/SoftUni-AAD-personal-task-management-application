"use client";

/**
 * Modal dialog for creating or editing a task on the current page.
 * On success it shows a toast, refreshes the page's server-rendered data (so
 * lists and counts update), and closes.
 */
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Task } from "@/lib/tasks/types";
import { TaskForm } from "./TaskForm";

interface TaskFormDialogProps {
  /** The task to edit; omit to create a new one. */
  task?: Task;
  onClose: () => void;
}

export function TaskFormDialog({ task, onClose }: TaskFormDialogProps) {
  const toast = useToast();
  const router = useRouter();

  return (
    <Modal title={task ? "Edit task" : "New task"} onClose={onClose}>
      <TaskForm
        task={task}
        onCancel={onClose}
        onSuccess={(saved) => {
          toast(task ? `Saved “${saved.title}”.` : `Created “${saved.title}”.`);
          router.refresh();
          onClose();
        }}
      />
    </Modal>
  );
}
