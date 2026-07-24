import { usePersistentPageState } from "../shared/usePersistentPageState";
import { CableSelectMode } from "./CableSelectMode";
import { CableRulerMode } from "./CableRulerMode";
import styles from "./CablePage.module.css";

type CableMode = "ruler" | "standard" | "detailed";

function isCableMode(value: unknown): value is CableMode {
  return value === "ruler" || value === "standard" || value === "detailed";
}

const TABS: { mode: CableMode; label: string }[] = [
  { mode: "ruler", label: "Cetvel Modu" },
  { mode: "standard", label: "Hesap Modu" },
  { mode: "detailed", label: "Detaylı Hesap" },
];

export function CablePage() {
  const [mode, setMode] = usePersistentPageState<CableMode>({
    key: "elektroplan.page.cable.mode",
    version: 2, // v1 "detailed" eski motoru işaret ediyordu; sürüm artışı stale değeri sıfırlar
    defaultValue: "ruler",
    validate: isCableMode,
  });

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Kablo Kesiti Seçimi</h1>
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.mode}
            type="button"
            className={`${styles.tab} ${mode === tab.mode ? styles.active : ""}`}
            onClick={() => setMode(tab.mode)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {mode === "ruler" ? <CableRulerMode /> : <CableSelectMode key={mode} mode={mode} />}
    </div>
  );
}
