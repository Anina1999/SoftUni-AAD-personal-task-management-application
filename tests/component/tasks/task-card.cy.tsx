import { TaskCard } from "@/components/tasks/TaskCard";
import { buildTask } from "../../support/api";

describe("A task card", () => {
  it("shows the priority and the due date", () => {
    cy.mount(<TaskCard task={buildTask({ priority: 1, dueDate: "2026-12-24" })} />);

    cy.get("article").should("contain", "Highest priority");
    cy.get("article").contains("Due").find("time").should("have.attr", "datetime", "2026-12-24").and("have.text", "24 Dec 2026");
  });

  it("shows the default priority and no due date for a task with neither set", () => {
    cy.mount(<TaskCard task={buildTask()} />);

    cy.get("article").should("contain", "Normal priority").and("not.contain", "Due");
  });

  it("names every priority", () => {
    cy.mount(
      <>
        {([1, 2, 3, 4] as const).map((priority) => (
          <TaskCard key={priority} task={buildTask({ id: priority, priority })} />
        ))}
      </>,
    );

    cy.get("article").should(($cards) => {
      expect($cards.toArray().map((card) => card.querySelector("[data-priority]")?.textContent)).to.deep.equal([
        "Highest priority",
        "High priority",
        "Normal priority",
        "Low priority",
      ]);
    });
  });
});
