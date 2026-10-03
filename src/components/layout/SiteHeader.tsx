/**
 * Site-wide header: the app logo/name (links to Home) and the main navigation.
 */
import Link from "next/link";
import { NavLinks } from "./NavLinks";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">
            ✓
          </span>
          Task Manager
        </Link>
        <NavLinks />
      </div>
    </header>
  );
}
