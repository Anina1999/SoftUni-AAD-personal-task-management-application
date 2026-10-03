/**
 * Runs before every component spec.
 *
 * - `cy.mount` renders a component inside the providers the app layout
 *   gives it: the toast provider and a stubbed router (see
 *   `next-navigation.tsx`).
 * - Any `/api/` request a spec has not stubbed fails the test, so no spec
 *   can depend on a server or on data left behind by another spec.
 */
import { mount, type MountOptions, type MountReturn } from "cypress/react";
import type { ReactNode } from "react";
import "@/app/globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { createRouterStub, RouterContext } from "./next-navigation";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Cypress's own typings are a namespace.
  namespace Cypress {
    interface Chainable {
      /** Mounts a component inside the app's providers (toasts and a stubbed router). */
      mount(component: ReactNode, options?: MountOptions): Chainable<MountReturn>;
    }
  }
}

Cypress.Commands.add("mount", (component: ReactNode, options?: MountOptions) =>
  mount(
    <RouterContext value={createRouterStub()}>
      <ToastProvider>{component}</ToastProvider>
    </RouterContext>,
    options,
  ),
);

// Type at full speed; the default 10 ms between keystrokes adds up fast.
Cypress.Keyboard.defaults({ keystrokeDelay: 0 });

beforeEach(() => {
  // Registered first, so every stub a spec adds takes precedence over it.
  cy.intercept("/api/**", (request) => {
    throw new Error(`Unstubbed API request: ${request.method} ${request.url}`);
  });
});
