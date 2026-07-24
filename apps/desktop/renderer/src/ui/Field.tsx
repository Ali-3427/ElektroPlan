import type { ReactNode } from "react";

import styles from "./Field.module.css";

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}

export function Field({ label, htmlFor, required, hint, error, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={htmlFor} className={`${styles.label} ${required ? styles.required : ""}`}>
        {label}
      </label>
      {children}
      {error ? <div className={styles.error}>{error}</div> : hint ? <div className={styles.hint}>{hint}</div> : null}
    </div>
  );
}

export const fieldGrid = styles.row;
export const fieldGrid3 = styles.row3;
