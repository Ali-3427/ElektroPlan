import styles from "./ResultRow.module.css";

interface ResultRowProps {
  label: string;
  value: string;
  highlight?: boolean;
  className?: string;
  valueClassName?: string;
}

export function ResultRow({ label, value, highlight, className, valueClassName }: ResultRowProps) {
  return (
    <div
      className={[styles.resultRow, highlight ? styles.highlight : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={styles.resultLabel}>{label}</span>
      <span className={[styles.resultValue, valueClassName].filter(Boolean).join(" ")}>
        {value}
      </span>
    </div>
  );
}

export const resultGrid = styles.resultGrid;
