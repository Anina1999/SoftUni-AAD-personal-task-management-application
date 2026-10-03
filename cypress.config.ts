/**
 * Cypress component testing. Specs, support code and run artifacts all live
 * in `tests/`.
 *
 * Components are bundled with Vite (not Next.js) so the dev server starts in
 * a second or two. That works because the client components under test only
 * need React, CSS modules and the `@/` alias; the one Next.js module they
 * use, `next/navigation`, is swapped for a test double that `cy.mount`
 * controls. The API is never called for real: specs answer every request
 * with `cy.intercept` (see `tests/support/api.ts`).
 */
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "cypress";

const fromRoot = (relative: string) => path.resolve(__dirname, relative);

export default defineConfig({
  fixturesFolder: false,
  screenshotsFolder: "tests/.artifacts/screenshots",
  downloadsFolder: "tests/.artifacts/downloads",
  video: false,
  viewportWidth: 1000,
  viewportHeight: 760,

  component: {
    specPattern: "tests/component/**/*.cy.{ts,tsx}",
    supportFile: "tests/support/component.tsx",
    indexHtmlFile: "tests/support/component-index.html",
    // `cypress run`: reuse one browser tab for every spec instead of a fresh tab per spec.
    experimentalSingleTabRunMode: true,
    devServer: {
      framework: "react",
      bundler: "vite",
      viteConfig: {
        configFile: false,
        plugins: [react()],
        resolve: {
          alias: [
            { find: /^next\/navigation$/, replacement: fromRoot("tests/support/next-navigation.tsx") },
            { find: /^@\//, replacement: `${fromRoot("src")}/` },
          ],
        },
        // Pre-bundle these up front so Vite never re-optimises (and reloads) mid-run.
        optimizeDeps: {
          include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
        },
      },
    },
  },
});
