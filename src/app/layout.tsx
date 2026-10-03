/**
 * Root layout: the shared shell (header + main content area) rendered
 * around every page, plus the toast provider used by task dialogs.
 */
import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Task Manager",
    template: "%s · Task Manager",
  },
  description: "A simple personal task manager.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#271c1e" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <SiteHeader />
          <main className="main container" id="main">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
