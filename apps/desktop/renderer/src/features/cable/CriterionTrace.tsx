import type { CandidateEvaluation, CriterionId, CriterionStatus } from "../../bridge/types";
import { formatNumberTr } from "../../i18n/format";
import styles from "./CriterionTrace.module.css";

const CRITERION_LABELS: Record<CriterionId, string> = {
  mechanical: "Mekanik",
  thermal: "Termal",
  device: "Cihaz",
  voltageDrop: "Gerilim",
  pe: "PE",
  shortCircuit: "K.Devre",
  loopImpedance: "Zs",
  neutral: "Nötr",
};

const STATUS_ICON: Record<CriterionStatus, string> = {
  pass: "✓",
  fail: "✕",
  skipped: "⊘",
  "not-applicable": "—",
};

// Friendly labels for the handful of detail keys the engine is known to emit;
// anything else falls back to the raw key so new criteria still render.
const DETAIL_LABELS: Partial<Record<string, string>> = {
  izCorrectedA: "Iz",
  sizingCurrentA: "Ib",
};

function formatDetail(detail: Readonly<Record<string, number | string | null>>): string | undefined {
  const entries = Object.entries(detail);
  if (entries.length === 0) return undefined;
  return entries
    .map(([key, value]) => {
      const label = DETAIL_LABELS[key] ?? key;
      const shown = value === null ? "—" : typeof value === "number" ? formatNumberTr(value) : value;
      return `${label}: ${shown}`;
    })
    .join(" · ");
}

interface CriterionTraceProps {
  trace: readonly CandidateEvaluation[];
  selectedSectionMm2: number;
}

export function CriterionTrace({ trace, selectedSectionMm2 }: CriterionTraceProps) {
  if (trace.length === 0) return null;

  return (
    <div className={styles.trace}>
      <h4 className={styles.heading}>Kriter İzi</h4>
      <div className={styles.list}>
        {trace.map((candidate) => {
          const isSelected = candidate.sectionMm2 === selectedSectionMm2;
          return (
            <div
              key={candidate.sectionMm2}
              data-testid={`candidate-${candidate.sectionMm2}`}
              data-selected={isSelected}
              className={[
                styles.candidate,
                isSelected ? styles.selected : "",
                candidate.accepted ? "" : styles.rejected,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className={styles.candidateHeader}>
                <span className={styles.sectionValue}>
                  {formatNumberTr(candidate.sectionMm2)} mm²
                </span>
                {isSelected && <span className={styles.selectedBadge}>Seçildi</span>}
                {!candidate.accepted && !isSelected && (
                  <span className={styles.rejectedBadge}>
                    Elendi{candidate.failedAt ? ` · ${CRITERION_LABELS[candidate.failedAt]}` : ""}
                  </span>
                )}
              </div>
              <div className={styles.badgeRow}>
                {candidate.criteria.map((criterion) => (
                  <span
                    key={criterion.id}
                    data-testid={`candidate-${candidate.sectionMm2}-${criterion.id}`}
                    data-status={criterion.status}
                    title={formatDetail(criterion.detail)}
                    className={[
                      styles.badge,
                      candidate.failedAt === criterion.id ? styles.failedAtBadge : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className={styles.badgeIcon}>{STATUS_ICON[criterion.status]}</span>
                    <span className={styles.badgeLabel}>{CRITERION_LABELS[criterion.id]}</span>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
