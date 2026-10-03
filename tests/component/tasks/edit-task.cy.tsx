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
      .should("deep.equal", {
        title: "Buy oat milk",
        description: "2 litres, semi-skimmed",
        priority: 3,
        dueDate: null,
      });
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

describe("Editing a task's priority and due date", () => {
  const planned = buildTask({ id: 8, title: "Book flights", description: "", priority: 1, dueDate: "2026-12-24" });

  beforeEach(() => {
    cy.mount(<TaskCard task={planned} />);
    cy.get('button[aria-label="Edit “Book flights”"]').click();
  });

  it("opens the form pre-filled with the task's priority and due date", () => {
    cy.get("#task-priority").should("have.value", "1");
    cy.get("#task-due-date").should("have.value", "2026-12-24");
    cy.contains("button", "Clear due date").should("be.visible");
  });

  it("keeps the priority and due date when only the title changes", () => {
    stubUpdateTask(planned.id, { statusCode: 200, body: { ...planned, title: "Book trains" } });

    cy.get("#task-title").clear().type("Book trains");
    cy.contains("button", "Save changes").click();

    cy.wait("@updateTask")
      .its("request.body")
      .should("deep.equal", { title: "Book trains", description: "", priority: 1, dueDate: "2026-12-24" });
  });

  it("saves a new priority and due date", () => {
    stubUpdateTask(planned.id, {
      statusCode: 200,
      body: { ...planned, priority: 4, dueDate: "2027-01-15", updatedAt: "2026-10-02T10:30:00.000Z" },
    });

    cy.get("#task-priority").select("4 · Low");
    cy.get("#task-due-date").clear().type("2027-01-15");
    cy.contains("button", "Save changes").click();

    cy.wait("@updateTask")
      .its("request.body")
      .should("deep.equal", { title: "Book flights", description: "", priority: 4, dueDate: "2027-01-15" });
    cy.get("dialog").should("not.exist");
    cy.get('[role="status"]').should("contain", "Saved “Book flights”.");
    cy.get("@router.refresh").should("have.been.calledOnce");
  });

  it("removes the due date", () => {
    stubUpdateTask(planned.id, { statusCode: 200, body: { ...planned, dueDate: null } });

    cy.contains("button", "Clear due date").click();
    cy.get("#task-due-date").should("have.value", "");
    cy.contains("button", "Save changes").click();

    cy.wait("@updateTask")
      .its("request.body")
      .should("deep.equal", { title: "Book flights", description: "", priority: 1, dueDate: null });
    cy.get("dialog").should("not.exist");
  });

  it("shows the API's due date error and keeps the edits", () => {
    stubUpdateTask(
      planned.id,
      apiError(400, "The task is not valid.", { dueDate: "Due date must be a valid date (YYYY-MM-DD)." }),
    );

    cy.get("#task-priority").select("2 · High");
    cy.get("#task-due-date").clear().type("2027-02-01");
    cy.contains("button", "Save changes").click();

    cy.wait("@updateTask");
    cy.get("#task-due-date-error").should("have.text", "Due date must be a valid date (YYYY-MM-DD).");
    cy.get("#task-priority").should("have.value", "2");
    cy.get("#task-due-date").should("have.value", "2027-02-01");
    cy.get("@router.refresh").should("not.have.been.called");
  });
});
