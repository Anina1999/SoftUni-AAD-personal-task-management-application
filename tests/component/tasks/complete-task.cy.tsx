import { TaskCard } from "@/components/tasks/TaskCard";
import { apiError, buildTask, heldResponse, stubUpdateTask } from "../../support/api";

const openTask = buildTask({ id: 7, title: "Buy milk" });
const completedTask = buildTask({ id: 7, title: "Buy milk", completedAt: "2026-10-02T18:30:00.000Z" });
const toggle = 'button[aria-label="Mark “Buy milk” as completed"]';

describe("Completing a task", () => {
  it("shows an empty circle for an open task and a filled one for a completed task", () => {
    cy.mount(
      <>
        <TaskCard task={openTask} />
        <TaskCard task={{ ...completedTask, id: 8 }} />
      </>,
    );

    cy.get(toggle).eq(0).should("have.attr", "aria-pressed", "false").find("circle").should("have.css", "fill", "none");
    cy.get(toggle).eq(1).should("have.attr", "aria-pressed", "true").find("circle").should("not.have.css", "fill", "none");
  });

  it("tints a completed task's card green", () => {
    cy.mount(
      <>
        <TaskCard task={openTask} />
        <TaskCard task={{ ...completedTask, id: 8 }} />
      </>,
    );

    cy.get("article").should(($cards) => {
      const [open, completed] = $cards.toArray().map((card) => getComputedStyle(card).backgroundColor);
      expect(completed).not.to.equal(open);
    });
  });

  it("marks the task as completed straight away, then refreshes the page data", () => {
    const response = heldResponse({ statusCode: 200, body: completedTask });
    stubUpdateTask(openTask.id, response.handler);
    cy.mount(<TaskCard task={openTask} />);

    cy.get(toggle).click();

    cy.get(toggle).should("have.attr", "aria-pressed", "true");
    cy.then(response.release);
    cy.wait("@updateTask").its("request.body").should("deep.equal", { completed: true });
    cy.get("@router.refresh").should("have.been.calledOnce");
  });

  it("reopens a completed task when clicked again", () => {
    stubUpdateTask(completedTask.id, { statusCode: 200, body: openTask });
    cy.mount(<TaskCard task={completedTask} />);

    cy.get(toggle).click();

    cy.wait("@updateTask").its("request.body").should("deep.equal", { completed: false });
    cy.get("@router.refresh").should("have.been.calledOnce");
  });

  it("reverts and shows the error when the change fails", () => {
    stubUpdateTask(openTask.id, apiError(500, "Something went wrong on the server. Please try again."));
    cy.mount(<TaskCard task={openTask} />);

    cy.get(toggle).click();

    cy.wait("@updateTask");
    cy.get('[role="status"]').should("contain", "Something went wrong on the server. Please try again.");
    cy.get(toggle).should("have.attr", "aria-pressed", "false");
  });
});
