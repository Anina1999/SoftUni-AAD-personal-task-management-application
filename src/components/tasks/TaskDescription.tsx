"use client";

/**
 * Task description preview: clamped to a few lines, with a "Show more"
 * toggle for long text so the full description can be read in place.
 */
import { useState } from "react";
import styles from "./TaskCard.module.css";

/** Rough threshold for "probably longer than the clamped preview". */
const LONG_TEXT_CHARS = 180;
const LONG_TEXT_LINES = 3;

export function TaskDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) {
    return <p className={`${styles.description} ${styles.placeholder}`}>No description</p>;
  }

  const isLong = text.length > LONG_TEXT_CHARS || text.split("\n").length > LONG_TEXT_LINES;

  return (
    <div>
      <p className={`${styles.description} ${expanded ? "" : styles.clamped}`}>{text}</p>
      {isLong && (
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
