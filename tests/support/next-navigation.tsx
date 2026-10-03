/**
 * Test double for `next/navigation`, swapped in by the Vite alias in
 * `cypress.config.ts`.
 *
 * `cy.mount` puts a router made of Cypress stubs into `RouterContext`, so a
 * spec can assert on navigation, e.g.
 * `cy.get("@router.refresh").should("have.been.calledOnce")`.
 */
import { createContext, useContext } from "react";
import type { useRouter as useNextRouter } from "next/navigation";

type AppRouter = ReturnType<typeof useNextRouter>;

export const RouterContext = createContext<AppRouter | null>(null);

/** A router whose methods are stubs aliased as `@router.<method>`. */
export function createRouterStub(): AppRouter {
  return {
    back: cy.stub().as("router.back"),
    forward: cy.stub().as("router.forward"),
    refresh: cy.stub().as("router.refresh"),
    push: cy.stub().as("router.push"),
    replace: cy.stub().as("router.replace"),
    prefetch: cy.stub().as("router.prefetch"),
    bfcacheId: "test",
  };
}

export function useRouter(): AppRouter {
  const router = useContext(RouterContext);
  if (!router) throw new Error("useRouter() needs the router that cy.mount() provides.");
  return router;
}
