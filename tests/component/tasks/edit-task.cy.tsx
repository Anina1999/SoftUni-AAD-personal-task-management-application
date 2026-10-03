import { TaskCard } from "@/components/tasks/TaskCard";
import { apiError, buildTask, heldResponse, stubUpdateTask } from "../../support/api";

const task = buildTask({ id: 7, title: "Buy milk", description: "2 litres, semi-skimmed" });

describe("Editing a task", () => {
  beforeEach(() => {
    cy.mount(<TaskCard task={task} />);
    cy.get('button[aria-label="Edit “Buy milk”"]').click();
  });

  it("opens the form pre-filled with the task", () => {
    cy.get("dialog").should("contain", "Edit task");
    cy.get("#task-title").should("have.value", "Buy milk").and("be.focused");
    cy.get("#task-description").should("have.value", "2 litres, semi-skimmed");
    cy.get("#task-title-count").should("have.text", "8/200");
  });

  it("saves the changes, confirms them and refreshes the page data", () => {
    stubUpdateTask(task.id, {
      statusCode: 200,
      body: { ...task, title: "Buy oat milk", updatedAt: "2026-10-02T10:30:00.000Z" },
    });

    cy.get("#task-title").clear().type("Buy oat milk");
    cy.contains("button", "Save changes").click();

    cy.wait("@updateTask")
      .its("request.body")
      .should("deep.equal", { title: "Buy oat milk", description: "2 litres, semi-skimmed" });
    cy.get("dialog").should("not.exist");
    cy.get('[role="status"]').should("contain", "Saved “Buy oat milk”.");
    cy.get("@router.refresh").should("have.been.calledOnce");
  });

  it("disables the submit button while the request is in flight", () => {
    const response = heldResponse({ statusCode: 200, body: task });
    stubUpdateTask(task.id, response.handler);

    cy.contains("button", "Save changes").click();

    cy.contains("button", "Saving…").should("be.disabled");
    cy.then(response.release);
    cy.get("dialog").should("not.exist");
  });

  it("shows the API's validation errors and keeps the edits", () => {
    stubUpdateTask(task.id, apiError(400, "The task is not valid.", { title: "Title is required." }));

    cy.get("#task-title").clear();
    cy.get("#task-description").clear().type("Changed my mind");
    cy.contains("button", "Save changes").click();

    cy.wait("@updateTask");
    cy.get("#task-title-error").should("have.text", "Title is required.");
    cy.get("#task-description").should("have.value", "Changed my mind");
    cy.get("@router.refresh").should("not.have.been.called");
  });

  it("explains when the task was deleted in the meantime", () => {
    stubUpdateTask(task.id, apiError(404, "Task not found. It may have been deleted."));

    cy.contains("button", "Save changes").click();

    cy.get('dialog [role="alert"]').should(
      "have.text",
      "This task no longer exists. It may have been deleted.",
    );
    cy.get("@router.refresh").should("not.have.been.called");
  });

  it("shows a generic error when the server answers with something unexpected", () => {
    stubUpdateTask(task.id, { statusCode: 502, body: "<html>Bad gateway</html>" });

    cy.contains("button", "Save changes").click();

    cy.get('dialog [role="alert"]').should("contain", "The server sent an unexpected response.");
    cy.get("dialog").should("exist");
  });

  it("closes without sending anything when cancelled", () => {
    cy.get("#task-title").clear().type("Not saved");
    cy.contains("button", "Cancel").click();

    cy.get("dialog").should("not.exist");
    cy.get("article h3").should("have.text", "Buy milk");
    cy.get("@router.refresh").should("not.have.been.called");
  });
});
