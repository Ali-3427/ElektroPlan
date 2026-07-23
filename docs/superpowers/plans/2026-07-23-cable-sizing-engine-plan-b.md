# Kablo Hesap Motoru — Plan B (Detaylı Mod) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `cable-sizing` motorunun **detaylı modunu** tamamla — cihaz koordinasyonu, PE iletkeni, kısa devre adyabatik, çevrim empedansı ve nötr kriterlerini datasetleriyle birlikte devreye al.

**Architecture:** Plan A'nın kurduğu kriter zincirine 5 yeni saf-fonksiyon kriter eklenir. `evaluate-candidate.ts`'teki `not-applicable` else dalı gerçek değerlendiricilerle değiştirilir ve zincir **ara durum** taşır (adım 3'ten `In`, adım 5'ten `S_PE`). Standart mod davranışı **değişmez**.

**Tech Stack:** TypeScript (ESM, `.js` import uzantıları zorunlu), vitest (globals: `describe/it/expect`), pnpm workspaces + turbo.

## Global Constraints

- Standart kapsamı **yalnız IEC 60364 / TS HD 60364** (v1), `decisions.md:48`.
- `calculation-core` **asla** `electron`, `react`, `better-sqlite3`, `fs` import etmez (master plan §9).
- Hiçbir formül duplike edilmez; ΔU tek yerde (`voltage-drop/`).
- Ruleset tabloları **asla** core'a hardcode edilmez; `calculation-data` accessor'larından okunur (`decisions.md:63`).
- Her dataset dosyası `DatasetMetadata { id, standard, revision, source, validFrom, notes }` taşır (`decisions.md:62`).
- Çıktı sözleşmesi `CalculationResult<T>` şekli değişmez (`[LOCKED] §2.5`).
- Fiziksel sabitler frozen (`decisions.md:5`): `ALPHA_COPPER_20=0.00393`, `ALPHA_ALUMINUM_20=0.00403`.
- Montaj metot seti `{A1, A2, B1, B2, C, D1, D2}` — genişletilmez.
- Veri güven değerleri: `"verified" | "draft" | "missing"`.
- Ondalık: JSON'da nokta (`14.5`).
- **Standart mod regresyonu:** `ACTIVE_CRITERIA.standard` ve mevcut `cable-sizing/index.test.ts` testleri her task sonunda yeşil kalmalı.
- Kaynak veriler: [`Plan/VERILER.md`](../../../Plan/VERILER.md). Sayı uydurma yok.
- Test komutu: `pnpm --filter @elektroplan/calculation-data test <isim>` / `pnpm --filter @elektroplan/calculation-core test <isim>`.

## Plan A'dan devralınan gerçek imzalar

Bu plandaki her `Consumes` bloğu aşağıdaki **mevcut** koda dayanır (doğrulandı):

```typescript
// cable-sizing/types.ts
type CriterionId = "mechanical"|"thermal"|"device"|"voltageDrop"|"pe"|"shortCircuit"|"loopImpedance"|"neutral";
type CriterionStatus = "pass" | "fail" | "not-applicable" | "skipped";
interface CriterionOutcome { id: CriterionId; status: CriterionStatus; detail: Readonly<Record<string, number|string|null>>; }
interface CandidateEvaluation { sectionMm2: number; criteria: readonly CriterionOutcome[]; failedAt: CriterionId|null; accepted: boolean; }
const ACTIVE_CRITERIA: Record<CableSizingMode, readonly CriterionId[]>;  // detailed = 8 kriter, sıralı

// cable-sizing/evaluate-candidate.ts
interface CandidateContext { mode; sectionMm2; material; insulation; circuitKind; ampacityKey; method; kTotal; sizingCurrentA; input; }
interface CandidateResult extends CandidateEvaluation { vdResult: VoltageDropResult | null; }
function evaluateCandidate(ctx: CandidateContext): CandidateResult;

// cable-sizing/correction.ts
interface CorrectionResult { kT: number; kG: number; kH: number; kTotal: number; }
function computeCorrection(input: CableSelectionInput, kH: number): CorrectionResult;

// calculation-data
function getResistance20(material: "copper"|"aluminum", sectionMm2: number): number | null | undefined;
function getReactance(arrangement: ConductorArrangement, sectionMm2: number): number | null | undefined;
function getCableCrossSections(key: CableAmpacityKey): readonly number[];
function lookupProtectionDevice(query: ProtectionDeviceLookupQuery): readonly ProtectionCatalogEntry[];
```

---

## Dosya Haritası

**calculation-data (yeni):**
```
packages/calculation-data/src/iec/
  adiabatic-k/                  # YENİ — IEC 60364-5-54 A.54.2/A.54.4
  pe-conductor-table/           # YENİ — Tablo 54.2
  disconnection-times/          # YENİ — IEC 60364-4-41 Tablo 41.1
  breaker-trip-multipliers/     # YENİ — IEC 60898-1 B/C/D
  soil-resistivity-factors/     # YENİ — B.52.16
  protection-catalog/           # DEĞİŞTİR — i2Multiplier + opsiyonel I²t/trip alanları
```

**calculation-core:**
```
packages/calculation-core/src/cable-sizing/
  types.ts                      # DEĞİŞTİR — DetailedOptions + Output alanları
  validate.ts                   # DEĞİŞTİR — detaylı mod girdi doğrulaması
  correction.ts                 # DEĞİŞTİR — kS (+kD placeholder) ekle
  evaluate-candidate.ts         # DEĞİŞTİR — else dalını gerçek kriterlerle değiştir, zincir durumu
  select.ts                     # DEĞİŞTİR — detaylı çıktı alanları + assumption birleştirme
  criteria/
    device-coordination.ts      # YENİ — kriter 3
    pe-conductor.ts             # YENİ — kriter 5
    short-circuit.ts            # YENİ — kriter 6
    loop-impedance.ts           # YENİ — kriter 7
    neutral-conductor.ts        # YENİ — kriter 8
```

**Değişmeyen:** `cable/`, `voltage-drop/`, `protection/` (core, recommendation-only guard korunur), `motor/`, `criteria/{mechanical-min,thermal,voltage-drop}.ts`.

---

## Bölüm 1 — Detaylı mod datasetleri

### Task 1: Adyabatik k sabitleri

**Files:**
- Create: `packages/calculation-data/src/iec/adiabatic-k/{types,dataset,accessors,index}.ts`, `data.json`
- Modify: `packages/calculation-data/src/iec/index.ts`
- Test: `.../adiabatic-k/accessors.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  type AdiabaticRole = "line" | "pe-bunched";
  function getAdiabaticK(args: { material: "copper"|"aluminum"; insulation: "PVC"|"XLPE/EPR"; role: AdiabaticRole; sectionMm2: number }): number | undefined;
  ```

- [ ] **Step 1: Failing test** (VERILER.md §7 — birincil doğrulanmış)

```typescript
import { getAdiabaticK } from "./index.js";

describe("adiabatic k", () => {
  it("returns line constants (Table A.54.4)", () => {
    expect(getAdiabaticK({ material: "copper", insulation: "PVC", role: "line", sectionMm2: 16 })).toBe(115);
    expect(getAdiabaticK({ material: "copper", insulation: "XLPE/EPR", role: "line", sectionMm2: 16 })).toBe(143);
    expect(getAdiabaticK({ material: "aluminum", insulation: "PVC", role: "line", sectionMm2: 16 })).toBe(76);
    expect(getAdiabaticK({ material: "aluminum", insulation: "XLPE/EPR", role: "line", sectionMm2: 16 })).toBe(94);
  });

  it("returns pe-bunched constants (Table A.54.2, 30C start)", () => {
    expect(getAdiabaticK({ material: "copper", insulation: "PVC", role: "pe-bunched", sectionMm2: 16 })).toBe(143);
    expect(getAdiabaticK({ material: "copper", insulation: "XLPE/EPR", role: "pe-bunched", sectionMm2: 16 })).toBe(176);
    expect(getAdiabaticK({ material: "aluminum", insulation: "XLPE/EPR", role: "pe-bunched", sectionMm2: 16 })).toBe(116);
  });

  it("uses the reduced constant above 300 mm² for PVC", () => {
    expect(getAdiabaticK({ material: "copper", insulation: "PVC", role: "line", sectionMm2: 400 })).toBe(103);
    expect(getAdiabaticK({ material: "aluminum", insulation: "PVC", role: "line", sectionMm2: 400 })).toBe(68);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-data test adiabatic-k`

- [ ] **Step 3: Implement**

```typescript
// types.ts
import type { DatasetWithMetadata } from "../../dataset/types.js";

export const ADIABATIC_ROLES = ["line", "pe-bunched"] as const;
export type AdiabaticRole = (typeof ADIABATIC_ROLES)[number];

export interface AdiabaticKEntry {
  material: "copper" | "aluminum";
  insulation: "PVC" | "XLPE/EPR";
  role: AdiabaticRole;
  initialTempC: number;
  finalTempC: number;
  k: number;
  /** Applies when section > this value; null means the base row. */
  aboveSectionMm2: number | null;
}

export interface AdiabaticKDataset extends DatasetWithMetadata {
  entries: readonly AdiabaticKEntry[];
}

export interface AdiabaticKQuery {
  material: "copper" | "aluminum";
  insulation: "PVC" | "XLPE/EPR";
  role: AdiabaticRole;
  sectionMm2: number;
}
```

```typescript
// dataset.ts
import raw from "./data.json" with { type: "json" };
import { loadJsonDataset } from "../../dataset/load-json-dataset.js";
import type { AdiabaticKDataset } from "./types.js";

export const adiabaticKDataset: Readonly<AdiabaticKDataset> = loadJsonDataset(
  raw as AdiabaticKDataset,
  "packages/calculation-data/src/iec/adiabatic-k/data.json",
);
```

```typescript
// accessors.ts
import { adiabaticKDataset } from "./dataset.js";
import type { AdiabaticKQuery } from "./types.js";

export function getAdiabaticK(query: AdiabaticKQuery): number | undefined {
  const matches = adiabaticKDataset.entries.filter(
    (e) =>
      e.material === query.material &&
      e.insulation === query.insulation &&
      e.role === query.role,
  );
  if (matches.length === 0) return undefined;

  // Prefer the most specific "above" row that the section exceeds.
  const above = matches
    .filter((e) => e.aboveSectionMm2 !== null && query.sectionMm2 > e.aboveSectionMm2)
    .sort((a, b) => (b.aboveSectionMm2 as number) - (a.aboveSectionMm2 as number))[0];
  if (above !== undefined) return above.k;

  return matches.find((e) => e.aboveSectionMm2 === null)?.k;
}
```

```typescript
// index.ts
export { getAdiabaticK } from "./accessors.js";
export { adiabaticKDataset } from "./dataset.js";
export {
  ADIABATIC_ROLES,
  type AdiabaticRole,
  type AdiabaticKDataset,
  type AdiabaticKEntry,
  type AdiabaticKQuery,
} from "./types.js";
```

- [ ] **Step 4: Create `data.json`** (VERILER.md §7 — tüm değerler birincil doğrulanmış)

```json
{
  "metadata": {
    "id": "iec-60364-5-54-adiabatic-k-v1",
    "standard": "IEC 60364-5-54",
    "revision": "v1",
    "source": "Tablo A.54.4 (line) + Tablo A.54.2 (pe-bunched)",
    "validFrom": "2026-07-23",
    "notes": "line = kablo ici cekirdek, baslangic = calisma sicakligi. pe-bunched = ayri PE, baslangic 30C."
  },
  "entries": [
    { "material": "copper", "insulation": "PVC", "role": "line", "initialTempC": 70, "finalTempC": 160, "k": 115, "aboveSectionMm2": null },
    { "material": "copper", "insulation": "PVC", "role": "line", "initialTempC": 70, "finalTempC": 140, "k": 103, "aboveSectionMm2": 300 },
    { "material": "copper", "insulation": "XLPE/EPR", "role": "line", "initialTempC": 90, "finalTempC": 250, "k": 143, "aboveSectionMm2": null },
    { "material": "aluminum", "insulation": "PVC", "role": "line", "initialTempC": 70, "finalTempC": 160, "k": 76, "aboveSectionMm2": null },
    { "material": "aluminum", "insulation": "PVC", "role": "line", "initialTempC": 70, "finalTempC": 140, "k": 68, "aboveSectionMm2": 300 },
    { "material": "aluminum", "insulation": "XLPE/EPR", "role": "line", "initialTempC": 90, "finalTempC": 250, "k": 94, "aboveSectionMm2": null },

    { "material": "copper", "insulation": "PVC", "role": "pe-bunched", "initialTempC": 30, "finalTempC": 160, "k": 143, "aboveSectionMm2": null },
    { "material": "copper", "insulation": "PVC", "role": "pe-bunched", "initialTempC": 30, "finalTempC": 140, "k": 133, "aboveSectionMm2": 300 },
    { "material": "copper", "insulation": "XLPE/EPR", "role": "pe-bunched", "initialTempC": 30, "finalTempC": 250, "k": 176, "aboveSectionMm2": null },
    { "material": "aluminum", "insulation": "PVC", "role": "pe-bunched", "initialTempC": 30, "finalTempC": 160, "k": 95, "aboveSectionMm2": null },
    { "material": "aluminum", "insulation": "PVC", "role": "pe-bunched", "initialTempC": 30, "finalTempC": 140, "k": 88, "aboveSectionMm2": 300 },
    { "material": "aluminum", "insulation": "XLPE/EPR", "role": "pe-bunched", "initialTempC": 30, "finalTempC": 250, "k": 116, "aboveSectionMm2": null }
  ]
}
```

- [ ] **Step 5: Run — expect PASS**

- [ ] **Step 6: Register + commit**

Modify `packages/calculation-data/src/iec/index.ts` — append `export * from "./adiabatic-k/index.js";`

```bash
git add packages/calculation-data/src/iec/adiabatic-k packages/calculation-data/src/iec/index.ts
git commit -m "feat(data): add adiabatic k constants dataset (IEC 60364-5-54)"
```

---

### Task 2: PE iletken tablosu (54.2)

**Files:**
- Create: `packages/calculation-data/src/iec/pe-conductor-table/{types,dataset,accessors,index}.ts`, `data.json`
- Modify: `packages/calculation-data/src/iec/index.ts`
- Test: `.../pe-conductor-table/accessors.test.ts`

**Interfaces:**
- Produces: `function getPeSectionByTable(lineSectionMm2: number): number`

- [ ] **Step 1: Failing test** (VERILER.md §9)

```typescript
import { getPeSectionByTable } from "./index.js";

describe("PE conductor table (54.2)", () => {
  it("equals the line section up to 16 mm²", () => {
    expect(getPeSectionByTable(1.5)).toBe(1.5);
    expect(getPeSectionByTable(16)).toBe(16);
  });
  it("is fixed at 16 mm² between 16 and 35 mm²", () => {
    expect(getPeSectionByTable(25)).toBe(16);
    expect(getPeSectionByTable(35)).toBe(16);
  });
  it("is half the line section above 35 mm²", () => {
    expect(getPeSectionByTable(50)).toBe(25);
    expect(getPeSectionByTable(240)).toBe(120);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-data test pe-conductor-table`

- [ ] **Step 3: Implement**

```typescript
// types.ts
import type { DatasetWithMetadata } from "../../dataset/types.js";

export const PE_RULES = ["equal", "fixed", "half"] as const;
export type PeRule = (typeof PE_RULES)[number];

export interface PeConductorRow {
  /** Upper bound of the line section band, inclusive. null = unbounded. */
  lineSectionMaxMm2: number | null;
  rule: PeRule;
  peSectionMm2: number | null;
}

export interface PeConductorTableDataset extends DatasetWithMetadata {
  entries: readonly PeConductorRow[];
}
```

```typescript
// dataset.ts
import raw from "./data.json" with { type: "json" };
import { loadJsonDataset } from "../../dataset/load-json-dataset.js";
import type { PeConductorTableDataset } from "./types.js";

export const peConductorTableDataset: Readonly<PeConductorTableDataset> = loadJsonDataset(
  raw as PeConductorTableDataset,
  "packages/calculation-data/src/iec/pe-conductor-table/data.json",
);
```

```typescript
// accessors.ts
import { peConductorTableDataset } from "./dataset.js";

export function getPeSectionByTable(lineSectionMm2: number): number {
  const row = peConductorTableDataset.entries.find(
    (r) => r.lineSectionMaxMm2 === null || lineSectionMm2 <= r.lineSectionMaxMm2,
  );
  if (row === undefined) {
    throw new RangeError(`No PE table row for line section ${lineSectionMm2} mm².`);
  }
  if (row.rule === "equal") return lineSectionMm2;
  if (row.rule === "half") return lineSectionMm2 / 2;
  if (row.peSectionMm2 === null) {
    throw new Error(`PE table 'fixed' row must declare peSectionMm2.`);
  }
  return row.peSectionMm2;
}
```

```typescript
// index.ts
export { getPeSectionByTable } from "./accessors.js";
export { peConductorTableDataset } from "./dataset.js";
export { PE_RULES, type PeRule, type PeConductorRow, type PeConductorTableDataset } from "./types.js";
```

- [ ] **Step 4: Create `data.json`** (satır sırası önemli — ilk eşleşen kazanır)

```json
{
  "metadata": {
    "id": "iec-60364-5-54-pe-conductor-table-v1",
    "standard": "IEC 60364-5-54",
    "revision": "v1",
    "source": "Tablo 54.2",
    "validFrom": "2026-07-23",
    "notes": "S<=16 -> esit; 16<S<=35 -> 16mm2 sabit; S>35 -> S/2. Satir sirasi anlamlidir."
  },
  "entries": [
    { "lineSectionMaxMm2": 16, "rule": "equal", "peSectionMm2": null },
    { "lineSectionMaxMm2": 35, "rule": "fixed", "peSectionMm2": 16 },
    { "lineSectionMaxMm2": null, "rule": "half", "peSectionMm2": null }
  ]
}
```

- [ ] **Step 5: Run — expect PASS**

- [ ] **Step 6: Register + commit**

Modify `iec/index.ts`: `export * from "./pe-conductor-table/index.js";`
```bash
git add packages/calculation-data/src/iec/pe-conductor-table packages/calculation-data/src/iec/index.ts
git commit -m "feat(data): add PE conductor table dataset (Table 54.2)"
```

---

### Task 3: Kesme süreleri (41.1)

**Files:**
- Create: `packages/calculation-data/src/iec/disconnection-times/{types,dataset,accessors,index}.ts`, `data.json`
- Modify: `packages/calculation-data/src/iec/index.ts`
- Test: `.../disconnection-times/accessors.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  type EarthingSystem = "TN" | "TT";
  type CircuitRole = "final" | "distribution";
  function getMaxDisconnectionTime(args: { system: EarthingSystem; circuitRole: CircuitRole; u0V: number }): number | undefined;
  ```

- [ ] **Step 1: Failing test** (VERILER.md §10 — birincil doğrulanmış)

```typescript
import { getMaxDisconnectionTime } from "./index.js";

describe("disconnection times (Table 41.1)", () => {
  it("returns 0.4 s for a TN final circuit at 230 V", () => {
    expect(getMaxDisconnectionTime({ system: "TN", circuitRole: "final", u0V: 230 })).toBe(0.4);
  });
  it("returns 5 s for TN distribution regardless of U0 band", () => {
    expect(getMaxDisconnectionTime({ system: "TN", circuitRole: "distribution", u0V: 230 })).toBe(5);
    expect(getMaxDisconnectionTime({ system: "TN", circuitRole: "distribution", u0V: 400 })).toBe(5);
  });
  it("returns 0.2 s for a TT final circuit at 230 V", () => {
    expect(getMaxDisconnectionTime({ system: "TT", circuitRole: "final", u0V: 230 })).toBe(0.2);
  });
  it("returns 0.2 s for a TN final circuit in the 230-400 V band", () => {
    expect(getMaxDisconnectionTime({ system: "TN", circuitRole: "final", u0V: 400 })).toBe(0.2);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-data test disconnection-times`

- [ ] **Step 3: Implement**

```typescript
// types.ts
import type { DatasetWithMetadata } from "../../dataset/types.js";

export const EARTHING_SYSTEMS = ["TN", "TT"] as const;
export type EarthingSystem = (typeof EARTHING_SYSTEMS)[number];
export const CIRCUIT_ROLES = ["final", "distribution"] as const;
export type CircuitRole = (typeof CIRCUIT_ROLES)[number];

export interface DisconnectionTimeEntry {
  system: EarthingSystem;
  circuitRole: CircuitRole;
  /** Band is (u0MinV, u0MaxV]; u0MaxV null = unbounded. */
  u0MinV: number;
  u0MaxV: number | null;
  maxSeconds: number;
}

export interface DisconnectionTimesDataset extends DatasetWithMetadata {
  entries: readonly DisconnectionTimeEntry[];
}

export interface DisconnectionTimeQuery {
  system: EarthingSystem;
  circuitRole: CircuitRole;
  u0V: number;
}
```

```typescript
// dataset.ts
import raw from "./data.json" with { type: "json" };
import { loadJsonDataset } from "../../dataset/load-json-dataset.js";
import type { DisconnectionTimesDataset } from "./types.js";

export const disconnectionTimesDataset: Readonly<DisconnectionTimesDataset> = loadJsonDataset(
  raw as DisconnectionTimesDataset,
  "packages/calculation-data/src/iec/disconnection-times/data.json",
);
```

```typescript
// accessors.ts
import { disconnectionTimesDataset } from "./dataset.js";
import type { DisconnectionTimeQuery } from "./types.js";

export function getMaxDisconnectionTime(query: DisconnectionTimeQuery): number | undefined {
  return disconnectionTimesDataset.entries.find(
    (e) =>
      e.system === query.system &&
      e.circuitRole === query.circuitRole &&
      query.u0V > e.u0MinV &&
      (e.u0MaxV === null || query.u0V <= e.u0MaxV),
  )?.maxSeconds;
}
```

```typescript
// index.ts
export { getMaxDisconnectionTime } from "./accessors.js";
export { disconnectionTimesDataset } from "./dataset.js";
export {
  EARTHING_SYSTEMS, CIRCUIT_ROLES,
  type EarthingSystem, type CircuitRole,
  type DisconnectionTimeEntry, type DisconnectionTimesDataset, type DisconnectionTimeQuery,
} from "./types.js";
```

- [ ] **Step 4: Create `data.json`** (VERILER.md §10 tam matris)

```json
{
  "metadata": {
    "id": "iec-60364-4-41-disconnection-times-v1",
    "standard": "IEC 60364-4-41",
    "revision": "v1",
    "source": "Tablo 41.1 (AC)",
    "validFrom": "2026-07-23",
    "notes": "Bant (u0MinV, u0MaxV]. TN dagitim 5s, TT dagitim 1s tum bantlarda."
  },
  "entries": [
    { "system": "TN", "circuitRole": "final", "u0MinV": 50, "u0MaxV": 120, "maxSeconds": 0.8 },
    { "system": "TN", "circuitRole": "final", "u0MinV": 120, "u0MaxV": 230, "maxSeconds": 0.4 },
    { "system": "TN", "circuitRole": "final", "u0MinV": 230, "u0MaxV": 400, "maxSeconds": 0.2 },
    { "system": "TN", "circuitRole": "final", "u0MinV": 400, "u0MaxV": null, "maxSeconds": 0.1 },
    { "system": "TN", "circuitRole": "distribution", "u0MinV": 50, "u0MaxV": null, "maxSeconds": 5 },

    { "system": "TT", "circuitRole": "final", "u0MinV": 50, "u0MaxV": 120, "maxSeconds": 0.3 },
    { "system": "TT", "circuitRole": "final", "u0MinV": 120, "u0MaxV": 230, "maxSeconds": 0.2 },
    { "system": "TT", "circuitRole": "final", "u0MinV": 230, "u0MaxV": 400, "maxSeconds": 0.07 },
    { "system": "TT", "circuitRole": "final", "u0MinV": 400, "u0MaxV": null, "maxSeconds": 0.04 },
    { "system": "TT", "circuitRole": "distribution", "u0MinV": 50, "u0MaxV": null, "maxSeconds": 1 }
  ]
}
```

- [ ] **Step 5: Run — expect PASS**

- [ ] **Step 6: Register + commit**

Modify `iec/index.ts`: `export * from "./disconnection-times/index.js";`
```bash
git add packages/calculation-data/src/iec/disconnection-times packages/calculation-data/src/iec/index.ts
git commit -m "feat(data): add disconnection time dataset (IEC 60364-4-41 Table 41.1)"
```

---

### Task 4: Kesici açma katsayıları (Ia)

**Files:**
- Create: `packages/calculation-data/src/iec/breaker-trip-multipliers/{types,dataset,accessors,index}.ts`, `data.json`
- Modify: `packages/calculation-data/src/iec/index.ts`
- Test: `.../breaker-trip-multipliers/accessors.test.ts`

**Interfaces:**
- Produces: `function getTripMultiplier(curve: "B"|"C"|"D"): { min: number; max: number; design: number } | undefined`

- [ ] **Step 1: Failing test** (VERILER.md §11; `design` = üst sınır, spec kararı)

```typescript
import { getTripMultiplier } from "./index.js";

describe("breaker trip multipliers (IEC 60898-1)", () => {
  it("returns the B/C/D bands", () => {
    expect(getTripMultiplier("B")).toEqual({ min: 3, max: 5, design: 5 });
    expect(getTripMultiplier("C")).toEqual({ min: 5, max: 10, design: 10 });
    expect(getTripMultiplier("D")).toEqual({ min: 10, max: 20, design: 20 });
  });
  it("uses the upper bound as the design multiplier (guaranteed trip)", () => {
    const c = getTripMultiplier("C");
    expect(c?.design).toBe(c?.max);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-data test breaker-trip-multipliers`

- [ ] **Step 3: Implement**

```typescript
// types.ts
import type { DatasetWithMetadata } from "../../dataset/types.js";

export interface BreakerTripMultiplierEntry {
  curve: "B" | "C" | "D";
  minMultiplier: number;
  maxMultiplier: number;
  designMultiplier: number;
}

export interface BreakerTripMultipliersDataset extends DatasetWithMetadata {
  entries: readonly BreakerTripMultiplierEntry[];
}
```

```typescript
// dataset.ts
import raw from "./data.json" with { type: "json" };
import { loadJsonDataset } from "../../dataset/load-json-dataset.js";
import type { BreakerTripMultipliersDataset } from "./types.js";

export const breakerTripMultipliersDataset: Readonly<BreakerTripMultipliersDataset> = loadJsonDataset(
  raw as BreakerTripMultipliersDataset,
  "packages/calculation-data/src/iec/breaker-trip-multipliers/data.json",
);
```

```typescript
// accessors.ts
import { breakerTripMultipliersDataset } from "./dataset.js";

export function getTripMultiplier(
  curve: "B" | "C" | "D",
): { min: number; max: number; design: number } | undefined {
  const e = breakerTripMultipliersDataset.entries.find((x) => x.curve === curve);
  return e === undefined
    ? undefined
    : { min: e.minMultiplier, max: e.maxMultiplier, design: e.designMultiplier };
}
```

```typescript
// index.ts
export { getTripMultiplier } from "./accessors.js";
export { breakerTripMultipliersDataset } from "./dataset.js";
export type { BreakerTripMultiplierEntry, BreakerTripMultipliersDataset } from "./types.js";
```

- [ ] **Step 4: Create `data.json`**

```json
{
  "metadata": {
    "id": "iec-60898-1-breaker-trip-multipliers-v1",
    "standard": "IEC 60898-1",
    "revision": "v1",
    "source": "IEC 60898-1 anlik acma bantlari",
    "validFrom": "2026-07-23",
    "notes": "designMultiplier = ust sinir; Zs kontrolunde acmayi garanti eder."
  },
  "entries": [
    { "curve": "B", "minMultiplier": 3, "maxMultiplier": 5, "designMultiplier": 5 },
    { "curve": "C", "minMultiplier": 5, "maxMultiplier": 10, "designMultiplier": 10 },
    { "curve": "D", "minMultiplier": 10, "maxMultiplier": 20, "designMultiplier": 20 }
  ]
}
```

- [ ] **Step 5: Run — expect PASS**

- [ ] **Step 6: Register + commit**

Modify `iec/index.ts`: `export * from "./breaker-trip-multipliers/index.js";`
```bash
git add packages/calculation-data/src/iec/breaker-trip-multipliers packages/calculation-data/src/iec/index.ts
git commit -m "feat(data): add breaker trip multiplier dataset (IEC 60898-1)"
```

---

### Task 5: Toprak termal direnci kS

**Files:**
- Create: `packages/calculation-data/src/iec/soil-resistivity-factors/{types,dataset,accessors,index}.ts`, `data.json`
- Modify: `packages/calculation-data/src/iec/index.ts`
- Test: `.../soil-resistivity-factors/accessors.test.ts`

**Interfaces:**
- Produces: `function getSoilResistivityFactor(thermalResistivityKmPerW: number): number | undefined`

- [ ] **Step 1: Failing test** (VERILER.md §4 — kanal-gömülü; doğrudan-gömülü varyantı standartta sayısal yok)

```typescript
import { getSoilResistivityFactor } from "./index.js";

describe("soil thermal resistivity factor (B.52.16)", () => {
  it("is 1.00 at the 2.5 K·m/W reference", () => {
    expect(getSoilResistivityFactor(2.5)).toBe(1);
  });
  it("raises capacity for lower resistivity", () => {
    expect(getSoilResistivityFactor(1.0)).toBe(1.18);
    expect(getSoilResistivityFactor(0.5)).toBe(1.28);
  });
  it("lowers capacity above the reference", () => {
    expect(getSoilResistivityFactor(3.0)).toBe(0.96);
  });
  it("returns undefined for an untabulated value (no interpolation)", () => {
    expect(getSoilResistivityFactor(1.234)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-data test soil-resistivity-factors`

- [ ] **Step 3: Implement**

```typescript
// types.ts
import type { DatasetWithMetadata } from "../../dataset/types.js";
import type { DataConfidence } from "../../dataset/confidence.js";

export interface SoilResistivityEntry {
  thermalResistivityKmPerW: number;
  buriedInDucts: number;
  /** Standard publishes no numeric direct-buried variant; null until sourced. */
  buriedDirect: number | null;
}

export interface SoilResistivityDataset extends DatasetWithMetadata {
  referenceResistivityKmPerW: 2.5;
  confidence: DataConfidence;
  entries: readonly SoilResistivityEntry[];
}
```

```typescript
// dataset.ts
import raw from "./data.json" with { type: "json" };
import { loadJsonDataset } from "../../dataset/load-json-dataset.js";
import { assertConfidence } from "../../dataset/confidence.js";
import type { SoilResistivityDataset } from "./types.js";

export const soilResistivityDataset: Readonly<SoilResistivityDataset> = (() => {
  const d = loadJsonDataset(
    raw as SoilResistivityDataset,
    "packages/calculation-data/src/iec/soil-resistivity-factors/data.json",
  );
  assertConfidence(d.confidence, "soil-resistivity-factors");
  return d;
})();
```

```typescript
// accessors.ts
import { soilResistivityDataset } from "./dataset.js";

export function getSoilResistivityFactor(
  thermalResistivityKmPerW: number,
): number | undefined {
  return soilResistivityDataset.entries.find(
    (e) => e.thermalResistivityKmPerW === thermalResistivityKmPerW,
  )?.buriedInDucts;
}
```

```typescript
// index.ts
export { getSoilResistivityFactor } from "./accessors.js";
export { soilResistivityDataset } from "./dataset.js";
export type { SoilResistivityEntry, SoilResistivityDataset } from "./types.js";
```

- [ ] **Step 4: Create `data.json`**

```json
{
  "metadata": {
    "id": "iec-60364-5-52-soil-resistivity-factors-v1",
    "standard": "IEC 60364-5-52",
    "revision": "v1",
    "source": "Tablo B.52.16 (kanal-gomulu)",
    "validFrom": "2026-07-23",
    "notes": "Yalniz metot D1/D2. Dogrudan-gomulu varyanti standartta sayisal yayimlanmaz (null)."
  },
  "referenceResistivityKmPerW": 2.5,
  "confidence": "draft",
  "entries": [
    { "thermalResistivityKmPerW": 0.5, "buriedInDucts": 1.28, "buriedDirect": null },
    { "thermalResistivityKmPerW": 0.7, "buriedInDucts": 1.2, "buriedDirect": null },
    { "thermalResistivityKmPerW": 1.0, "buriedInDucts": 1.18, "buriedDirect": null },
    { "thermalResistivityKmPerW": 1.5, "buriedInDucts": 1.1, "buriedDirect": null },
    { "thermalResistivityKmPerW": 2.0, "buriedInDucts": 1.05, "buriedDirect": null },
    { "thermalResistivityKmPerW": 2.5, "buriedInDucts": 1, "buriedDirect": null },
    { "thermalResistivityKmPerW": 3.0, "buriedInDucts": 0.96, "buriedDirect": null }
  ]
}
```

- [ ] **Step 5: Run — expect PASS**

- [ ] **Step 6: Register + commit**

Modify `iec/index.ts`: `export * from "./soil-resistivity-factors/index.js";`
```bash
git add packages/calculation-data/src/iec/soil-resistivity-factors packages/calculation-data/src/iec/index.ts
git commit -m "feat(data): add soil thermal resistivity factor dataset (B.52.16)"
```

---

### Task 6: Koruma kataloğuna koordinasyon alanları ekle

**Files:**
- Modify: `packages/calculation-data/src/iec/protection-catalog/types.ts`
- Modify: `packages/calculation-data/src/iec/protection-catalog/dataset.ts`
- Modify: `packages/calculation-data/src/iec/protection-catalog/data.json`
- Modify: `packages/calculation-data/src/iec/protection-catalog/accessors.ts`
- Test: `packages/calculation-data/src/iec/protection-catalog/accessors.test.ts`

> **Dikkat:** `dataset.ts:109` `assertColumnsMatchSchema` ile kolon listesini **birebir** doğruluyor. Yeni alan eklenince hem `PROTECTION_CATALOG_COLUMNS` hem `data.json`'daki `columns` dizisi güncellenmeli, yoksa loader fırlatır. Core `protection/` modülünün "recommendation-only" scope guard'ı **korunur** — burada yalnız veri genişler.

**Interfaces:**
- Produces (mevcut `ProtectionCatalogEntry`'ye eklenir):
  ```typescript
  i2Multiplier: number;                  // MCB 1.45, gG sigorta 1.6
  letThroughI2t: readonly { prospectiveFaultKa: number; i2tA2s: number }[] | null;
  ```
- Produces (yeni accessor): `function getLetThroughI2t(entryId: string, prospectiveFaultKa: number): number | null`

- [ ] **Step 1: Failing test**

```typescript
import { lookupProtectionDevice, getLetThroughI2t } from "./index.js";

describe("protection catalog coordination fields", () => {
  it("exposes i2Multiplier = 1.45 for MCB entries", () => {
    const [device] = lookupProtectionDevice({ minimumNominalCurrentA: 6, families: ["MCB"], limit: 1 });
    expect(device?.i2Multiplier).toBe(1.45);
  });

  it("returns null let-through when the catalog has no curve data", () => {
    const [device] = lookupProtectionDevice({ minimumNominalCurrentA: 6, families: ["MCB"], limit: 1 });
    expect(getLetThroughI2t(device?.id as string, 3)).toBeNull();
  });

  it("keeps existing lookup behaviour (regression)", () => {
    const matches = lookupProtectionDevice({ minimumNominalCurrentA: 20, families: ["MCB"] });
    expect(matches.every((m) => m.nominalCurrentA >= 20)).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-data test protection-catalog`

- [ ] **Step 3: Genişlet types.ts**

`PROTECTION_CATALOG_COLUMNS`'a iki eleman ekle (sona):
```typescript
export const PROTECTION_CATALOG_COLUMNS = [
  "id", "family", "poles", "nominalCurrentA", "breakingCapacityKa",
  "curve", "residualCurrentMa", "voltageV", "sourceNote",
  "i2Multiplier", "letThroughI2t",
] as const;
```

`ProtectionCatalogEntry`'ye ekle:
```typescript
export interface LetThroughPoint {
  prospectiveFaultKa: number;
  i2tA2s: number;
}

export interface ProtectionCatalogEntry {
  // …mevcut alanlar değişmeden…
  i2Multiplier: number;
  letThroughI2t: readonly LetThroughPoint[] | null;
}
```

- [ ] **Step 4: dataset.ts doğrulaması ekle** — mevcut entry doğrulamasının yanına:

```typescript
function assertCoordinationFields(entry: Record<string, unknown>, index: number): void {
  if (typeof entry.i2Multiplier !== "number" || entry.i2Multiplier <= 0) {
    throw new Error(`Protection catalog entry ${index} must declare a positive 'i2Multiplier'.`);
  }
  if (entry.letThroughI2t !== null && !Array.isArray(entry.letThroughI2t)) {
    throw new Error(`Protection catalog entry ${index} 'letThroughI2t' must be an array or null.`);
  }
}
```
ve entry döngüsünde çağır.

- [ ] **Step 5: data.json güncelle** — `columns` dizisine `"i2Multiplier"`, `"letThroughI2t"` ekle; **her** entry'ye:
```json
"i2Multiplier": 1.45,
"letThroughI2t": null
```
MCB/MCCB/RCBO için `1.45`. (Katalogda gG sigorta yok; eklenirse `1.6`.) `letThroughI2t` şimdilik hepsinde `null` — ABB yalnız grafik veriyor (VERILER.md §12), kısa devre kriteri manuel Isc/t yedeğiyle çalışır.

- [ ] **Step 6: accessors.ts'e ekle**

```typescript
import type { LetThroughPoint } from "./types.js";

/** Linear interpolation between catalog let-through points; null when absent. */
export function getLetThroughI2t(entryId: string, prospectiveFaultKa: number): number | null {
  const entry = protectionCatalogDataset.entries.find((e) => e.id === entryId);
  const points = entry?.letThroughI2t;
  if (entry === undefined || points === null || points === undefined || points.length === 0) {
    return null;
  }
  const sorted = [...points].sort((a, b) => a.prospectiveFaultKa - b.prospectiveFaultKa);
  const first = sorted[0] as LetThroughPoint;
  const last = sorted[sorted.length - 1] as LetThroughPoint;
  if (prospectiveFaultKa <= first.prospectiveFaultKa) return first.i2tA2s;
  if (prospectiveFaultKa >= last.prospectiveFaultKa) return last.i2tA2s;
  for (let i = 1; i < sorted.length; i += 1) {
    const lo = sorted[i - 1] as LetThroughPoint;
    const hi = sorted[i] as LetThroughPoint;
    if (prospectiveFaultKa <= hi.prospectiveFaultKa) {
      const span = hi.prospectiveFaultKa - lo.prospectiveFaultKa;
      const ratio = span === 0 ? 0 : (prospectiveFaultKa - lo.prospectiveFaultKa) / span;
      return lo.i2tA2s + ratio * (hi.i2tA2s - lo.i2tA2s);
    }
  }
  return last.i2tA2s;
}
```
`index.ts`'e `getLetThroughI2t` ve `type LetThroughPoint` export'u ekle.

- [ ] **Step 7: Run — expect PASS** (yeni + regresyon)

Run: `pnpm --filter @elektroplan/calculation-data test`

- [ ] **Step 8: Commit**

```bash
git add packages/calculation-data/src/iec/protection-catalog
git commit -m "feat(data): add i2Multiplier and let-through I2t to protection catalog"
```

---

## Bölüm 2 — Girdi/çıktı genişletme

### Task 7: Detaylı mod DTO + doğrulama

**Files:**
- Modify: `packages/calculation-core/src/cable-sizing/types.ts`
- Modify: `packages/calculation-core/src/cable-sizing/validate.ts`
- Test: `packages/calculation-core/src/cable-sizing/validate.test.ts` (yeni dosya)

**Interfaces:**
- Produces:
  ```typescript
  interface DetailedOptions {
    earthingSystem: "TN" | "TT";
    circuitRole: "final" | "distribution";
    breakerCurve: "B" | "C" | "D";
    peLocation: "in-cable" | "separate";
    conductorArrangement: ConductorArrangement;      // reaktans seçimi
    parallelConductors?: number;                     // varsayılan 1
    soilThermalResistivityKmPerW?: number;           // yalnız D1/D2
    burialDepthM?: number;                           // kD verisi yok → assumption
    shortCircuit?: { prospectiveFaultKa: number; clearingTimeS: number };
    loopImpedance:
      | { method: "estimated" }
      | { method: "calculated"; prospectiveEarthFaultKa: number }
      | { method: "measured"; sourceImpedanceOhm: number };
  }
  // CableSelectionInput'a eklenir:  detailed?: DetailedOptions;
  // CableSelectionOutput'a eklenir: kS, kD, selectedDevice, peSectionMm2, neutralSectionMm2
  ```

- [ ] **Step 1: Failing test**

```typescript
import { validateSelectionInput } from "./validate.js";
import type { CableSelectionInput } from "./types.js";

function detailedInput(): CableSelectionInput {
  return {
    mode: "detailed", designCurrentA: 60, phase: 3, circuitKind: "power",
    conductorMaterial: "copper", insulation: "XLPE/EPR", installationMethod: "C",
    ambientTemperatureC: 30, groupedCircuits: 1, groupingArrangement: "bunched",
    thirdHarmonicPercent: 0, voltageDropLimitPercent: 5,
    voltageDrop: { systemType: "three-phase-ac-ll", lengthM: 25, baseVoltageV: 400, cosPhi: 0.9 },
    detailed: {
      earthingSystem: "TN", circuitRole: "final", breakerCurve: "C",
      peLocation: "in-cable", conductorArrangement: "multicore",
      loopImpedance: { method: "estimated" },
    },
  };
}

describe("detailed mode validation", () => {
  it("accepts a complete detailed input", () => {
    expect(() => validateSelectionInput(detailedInput())).not.toThrow();
  });

  it("rejects detailed mode without the detailed block", () => {
    const { detailed, ...rest } = detailedInput();
    expect(() => validateSelectionInput(rest as CableSelectionInput))
      .toThrow("detailed mode requires the 'detailed' options block.");
  });

  it("rejects a non-positive parallelConductors", () => {
    const input = detailedInput();
    expect(() => validateSelectionInput({
      ...input,
      detailed: { ...input.detailed!, parallelConductors: 0 },
    })).toThrow();
  });

  it("rejects measured loop impedance without a source impedance", () => {
    const input = detailedInput();
    expect(() => validateSelectionInput({
      ...input,
      detailed: { ...input.detailed!, loopImpedance: { method: "measured" } as never },
    })).toThrow("loopImpedance 'measured' requires sourceImpedanceOhm.");
  });

  it("still accepts standard mode without the detailed block (regression)", () => {
    const input = { ...detailedInput(), mode: "standard" as const, detailed: undefined };
    expect(() => validateSelectionInput(input)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-core test cable-sizing/validate`

- [ ] **Step 3: types.ts'i genişlet** — mevcut tipleri **değiştirmeden** ekle:

```typescript
import type { ConductorArrangement, ProtectionDeviceCurve } from "@elektroplan/calculation-data";

export type EarthingSystem = "TN" | "TT";
export type CircuitRole = "final" | "distribution";
export type PeLocation = "in-cable" | "separate";

export type LoopImpedanceSource =
  | { method: "estimated" }
  | { method: "calculated"; prospectiveEarthFaultKa: number }
  | { method: "measured"; sourceImpedanceOhm: number };

export interface ShortCircuitInput {
  prospectiveFaultKa: number;
  clearingTimeS: number;
}

export interface DetailedOptions {
  earthingSystem: EarthingSystem;
  circuitRole: CircuitRole;
  breakerCurve: ProtectionDeviceCurve;
  peLocation: PeLocation;
  conductorArrangement: ConductorArrangement;
  parallelConductors?: number;
  soilThermalResistivityKmPerW?: number;
  burialDepthM?: number;
  shortCircuit?: ShortCircuitInput;
  loopImpedance: LoopImpedanceSource;
}

export interface SelectedDevice {
  id: string;
  nominalCurrentA: number;
  curve: ProtectionDeviceCurve | null;
  family: string;
  i2A: number;
}
```

`CableSelectionInput`'a ekle: `detailed?: DetailedOptions;`

`CableSelectionOutput`'a ekle (hepsi standart modda `null`/`1`):
```typescript
  kS: number;
  kD: number;
  selectedDevice: SelectedDevice | null;
  peSectionMm2: number | null;
  neutralSectionMm2: number | null;
```

- [ ] **Step 4: validate.ts'i genişlet** — mevcut doğrulamalardan sonra:

```typescript
function validateDetailed(input: CableSelectionInput): void {
  if (input.mode !== "detailed") return;
  const d = input.detailed;
  if (d === undefined) {
    throw new RangeError("detailed mode requires the 'detailed' options block.");
  }
  assertOneOf(d.earthingSystem, ["TN", "TT"] as const, "detailed.earthingSystem");
  assertOneOf(d.circuitRole, ["final", "distribution"] as const, "detailed.circuitRole");
  assertOneOf(d.breakerCurve, ["B", "C", "D"] as const, "detailed.breakerCurve");
  assertOneOf(d.peLocation, ["in-cable", "separate"] as const, "detailed.peLocation");

  if (d.parallelConductors !== undefined) {
    assertPositive(d.parallelConductors, "detailed.parallelConductors");
    if (!Number.isInteger(d.parallelConductors)) {
      throw new RangeError("detailed.parallelConductors must be an integer.");
    }
  }
  if (d.soilThermalResistivityKmPerW !== undefined) {
    assertPositive(d.soilThermalResistivityKmPerW, "detailed.soilThermalResistivityKmPerW");
  }
  if (d.burialDepthM !== undefined) assertPositive(d.burialDepthM, "detailed.burialDepthM");
  if (d.shortCircuit !== undefined) {
    assertPositive(d.shortCircuit.prospectiveFaultKa, "detailed.shortCircuit.prospectiveFaultKa");
    assertPositive(d.shortCircuit.clearingTimeS, "detailed.shortCircuit.clearingTimeS");
  }
  if (d.loopImpedance.method === "calculated") {
    assertPositive(d.loopImpedance.prospectiveEarthFaultKa, "detailed.loopImpedance.prospectiveEarthFaultKa");
  }
  if (d.loopImpedance.method === "measured") {
    if (typeof d.loopImpedance.sourceImpedanceOhm !== "number") {
      throw new RangeError("loopImpedance 'measured' requires sourceImpedanceOhm.");
    }
    assertPositive(d.loopImpedance.sourceImpedanceOhm, "detailed.loopImpedance.sourceImpedanceOhm");
  }
}
```
ve `validateSelectionInput` sonunda `validateDetailed(input);` çağır.

- [ ] **Step 5: Run — expect PASS** + standart mod regresyonu

Run: `pnpm --filter @elektroplan/calculation-core test cable-sizing`

- [ ] **Step 6: Commit**

```bash
git add packages/calculation-core/src/cable-sizing/types.ts packages/calculation-core/src/cable-sizing/validate.ts packages/calculation-core/src/cable-sizing/validate.test.ts
git commit -m "feat(core): add detailed-mode options DTO and validation"
```

---

## Bölüm 3 — Kriterler

> **Zincir sırası zorunlu:** `device` → `In`; `pe` → `S_PE`. `shortCircuit` ve `loopImpedance` bunlara bağlı. Kriter dosyaları saf fonksiyondur — bağımlılıklar argüman olarak gelir.

### Task 8: Kriter 3 — cihaz koordinasyonu

**Files:**
- Create: `packages/calculation-core/src/cable-sizing/criteria/device-coordination.ts`
- Test: `.../criteria/device-coordination.test.ts`

**Interfaces:**
- Consumes: `lookupProtectionDevice` (data), `CriterionOutcome`, `SelectedDevice`.
- Produces:
  ```typescript
  interface DeviceArgs { designCurrentA: number; izCorrectedA: number; curve: "B"|"C"|"D"; enforce: boolean; }
  function evaluateDeviceCoordination(args: DeviceArgs): { outcome: CriterionOutcome; device: SelectedDevice | null };
  ```

- [ ] **Step 1: Failing test** (IEC 60364-4-43 §433.1: `Ib ≤ In ≤ Iz` ∧ `I2 ≤ 1.45·Iz`)

```typescript
import { evaluateDeviceCoordination } from "./device-coordination.js";

describe("device coordination criterion", () => {
  it("selects the smallest In at or above the design current", () => {
    const r = evaluateDeviceCoordination({ designCurrentA: 22, izCorrectedA: 96, curve: "C", enforce: true });
    expect(r.device?.nominalCurrentA).toBe(25);
    expect(r.outcome.status).toBe("pass");
  });

  it("fails when no In fits between Ib and Iz", () => {
    const r = evaluateDeviceCoordination({ designCurrentA: 22, izCorrectedA: 23, curve: "C", enforce: true });
    expect(r.outcome.status).toBe("fail");
    expect(r.device).toBeNull();
  });

  it("reports but does not fail when enforce is false (standard mode)", () => {
    const r = evaluateDeviceCoordination({ designCurrentA: 22, izCorrectedA: 23, curve: "C", enforce: false });
    expect(r.outcome.status).toBe("pass");
    expect(r.outcome.detail.coordinated).toBe("no");
  });

  it("computes I2 as In × i2Multiplier", () => {
    const r = evaluateDeviceCoordination({ designCurrentA: 22, izCorrectedA: 96, curve: "C", enforce: true });
    expect(r.device?.i2A).toBeCloseTo(25 * 1.45, 6);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-core test criteria/device-coordination`

- [ ] **Step 3: Implement**

```typescript
// device-coordination.ts
import { lookupProtectionDevice } from "@elektroplan/calculation-data";
import type { ProtectionDeviceCurve } from "@elektroplan/calculation-data";
import type { CriterionOutcome, SelectedDevice } from "../types.js";

const I2_LIMIT_FACTOR = 1.45; // IEC 60364-4-43 §433.1: I2 ≤ 1.45 · Iz

export interface DeviceArgs {
  designCurrentA: number;
  izCorrectedA: number;
  curve: ProtectionDeviceCurve;
  /** true in detailed mode (gate), false in standard mode (advisory only). */
  enforce: boolean;
}

export function evaluateDeviceCoordination(args: DeviceArgs): {
  outcome: CriterionOutcome;
  device: SelectedDevice | null;
} {
  const candidates = lookupProtectionDevice({
    minimumNominalCurrentA: args.designCurrentA,
    families: ["MCB"],
    curve: args.curve,
  });

  const fitting = candidates.find((c) => {
    const i2 = c.nominalCurrentA * c.i2Multiplier;
    return (
      c.nominalCurrentA <= args.izCorrectedA &&
      i2 <= I2_LIMIT_FACTOR * args.izCorrectedA
    );
  });

  if (fitting === undefined) {
    return {
      outcome: {
        id: "device",
        status: args.enforce ? "fail" : "pass",
        detail: {
          coordinated: "no",
          reason: "no-device-between-ib-and-iz",
          designCurrentA: args.designCurrentA,
          izCorrectedA: args.izCorrectedA,
        },
      },
      device: null,
    };
  }

  const i2A = fitting.nominalCurrentA * fitting.i2Multiplier;
  return {
    outcome: {
      id: "device",
      status: "pass",
      detail: {
        coordinated: "yes",
        nominalCurrentA: fitting.nominalCurrentA,
        i2A,
        i2LimitA: I2_LIMIT_FACTOR * args.izCorrectedA,
      },
    },
    device: {
      id: fitting.id,
      nominalCurrentA: fitting.nominalCurrentA,
      curve: fitting.curve,
      family: fitting.family,
      i2A,
    },
  };
}
```

- [ ] **Step 4: Run — expect PASS**

> Test `25 A` C-eğrisi MCB bekliyor. Katalogda yoksa (`protection-catalog/data.json` seed) önce entry ekle — `id: "mcb-3p-c-25a-6ka"`, `family: "MCB"`, `poles: 3`, `nominalCurrentA: 25`, `breakingCapacityKa: 6`, `curve: "C"`, `residualCurrentMa: null`, `voltageV: 400`, `i2Multiplier: 1.45`, `letThroughI2t: null`, `sourceNote: "Seed catalog"`. Eksik nominal değerleri de tamamla: 6,10,13,16,20,25,32,40,50,63,80,100,125.

- [ ] **Step 5: Commit**

```bash
git add packages/calculation-core/src/cable-sizing/criteria/device-coordination.ts packages/calculation-core/src/cable-sizing/criteria/device-coordination.test.ts packages/calculation-data/src/iec/protection-catalog/data.json
git commit -m "feat(core): add device coordination criterion (Ib<=In<=Iz, I2<=1.45Iz)"
```

---

### Task 9: Kriter 5 — PE iletkeni

**Files:**
- Create: `packages/calculation-core/src/cable-sizing/criteria/pe-conductor.ts`
- Test: `.../criteria/pe-conductor.test.ts`

**Interfaces:**
- Consumes: `getPeSectionByTable`, `getAdiabaticK`, `getCableCrossSections` (data).
- Produces:
  ```typescript
  interface PeArgs {
    sectionMm2: number; material: "copper"|"aluminum"; insulation: "PVC"|"XLPE/EPR";
    peLocation: "in-cable"|"separate"; ampacityKey: CableAmpacityKey;
    fault: { earthFaultA: number; clearingTimeS: number } | null;
  }
  function evaluatePeConductor(args: PeArgs): { outcome: CriterionOutcome; peSectionMm2: number | null };
  ```

- [ ] **Step 1: Failing test** (`S_PE = max(√(I²t)/k, Tablo 54.2)`, sonraki standart kesite yuvarlanır)

```typescript
import { evaluatePeConductor } from "./pe-conductor.js";

const KEY = { material: "copper", insulation: "XLPE/EPR", loadedConductors: 3 } as const;

describe("PE conductor criterion", () => {
  it("uses the table value when no fault data is supplied", () => {
    const r = evaluatePeConductor({
      sectionMm2: 50, material: "copper", insulation: "XLPE/EPR",
      peLocation: "in-cable", ampacityKey: KEY, fault: null,
    });
    expect(r.peSectionMm2).toBe(25); // 50/2 per Table 54.2
    expect(r.outcome.status).toBe("pass");
  });

  it("upsizes to the adiabatic result when the fault demands it", () => {
    // I=10000 A, t=0.1 s, k=143 (Cu XLPE in-cable) -> sqrt(1e8*0.1)/143 = 22.1 mm² -> 25
    const r = evaluatePeConductor({
      sectionMm2: 16, material: "copper", insulation: "XLPE/EPR",
      peLocation: "in-cable", ampacityKey: KEY,
      fault: { earthFaultA: 10000, clearingTimeS: 0.1 },
    });
    expect(r.peSectionMm2).toBe(25);
    expect(Number(r.outcome.detail.byAdiabaticMm2)).toBeCloseTo(22.1, 1);
  });

  it("uses the pe-bunched k constant for a separate PE conductor", () => {
    const r = evaluatePeConductor({
      sectionMm2: 16, material: "copper", insulation: "XLPE/EPR",
      peLocation: "separate", ampacityKey: KEY,
      fault: { earthFaultA: 10000, clearingTimeS: 0.1 },
    });
    // k = 176 -> sqrt(1e7)/176 = 17.96 mm² -> table gives 16 -> max -> 25 standard step
    expect(Number(r.outcome.detail.kUsed)).toBe(176);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-core test criteria/pe-conductor`

- [ ] **Step 3: Implement**

```typescript
// pe-conductor.ts
import {
  getAdiabaticK, getPeSectionByTable, getCableCrossSections,
  type CableAmpacityKey,
} from "@elektroplan/calculation-data";
import type { CriterionOutcome } from "../types.js";

export interface PeArgs {
  sectionMm2: number;
  material: "copper" | "aluminum";
  insulation: "PVC" | "XLPE/EPR";
  peLocation: "in-cable" | "separate";
  ampacityKey: CableAmpacityKey;
  fault: { earthFaultA: number; clearingTimeS: number } | null;
}

function nextStandardSection(minimumMm2: number, sections: readonly number[]): number | null {
  return sections.find((s) => s >= minimumMm2) ?? null;
}

export function evaluatePeConductor(args: PeArgs): {
  outcome: CriterionOutcome;
  peSectionMm2: number | null;
} {
  const byTable = getPeSectionByTable(args.sectionMm2);
  const role = args.peLocation === "separate" ? "pe-bunched" : "line";
  const k = getAdiabaticK({
    material: args.material,
    insulation: args.insulation,
    role,
    sectionMm2: args.sectionMm2,
  });

  if (k === undefined) {
    return {
      outcome: { id: "pe", status: "skipped", detail: { reason: "no-adiabatic-k" } },
      peSectionMm2: null,
    };
  }

  const byAdiabatic =
    args.fault === null
      ? 0
      : Math.sqrt(args.fault.earthFaultA ** 2 * args.fault.clearingTimeS) / k;

  const required = Math.max(byTable, byAdiabatic);
  const sections = getCableCrossSections(args.ampacityKey);
  const peSectionMm2 = nextStandardSection(required, sections);

  if (peSectionMm2 === null) {
    return {
      outcome: {
        id: "pe",
        status: "fail",
        detail: { reason: "no-standard-section-for-pe", requiredMm2: required, kUsed: k },
      },
      peSectionMm2: null,
    };
  }

  return {
    outcome: {
      id: "pe",
      status: "pass",
      detail: {
        byTableMm2: byTable,
        byAdiabaticMm2: byAdiabatic,
        peSectionMm2,
        kUsed: k,
        faultDataUsed: args.fault === null ? "no" : "yes",
      },
    },
    peSectionMm2,
  };
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/calculation-core/src/cable-sizing/criteria/pe-conductor.ts packages/calculation-core/src/cable-sizing/criteria/pe-conductor.test.ts
git commit -m "feat(core): add PE conductor criterion (adiabatic + Table 54.2)"
```

---

### Task 10: Kriter 6 — kısa devre (adyabatik)

**Files:**
- Create: `packages/calculation-core/src/cable-sizing/criteria/short-circuit.ts`
- Test: `.../criteria/short-circuit.test.ts`

**Interfaces:**
- Consumes: `getAdiabaticK`, `getLetThroughI2t` (data).
- Produces:
  ```typescript
  interface ShortCircuitArgs {
    sectionMm2: number; material: "copper"|"aluminum"; insulation: "PVC"|"XLPE/EPR";
    deviceId: string | null;
    manual: { prospectiveFaultKa: number; clearingTimeS: number } | null;
  }
  function evaluateShortCircuit(args: ShortCircuitArgs): { outcome: CriterionOutcome };
  ```

- [ ] **Step 1: Failing test** (`I²t ≤ k²·S²`)

```typescript
import { evaluateShortCircuit } from "./short-circuit.js";

describe("short-circuit criterion", () => {
  it("skips when neither catalog let-through nor manual data exists", () => {
    const r = evaluateShortCircuit({
      sectionMm2: 16, material: "copper", insulation: "XLPE/EPR",
      deviceId: null, manual: null,
    });
    expect(r.outcome.status).toBe("skipped");
    expect(r.outcome.detail.reason).toBe("no-fault-energy-data");
  });

  it("passes when I²t is below k²S²", () => {
    // k=143, S=16 -> k²S² = 143² * 256 = 5,234,944 A²s
    // I=6 kA, t=0.1 s -> I²t = 3.6e6 -> ratio < 1
    const r = evaluateShortCircuit({
      sectionMm2: 16, material: "copper", insulation: "XLPE/EPR",
      deviceId: null, manual: { prospectiveFaultKa: 6, clearingTimeS: 0.1 },
    });
    expect(r.outcome.status).toBe("pass");
    expect(Number(r.outcome.detail.energyRatio)).toBeLessThan(1);
  });

  it("fails when I²t exceeds k²S²", () => {
    const r = evaluateShortCircuit({
      sectionMm2: 2.5, material: "copper", insulation: "XLPE/EPR",
      deviceId: null, manual: { prospectiveFaultKa: 6, clearingTimeS: 0.1 },
    });
    expect(r.outcome.status).toBe("fail");
    expect(Number(r.outcome.detail.sMinMm2)).toBeGreaterThan(2.5);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-core test criteria/short-circuit`

- [ ] **Step 3: Implement**

```typescript
// short-circuit.ts
import { getAdiabaticK, getLetThroughI2t } from "@elektroplan/calculation-data";
import type { CriterionOutcome } from "../types.js";

export interface ShortCircuitArgs {
  sectionMm2: number;
  material: "copper" | "aluminum";
  insulation: "PVC" | "XLPE/EPR";
  deviceId: string | null;
  manual: { prospectiveFaultKa: number; clearingTimeS: number } | null;
}

export function evaluateShortCircuit(args: ShortCircuitArgs): { outcome: CriterionOutcome } {
  const k = getAdiabaticK({
    material: args.material,
    insulation: args.insulation,
    role: "line",
    sectionMm2: args.sectionMm2,
  });
  if (k === undefined) {
    return { outcome: { id: "shortCircuit", status: "skipped", detail: { reason: "no-adiabatic-k" } } };
  }

  // Prefer catalog let-through energy; fall back to manual Isc²·t.
  const catalogI2t =
    args.deviceId === null || args.manual === null
      ? null
      : getLetThroughI2t(args.deviceId, args.manual.prospectiveFaultKa);

  const manualI2t =
    args.manual === null
      ? null
      : (args.manual.prospectiveFaultKa * 1000) ** 2 * args.manual.clearingTimeS;

  const i2t = catalogI2t ?? manualI2t;
  if (i2t === null) {
    return {
      outcome: { id: "shortCircuit", status: "skipped", detail: { reason: "no-fault-energy-data" } },
    };
  }

  const withstand = k ** 2 * args.sectionMm2 ** 2;
  const energyRatio = i2t / withstand;
  const sMinMm2 = Math.sqrt(i2t) / k;

  return {
    outcome: {
      id: "shortCircuit",
      status: energyRatio <= 1 ? "pass" : "fail",
      detail: {
        i2tA2s: i2t,
        withstandA2s: withstand,
        energyRatio,
        sMinMm2,
        kUsed: k,
        source: catalogI2t === null ? "manual-isc-t" : "catalog-let-through",
      },
    },
  };
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/calculation-core/src/cable-sizing/criteria/short-circuit.ts packages/calculation-core/src/cable-sizing/criteria/short-circuit.test.ts
git commit -m "feat(core): add short-circuit adiabatic criterion with catalog/manual sources"
```

---

### Task 11: Kriter 7 — çevrim empedansı

**Files:**
- Create: `packages/calculation-core/src/cable-sizing/criteria/loop-impedance.ts`
- Test: `.../criteria/loop-impedance.test.ts`

**Interfaces:**
- Consumes: `getResistance20`, `getReactance`, `getTripMultiplier` (data); `ALPHA_COPPER_20`/`ALPHA_ALUMINUM_20` (constants). `maxDisconnectionS` argüman olarak gelir — lookup'ı Task 13 yapar (kriter saf kalır).
- Produces:
  ```typescript
  interface LoopArgs {
    sectionMm2: number; peSectionMm2: number | null;
    material: "copper"|"aluminum"; insulation: "PVC"|"XLPE/EPR";
    lengthM: number; u0V: number; nominalCurrentA: number | null;
    curve: "B"|"C"|"D"; arrangement: ConductorArrangement;
    parallelConductors: number; source: LoopImpedanceSource;
    maxDisconnectionS: number | null;
  }
  function evaluateLoopImpedance(args: LoopArgs): { outcome: CriterionOutcome };
  ```

- [ ] **Step 1: Failing test** (`Zs·Ia ≤ U₀`; `Z_kaynak`: estimated `0.2·U₀/Ia`, calculated `U₀/I_f`, measured girdi)

```typescript
import { evaluateLoopImpedance } from "./loop-impedance.js";

function args(over: Partial<Parameters<typeof evaluateLoopImpedance>[0]> = {}) {
  return {
    sectionMm2: 16, peSectionMm2: 16, material: "copper" as const,
    insulation: "XLPE/EPR" as const, lengthM: 30, u0V: 230,
    nominalCurrentA: 32, curve: "C" as const, arrangement: "multicore" as const,
    parallelConductors: 1, source: { method: "estimated" as const },
    maxDisconnectionS: 0.4,
    ...over,
  };
}

describe("loop impedance criterion", () => {
  it("passes a short run with adequate conductors", () => {
    const r = evaluateLoopImpedance(args());
    expect(r.outcome.status).toBe("pass");
    expect(Number(r.outcome.detail.iaA)).toBe(320); // C curve, design ×10
  });

  it("reports the required disconnection time alongside the verdict", () => {
    const r = evaluateLoopImpedance(args());
    expect(Number(r.outcome.detail.maxDisconnectionS)).toBe(0.4);
  });

  it("fails an over-long run", () => {
    const r = evaluateLoopImpedance(args({ lengthM: 3000 }));
    expect(r.outcome.status).toBe("fail");
  });

  it("reports the maximum permissible length", () => {
    const r = evaluateLoopImpedance(args());
    expect(Number(r.outcome.detail.lMaxM)).toBeGreaterThan(30);
  });

  it("skips when no device was selected", () => {
    const r = evaluateLoopImpedance(args({ nominalCurrentA: null }));
    expect(r.outcome.status).toBe("skipped");
    expect(r.outcome.detail.reason).toBe("no-device-selected");
  });

  it("uses the measured source impedance when supplied", () => {
    const r = evaluateLoopImpedance(args({ source: { method: "measured", sourceImpedanceOhm: 0.35 } }));
    expect(Number(r.outcome.detail.zSourceOhm)).toBe(0.35);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-core test criteria/loop-impedance`

- [ ] **Step 3: Implement**

```typescript
// loop-impedance.ts
import {
  getResistance20, getReactance, getTripMultiplier,
  type ConductorArrangement,
} from "@elektroplan/calculation-data";
import { ALPHA_ALUMINUM_20, ALPHA_COPPER_20 } from "../../common/constants/index.js";
import type { CriterionOutcome, LoopImpedanceSource } from "../types.js";

const MAX_TEMP_C = { PVC: 70, "XLPE/EPR": 90 } as const;
/** IEC 60364-4-41 estimate: 80 % of U0 is assumed available at the cable origin. */
const ESTIMATED_SOURCE_FRACTION = 0.2;

export interface LoopArgs {
  sectionMm2: number;
  peSectionMm2: number | null;
  material: "copper" | "aluminum";
  insulation: "PVC" | "XLPE/EPR";
  lengthM: number;
  u0V: number;
  nominalCurrentA: number | null;
  curve: "B" | "C" | "D";
  arrangement: ConductorArrangement;
  parallelConductors: number;
  source: LoopImpedanceSource;
  /** Reported for traceability; the instantaneous Ia already clears well inside it. */
  maxDisconnectionS: number | null;
}

function alpha(material: "copper" | "aluminum"): number {
  return material === "copper" ? ALPHA_COPPER_20 : ALPHA_ALUMINUM_20;
}

/** Ω/km at the insulation's maximum operating temperature. */
function impedanceOhmPerKm(
  sectionMm2: number,
  args: LoopArgs,
): { r: number; x: number } | null {
  const r20 = getResistance20(args.material, sectionMm2);
  if (r20 === null || r20 === undefined) return null;
  const theta = MAX_TEMP_C[args.insulation];
  const r = r20 * (1 + alpha(args.material) * (theta - 20));
  const x = getReactance(args.arrangement, sectionMm2) ?? 0;
  return { r, x };
}

function sourceImpedance(args: LoopArgs, iaA: number): number {
  if (args.source.method === "measured") return args.source.sourceImpedanceOhm;
  if (args.source.method === "calculated") {
    return args.u0V / (args.source.prospectiveEarthFaultKa * 1000);
  }
  return (ESTIMATED_SOURCE_FRACTION * args.u0V) / iaA;
}

export function evaluateLoopImpedance(args: LoopArgs): { outcome: CriterionOutcome } {
  if (args.nominalCurrentA === null) {
    return {
      outcome: { id: "loopImpedance", status: "skipped", detail: { reason: "no-device-selected" } },
    };
  }
  if (args.peSectionMm2 === null) {
    return {
      outcome: { id: "loopImpedance", status: "skipped", detail: { reason: "no-pe-section" } },
    };
  }

  const multiplier = getTripMultiplier(args.curve);
  if (multiplier === undefined) {
    return {
      outcome: { id: "loopImpedance", status: "skipped", detail: { reason: "no-trip-multiplier" } },
    };
  }

  const phase = impedanceOhmPerKm(args.sectionMm2, args);
  const pe = impedanceOhmPerKm(args.peSectionMm2, args);
  if (phase === null || pe === null) {
    return {
      outcome: { id: "loopImpedance", status: "skipped", detail: { reason: "no-impedance-data" } },
    };
  }

  const iaA = multiplier.design * args.nominalCurrentA;
  const zPhase = Math.hypot(phase.r, phase.x) / args.parallelConductors;
  const zPe = Math.hypot(pe.r, pe.x) / args.parallelConductors;
  const zSourceOhm = sourceImpedance(args, iaA);
  const zsOhm = zSourceOhm + ((zPhase + zPe) * args.lengthM) / 1000;
  const zMaxOhm = args.u0V / iaA;
  const lMaxM = ((zMaxOhm - zSourceOhm) / (zPhase + zPe)) * 1000;

  return {
    outcome: {
      id: "loopImpedance",
      status: zsOhm * iaA <= args.u0V ? "pass" : "fail",
      detail: {
        iaA, zsOhm, zMaxOhm, zSourceOhm, lMaxM,
        method: args.source.method,
        maxDisconnectionS: args.maxDisconnectionS,
      },
    },
  };
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/calculation-core/src/cable-sizing/criteria/loop-impedance.ts packages/calculation-core/src/cable-sizing/criteria/loop-impedance.test.ts
git commit -m "feat(core): add earth-loop impedance criterion with three source methods"
```

---

### Task 12: Kriter 8 — nötr iletkeni

**Files:**
- Create: `packages/calculation-core/src/cable-sizing/criteria/neutral-conductor.ts`
- Test: `.../criteria/neutral-conductor.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  interface NeutralArgs { sectionMm2: number; phase: 1|3; thirdHarmonicPercent: number; material: "copper"|"aluminum"; }
  function evaluateNeutralConductor(args: NeutralArgs): { outcome: CriterionOutcome; neutralSectionMm2: number };
  ```

- [ ] **Step 1: Failing test** (IEC 60364-5-52 §524)

```typescript
import { evaluateNeutralConductor } from "./neutral-conductor.js";

describe("neutral conductor criterion", () => {
  it("equals the phase section on single-phase circuits", () => {
    const r = evaluateNeutralConductor({ sectionMm2: 4, phase: 1, thirdHarmonicPercent: 0, material: "copper" });
    expect(r.neutralSectionMm2).toBe(4);
    expect(r.outcome.detail.basis).toBe("single-phase");
  });

  it("equals the phase section when triplen harmonics dominate", () => {
    const r = evaluateNeutralConductor({ sectionMm2: 50, phase: 3, thirdHarmonicPercent: 40, material: "copper" });
    expect(r.neutralSectionMm2).toBe(50);
    expect(r.outcome.detail.basis).toBe("harmonic-driven");
  });

  it("equals the phase section at or below 16 mm² copper", () => {
    const r = evaluateNeutralConductor({ sectionMm2: 16, phase: 3, thirdHarmonicPercent: 0, material: "copper" });
    expect(r.neutralSectionMm2).toBe(16);
    expect(r.outcome.detail.basis).toBe("small-section");
  });

  it("may be reduced on large balanced three-phase circuits", () => {
    const r = evaluateNeutralConductor({ sectionMm2: 120, phase: 3, thirdHarmonicPercent: 0, material: "copper" });
    expect(r.neutralSectionMm2).toBe(60);
    expect(r.outcome.detail.basis).toBe("reduced-balanced");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-core test criteria/neutral-conductor`

- [ ] **Step 3: Implement**

```typescript
// neutral-conductor.ts
import type { CriterionOutcome } from "../types.js";

/** IEC 60364-5-52 §524: full-size neutral is mandatory at or below these sections. */
const FULL_NEUTRAL_LIMIT_MM2 = { copper: 16, aluminum: 25 } as const;
const HARMONIC_FULL_NEUTRAL_PERCENT = 33;

export interface NeutralArgs {
  sectionMm2: number;
  phase: 1 | 3;
  thirdHarmonicPercent: number;
  material: "copper" | "aluminum";
}

export function evaluateNeutralConductor(args: NeutralArgs): {
  outcome: CriterionOutcome;
  neutralSectionMm2: number;
} {
  let neutralSectionMm2 = args.sectionMm2;
  let basis = "single-phase";

  if (args.phase === 3) {
    if (args.thirdHarmonicPercent > HARMONIC_FULL_NEUTRAL_PERCENT) {
      basis = "harmonic-driven";
    } else if (args.sectionMm2 <= FULL_NEUTRAL_LIMIT_MM2[args.material]) {
      basis = "small-section";
    } else {
      neutralSectionMm2 = args.sectionMm2 / 2;
      basis = "reduced-balanced";
    }
  }

  return {
    outcome: {
      id: "neutral",
      status: "pass",
      detail: { neutralSectionMm2, basis, phaseSectionMm2: args.sectionMm2 },
    },
    neutralSectionMm2,
  };
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/calculation-core/src/cable-sizing/criteria/neutral-conductor.ts packages/calculation-core/src/cable-sizing/criteria/neutral-conductor.test.ts
git commit -m "feat(core): add neutral conductor criterion (IEC 60364-5-52 524)"
```

---

## Bölüm 4 — Entegrasyon

### Task 13: Zincir durumu — evaluate-candidate'ı bağla

**Files:**
- Modify: `packages/calculation-core/src/cable-sizing/evaluate-candidate.ts`
- Test: `packages/calculation-core/src/cable-sizing/evaluate-candidate.test.ts` (yeni testler ekle)

> Mevcut `else` dalı (`evaluate-candidate.ts:59-63`) tüm Plan B kriterlerini `not-applicable` döndürüyor. Bu task onu gerçek değerlendiricilerle değiştirir ve **ara durum** taşır: `device` → `In`, `pe` → `S_PE`, `thermal` → `izCorrectedA`.

**Interfaces:**
- Consumes: 5 yeni kriter (Task 8–12) + `getMaxDisconnectionTime` (Task 3 — lookup burada yapılır, kriter saf kalır).
- Produces (genişletilir):
  ```typescript
  interface CandidateResult extends CandidateEvaluation {
    vdResult: VoltageDropResult | null;
    device: SelectedDevice | null;
    peSectionMm2: number | null;
    neutralSectionMm2: number | null;
  }
  ```

- [ ] **Step 1: Failing test**

```typescript
import { evaluateCandidate } from "./evaluate-candidate.js";
import type { CableSelectionInput } from "./types.js";

function detailedCtx(sectionMm2: number) {
  const input: CableSelectionInput = {
    mode: "detailed", designCurrentA: 60, phase: 3, circuitKind: "power",
    conductorMaterial: "copper", insulation: "XLPE/EPR", installationMethod: "C",
    ambientTemperatureC: 30, groupedCircuits: 1, groupingArrangement: "bunched",
    thirdHarmonicPercent: 0, voltageDropLimitPercent: 5,
    voltageDrop: { systemType: "three-phase-ac-ll", lengthM: 25, baseVoltageV: 400, cosPhi: 0.9 },
    detailed: {
      earthingSystem: "TN", circuitRole: "final", breakerCurve: "C",
      peLocation: "in-cable", conductorArrangement: "multicore",
      loopImpedance: { method: "estimated" },
      shortCircuit: { prospectiveFaultKa: 6, clearingTimeS: 0.1 },
    },
  };
  return {
    mode: input.mode, sectionMm2, material: "copper" as const, insulation: "XLPE/EPR" as const,
    circuitKind: "power" as const,
    ampacityKey: { material: "copper" as const, insulation: "XLPE/EPR" as const, loadedConductors: 3 as const },
    method: "C" as const, kTotal: 1, sizingCurrentA: 60, input,
  };
}

describe("evaluateCandidate (detailed mode)", () => {
  it("runs all eight criteria in dependency order", () => {
    const e = evaluateCandidate(detailedCtx(25));
    expect(e.criteria.map((c) => c.id)).toEqual([
      "mechanical", "thermal", "device", "voltageDrop",
      "pe", "shortCircuit", "loopImpedance", "neutral",
    ]);
  });

  it("threads the selected device into later criteria", () => {
    const e = evaluateCandidate(detailedCtx(25));
    expect(e.device?.nominalCurrentA).toBeGreaterThanOrEqual(60);
    const loop = e.criteria.find((c) => c.id === "loopImpedance");
    expect(loop?.status).not.toBe("skipped");
  });

  it("exposes PE and neutral sections", () => {
    const e = evaluateCandidate(detailedCtx(25));
    expect(e.peSectionMm2).not.toBeNull();
    expect(e.neutralSectionMm2).not.toBeNull();
  });

  it("keeps standard mode limited to three criteria (regression)", () => {
    const ctx = detailedCtx(16);
    const e = evaluateCandidate({ ...ctx, mode: "standard", input: { ...ctx.input, mode: "standard" } });
    expect(e.criteria.map((c) => c.id)).toEqual(["mechanical", "thermal", "voltageDrop"]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-core test cable-sizing/evaluate-candidate`

- [ ] **Step 3: Implement** — `evaluate-candidate.ts`'i yeniden yaz:

```typescript
import {
  ACTIVE_CRITERIA,
  type CableSizingMode, type CableSelectionInput, type CandidateEvaluation,
  type CriterionId, type CriterionOutcome, type CircuitKind, type SelectedDevice,
} from "./types.js";
import { evaluateMechanical } from "./criteria/mechanical-min.js";
import { evaluateThermal } from "./criteria/thermal.js";
import { evaluateVoltageDrop } from "./criteria/voltage-drop.js";
import { evaluateDeviceCoordination } from "./criteria/device-coordination.js";
import { evaluatePeConductor } from "./criteria/pe-conductor.js";
import { evaluateShortCircuit } from "./criteria/short-circuit.js";
import { evaluateLoopImpedance } from "./criteria/loop-impedance.js";
import { evaluateNeutralConductor } from "./criteria/neutral-conductor.js";
import { getMaxDisconnectionTime } from "@elektroplan/calculation-data";
import type { CableAmpacityKey, CableMethodCode } from "@elektroplan/calculation-data";
import type { VoltageDropResult } from "../voltage-drop/index.js";

export interface CandidateContext {
  mode: CableSizingMode;
  sectionMm2: number;
  material: "copper" | "aluminum";
  insulation: "PVC" | "XLPE/EPR";
  circuitKind: CircuitKind;
  ampacityKey: CableAmpacityKey;
  method: CableMethodCode;
  kTotal: number;
  sizingCurrentA: number;
  input: CableSelectionInput;
}

export interface CandidateResult extends CandidateEvaluation {
  vdResult: VoltageDropResult | null;
  device: SelectedDevice | null;
  peSectionMm2: number | null;
  neutralSectionMm2: number | null;
}

/** Values produced by earlier criteria and consumed by later ones. */
interface ChainState {
  izCorrectedA: number | null;
  device: SelectedDevice | null;
  peSectionMm2: number | null;
  neutralSectionMm2: number | null;
  vdResult: VoltageDropResult | null;
}

function runCriterion(
  id: CriterionId,
  ctx: CandidateContext,
  state: ChainState,
): CriterionOutcome {
  const detailed = ctx.input.detailed;

  if (id === "mechanical") {
    return evaluateMechanical(ctx.sectionMm2, ctx.material, ctx.circuitKind);
  }

  if (id === "thermal") {
    const outcome = evaluateThermal({
      key: ctx.ampacityKey, sectionMm2: ctx.sectionMm2, method: ctx.method,
      kTotal: ctx.kTotal, sizingCurrentA: ctx.sizingCurrentA,
    });
    const iz = outcome.detail.izCorrectedA;
    state.izCorrectedA = typeof iz === "number" ? iz : null;
    return outcome;
  }

  if (id === "device") {
    if (detailed === undefined || state.izCorrectedA === null) {
      return { id, status: "skipped", detail: { reason: "no-detailed-options-or-ampacity" } };
    }
    const r = evaluateDeviceCoordination({
      designCurrentA: ctx.input.designCurrentA,
      izCorrectedA: state.izCorrectedA,
      curve: detailed.breakerCurve,
      enforce: ctx.mode === "detailed",
    });
    state.device = r.device;
    return r.outcome;
  }

  if (id === "voltageDrop") {
    const r = evaluateVoltageDrop({
      sectionMm2: ctx.sectionMm2, material: ctx.material,
      insulation: ctx.insulation, input: ctx.input,
    });
    state.vdResult = r.vdResult;
    return r.outcome;
  }

  if (id === "pe") {
    if (detailed === undefined) {
      return { id, status: "skipped", detail: { reason: "no-detailed-options" } };
    }
    const fault =
      detailed.shortCircuit === undefined
        ? null
        : {
            earthFaultA: detailed.shortCircuit.prospectiveFaultKa * 1000,
            clearingTimeS: detailed.shortCircuit.clearingTimeS,
          };
    const r = evaluatePeConductor({
      sectionMm2: ctx.sectionMm2, material: ctx.material, insulation: ctx.insulation,
      peLocation: detailed.peLocation, ampacityKey: ctx.ampacityKey, fault,
    });
    state.peSectionMm2 = r.peSectionMm2;
    return r.outcome;
  }

  if (id === "shortCircuit") {
    if (detailed === undefined) {
      return { id, status: "skipped", detail: { reason: "no-detailed-options" } };
    }
    return evaluateShortCircuit({
      sectionMm2: ctx.sectionMm2, material: ctx.material, insulation: ctx.insulation,
      deviceId: state.device?.id ?? null,
      manual: detailed.shortCircuit ?? null,
    }).outcome;
  }

  if (id === "loopImpedance") {
    if (detailed === undefined) {
      return { id, status: "skipped", detail: { reason: "no-detailed-options" } };
    }
    const u0V = ctx.input.voltageDrop.baseVoltageV;
    return evaluateLoopImpedance({
      sectionMm2: ctx.sectionMm2,
      peSectionMm2: state.peSectionMm2,
      material: ctx.material,
      insulation: ctx.insulation,
      lengthM: ctx.input.voltageDrop.lengthM,
      u0V,
      nominalCurrentA: state.device?.nominalCurrentA ?? null,
      curve: detailed.breakerCurve,
      arrangement: detailed.conductorArrangement,
      parallelConductors: detailed.parallelConductors ?? 1,
      source: detailed.loopImpedance,
      maxDisconnectionS:
        getMaxDisconnectionTime({
          system: detailed.earthingSystem,
          circuitRole: detailed.circuitRole,
          u0V,
        }) ?? null,
    }).outcome;
  }

  const neutral = evaluateNeutralConductor({
    sectionMm2: ctx.sectionMm2,
    phase: ctx.input.phase,
    thirdHarmonicPercent: ctx.input.thirdHarmonicPercent,
    material: ctx.material,
  });
  state.neutralSectionMm2 = neutral.neutralSectionMm2;
  return neutral.outcome;
}

export function evaluateCandidate(ctx: CandidateContext): CandidateResult {
  const criteria: CriterionOutcome[] = [];
  const state: ChainState = {
    izCorrectedA: null, device: null, peSectionMm2: null,
    neutralSectionMm2: null, vdResult: null,
  };
  let failedAt: CriterionId | null = null;

  for (const id of ACTIVE_CRITERIA[ctx.mode]) {
    const outcome = runCriterion(id, ctx, state);
    criteria.push(outcome);
    if (outcome.status === "fail") {
      failedAt = id;
      break;
    }
    // "skipped" rejects the candidate (accepted stays false) but does not
    // short-circuit the loop and does not set failedAt.
  }

  const accepted =
    failedAt === null &&
    criteria.every((c) => c.status === "pass" || c.status === "not-applicable");

  return {
    sectionMm2: ctx.sectionMm2,
    criteria,
    failedAt,
    accepted,
    vdResult: state.vdResult,
    device: state.device,
    peSectionMm2: state.peSectionMm2,
    neutralSectionMm2: state.neutralSectionMm2,
  };
}
```

- [ ] **Step 4: Run — expect PASS** (yeni + Plan A regresyon testleri)

Run: `pnpm --filter @elektroplan/calculation-core test cable-sizing`

- [ ] **Step 5: Commit**

```bash
git add packages/calculation-core/src/cable-sizing/evaluate-candidate.ts packages/calculation-core/src/cable-sizing/evaluate-candidate.test.ts
git commit -m "feat(core): wire detailed-mode criteria chain with threaded state"
```

---

### Task 14: kS/kD düzeltmesi + select.ts detaylı çıktı

**Files:**
- Modify: `packages/calculation-core/src/cable-sizing/correction.ts`
- Modify: `packages/calculation-core/src/cable-sizing/select.ts`
- Test: `packages/calculation-core/src/cable-sizing/correction.test.ts` (yeni testler ekle)

> **kD verisi yok:** IEC 60364-5-52 gömme derinliği için sayısal tablo yayımlamıyor (VERILER.md §5). `kD` daima `1` döner ve `burialDepthM` verildiyse `assumptions`'a `estimated` kaydı düşer — sessiz varsayım yok.

**Interfaces:**
- Produces (genişletilir): `CorrectionResult` → `{ kT; kG; kH; kS; kD; kTotal; assumptions: AssumptionEntry[] }`

- [ ] **Step 1: Failing test**

```typescript
import { computeCorrection } from "./correction.js";
import type { CableSelectionInput } from "./types.js";

function buried(over: Partial<CableSelectionInput> = {}): CableSelectionInput {
  return {
    mode: "detailed", designCurrentA: 60, phase: 3, circuitKind: "power",
    conductorMaterial: "copper", insulation: "XLPE/EPR", installationMethod: "D1",
    ambientTemperatureC: 20, groupedCircuits: 1, groupingArrangement: "buried-in-ducts",
    thirdHarmonicPercent: 0, voltageDropLimitPercent: 5,
    voltageDrop: { systemType: "three-phase-ac-ll", lengthM: 25, baseVoltageV: 400, cosPhi: 0.9 },
    detailed: {
      earthingSystem: "TN", circuitRole: "final", breakerCurve: "C",
      peLocation: "in-cable", conductorArrangement: "multicore",
      loopImpedance: { method: "estimated" },
      soilThermalResistivityKmPerW: 1.0,
    },
    ...over,
  };
}

describe("computeCorrection with kS/kD", () => {
  it("applies the soil resistivity factor on buried methods", () => {
    const input = buried();
    // buried-in-ducts kG at 1 circuit is not tabulated; use 2 circuits
    const r = computeCorrection({ ...input, groupedCircuits: 2 }, 1);
    expect(r.kS).toBe(1.18);
    expect(r.kTotal).toBeCloseTo(r.kT * r.kG * r.kH * r.kS * r.kD, 9);
  });

  it("keeps kS = 1 on non-buried methods", () => {
    const r = computeCorrection({ ...buried(), installationMethod: "C", groupingArrangement: "bunched" }, 1);
    expect(r.kS).toBe(1);
  });

  it("always returns kD = 1 and records an assumption when a depth is given", () => {
    const input = buried();
    const r = computeCorrection({
      ...input, groupedCircuits: 2,
      detailed: { ...input.detailed!, burialDepthM: 1.5 },
    }, 1);
    expect(r.kD).toBe(1);
    expect(r.assumptions.some((a) => a.field === "kD" && a.source === "estimated")).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-core test cable-sizing/correction`

- [ ] **Step 3: correction.ts'i genişlet**

```typescript
import {
  getTempFactor, getGroupingArrangementFactor, getSoilResistivityFactor,
} from "@elektroplan/calculation-data";
import type { AssumptionEntry } from "../common/types/result.js";
import type { CableSelectionInput } from "./types.js";
export { validateSelectionInput } from "./validate.js";

const INSULATION_RATING = { PVC: "PVC_70C", "XLPE/EPR": "XLPE_EPR_90C" } as const;
const UNDERGROUND_METHODS = new Set(["D1", "D2"]);

export interface CorrectionResult {
  kT: number;
  kG: number;
  kH: number;
  kS: number;
  kD: number;
  kTotal: number;
  assumptions: AssumptionEntry[];
}

export function computeCorrection(input: CableSelectionInput, kH: number): CorrectionResult {
  const buried = UNDERGROUND_METHODS.has(input.installationMethod);
  const method = buried ? "D" : input.installationMethod;
  const assumptions: AssumptionEntry[] = [];

  const kT = getTempFactor({
    method: method as never,
    temperatureC: input.ambientTemperatureC,
    insulation: INSULATION_RATING[input.insulation],
  });
  if (kT === undefined) {
    throw new RangeError(`No temperature factor for ${input.installationMethod} at ${input.ambientTemperatureC}C.`);
  }

  const kG = getGroupingArrangementFactor(input.groupingArrangement, input.groupedCircuits);
  if (kG === undefined) {
    throw new RangeError(`No grouping factor for ${input.groupingArrangement} × ${input.groupedCircuits}.`);
  }

  // kS: soil thermal resistivity, buried methods only.
  let kS = 1;
  const soil = input.detailed?.soilThermalResistivityKmPerW;
  if (buried && soil !== undefined) {
    const factor = getSoilResistivityFactor(soil);
    if (factor === undefined) {
      throw new RangeError(`No soil resistivity factor for ${soil} K·m/W (no interpolation).`);
    }
    kS = factor;
  }

  // kD: IEC 60364-5-52 publishes no numeric burial-depth table (VERILER.md §5).
  const kD = 1;
  if (input.detailed?.burialDepthM !== undefined) {
    assumptions.push({ field: "kD", usedValue: 1, source: "estimated" });
  }

  const extra = input.extraCorrectionFactor ?? 1;
  return { kT, kG, kH, kS, kD, kTotal: kT * kG * kH * kS * kD * extra, assumptions };
}
```

- [ ] **Step 4: select.ts'i genişlet** — çıktı alanları ve assumption birleştirme:

```typescript
// selectCable içinde, dönüş nesnesinde value'ya ekle:
          kS: correction.kS,
          kD: correction.kD,
          selectedDevice: evaluation.device,
          peSectionMm2: evaluation.peSectionMm2,
          neutralSectionMm2: evaluation.neutralSectionMm2,

// ve assumptions birleşimi:
        assumptions: [...correction.assumptions, ...evaluation.vdResult.assumptions],
```

- [ ] **Step 5: Run — expect PASS** (standart mod regresyonu dahil)

Run: `pnpm --filter @elektroplan/calculation-core test cable-sizing`

- [ ] **Step 6: Commit**

```bash
git add packages/calculation-core/src/cable-sizing/correction.ts packages/calculation-core/src/cable-sizing/select.ts packages/calculation-core/src/cable-sizing/correction.test.ts
git commit -m "feat(core): add kS soil factor and detailed outputs to selection"
```

---

### Task 15: Uçtan uca detaylı mod + doğrulama

**Files:**
- Modify: `packages/calculation-core/src/cable-sizing/index.ts` (yeni tip export'ları)
- Test: `packages/calculation-core/src/cable-sizing/index.test.ts` (yeni testler ekle)

**Interfaces:**
- Produces: `index.ts` export'larına `type DetailedOptions, type SelectedDevice, type LoopImpedanceSource, type ShortCircuitInput, type EarthingSystem, type CircuitRole, type PeLocation` eklenir.

- [ ] **Step 1: Failing test**

```typescript
import { selectCable } from "./index.js";
import type { CableSelectionInput } from "./types.js";

function detailed(over: Partial<CableSelectionInput> = {}): CableSelectionInput {
  return {
    mode: "detailed", designCurrentA: 60, phase: 3, circuitKind: "power",
    conductorMaterial: "copper", insulation: "XLPE/EPR", installationMethod: "C",
    ambientTemperatureC: 30, groupedCircuits: 1, groupingArrangement: "bunched",
    thirdHarmonicPercent: 0, voltageDropLimitPercent: 5,
    voltageDrop: { systemType: "three-phase-ac-ll", lengthM: 25, baseVoltageV: 400, cosPhi: 0.9 },
    detailed: {
      earthingSystem: "TN", circuitRole: "final", breakerCurve: "C",
      peLocation: "in-cable", conductorArrangement: "multicore",
      loopImpedance: { method: "estimated" },
      shortCircuit: { prospectiveFaultKa: 6, clearingTimeS: 0.1 },
    },
    ...over,
  };
}

describe("selectCable (detailed mode)", () => {
  it("returns device, PE and neutral sections", () => {
    const r = selectCable(detailed());
    expect(r.value.selectedDevice).not.toBeNull();
    expect(r.value.peSectionMm2).not.toBeNull();
    expect(r.value.neutralSectionMm2).not.toBeNull();
    expect(r.formulaVariant).toBe("cable-sizing-detailed-ascending-scan");
  });

  it("never selects a smaller section than standard mode for the same load", () => {
    const std = selectCable({ ...detailed(), mode: "standard", detailed: undefined });
    const det = selectCable(detailed());
    expect(det.value.selectedSectionMm2).toBeGreaterThanOrEqual(std.value.selectedSectionMm2);
  });

  it("upsizes when a long run breaches the loop impedance limit", () => {
    const short = selectCable(detailed());
    const long = selectCable(detailed({
      voltageDrop: { systemType: "three-phase-ac-ll", lengthM: 400, baseVoltageV: 400, cosPhi: 0.9 },
      voltageDropLimitPercent: 100,
    }));
    expect(long.value.selectedSectionMm2).toBeGreaterThan(short.value.selectedSectionMm2);
  });

  it("records the criterion that rejected each smaller candidate", () => {
    const r = selectCable(detailed());
    const rejected = r.value.candidateTrace.filter((c) => !c.accepted);
    expect(rejected.length).toBeGreaterThan(0);
    expect(rejected.every((c) => c.failedAt !== null || c.criteria.some((x) => x.status === "skipped"))).toBe(true);
  });

  it("keeps standard mode output shape unchanged (regression)", () => {
    const r = selectCable({ ...detailed(), mode: "standard", detailed: undefined });
    expect(r.value.selectedDevice).toBeNull();
    expect(r.value.kS).toBe(1);
    expect(r.value.kD).toBe(1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-core test cable-sizing/index`

- [ ] **Step 3: index.ts export'larını genişlet**

```typescript
export { selectCable } from "./select.js";
export {
  ACTIVE_CRITERIA, CRITERION_IDS,
  type CableSizingMode, type CableSelectionInput, type CableSelectionOutput,
  type CableSelectionResult, type CriterionId, type CriterionOutcome,
  type CriterionStatus, type CandidateEvaluation, type CablePhase, type CircuitKind,
  type DetailedOptions, type SelectedDevice, type LoopImpedanceSource,
  type ShortCircuitInput, type EarthingSystem, type CircuitRole, type PeLocation,
} from "./types.js";
```

- [ ] **Step 4: Run — expect PASS**

> Test beklentileri veriye bağlı. `standart ≤ detaylı` ve "uzun hat büyütür" invariantları fiziksel olarak zorunlu; sayısal beklenti kullanılmadı. Bir test veri nedeniyle düşerse **testi gevşetme** — nedeni araştır (eksik katalog nominali, `buried-in-ducts` kG'de 1-devre satırı yok gibi) ve veriyi düzelt.

- [ ] **Step 5: Tam doğrulama**

Run: `pnpm test`
Expected: tüm paketler PASS.

Run: `pnpm lint && pnpm typecheck && pnpm format`
Expected: hata yok.

- [ ] **Step 6: Kapsam el kontrolü** — detaylı modu şu senaryolarla bir kez çalıştır ve `candidateTrace`'i logla:
  - 3F Cu XLPE C, 60 A, 25 m, TN final, C eğrisi → cihaz + PE + nötr dolu
  - Aynı girdi, 400 m → `loopImpedance` ile üst kesit
  - `shortCircuit` verilmeden → kriter `skipped`, sonuçta uyarı
  - D1 metodu + `soilThermalResistivityKmPerW: 1.0` → `kS = 1.18`
  - `burialDepthM` verildi → `assumptions`'da `kD/estimated` kaydı

- [ ] **Step 7: Commit**

```bash
git add packages/calculation-core/src/cable-sizing/index.ts packages/calculation-core/src/cable-sizing/index.test.ts
git commit -m "feat(core): complete detailed cable-sizing mode end to end"
```

---

## Kapsam dışı — sonraki iş

- **kD gömme derinliği tablosu** — IEC 60287 veya BS 7671 Tablo 4B4'ten alınmalı; geldiğinde `burial-depth-factors` dataseti + `correction.ts`'te kD lookup.
- **Flat-spaced reaktans** — `CONDUCTOR_ARRANGEMENTS`'a dördüncü değer + veri.
- **Katalog let-through I²t sayısalları** — ABB eğrilerinden dijitalleştirme; `letThroughI2t: null` yerine nokta çiftleri.
- **kS doğrudan-gömülü varyantı** — şu an D2'de kanal değeri kullanılıyor (muhafazakâr).
- **E/F/G metotları** — B.52.10–13 tam verisi.
- **Paralel iletken tam desteği** — şu an yalnız `loopImpedance` bölüyor; termal (`Iz·n`) ve ΔU (`R/n`) yolları eklenmeli.
- **UI 3-mod entegrasyonu** — renderer tarafı, ayrı plan.
- **Eski `cable/` sizing modülünün emekliye ayrılması** — UI geçişi tamamlanınca.
- **Ampacity `draft` → `verified`** — üretici kataloğu ile hücre-hücre doğrulama.

---

## Coding Agent Talimatları

1. **Sırayla git.** Bölüm 1 (veri) → Bölüm 2 (DTO) → Bölüm 3 (kriterler) → Bölüm 4 (entegrasyon). Kriterler Bölüm 1 datasetleri olmadan derlenmez.
2. **TDD zorunlu.** Her task: failing test → çalıştır, fail gör → minimal implementasyon → çalıştır, pass gör → commit.
3. **`.js` uzantısı.** ESM; tüm relative import'lar `.js` ile biter.
4. **Standart mod regresyonu kutsal.** `ACTIVE_CRITERIA.standard` değişmez; her task sonunda `pnpm --filter @elektroplan/calculation-core test cable-sizing` tümü yeşil.
5. **Frozen dosyalara dokunma:** `cable/`, `voltage-drop/`, `protection/` (core modül — "recommendation-only" scope guard korunur), `motor/`, `criteria/{mechanical-min,thermal,voltage-drop}.ts`.
6. **Formül duplike etme.** ΔU yalnız `voltage-drop/index.ts`'te.
7. **Veri değerleri VERILER.md'den.** Sayı uydurma yok. Bulunmayan hücre `null`, doğrulanmamış tablo `confidence: "draft"`.
8. **`skipped` sessiz geçmez.** Veri eksikse kriter `skipped` + `detail.reason` döner; aday reddedilir ama `failedAt` yazılmaz.
9. **Task 6 uyarısı:** `protection-catalog/dataset.ts` kolonları `assertColumnsMatchSchema` ile birebir doğruluyor — `PROTECTION_CATALOG_COLUMNS` **ve** `data.json`'daki `columns` dizisi birlikte güncellenmeli.
10. **Task 8 uyarısı:** seed katalogda test edilen nominal akım/eğri kombinasyonu yoksa önce katalog entry'sini ekle, testi değiştirme.
11. **Belirsizlik varsa dur, sor.** Özellikle: `getTempFactor`'ın `"D"` metodu D1/D2 için doğru underground satırını veriyor mu (Plan A'dan devralınan `as never` cast'i), ve `buried-in-ducts` kG tablosunda 1-devre satırı olmaması.
