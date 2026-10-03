"use client";

/**
 * Modal dialog for creating or editing a task on the current page.
 * On success it shows a toast and closes; the Server Action revalidates the
 * page, so lists and counts refresh automatically.
 */
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

  return (
    <Modal title={task ? "Edit task" : "New task"} onClose={onClose}>
      <TaskForm
        task={task}
        onCancel={onClose}
        onSuccess={(saved) => {
          toast(task ? `Saved “${saved.title}”.` : `Created “${saved.title}”.`);
          onClose();
        }}
      />
    </Modal>
  );
}
