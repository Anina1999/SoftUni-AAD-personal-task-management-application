import { NewTaskButton } from "@/components/tasks/NewTaskButton";
import { apiError, buildTask, heldResponse, stubCreateTask } from "../../support/api";

describe("Creating a task", () => {
  beforeEach(() => {
    cy.mount(<NewTaskButton />);
    cy.contains("button", "New task").click();
  });

  it("opens an empty form with the title focused", () => {
    cy.get("dialog").should("contain", "New task");
    cy.get("#task-title").should("have.value", "").and("be.focused");
    cy.get("#task-description").should("have.value", "");
    cy.get("#task-title-count").should("have.text", "0/200");
  });

  it("sends the task to the API, confirms it and refreshes the page data", () => {
    stubCreateTask({
      statusCode: 201,
      body: buildTask({ id: 42, title: "Water plants", description: "Ferns first" }),
    });

    cy.get("#task-title").type("Water plants");
    cy.get("#task-description").type("Ferns first");
    cy.contains("button", "Create task").click();

    cy.wait("@createTask").then(({ request }) => {
      expect(request.headers["content-type"]).to.equal("application/json");
      expect(request.body).to.deep.equal({ title: "Water plants", description: "Ferns first" });
    });
    cy.get("dialog").should("not.exist");
    cy.get('[role="status"]').should("contain", "Created “Water plants”.");
    cy.get("@router.refresh").should("have.been.calledOnce");
  });

  it("disables the submit button while the request is in flight", () => {
    const response = heldResponse({ statusCode: 201, body: buildTask() });
    stubCreateTask(response.handler);

    cy.get("#task-title").type("Buy milk");
    cy.contains("button", "Create task").click();

    cy.contains("button", "Creating…").should("be.disabled");
    cy.then(response.release);
    cy.get("dialog").should("not.exist");
  });

  it("shows the API's validation errors and keeps what the user typed", () => {
    stubCreateTask(apiError(400, "The task is not valid.", { title: "Title is required." }));

    cy.get("#task-description").type("No title yet");
    cy.contains("button", "Create task").click();

    cy.wait("@createTask");
    cy.get("#task-title").should("have.attr", "aria-invalid", "true");
    cy.get("#task-title-error").should("have.text", "Title is required.");
    cy.get("#task-description").should("have.value", "No title yet");
    cy.get("dialog").should("exist");
    cy.get("@router.refresh").should("not.have.been.called");
  });

  it("reports a network failure inside the dialog", () => {
    stubCreateTask({ forceNetworkError: true });

    cy.get("#task-title").type("Buy milk");
    cy.contains("button", "Create task").click();

    cy.get('dialog [role="alert"]').should("contain", "Could not reach the server.");
    cy.get("#task-title").should("have.value", "Buy milk");
    cy.get("@router.refresh").should("not.have.been.called");
  });

  it("closes without sending anything when cancelled", () => {
    cy.get("#task-title").type("Never mind");
    cy.contains("button", "Cancel").click();

    cy.get("dialog").should("not.exist");
    cy.get('[role="status"]').should("be.empty");
    cy.get("@router.refresh").should("not.have.been.called");
  });
});
