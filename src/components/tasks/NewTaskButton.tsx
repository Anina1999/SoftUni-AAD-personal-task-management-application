"use client";

/** Button that opens the "New task" dialog on the current page. */
import { useState } from "react";
import { TaskFormDialog } from "./TaskFormDialog";

export function NewTaskButton({ label = "New task" }: { label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        <span aria-hidden="true">+</span> {label}
      </button>
      {open && <TaskFormDialog onClose={() => setOpen(false)} />}
    </>
  );
}
