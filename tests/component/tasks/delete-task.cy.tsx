import { TaskCard } from "@/components/tasks/TaskCard";
import { apiError, buildTask, heldResponse, stubDeleteTask } from "../../support/api";

const task = buildTask({ id: 7, title: "Buy milk" });

describe("Deleting a task", () => {
  beforeEach(() => {
    cy.mount(<TaskCard task={task} />);
    cy.get('button[aria-label="Delete “Buy milk”"]').click();
  });

  it("asks for confirmation, naming the task, with Cancel focused", () => {
    cy.get('dialog[role="alertdialog"]')
      .should("contain", "Delete task?")
      .and("contain", "“Buy milk” will be permanently deleted.");
    cy.get("dialog").contains("button", "Cancel").should("be.focused");
  });

  it("deletes the task, confirms it and refreshes the page data", () => {
    stubDeleteTask(task.id, { statusCode: 204 });

    cy.get("dialog").contains("button", "Delete").click();

    cy.wait("@deleteTask");
    cy.get("dialog").should("not.exist");
    cy.get('[role="status"]').should("contain", "Deleted “Buy milk”.");
    cy.get("@router.refresh").should("have.been.calledOnce");
  });

  it("disables the delete button while the request is in flight", () => {
    const response = heldResponse({ statusCode: 204 });
    stubDeleteTask(task.id, response.handler);

    cy.get("dialog").contains("button", "Delete").click();

    cy.get("dialog").contains("button", "Deleting…").should("be.disabled");
    cy.then(response.release);
    cy.get("dialog").should("not.exist");
  });

  it("treats a task that is already gone as deleted", () => {
    stubDeleteTask(task.id, apiError(404, "Task not found. It may have been deleted."));

    cy.get("dialog").contains("button", "Delete").click();

    cy.get("dialog").should("not.exist");
    cy.get('[role="status"]').should("contain", "Deleted “Buy milk”.");
    cy.get("@router.refresh").should("have.been.calledOnce");
  });

  it("keeps the dialog open and shows the error when deletion fails", () => {
    stubDeleteTask(task.id, apiError(500, "Something went wrong on the server. Please try again."));

    cy.get("dialog").contains("button", "Delete").click();

    cy.get('dialog [role="alert"]').should(
      "have.text",
      "Something went wrong on the server. Please try again.",
    );
    cy.get('[role="status"]').should("be.empty");
    cy.get("@router.refresh").should("not.have.been.called");
  });

  it("closes without sending anything when cancelled", () => {
    cy.get("dialog").contains("button", "Cancel").click();

    cy.get("dialog").should("not.exist");
    cy.get("@router.refresh").should("not.have.been.called");
  });
});
