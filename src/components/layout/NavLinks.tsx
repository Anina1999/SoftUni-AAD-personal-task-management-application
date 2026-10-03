"use client";

/**
 * Main navigation links. Highlights the current section and marks it with
 * `aria-current="page"`. New sections are added by extending `NAV_ITEMS`.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SiteHeader.module.css";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/tasks", label: "Tasks" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main">
      <ul className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`${styles.navLink} ${active ? styles.active : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
