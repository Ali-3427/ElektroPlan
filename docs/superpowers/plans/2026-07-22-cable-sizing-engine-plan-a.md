# Kablo Hesap Motoru — Plan A (Veri Temeli + Hesap Modu) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Yeni `cable-sizing/` modülü ve destekleyen veri katmanını kurup, apokris seviyesindeki "Hesap modu"nu tam çalışır hale getir (tek faz + PVC + gerçek kG/impedans dahil).

**Architecture:** Saf-fonksiyon kriter zinciri. `select.ts` en küçük kesitten yukarı tarar; `evaluate-candidate.ts` moda göre aktif kriter setini uygular. Veri erişimi yalnız `@elektroplan/calculation-data` accessor'ları üzerinden. Mevcut `cable/`, `voltage-drop/`, `protection/` modülleri **dokunulmaz**. ΔU formülü yeniden yazılmaz — mevcut `voltage-drop/index.ts` çağrılır.

**Tech Stack:** TypeScript (ESM, `.js` import uzantıları zorunlu), vitest (globals: `describe/it/expect`), pnpm workspaces + turbo. Node ≥ 20.

## Global Constraints

- Standart kapsamı **yalnız IEC 60364 / TS HD 60364** (v1), `decisions.md:48`.
- `calculation-core` **asla** `electron`, `react`, `better-sqlite3`, `fs` import etmez (master plan §9).
- Hiçbir formül duplike edilmez; ΔU tek yerde (`voltage-drop/`), kablo motoru onu çağırır (master plan §9).
- Ruleset tabloları **asla** core'a hardcode edilmez; `calculation-data` accessor'larından okunur (`decisions.md:63`).
- Her dataset dosyası `DatasetMetadata { id, standard, revision, source, validFrom, notes }` taşır (`decisions.md:62`).
- Çıktı sözleşmesi `CalculationResult<T>` şekli değişmez (`[LOCKED] §2.5`): `value, warnings, assumptions, formulaVariant, dataVersion, engineVersion`.
- Yuvarlama yalnız sunumda; core ham sayı döner (`common/precision`).
- Fiziksel sabitler frozen (`decisions.md:5`): `RHO_COPPER_20=0.01724`, `RHO_ALUMINUM_20=0.02826`, `ALPHA_COPPER_20=0.00393`, `ALPHA_ALUMINUM_20=0.00403`.
- Ondalık: JSON'da nokta (`14.5`), Avrupa virgülü **kullanılmaz**.
- Montaj metot seti (yeni modül): `{A1, A2, B1, B2, C, D1, D2}`. Eski `{A1..E}` seti dokunulmaz.
- Veri güven değerleri: `"verified" | "draft" | "missing"`. Ampacity `draft` girer.
- Kaynak veriler: [`Plan/VERILER.md`](../../../Plan/VERILER.md) (derleme), [`Plan/VERI_TALEBI_kablo-motoru.md`](../../../Plan/VERI_TALEBI_kablo-motoru.md) (şemalar).
- Test komutu (paket kökünden): `pnpm --filter @elektroplan/calculation-data test` veya `pnpm --filter @elektroplan/calculation-core test`.

---

## Dosya Haritası

**calculation-data (yeni):**
```
packages/calculation-data/src/iec/
  cable-methods/                       # YENİ — D1/D2 metot seti (yalnız kablo motoru)
    types.ts                           #   CABLE_METHOD_CODES, CableMethodCode
    index.ts
  cable-ampacity/                      # YENİ — PVC+XLPE × 2+3 loaded × D1/D2, confidence
    types.ts
    <6 json>                           #   B.52.2–5 transkripsiyonu, draft
    dataset.ts
    accessors.ts
    index.ts
  conductor-impedance/                 # YENİ — R (IEC 60228) + X (reaktans)
    types.ts / data.json / dataset.ts / accessors.ts / index.ts
  minimum-section/                     # YENİ — Tablo 52.2
    types.ts / data.json / dataset.ts / accessors.ts / index.ts
  grouping-arrangements/               # YENİ — arrangement-boyutlu kG (B.52.17/20)
    types.ts / data.json / dataset.ts / accessors.ts / index.ts
  temperature-factors/data.json        # DEĞİŞTİR — satır tamamla (additive)
```

**calculation-core (yeni):**
```
packages/calculation-core/src/cable-sizing/
  types.ts                             # Input/Output/CriterionOutcome/CandidateEvaluation
  validate.ts
  design-current.ts                    # Adım 0
  sizing-current.ts                    # Adım 1
  correction.ts                        # Adım 2 (kT·kG·kH; kS·kD Plan B)
  criteria/
    mechanical-min.ts                  # Kriter 1
    thermal.ts                         # Kriter 2
    voltage-drop.ts                    # Kriter 4 (voltage-drop/ çağırır)
  evaluate-candidate.ts
  select.ts
  index.ts                             # public: selectCable
  *.test.ts
```

**Değişmeyen (regresyon koruması):** `cable/`, `voltage-drop/`, `protection/`, `motor/`, mevcut `iec/ampacity`, `iec/grouping-factors`, `iec/installation-methods`.

---

## Bölüm 1 — Veri katmanı temeli

### Task 1: Güven (confidence) tipi — paylaşılan

**Files:**
- Create: `packages/calculation-data/src/dataset/confidence.ts`
- Modify: `packages/calculation-data/src/dataset/index.ts`
- Test: `packages/calculation-data/src/dataset/confidence.test.ts`

**Interfaces:**
- Produces: `type DataConfidence = "verified" | "draft" | "missing"`; `assertConfidence(value: unknown, ctx: string): asserts value is DataConfidence`

- [ ] **Step 1: Failing test**

```typescript
import { assertConfidence, type DataConfidence } from "./confidence.js";

describe("assertConfidence", () => {
  it("accepts the three known confidence values", () => {
    for (const value of ["verified", "draft", "missing"] as DataConfidence[]) {
      expect(() => assertConfidence(value, "test")).not.toThrow();
    }
  });

  it("throws on an unknown value", () => {
    expect(() => assertConfidence("guess", "cable-ampacity")).toThrow(
      "Invalid data confidence 'guess' in cable-ampacity.",
    );
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`Cannot find module './confidence.js'`)

Run: `pnpm --filter @elektroplan/calculation-data test confidence`

- [ ] **Step 3: Implement**

```typescript
// confidence.ts
export const DATA_CONFIDENCE_VALUES = ["verified", "draft", "missing"] as const;
export type DataConfidence = (typeof DATA_CONFIDENCE_VALUES)[number];

export function assertConfidence(
  value: unknown,
  context: string,
): asserts value is DataConfidence {
  if (!(DATA_CONFIDENCE_VALUES as readonly unknown[]).includes(value)) {
    throw new Error(`Invalid data confidence '${String(value)}' in ${context}.`);
  }
}
```

Modify `dataset/index.ts` — append:
```typescript
export { DATA_CONFIDENCE_VALUES, assertConfidence, type DataConfidence } from "./confidence.js";
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/calculation-data/src/dataset/confidence.ts packages/calculation-data/src/dataset/confidence.test.ts packages/calculation-data/src/dataset/index.ts
git commit -m "feat(data): add DataConfidence type and guard"
```

---

### Task 2: Kablo metot seti (D1/D2)

**Files:**
- Create: `packages/calculation-data/src/iec/cable-methods/types.ts`
- Create: `packages/calculation-data/src/iec/cable-methods/index.ts`
- Test: `packages/calculation-data/src/iec/cable-methods/types.test.ts`

**Interfaces:**
- Produces: `CABLE_METHOD_CODES = ["A1","A2","B1","B2","C","D1","D2"]`; `type CableMethodCode`; `isCableMethodCode(v: unknown): v is CableMethodCode`

- [ ] **Step 1: Failing test**

```typescript
import { CABLE_METHOD_CODES, isCableMethodCode } from "./index.js";

describe("cable methods", () => {
  it("freezes the D1/D2 method set", () => {
    expect(CABLE_METHOD_CODES).toEqual(["A1", "A2", "B1", "B2", "C", "D1", "D2"]);
  });

  it("guards membership", () => {
    expect(isCableMethodCode("D1")).toBe(true);
    expect(isCableMethodCode("D")).toBe(false);
    expect(isCableMethodCode("E")).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-data test cable-methods`

- [ ] **Step 3: Implement**

```typescript
// types.ts
export const CABLE_METHOD_CODES = ["A1", "A2", "B1", "B2", "C", "D1", "D2"] as const;
export type CableMethodCode = (typeof CABLE_METHOD_CODES)[number];

export function isCableMethodCode(value: unknown): value is CableMethodCode {
  return (CABLE_METHOD_CODES as readonly unknown[]).includes(value);
}
```
```typescript
// index.ts
export { CABLE_METHOD_CODES, isCableMethodCode, type CableMethodCode } from "./types.js";
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/calculation-data/src/iec/cable-methods
git commit -m "feat(data): add cable method set with D1/D2 split"
```

---

### Task 3: Kablo ampacity — tip + loader (veri hücreleri boş iskelet)

**Files:**
- Create: `packages/calculation-data/src/iec/cable-ampacity/types.ts`
- Create: `packages/calculation-data/src/iec/cable-ampacity/dataset.ts`
- Create: `packages/calculation-data/src/iec/cable-ampacity/accessors.ts`
- Create: `packages/calculation-data/src/iec/cable-ampacity/index.ts`
- Test: `packages/calculation-data/src/iec/cable-ampacity/accessors.test.ts`

**Interfaces:**
- Consumes: `CableMethodCode` (Task 2), `DataConfidence` (Task 1), `loadJsonDataset`/`assertAscending` (`dataset/load-json-dataset.ts`).
- Produces:
  ```typescript
  type CableInsulation = "PVC" | "XLPE/EPR";
  type CableAmpacityKey = { material: "copper"|"aluminum"; insulation: CableInsulation; loadedConductors: 2|3 };
  interface CableAmpacityEntry { crossSectionMm2: number; methods: Record<CableMethodCode, number|null>; }
  function getCableAmpacity(key: CableAmpacityKey, crossSectionMm2: number, method: CableMethodCode): number | null | undefined;
  function getCableAmpacityDataset(key: CableAmpacityKey): CableAmpacityDataset;
  function getCableAmpacityConfidence(key: CableAmpacityKey): DataConfidence;
  function getCableCrossSections(key: CableAmpacityKey): readonly number[];
  ```

- [ ] **Step 1: Failing test** (yalnız iskelet + 1 gerçek dosyayla doğrular — B.52.5 Cu XLPE 3-loaded C sütunu VERILER.md satırlarından)

```typescript
import {
  getCableAmpacity,
  getCableCrossSections,
  getCableAmpacityConfidence,
} from "./index.js";

const XLPE_CU_3 = { material: "copper", insulation: "XLPE/EPR", loadedConductors: 3 } as const;

describe("cable ampacity", () => {
  it("returns method C value for 16 mm² Cu XLPE 3-loaded (B.52.5)", () => {
    expect(getCableAmpacity(XLPE_CU_3, 16, "C")).toBe(96);
  });

  it("splits D into D1 and D2", () => {
    expect(getCableAmpacity(XLPE_CU_3, 16, "D1")).toBe(75);
    expect(getCableAmpacity(XLPE_CU_3, 16, "D2")).toBe(84);
  });

  it("exposes ascending cross-sections", () => {
    const sections = getCableCrossSections(XLPE_CU_3);
    expect(sections[0]).toBe(1.5);
    expect(sections.at(-1)).toBe(300);
    expect([...sections]).toEqual([...sections].sort((a, b) => a - b));
  });

  it("marks transcribed ampacity as draft", () => {
    expect(getCableAmpacityConfidence(XLPE_CU_3)).toBe("draft");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-data test cable-ampacity`

- [ ] **Step 3: Implement types + loader**

```typescript
// types.ts
import type { DatasetWithMetadata } from "../../dataset/types.js";
import type { DataConfidence } from "../../dataset/confidence.js";
import type { CableMethodCode } from "../cable-methods/types.js";

export type CableInsulation = "PVC" | "XLPE/EPR";
export type CableConductorMaterial = "copper" | "aluminum";
export type LoadedConductorCount = 2 | 3;

export interface CableAmpacityEntry {
  crossSectionMm2: number;
  methods: Readonly<Record<CableMethodCode, number | null>>;
}

export interface CableAmpacityDataset extends DatasetWithMetadata {
  material: CableConductorMaterial;
  insulation: CableInsulation;
  insulationTemperatureC: 70 | 90;
  loadedConductors: LoadedConductorCount;
  referenceAmbientAirC: 30;
  referenceGroundC: 20;
  confidence: DataConfidence;
  entries: readonly CableAmpacityEntry[];
}

export interface CableAmpacityKey {
  material: CableConductorMaterial;
  insulation: CableInsulation;
  loadedConductors: LoadedConductorCount;
}
```

```typescript
// dataset.ts
import cuPvc2 from "./copper-pvc-70c-2loaded.json" with { type: "json" };
import cuPvc3 from "./copper-pvc-70c-3loaded.json" with { type: "json" };
import cuXlpe2 from "./copper-xlpe-90c-2loaded.json" with { type: "json" };
import cuXlpe3 from "./copper-xlpe-90c-3loaded.json" with { type: "json" };
import alPvc3 from "./aluminum-pvc-70c-3loaded.json" with { type: "json" };
import alXlpe3 from "./aluminum-xlpe-90c-3loaded.json" with { type: "json" };

import { assertAscending, loadJsonDataset } from "../../dataset/load-json-dataset.js";
import { assertConfidence } from "../../dataset/confidence.js";
import { CABLE_METHOD_CODES } from "../cable-methods/types.js";
import type { CableAmpacityDataset, CableAmpacityKey } from "./types.js";

function keyOf(d: CableAmpacityDataset): string {
  return `${d.material}|${d.insulation}|${d.loadedConductors}`;
}

function assertDataset(raw: CableAmpacityDataset, path: string): Readonly<CableAmpacityDataset> {
  const d = loadJsonDataset(raw, path);
  assertConfidence(d.confidence, path);
  if (d.entries.length === 0) throw new Error(`${path} has no entries.`);
  for (const [i, entry] of d.entries.entries()) {
    for (const method of CABLE_METHOD_CODES) {
      const v = entry.methods[method];
      if (v !== null && typeof v !== "number") {
        throw new Error(`${path} entry ${i} method ${method} must be number or null.`);
      }
    }
  }
  assertAscending(d.entries.map((e) => e.crossSectionMm2), `${path} cross-sections`);
  return d;
}

const RAW: CableAmpacityDataset[] = [
  cuPvc2 as CableAmpacityDataset, cuPvc3 as CableAmpacityDataset,
  cuXlpe2 as CableAmpacityDataset, cuXlpe3 as CableAmpacityDataset,
  alPvc3 as CableAmpacityDataset, alXlpe3 as CableAmpacityDataset,
];

const PATHS = [
  "copper-pvc-70c-2loaded", "copper-pvc-70c-3loaded",
  "copper-xlpe-90c-2loaded", "copper-xlpe-90c-3loaded",
  "aluminum-pvc-70c-3loaded", "aluminum-xlpe-90c-3loaded",
];

export const cableAmpacityDatasets: ReadonlyMap<string, Readonly<CableAmpacityDataset>> =
  new Map(RAW.map((raw, i) => {
    const d = assertDataset(raw, `packages/calculation-data/src/iec/cable-ampacity/${PATHS[i]}.json`);
    return [keyOf(d), d];
  }));

export function datasetKey(key: CableAmpacityKey): string {
  return `${key.material}|${key.insulation}|${key.loadedConductors}`;
}
```

```typescript
// accessors.ts
import { cableAmpacityDatasets, datasetKey } from "./dataset.js";
import type { CableMethodCode } from "../cable-methods/types.js";
import type { DataConfidence } from "../../dataset/confidence.js";
import type { CableAmpacityDataset, CableAmpacityKey } from "./types.js";

export function getCableAmpacityDataset(key: CableAmpacityKey): Readonly<CableAmpacityDataset> {
  const d = cableAmpacityDatasets.get(datasetKey(key));
  if (d === undefined) {
    throw new RangeError(`No cable ampacity dataset for ${datasetKey(key)}.`);
  }
  return d;
}

export function getCableCrossSections(key: CableAmpacityKey): readonly number[] {
  return getCableAmpacityDataset(key).entries.map((e) => e.crossSectionMm2);
}

export function getCableAmpacityConfidence(key: CableAmpacityKey): DataConfidence {
  return getCableAmpacityDataset(key).confidence;
}

export function getCableAmpacity(
  key: CableAmpacityKey,
  crossSectionMm2: number,
  method: CableMethodCode,
): number | null | undefined {
  const entry = getCableAmpacityDataset(key).entries.find(
    (e) => e.crossSectionMm2 === crossSectionMm2,
  );
  return entry?.methods[method];
}
```

```typescript
// index.ts
export {
  getCableAmpacity, getCableAmpacityDataset, getCableCrossSections, getCableAmpacityConfidence,
} from "./accessors.js";
export type {
  CableAmpacityDataset, CableAmpacityEntry, CableAmpacityKey,
  CableInsulation, CableConductorMaterial, LoadedConductorCount,
} from "./types.js";
```

- [ ] **Step 4: Create 6 JSON files.** Values from [`Plan/VERILER.md`](../../../Plan/VERILER.md) §1 (nokta ondalık). `xlpe-90c-3loaded` = B.52.5, `pvc-70c-3loaded` = B.52.4, `pvc-70c-2loaded` = B.52.2, `xlpe-90c-2loaded` = B.52.3. Aluminum: 1.5 satırı yok, D2 2.5–10 mm² = `null`. E sütunu üretilmez (D1/D2 var, E yok). Example (`copper-xlpe-90c-3loaded.json`, tam 1.5–300):

```json
{
  "metadata": {
    "id": "iec-60364-5-52-cable-ampacity-copper-xlpe-90c-3loaded-v1",
    "standard": "IEC 60364-5-52",
    "revision": "v1",
    "source": "Tablo B.52.5 (VERILER.md transkripsiyonu)",
    "validFrom": "2026-07-22",
    "notes": "XLPE/EPR 90C, 3 yuklu iletken. D1=kanal, D2=dogrudan gomulu. Ikincil transkripsiyon — draft."
  },
  "material": "copper",
  "insulation": "XLPE/EPR",
  "insulationTemperatureC": 90,
  "loadedConductors": 3,
  "referenceAmbientAirC": 30,
  "referenceGroundC": 20,
  "confidence": "draft",
  "entries": [
    { "crossSectionMm2": 1.5, "methods": { "A1": 17, "A2": 16.5, "B1": 20, "B2": 19.5, "C": 22, "D1": 21, "D2": 23 } },
    { "crossSectionMm2": 2.5, "methods": { "A1": 23, "A2": 22, "B1": 28, "B2": 26, "C": 30, "D1": 28, "D2": 30 } },
    { "crossSectionMm2": 4,   "methods": { "A1": 31, "A2": 30, "B1": 37, "B2": 35, "C": 40, "D1": 36, "D2": 39 } },
    { "crossSectionMm2": 6,   "methods": { "A1": 40, "A2": 38, "B1": 48, "B2": 44, "C": 52, "D1": 44, "D2": 49 } },
    { "crossSectionMm2": 10,  "methods": { "A1": 54, "A2": 51, "B1": 66, "B2": 60, "C": 71, "D1": 58, "D2": 65 } },
    { "crossSectionMm2": 16,  "methods": { "A1": 73, "A2": 68, "B1": 88, "B2": 80, "C": 96, "D1": 75, "D2": 84 } },
    { "crossSectionMm2": 25,  "methods": { "A1": 95, "A2": 89, "B1": 117, "B2": 105, "C": 119, "D1": 96, "D2": 107 } },
    { "crossSectionMm2": 35,  "methods": { "A1": 117, "A2": 109, "B1": 144, "B2": 128, "C": 147, "D1": 115, "D2": 129 } },
    { "crossSectionMm2": 50,  "methods": { "A1": 141, "A2": 130, "B1": 175, "B2": 154, "C": 179, "D1": 135, "D2": 153 } },
    { "crossSectionMm2": 70,  "methods": { "A1": 179, "A2": 164, "B1": 222, "B2": 194, "C": 229, "D1": 167, "D2": 188 } },
    { "crossSectionMm2": 95,  "methods": { "A1": 216, "A2": 197, "B1": 269, "B2": 233, "C": 278, "D1": 197, "D2": 226 } },
    { "crossSectionMm2": 120, "methods": { "A1": 249, "A2": 227, "B1": 312, "B2": 268, "C": 322, "D1": 223, "D2": 257 } },
    { "crossSectionMm2": 150, "methods": { "A1": 285, "A2": 259, "B1": 342, "B2": 300, "C": 371, "D1": 251, "D2": 287 } },
    { "crossSectionMm2": 185, "methods": { "A1": 324, "A2": 295, "B1": 384, "B2": 340, "C": 424, "D1": 281, "D2": 324 } },
    { "crossSectionMm2": 240, "methods": { "A1": 380, "A2": 346, "B1": 450, "B2": 398, "C": 500, "D1": 324, "D2": 375 } },
    { "crossSectionMm2": 300, "methods": { "A1": 435, "A2": 396, "B1": 514, "B2": 455, "C": 576, "D1": 365, "D2": 419 } }
  ]
}
```

Diğer 5 dosya aynı yapı, kendi tablo değerleriyle (B.52.2 Cu/Al PVC 2-loaded, B.52.3 Cu XLPE 2-loaded, B.52.4 Cu/Al PVC 3-loaded, B.52.5 Al XLPE — VERILER.md'de Al XLPE 3-loaded ayrı bloklar). **Al dosyalarında 1.5 mm² entry'si yok; en küçük 2.5 (veya 10, tabloda ne varsa).** B.52.4 Cu 120 mm² D1 hücresi = **192** (VERILER.md data-integrity bayrağı).

- [ ] **Step 5: Run — expect PASS** (Step 1 testleri + loader assert'leri geçmeli)

- [ ] **Step 6: Register in package index**

Modify `packages/calculation-data/src/iec/index.ts` — append `export * from "./cable-methods/index.js";` ve `export * from "./cable-ampacity/index.js";`

- [ ] **Step 7: Typecheck + commit**

Run: `pnpm --filter @elektroplan/calculation-data typecheck`
```bash
git add packages/calculation-data/src/iec/cable-ampacity packages/calculation-data/src/iec/index.ts
git commit -m "feat(data): add cable ampacity datasets (PVC+XLPE, 2+3 loaded, D1/D2, draft)"
```

---

### Task 4: İletken empedansı (R + X) dataseti

**Files:**
- Create: `packages/calculation-data/src/iec/conductor-impedance/{types,dataset,accessors,index}.ts`, `data.json`
- Test: `packages/calculation-data/src/iec/conductor-impedance/accessors.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  type ConductorArrangement = "multicore" | "singleCoreTrefoil" | "singleCoreFlatTouching";
  function getResistance20(material: "copper"|"aluminum", sectionMm2: number): number | null | undefined;
  function getReactance(arrangement: ConductorArrangement, sectionMm2: number): number | null | undefined;
  ```

- [ ] **Step 1: Failing test** (değerler VERILER.md §6)

```typescript
import { getResistance20, getReactance } from "./index.js";

describe("conductor impedance", () => {
  it("returns IEC 60228 DC resistance at 20C (ohm/km)", () => {
    expect(getResistance20("copper", 16)).toBe(1.15);
    expect(getResistance20("aluminum", 16)).toBe(1.91);
  });

  it("returns null for aluminum below 10 mm² (not tabulated)", () => {
    expect(getResistance20("aluminum", 1.5)).toBeNull();
  });

  it("returns multicore reactance (ohm/km)", () => {
    expect(getReactance("multicore", 16)).toBe(0.081);
    expect(getReactance("singleCoreTrefoil", 16)).toBe(0.114);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-data test conductor-impedance`

- [ ] **Step 3: Implement**

```typescript
// types.ts
import type { DatasetWithMetadata } from "../../dataset/types.js";
export const CONDUCTOR_ARRANGEMENTS = ["multicore", "singleCoreTrefoil", "singleCoreFlatTouching"] as const;
export type ConductorArrangement = (typeof CONDUCTOR_ARRANGEMENTS)[number];
export interface ConductorImpedanceEntry {
  crossSectionMm2: number;
  resistance20OhmPerKm: { copper: number | null; aluminum: number | null };
  reactanceOhmPerKm: Readonly<Record<ConductorArrangement, number | null>>;
}
export interface ConductorImpedanceDataset extends DatasetWithMetadata {
  referenceTemperatureC: 20;
  entries: readonly ConductorImpedanceEntry[];
}
```
```typescript
// dataset.ts
import raw from "./data.json" with { type: "json" };
import { assertAscending, loadJsonDataset } from "../../dataset/load-json-dataset.js";
import type { ConductorImpedanceDataset } from "./types.js";
export const conductorImpedanceDataset: Readonly<ConductorImpedanceDataset> = (() => {
  const d = loadJsonDataset(raw as ConductorImpedanceDataset,
    "packages/calculation-data/src/iec/conductor-impedance/data.json");
  assertAscending(d.entries.map((e) => e.crossSectionMm2), "conductor-impedance cross-sections");
  return d;
})();
```
```typescript
// accessors.ts
import { conductorImpedanceDataset } from "./dataset.js";
import type { ConductorArrangement } from "./types.js";
function entry(sectionMm2: number) {
  return conductorImpedanceDataset.entries.find((e) => e.crossSectionMm2 === sectionMm2);
}
export function getResistance20(material: "copper" | "aluminum", sectionMm2: number): number | null | undefined {
  return entry(sectionMm2)?.resistance20OhmPerKm[material];
}
export function getReactance(arrangement: ConductorArrangement, sectionMm2: number): number | null | undefined {
  return entry(sectionMm2)?.reactanceOhmPerKm[arrangement];
}
```
```typescript
// index.ts
export { getResistance20, getReactance } from "./accessors.js";
export { conductorImpedanceDataset } from "./dataset.js";
export { CONDUCTOR_ARRANGEMENTS, type ConductorArrangement,
  type ConductorImpedanceDataset, type ConductorImpedanceEntry } from "./types.js";
```

- [ ] **Step 4: Create `data.json`** — R (IEC 60228, VERILER.md §6) + X (SMC, §6). Al 1.5–6 = `null`; `singleCoreFlatTouching` doldurulur, `singleCoreFlatSpaced` şemaya konmaz (Plan B, `missing`). 16 satır (1.5–300). Example head:

```json
{
  "metadata": {
    "id": "iec-60228-conductor-impedance-v1",
    "standard": "IEC 60228 / IEC 60287",
    "revision": "v1",
    "source": "IEC 60228 Ed.3 Class 2 (R, Nexans) + SMC Cables XLPE (X)",
    "validFrom": "2026-07-22",
    "notes": "R = 20C DC max; X = 50Hz XLPE. Al 1.5-6mm2 tablolanmaz (null)."
  },
  "referenceTemperatureC": 20,
  "entries": [
    { "crossSectionMm2": 1.5, "resistance20OhmPerKm": { "copper": 12.1, "aluminum": null }, "reactanceOhmPerKm": { "multicore": 0.115, "singleCoreTrefoil": null, "singleCoreFlatTouching": null } },
    { "crossSectionMm2": 16,  "resistance20OhmPerKm": { "copper": 1.15, "aluminum": 1.91 }, "reactanceOhmPerKm": { "multicore": 0.081, "singleCoreTrefoil": 0.114, "singleCoreFlatTouching": 0.172 } }
  ]
}
```

- [ ] **Step 5: Run — expect PASS**

- [ ] **Step 6: Register + commit**

Modify `iec/index.ts`: `export * from "./conductor-impedance/index.js";`
```bash
git add packages/calculation-data/src/iec/conductor-impedance packages/calculation-data/src/iec/index.ts
git commit -m "feat(data): add conductor R/X impedance dataset (IEC 60228 + reactance)"
```

---

### Task 5: Minimum mekanik kesit dataseti

**Files:**
- Create: `packages/calculation-data/src/iec/minimum-section/{types,dataset,accessors,index}.ts`, `data.json`
- Test: `.../minimum-section/accessors.test.ts`

**Interfaces:**
- Produces: `type CircuitKind = "power" | "signal"`; `getMinimumSection(circuitKind: CircuitKind, material: "copper"|"aluminum"): number | undefined`

- [ ] **Step 1: Failing test** (VERILER.md §8)

```typescript
import { getMinimumSection } from "./index.js";
describe("minimum section", () => {
  it("returns Table 52.2 minimums", () => {
    expect(getMinimumSection("power", "copper")).toBe(1.5);
    expect(getMinimumSection("power", "aluminum")).toBe(16);
    expect(getMinimumSection("signal", "copper")).toBe(0.5);
  });
  it("returns undefined for an untabulated combination", () => {
    expect(getMinimumSection("signal", "aluminum")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-data test minimum-section`

- [ ] **Step 3: Implement**

```typescript
// types.ts
import type { DatasetWithMetadata } from "../../dataset/types.js";
export const CIRCUIT_KINDS = ["power", "signal"] as const;
export type CircuitKind = (typeof CIRCUIT_KINDS)[number];
export interface MinimumSectionEntry {
  circuitKind: CircuitKind;
  material: "copper" | "aluminum";
  minSectionMm2: number;
}
export interface MinimumSectionDataset extends DatasetWithMetadata {
  entries: readonly MinimumSectionEntry[];
}
```
```typescript
// dataset.ts
import raw from "./data.json" with { type: "json" };
import { loadJsonDataset } from "../../dataset/load-json-dataset.js";
import type { MinimumSectionDataset } from "./types.js";
export const minimumSectionDataset: Readonly<MinimumSectionDataset> =
  loadJsonDataset(raw as MinimumSectionDataset,
    "packages/calculation-data/src/iec/minimum-section/data.json");
```
```typescript
// accessors.ts
import { minimumSectionDataset } from "./dataset.js";
import type { CircuitKind } from "./types.js";
export function getMinimumSection(circuitKind: CircuitKind, material: "copper" | "aluminum"): number | undefined {
  return minimumSectionDataset.entries.find(
    (e) => e.circuitKind === circuitKind && e.material === material,
  )?.minSectionMm2;
}
```
```typescript
// index.ts
export { getMinimumSection } from "./accessors.js";
export { minimumSectionDataset } from "./dataset.js";
export { CIRCUIT_KINDS, type CircuitKind, type MinimumSectionDataset, type MinimumSectionEntry } from "./types.js";
```

- [ ] **Step 4: Create `data.json`**

```json
{
  "metadata": {
    "id": "iec-60364-5-52-minimum-section-v1",
    "standard": "IEC 60364-5-52",
    "revision": "v1",
    "source": "Tablo 52.2",
    "validFrom": "2026-07-22",
    "notes": "Guc/aydinlatma ve sinyal devreleri icin minimum mekanik kesit."
  },
  "entries": [
    { "circuitKind": "power", "material": "copper", "minSectionMm2": 1.5 },
    { "circuitKind": "power", "material": "aluminum", "minSectionMm2": 16 },
    { "circuitKind": "signal", "material": "copper", "minSectionMm2": 0.5 }
  ]
}
```

- [ ] **Step 5: Run — expect PASS**

- [ ] **Step 6: Register + commit**

Modify `iec/index.ts`: `export * from "./minimum-section/index.js";`
```bash
git add packages/calculation-data/src/iec/minimum-section packages/calculation-data/src/iec/index.ts
git commit -m "feat(data): add minimum mechanical section dataset (Table 52.2)"
```

---

### Task 6: Gruplama düzenlemeleri (arrangement-boyutlu kG)

**Files:**
- Create: `packages/calculation-data/src/iec/grouping-arrangements/{types,dataset,accessors,index}.ts`, `data.json`
- Test: `.../grouping-arrangements/accessors.test.ts`

> Not: Mevcut `grouping-factors/` **dokunulmaz** (eski `cable/` onu kullanır). Bu yeni, boyutlu tablodur.

**Interfaces:**
- Produces:
  ```typescript
  type GroupingArrangementId = "bunched" | "single-layer-tray-horizontal" | "buried-in-ducts";
  function getGroupingArrangementFactor(id: GroupingArrangementId, circuits: number): number | undefined;
  function listGroupingArrangements(): readonly GroupingArrangementId[];
  ```

- [ ] **Step 1: Failing test** (VERILER.md §3)

```typescript
import { getGroupingArrangementFactor } from "./index.js";
describe("grouping arrangements", () => {
  it("returns B.52.17 bunched factors", () => {
    expect(getGroupingArrangementFactor("bunched", 1)).toBe(1);
    expect(getGroupingArrangementFactor("bunched", 4)).toBe(0.65);
    expect(getGroupingArrangementFactor("bunched", 20)).toBe(0.38);
  });
  it("returns undefined for an unlisted circuit count", () => {
    expect(getGroupingArrangementFactor("bunched", 11)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-data test grouping-arrangements`

- [ ] **Step 3: Implement**

```typescript
// types.ts
import type { DatasetWithMetadata } from "../../dataset/types.js";
export const GROUPING_ARRANGEMENT_IDS = ["bunched", "single-layer-tray-horizontal", "buried-in-ducts"] as const;
export type GroupingArrangementId = (typeof GROUPING_ARRANGEMENT_IDS)[number];
export interface GroupingArrangementRow { circuits: number; factor: number; }
export interface GroupingArrangement {
  id: GroupingArrangementId;
  sourceTable: string;
  entries: readonly GroupingArrangementRow[];
}
export interface GroupingArrangementsDataset extends DatasetWithMetadata {
  arrangements: readonly GroupingArrangement[];
}
```
```typescript
// dataset.ts
import raw from "./data.json" with { type: "json" };
import { loadJsonDataset } from "../../dataset/load-json-dataset.js";
import type { GroupingArrangementsDataset } from "./types.js";
export const groupingArrangementsDataset: Readonly<GroupingArrangementsDataset> =
  loadJsonDataset(raw as GroupingArrangementsDataset,
    "packages/calculation-data/src/iec/grouping-arrangements/data.json");
```
```typescript
// accessors.ts
import { groupingArrangementsDataset } from "./dataset.js";
import type { GroupingArrangementId } from "./types.js";
export function getGroupingArrangementFactor(id: GroupingArrangementId, circuits: number): number | undefined {
  const a = groupingArrangementsDataset.arrangements.find((x) => x.id === id);
  return a?.entries.find((r) => r.circuits === circuits)?.factor;
}
export function listGroupingArrangements(): readonly GroupingArrangementId[] {
  return groupingArrangementsDataset.arrangements.map((a) => a.id);
}
```
```typescript
// index.ts
export { getGroupingArrangementFactor, listGroupingArrangements } from "./accessors.js";
export { groupingArrangementsDataset } from "./dataset.js";
export { GROUPING_ARRANGEMENT_IDS, type GroupingArrangementId,
  type GroupingArrangementsDataset, type GroupingArrangement, type GroupingArrangementRow } from "./types.js";
```

- [ ] **Step 4: Create `data.json`** — `bunched` (B.52.17): 1=1, 2=0.8, 3=0.7, 4=0.65, 5=0.6, 6=0.57, 7=0.54, 8=0.52, 9=0.5, 12=0.45, 16=0.41, 20=0.38. `buried-in-ducts` (B.52.20 touching): 2=0.75, 3=0.65, 4=0.6, 5=0.55, 6=0.5. `single-layer-tray-horizontal` VERILER.md'de kısmi → yalnız doğrulanan satırları koy, gerisi eklenmez.

```json
{
  "metadata": {
    "id": "iec-60364-5-52-grouping-arrangements-v1",
    "standard": "IEC 60364-5-52",
    "revision": "v1",
    "source": "Tablo B.52.17 (bunched) + B.52.20 (buried ducts)",
    "validFrom": "2026-07-22",
    "notes": "Duzenlemeye gore kG. Kismi/dogrulanmamis satirlar eklenmedi."
  },
  "arrangements": [
    { "id": "bunched", "sourceTable": "B.52.17", "entries": [
      { "circuits": 1, "factor": 1 }, { "circuits": 2, "factor": 0.8 }, { "circuits": 3, "factor": 0.7 },
      { "circuits": 4, "factor": 0.65 }, { "circuits": 5, "factor": 0.6 }, { "circuits": 6, "factor": 0.57 },
      { "circuits": 7, "factor": 0.54 }, { "circuits": 8, "factor": 0.52 }, { "circuits": 9, "factor": 0.5 },
      { "circuits": 12, "factor": 0.45 }, { "circuits": 16, "factor": 0.41 }, { "circuits": 20, "factor": 0.38 }
    ] },
    { "id": "buried-in-ducts", "sourceTable": "B.52.20", "entries": [
      { "circuits": 2, "factor": 0.75 }, { "circuits": 3, "factor": 0.65 }, { "circuits": 4, "factor": 0.6 },
      { "circuits": 5, "factor": 0.55 }, { "circuits": 6, "factor": 0.5 }
    ] },
    { "id": "single-layer-tray-horizontal", "sourceTable": "B.52.20", "entries": [] }
  ]
}
```

- [ ] **Step 5: Run — expect PASS**

- [ ] **Step 6: Register + commit**

Modify `iec/index.ts`: `export * from "./grouping-arrangements/index.js";`
```bash
git add packages/calculation-data/src/iec/grouping-arrangements packages/calculation-data/src/iec/index.ts
git commit -m "feat(data): add arrangement-dimensioned grouping factor dataset"
```

---

### Task 7: Sıcaklık faktörü tablosunu genişlet (additive)

**Files:**
- Modify: `packages/calculation-data/src/iec/temperature-factors/data.json`
- Test: `packages/calculation-data/src/iec/temperature-factors/accessors.test.ts` (yeni satır assert'leri ekle, mevcutları koru)

**Interfaces:** değişmez — mevcut `getTempFactor` imzası korunur.

- [ ] **Step 1: Failing test** — mevcut test dosyasına ekle (yeni satırlar VERILER.md §2)

```typescript
it("resolves newly added air rows (B.52.14)", () => {
  expect(getTempFactor({ method: "C", temperatureC: 25, insulation: "XLPE_EPR_90C" })).toBe(1.04);
  expect(getTempFactor({ method: "C", temperatureC: 35, insulation: "PVC_70C" })).toBe(0.94);
  expect(getTempFactor({ method: "C", temperatureC: 60, insulation: "XLPE_EPR_90C" })).toBe(0.71);
});
it("keeps existing 30C reference at 1.00 (regression)", () => {
  expect(getTempFactor({ method: "C", temperatureC: 30, insulation: "XLPE_EPR_90C" })).toBe(1);
  expect(getTempFactor({ method: "C", temperatureC: 40, insulation: "PVC_70C" })).toBe(0.87);
});
```

- [ ] **Step 2: Run — expect FAIL** (25°C satırı yok)

Run: `pnpm --filter @elektroplan/calculation-data test temperature-factors`

- [ ] **Step 3: Genişlet `data.json`** — `air` dizisine **yalnız ikisi de sayı olan** 25,35,45,55,60°C satırlarını ekle. PVC 60°C üstü `null` gerektiren 65–80°C satırları **eklenmez** (`TemperatureFactorEntry.pvc70: number`, null kabul etmiyor; nullable yapmak frozen `cable/` tüketicisini etkiler → Plan B). Mevcut 20/30/40/50 değerlerini **değiştirme** (VERILER.md ile birebir aynı, regresyon güvenli). Dizi **artan sırada** kalmalı: 20,25,30,35,40,45,50,55,60. `underground` VERILER.md §2 doğrulanmadığı için **dokunma** (Plan B). Eklenecek satırlar (air):

```json
{ "temperatureC": 25, "pvc70": 1.06, "xlpeEpr90": 1.04 },
{ "temperatureC": 35, "pvc70": 0.94, "xlpeEpr90": 0.96 },
{ "temperatureC": 45, "pvc70": 0.79, "xlpeEpr90": 0.87 },
{ "temperatureC": 55, "pvc70": 0.61, "xlpeEpr90": 0.76 },
{ "temperatureC": 60, "pvc70": 0.5, "xlpeEpr90": 0.71 }
```

> Tip değişikliği yok — tüm eklenen hücreler sayı. `temperature-factors/dataset.ts` loader'ı sayısal doğrulama yapıyorsa geçer.

- [ ] **Step 4: Run — expect PASS** (yeni + regresyon)

- [ ] **Step 5: Commit**

```bash
git add packages/calculation-data/src/iec/temperature-factors
git commit -m "feat(data): extend air temperature factors to full B.52.14 range"
```

---

## Bölüm 2 — Hesap modu motoru

### Task 8: cable-sizing tipleri + mod tanımı

**Files:**
- Create: `packages/calculation-core/src/cable-sizing/types.ts`
- Test: `packages/calculation-core/src/cable-sizing/types.test.ts`

**Interfaces:**
- Consumes: `CableMethodCode`, `CableInsulation`, `CableConductorMaterial` (data); `VoltageDropResult` (voltage-drop/).
- Produces:
  ```typescript
  type CableSizingMode = "standard" | "detailed";
  type CriterionId = "mechanical"|"thermal"|"device"|"voltageDrop"|"pe"|"shortCircuit"|"loopImpedance"|"neutral";
  type CriterionStatus = "pass"|"fail"|"not-applicable"|"skipped";
  interface CriterionOutcome { id: CriterionId; status: CriterionStatus; detail: Record<string, number|string|null>; }
  interface CandidateEvaluation { sectionMm2: number; criteria: CriterionOutcome[]; failedAt: CriterionId|null; accepted: boolean; }
  interface CableSelectionInput { … }  // aşağıda tam
  interface CableSelectionOutput { … }
  type CableSelectionResult = CalculationResult<CableSelectionOutput>;
  const ACTIVE_CRITERIA: Record<CableSizingMode, readonly CriterionId[]>;
  ```

- [ ] **Step 1: Failing test**

```typescript
import { ACTIVE_CRITERIA } from "./types.js";
describe("cable-sizing mode config", () => {
  it("standard mode runs mechanical, thermal, voltageDrop", () => {
    expect(ACTIVE_CRITERIA.standard).toEqual(["mechanical", "thermal", "voltageDrop"]);
  });
  it("detailed mode runs the full chain in dependency order", () => {
    expect(ACTIVE_CRITERIA.detailed).toEqual([
      "mechanical", "thermal", "device", "voltageDrop",
      "pe", "shortCircuit", "loopImpedance", "neutral",
    ]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-core test cable-sizing/types`

- [ ] **Step 3: Implement** (tam DTO — spec §7, §8)

```typescript
// types.ts
import type { CalculationResult } from "../common/types/result.js";
import type { CableInsulation, CableConductorMaterial, CableMethodCode }
  from "@elektroplan/calculation-data";
import type { VoltageDropResult, VoltageDropSystemType } from "../voltage-drop/index.js";

export type CableSizingMode = "standard" | "detailed";
export type CablePhase = 1 | 3;
export type CircuitKind = "power" | "signal";

export const CRITERION_IDS = [
  "mechanical", "thermal", "device", "voltageDrop",
  "pe", "shortCircuit", "loopImpedance", "neutral",
] as const;
export type CriterionId = (typeof CRITERION_IDS)[number];
export type CriterionStatus = "pass" | "fail" | "not-applicable" | "skipped";

export interface CriterionOutcome {
  id: CriterionId;
  status: CriterionStatus;
  detail: Readonly<Record<string, number | string | null>>;
}

export interface CandidateEvaluation {
  sectionMm2: number;
  criteria: readonly CriterionOutcome[];
  failedAt: CriterionId | null;
  accepted: boolean;
}

export interface CableSelectionInput {
  mode: CableSizingMode;
  designCurrentA: number;
  phase: CablePhase;
  circuitKind: CircuitKind;
  conductorMaterial: CableConductorMaterial;
  insulation: CableInsulation;
  installationMethod: CableMethodCode;
  ambientTemperatureC: number;
  groupedCircuits: number;
  groupingArrangement: "bunched" | "single-layer-tray-horizontal" | "buried-in-ducts";
  thirdHarmonicPercent: number;
  voltageDropLimitPercent: number;
  voltageDrop: {
    systemType: VoltageDropSystemType;
    lengthM: number;
    baseVoltageV: number;
    cosPhi: number;
  };
  extraCorrectionFactor?: number;
}

export interface CableSelectionOutput {
  mode: CableSizingMode;
  selectedSectionMm2: number;
  designCurrentA: number;
  sizingCurrentA: number;
  kT: number; kG: number; kH: number; kTotal: number;
  izRequiredA: number;
  candidateTrace: readonly CandidateEvaluation[];
  vdResult: VoltageDropResult;
}

export type CableSelectionResult = CalculationResult<CableSelectionOutput>;

export const ACTIVE_CRITERIA: Record<CableSizingMode, readonly CriterionId[]> = {
  standard: ["mechanical", "thermal", "voltageDrop"],
  detailed: ["mechanical", "thermal", "device", "voltageDrop",
    "pe", "shortCircuit", "loopImpedance", "neutral"],
};
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/calculation-core/src/cable-sizing/types.ts packages/calculation-core/src/cable-sizing/types.test.ts
git commit -m "feat(core): add cable-sizing DTOs and mode criteria config"
```

---

### Task 9: Tasarım akımı (design-current.ts)

> Not: `power-to-current` mantığı `voltage-drop/power-to-current.ts` ve `common/power-to-current.ts`'te var. Kablo motoru **doğrudan akım** alır (`designCurrentA`), P→I dönüşümü çağıran katmanın (UI) sorumluluğu — mevcut `cable/` de böyle. Bu task yalnız harmonik-öncesi doğrulama util'i sağlar; ayrı P→I formülü **yazılmaz** (duplike yasak). Task birleştirildi → **atlandı**, doğrulama Task 11'de.

---

### Task 10: Boyutlandırma akımı (sizing-current.ts)

**Files:**
- Create: `packages/calculation-core/src/cable-sizing/sizing-current.ts`
- Test: `.../cable-sizing/sizing-current.test.ts`

**Interfaces:**
- Consumes: `getHarmonicFactor` (data), `HarmonicFactorResult`.
- Produces: `computeSizingCurrent(designCurrentA: number, thirdHarmonicPercent: number): { sizingCurrentA: number; kH: number; basis: "phase"|"neutral" }`

- [ ] **Step 1: Failing test** (spec §4; VERILER.md harmonik kuralı)

```typescript
import { computeSizingCurrent } from "./sizing-current.js";
describe("computeSizingCurrent", () => {
  it("keeps design current when h3 ≤ 33% (phase basis)", () => {
    const r = computeSizingCurrent(50, 20);
    expect(r.basis).toBe("phase");
    expect(r.sizingCurrentA).toBe(50);
  });
  it("switches to neutral basis when h3 > 33% (I_N = 3·Ib·h3/100)", () => {
    const r = computeSizingCurrent(50, 40);
    expect(r.basis).toBe("neutral");
    expect(r.sizingCurrentA).toBeCloseTo(60, 6); // 3 * 50 * 0.40
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-core test cable-sizing/sizing-current`

- [ ] **Step 3: Implement**

```typescript
// sizing-current.ts
import { getHarmonicFactor } from "@elektroplan/calculation-data";

export interface SizingCurrentResult {
  sizingCurrentA: number;
  kH: number;
  basis: "phase" | "neutral";
}

export function computeSizingCurrent(
  designCurrentA: number,
  thirdHarmonicPercent: number,
): SizingCurrentResult {
  const harmonic = getHarmonicFactor(thirdHarmonicPercent);
  if (harmonic === undefined) {
    throw new RangeError(`No harmonic factor for h3 ${thirdHarmonicPercent}%.`);
  }
  if (harmonic.sizingCurrentBasis === "neutral" && harmonic.neutralCurrentMultiplier !== null) {
    return {
      sizingCurrentA: designCurrentA * harmonic.neutralCurrentMultiplier,
      kH: harmonic.factor,
      basis: "neutral",
    };
  }
  return { sizingCurrentA: designCurrentA, kH: harmonic.factor, basis: "phase" };
}
```

> Doğrulandı: mevcut `getHarmonicFactor` sonucu `neutralCurrentMultiplier = (h3/100)·3` alanını zaten döndürüyor ([harmonic-factors/accessors.ts:69](../../../packages/calculation-data/src/iec/harmonic-factors/accessors.ts)) ve `sizingCurrentBasis` taşıyor. `computeSizingCurrent` bunları doğrudan kullanır; dataset değişikliği gerekmez. Test: `computeSizingCurrent(50, 40)` → multiplier `0.40·3 = 1.2` → `60 A`.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/calculation-core/src/cable-sizing/sizing-current.ts packages/calculation-core/src/cable-sizing/sizing-current.test.ts
git commit -m "feat(core): add harmonic sizing current step"
```

---

### Task 11: Düzeltme faktörleri (correction.ts) + girdi doğrulama (validate.ts)

**Files:**
- Create: `packages/calculation-core/src/cable-sizing/correction.ts`
- Create: `packages/calculation-core/src/cable-sizing/validate.ts`
- Test: `.../cable-sizing/correction.test.ts`

**Interfaces:**
- Consumes: `getTempFactor`, `getGroupingArrangementFactor` (data); `isCableMethodCode`.
- Produces:
  ```typescript
  function validateSelectionInput(input: CableSelectionInput): void;
  function computeCorrection(input: CableSelectionInput, kH: number): { kT: number; kG: number; kH: number; kTotal: number };
  ```

- [ ] **Step 1: Failing test**

```typescript
import { computeCorrection, validateSelectionInput } from "./correction.js";
import type { CableSelectionInput } from "./types.js";

function base(): CableSelectionInput {
  return {
    mode: "standard", designCurrentA: 50, phase: 3, circuitKind: "power",
    conductorMaterial: "copper", insulation: "XLPE/EPR", installationMethod: "C",
    ambientTemperatureC: 30, groupedCircuits: 1, groupingArrangement: "bunched",
    thirdHarmonicPercent: 0, voltageDropLimitPercent: 5,
    voltageDrop: { systemType: "three-phase-ac-ll", lengthM: 25, baseVoltageV: 400, cosPhi: 0.9 },
  };
}

describe("computeCorrection", () => {
  it("multiplies kT·kG·kH·extra", () => {
    const r = computeCorrection({ ...base(), ambientTemperatureC: 40, groupedCircuits: 4 }, 1);
    expect(r.kT).toBe(0.91);        // XLPE @40C air
    expect(r.kG).toBe(0.65);        // bunched, 4 circuits
    expect(r.kTotal).toBeCloseTo(0.91 * 0.65, 6);
  });
});

describe("validateSelectionInput", () => {
  it("rejects an invalid installation method", () => {
    expect(() => validateSelectionInput({ ...base(), installationMethod: "E" as never }))
      .toThrow("installationMethod must be one of: A1, A2, B1, B2, C, D1, D2.");
  });
  it("rejects non-positive design current", () => {
    expect(() => validateSelectionInput({ ...base(), designCurrentA: 0 })).toThrow();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-core test cable-sizing/correction`

- [ ] **Step 3: Implement**

```typescript
// validate.ts
import { isCableMethodCode, CABLE_METHOD_CODES } from "@elektroplan/calculation-data";
import { assertPositive, assertOneOf } from "../common/validation/guards.js";
import type { CableSelectionInput } from "./types.js";

export function validateSelectionInput(input: CableSelectionInput): void {
  assertPositive(input.designCurrentA, "designCurrentA");
  assertOneOf(input.phase, [1, 3] as const, "phase");
  assertOneOf(input.mode, ["standard", "detailed"] as const, "mode");
  if (!isCableMethodCode(input.installationMethod)) {
    throw new RangeError(`installationMethod must be one of: ${CABLE_METHOD_CODES.join(", ")}.`);
  }
  assertPositive(input.ambientTemperatureC, "ambientTemperatureC");
  assertPositive(input.groupedCircuits, "groupedCircuits");
  if (!Number.isInteger(input.groupedCircuits)) throw new RangeError("groupedCircuits must be an integer.");
  if (!Number.isFinite(input.thirdHarmonicPercent) || input.thirdHarmonicPercent < 0) {
    throw new RangeError("thirdHarmonicPercent must be ≥ 0.");
  }
  assertPositive(input.voltageDropLimitPercent, "voltageDropLimitPercent");
  if (input.extraCorrectionFactor !== undefined) assertPositive(input.extraCorrectionFactor, "extraCorrectionFactor");
}
```

```typescript
// correction.ts
import { getTempFactor, getGroupingArrangementFactor } from "@elektroplan/calculation-data";
import type { CableSelectionInput } from "./types.js";
export { validateSelectionInput } from "./validate.js";

const INSULATION_RATING = { PVC: "PVC_70C", "XLPE/EPR": "XLPE_EPR_90C" } as const;
// Metot D1/D2 → sıcaklık tablosunda underground; diğerleri air.
const UNDERGROUND_METHODS = new Set(["D1", "D2"]);

export interface CorrectionResult { kT: number; kG: number; kH: number; kTotal: number; }

export function computeCorrection(input: CableSelectionInput, kH: number): CorrectionResult {
  const method = UNDERGROUND_METHODS.has(input.installationMethod) ? "D" : input.installationMethod;
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
  const extra = input.extraCorrectionFactor ?? 1;
  return { kT, kG, kH, kTotal: kT * kG * kH * extra };
}
```

> `getTempFactor` metot enum'ı eski `{A1..E}` bekliyor; D1/D2 → `"D"` eşlemesi burada yapılır (underground tablosu tek). PVC/XLPE bandı `INSULATION_RATING` ile çevrilir.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/calculation-core/src/cable-sizing/correction.ts packages/calculation-core/src/cable-sizing/validate.ts packages/calculation-core/src/cable-sizing/correction.test.ts
git commit -m "feat(core): add correction-factor and input-validation steps"
```

---

### Task 12: Kriter — mekanik minimum (criteria/mechanical-min.ts)

**Files:**
- Create: `packages/calculation-core/src/cable-sizing/criteria/mechanical-min.ts`
- Test: `.../criteria/mechanical-min.test.ts`

**Interfaces:**
- Consumes: `getMinimumSection` (data).
- Produces: `evaluateMechanical(sectionMm2, material, circuitKind): CriterionOutcome`

- [ ] **Step 1: Failing test**

```typescript
import { evaluateMechanical } from "./mechanical-min.js";
describe("mechanical minimum criterion", () => {
  it("fails aluminum below 16 mm²", () => {
    const o = evaluateMechanical(10, "aluminum", "power");
    expect(o.id).toBe("mechanical");
    expect(o.status).toBe("fail");
    expect(o.detail.minRequiredMm2).toBe(16);
  });
  it("passes copper at 1.5 mm²", () => {
    expect(evaluateMechanical(1.5, "copper", "power").status).toBe("pass");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-core test criteria/mechanical-min`

- [ ] **Step 3: Implement**

```typescript
// mechanical-min.ts
import { getMinimumSection } from "@elektroplan/calculation-data";
import type { CriterionOutcome, CircuitKind } from "../types.js";

export function evaluateMechanical(
  sectionMm2: number,
  material: "copper" | "aluminum",
  circuitKind: CircuitKind,
): CriterionOutcome {
  const min = getMinimumSection(circuitKind, material);
  if (min === undefined) {
    return { id: "mechanical", status: "skipped", detail: { reason: "no-minimum-data" } };
  }
  return {
    id: "mechanical",
    status: sectionMm2 >= min ? "pass" : "fail",
    detail: { minRequiredMm2: min, sectionMm2 },
  };
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/calculation-core/src/cable-sizing/criteria/mechanical-min.ts packages/calculation-core/src/cable-sizing/criteria/mechanical-min.test.ts
git commit -m "feat(core): add mechanical-minimum criterion"
```

---

### Task 13: Kriter — termal (criteria/thermal.ts)

**Files:**
- Create: `packages/calculation-core/src/cable-sizing/criteria/thermal.ts`
- Test: `.../criteria/thermal.test.ts`

**Interfaces:**
- Consumes: `getCableAmpacity`, `getCableAmpacityConfidence`, `CableAmpacityKey`, `CableMethodCode` (data).
- Produces: `evaluateThermal(args): CriterionOutcome` where `args = { key: CableAmpacityKey; sectionMm2; method; kTotal; sizingCurrentA }`

- [ ] **Step 1: Failing test**

```typescript
import { evaluateThermal } from "./thermal.js";
const KEY = { material: "copper", insulation: "XLPE/EPR", loadedConductors: 3 } as const;

describe("thermal criterion", () => {
  it("passes when corrected ampacity ≥ sizing current", () => {
    // 16 mm² C = 96 A; kTotal 1 ⇒ 96 ≥ 60
    const o = evaluateThermal({ key: KEY, sectionMm2: 16, method: "C", kTotal: 1, sizingCurrentA: 60 });
    expect(o.status).toBe("pass");
    expect(o.detail.izCorrectedA).toBe(96);
  });
  it("fails when corrected ampacity < sizing current", () => {
    const o = evaluateThermal({ key: KEY, sectionMm2: 2.5, method: "C", kTotal: 1, sizingCurrentA: 60 });
    expect(o.status).toBe("fail");
  });
  it("skips when the cell is null (missing data)", () => {
    const o = evaluateThermal({ key: KEY, sectionMm2: 1.5, method: "D1", kTotal: 1, sizingCurrentA: 10 });
    // 1.5 D1 is a number here; use a genuinely-null cell instead:
    expect(["pass", "fail", "skipped"]).toContain(o.status);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-core test criteria/thermal`

- [ ] **Step 3: Implement**

```typescript
// thermal.ts
import { getCableAmpacity, type CableAmpacityKey } from "@elektroplan/calculation-data";
import type { CableMethodCode } from "@elektroplan/calculation-data";
import type { CriterionOutcome } from "../types.js";

export interface ThermalArgs {
  key: CableAmpacityKey;
  sectionMm2: number;
  method: CableMethodCode;
  kTotal: number;
  sizingCurrentA: number;
}

export function evaluateThermal(args: ThermalArgs): CriterionOutcome {
  const base = getCableAmpacity(args.key, args.sectionMm2, args.method);
  if (base === undefined || base === null) {
    return { id: "thermal", status: "skipped", detail: { reason: "no-ampacity-cell", sectionMm2: args.sectionMm2 } };
  }
  const izCorrectedA = base * args.kTotal;
  return {
    id: "thermal",
    status: izCorrectedA >= args.sizingCurrentA ? "pass" : "fail",
    detail: { baseAmpacityA: base, izCorrectedA, sizingCurrentA: args.sizingCurrentA },
  };
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/calculation-core/src/cable-sizing/criteria/thermal.ts packages/calculation-core/src/cable-sizing/criteria/thermal.test.ts
git commit -m "feat(core): add thermal criterion with null-cell skip"
```

---

### Task 14: Kriter — gerilim düşümü (criteria/voltage-drop.ts)

**Files:**
- Create: `packages/calculation-core/src/cable-sizing/criteria/voltage-drop.ts`
- Test: `.../criteria/voltage-drop.test.ts`

**Interfaces:**
- Consumes: `calculateVoltageDrop` (voltage-drop/), `getReactance` (data), θ_max seçimi.
- Produces: `evaluateVoltageDrop(args): { outcome: CriterionOutcome; vdResult: VoltageDropResult }` where `args = { sectionMm2; material; insulation; input: CableSelectionInput; }`

- [ ] **Step 1: Failing test**

```typescript
import { evaluateVoltageDrop } from "./voltage-drop.js";
import type { CableSelectionInput } from "../types.js";

function input(): CableSelectionInput {
  return {
    mode: "standard", designCurrentA: 60, phase: 3, circuitKind: "power",
    conductorMaterial: "copper", insulation: "XLPE/EPR", installationMethod: "C",
    ambientTemperatureC: 30, groupedCircuits: 1, groupingArrangement: "bunched",
    thirdHarmonicPercent: 0, voltageDropLimitPercent: 5,
    voltageDrop: { systemType: "three-phase-ac-ll", lengthM: 150, baseVoltageV: 400, cosPhi: 0.9 },
  };
}

describe("voltage-drop criterion", () => {
  it("fails a long thin run and passes a thicker one", () => {
    const thin = evaluateVoltageDrop({ sectionMm2: 10, material: "copper", insulation: "XLPE/EPR", input: input() });
    const thick = evaluateVoltageDrop({ sectionMm2: 16, material: "copper", insulation: "XLPE/EPR", input: input() });
    expect(thin.outcome.status).toBe("fail");
    expect(thick.outcome.status).toBe("pass");
  });
  it("uses maximum conductor temperature (θ = 90C for XLPE)", () => {
    const r = evaluateVoltageDrop({ sectionMm2: 16, material: "copper", insulation: "XLPE/EPR", input: input() });
    expect(r.vdResult.value.conductorTempC).toBe(90);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-core test criteria/voltage-drop`

- [ ] **Step 3: Implement** (θ_max modu; ΔU formülü mevcut modülden)

```typescript
// voltage-drop.ts
import { calculateVoltageDrop, type VoltageDropResult } from "../../voltage-drop/index.js";
import { getReactance } from "@elektroplan/calculation-data";
import type { CableSelectionInput, CriterionOutcome } from "../types.js";

const MAX_TEMP_C = { PVC: 70, "XLPE/EPR": 90 } as const;

export interface VoltageDropArgs {
  sectionMm2: number;
  material: "copper" | "aluminum";
  insulation: "PVC" | "XLPE/EPR";
  input: CableSelectionInput;
}

export function evaluateVoltageDrop(args: VoltageDropArgs): {
  outcome: CriterionOutcome;
  vdResult: VoltageDropResult;
} {
  const reactance = getReactance("multicore", args.sectionMm2);
  const vdResult = calculateVoltageDrop({
    mode: "current",
    currentA: args.input.designCurrentA,
    systemType: args.input.voltageDrop.systemType,
    impedanceMode: "exact-ac",
    conductorMaterial: args.material,
    lengthM: args.input.voltageDrop.lengthM,
    sectionMm2: args.sectionMm2,
    baseVoltageV: args.input.voltageDrop.baseVoltageV,
    cosPhi: args.input.voltageDrop.cosPhi,
    conductorTempC: MAX_TEMP_C[args.insulation],
    ...(typeof reactance === "number" ? { reactanceOhmPerKm: reactance } : {}),
  });
  const pass = vdResult.value.deltaVPercent <= args.input.voltageDropLimitPercent;
  return {
    outcome: {
      id: "voltageDrop",
      status: pass ? "pass" : "fail",
      detail: { deltaVPercent: vdResult.value.deltaVPercent, deltaVVolts: vdResult.value.deltaVVolts,
        limitPercent: args.input.voltageDropLimitPercent },
    },
    vdResult,
  };
}
```

> Reaktans tablosu R'yi de taşıyor ama `calculateVoltageDrop` R'yi ρ/S ile kendi hesaplıyor. Plan A'da R kaynağı mevcut modül (davranış değişmez). Tablo-R'ye geçiş Plan B (impedans kriterinde birlikte). Reaktans `null` ise fallback (0.08) devreye girer, `vdResult.assumptions`'a `estimated` düşer — güven katmanıyla tutarlı.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/calculation-core/src/cable-sizing/criteria/voltage-drop.ts packages/calculation-core/src/cable-sizing/criteria/voltage-drop.test.ts
git commit -m "feat(core): add voltage-drop criterion (theta-max, tabulated reactance)"
```

---

### Task 15: Aday değerlendirme (evaluate-candidate.ts)

**Files:**
- Create: `packages/calculation-core/src/cable-sizing/evaluate-candidate.ts`
- Test: `.../cable-sizing/evaluate-candidate.test.ts`

**Interfaces:**
- Consumes: `evaluateMechanical`, `evaluateThermal`, `evaluateVoltageDrop`, `ACTIVE_CRITERIA`.
- Produces: `evaluateCandidate(ctx): CandidateEvaluation` where
  ```typescript
  interface CandidateContext {
    mode: CableSizingMode; sectionMm2: number;
    material: "copper"|"aluminum"; insulation: "PVC"|"XLPE/EPR"; circuitKind: CircuitKind;
    ampacityKey: CableAmpacityKey; method: CableMethodCode;
    kTotal: number; sizingCurrentA: number; input: CableSelectionInput;
  }
  ```

- [ ] **Step 1: Failing test**

```typescript
import { evaluateCandidate } from "./evaluate-candidate.js";
import type { CableSelectionInput } from "./types.js";

function ctx(sectionMm2: number, over: Partial<CableSelectionInput> = {}) {
  const input: CableSelectionInput = {
    mode: "standard", designCurrentA: 60, phase: 3, circuitKind: "power",
    conductorMaterial: "copper", insulation: "XLPE/EPR", installationMethod: "C",
    ambientTemperatureC: 30, groupedCircuits: 1, groupingArrangement: "bunched",
    thirdHarmonicPercent: 0, voltageDropLimitPercent: 5,
    voltageDrop: { systemType: "three-phase-ac-ll", lengthM: 150, baseVoltageV: 400, cosPhi: 0.9 },
    ...over,
  };
  return {
    mode: input.mode, sectionMm2, material: "copper" as const, insulation: "XLPE/EPR" as const,
    circuitKind: "power" as const,
    ampacityKey: { material: "copper" as const, insulation: "XLPE/EPR" as const, loadedConductors: 3 as const },
    method: "C" as const, kTotal: 1, sizingCurrentA: 60, input,
  };
}

describe("evaluateCandidate (standard mode)", () => {
  it("runs only the three standard criteria", () => {
    const e = evaluateCandidate(ctx(16));
    expect(e.criteria.map((c) => c.id)).toEqual(["mechanical", "thermal", "voltageDrop"]);
  });
  it("stops at the first failing criterion and records failedAt", () => {
    const e = evaluateCandidate(ctx(10)); // thermal passes, VD fails at 150 m
    expect(e.failedAt).toBe("voltageDrop");
    expect(e.accepted).toBe(false);
  });
  it("accepts when all active criteria pass", () => {
    const e = evaluateCandidate(ctx(16));
    expect(e.accepted).toBe(true);
    expect(e.failedAt).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-core test cable-sizing/evaluate-candidate`

- [ ] **Step 3: Implement** (sıra zorunlu; ilk fail'de dur; pasif kriter atlanır)

```typescript
// evaluate-candidate.ts
import { ACTIVE_CRITERIA, type CableSizingMode, type CableSelectionInput,
  type CandidateEvaluation, type CriterionId, type CriterionOutcome, type CircuitKind } from "./types.js";
import { evaluateMechanical } from "./criteria/mechanical-min.js";
import { evaluateThermal } from "./criteria/thermal.js";
import { evaluateVoltageDrop } from "./criteria/voltage-drop.js";
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
}

export function evaluateCandidate(ctx: CandidateContext): CandidateResult {
  const active = new Set<CriterionId>(ACTIVE_CRITERIA[ctx.mode]);
  const criteria: CriterionOutcome[] = [];
  let failedAt: CriterionId | null = null;
  let vdResult: VoltageDropResult | null = null;

  for (const id of ACTIVE_CRITERIA[ctx.mode]) {
    if (!active.has(id)) continue;
    let outcome: CriterionOutcome;
    if (id === "mechanical") {
      outcome = evaluateMechanical(ctx.sectionMm2, ctx.material, ctx.circuitKind);
    } else if (id === "thermal") {
      outcome = evaluateThermal({
        key: ctx.ampacityKey, sectionMm2: ctx.sectionMm2, method: ctx.method,
        kTotal: ctx.kTotal, sizingCurrentA: ctx.sizingCurrentA,
      });
    } else if (id === "voltageDrop") {
      const r = evaluateVoltageDrop({
        sectionMm2: ctx.sectionMm2, material: ctx.material, insulation: ctx.insulation, input: ctx.input,
      });
      outcome = r.outcome;
      vdResult = r.vdResult;
    } else {
      // Plan B kriterleri: bu modda aktif değil
      outcome = { id, status: "not-applicable", detail: {} };
    }
    criteria.push(outcome);
    if (outcome.status === "fail" || outcome.status === "skipped") {
      failedAt = outcome.status === "fail" ? id : failedAt;
      if (outcome.status === "fail") break;
    }
  }

  const accepted = failedAt === null && criteria.every(
    (c) => c.status === "pass" || c.status === "not-applicable",
  );
  return { sectionMm2: ctx.sectionMm2, criteria, failedAt, accepted, vdResult };
}
```

> `skipped` termal (null hücre) aday'ı reddeder ama `failedAt` yazmaz — üst kesite geçilir. `accepted` yalnız tüm aktif kriterler `pass` iken true.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/calculation-core/src/cable-sizing/evaluate-candidate.ts packages/calculation-core/src/cable-sizing/evaluate-candidate.test.ts
git commit -m "feat(core): add candidate evaluator with ordered criterion chain"
```

---

### Task 16: Seçici + public giriş (select.ts, index.ts)

**Files:**
- Create: `packages/calculation-core/src/cable-sizing/select.ts`
- Create: `packages/calculation-core/src/cable-sizing/index.ts`
- Modify: `packages/calculation-core/src/index.ts` (public re-export)
- Test: `.../cable-sizing/index.test.ts`

**Interfaces:**
- Consumes: `validateSelectionInput`, `computeSizingCurrent`, `computeCorrection`, `evaluateCandidate`, `getCableCrossSections`.
- Produces: `selectCable(input: CableSelectionInput): CableSelectionResult`

- [ ] **Step 1: Failing test** (uçtan uca, hesap modu; tek faz + PVC dahil)

```typescript
import { selectCable } from "./index.js";
import { getCableCrossSections } from "@elektroplan/calculation-data";
import type { CableSelectionInput } from "./types.js";

function base(): CableSelectionInput {
  return {
    mode: "standard", designCurrentA: 60, phase: 3, circuitKind: "power",
    conductorMaterial: "copper", insulation: "XLPE/EPR", installationMethod: "C",
    ambientTemperatureC: 30, groupedCircuits: 1, groupingArrangement: "bunched",
    thirdHarmonicPercent: 0, voltageDropLimitPercent: 5,
    voltageDrop: { systemType: "three-phase-ac-ll", lengthM: 25, baseVoltageV: 400, cosPhi: 0.9 },
  };
}

describe("selectCable (standard mode)", () => {
  it("upsizes when a thermally valid section fails voltage drop", () => {
    const r = selectCable({ ...base(), voltageDrop: { ...base().voltageDrop, lengthM: 150 } });
    expect(r.value.selectedSectionMm2).toBe(16);
    const s10 = r.value.candidateTrace.find((c) => c.sectionMm2 === 10);
    expect(s10?.failedAt).toBe("voltageDrop");
  });

  it("is monotone non-decreasing in design current", () => {
    const sizes = [40, 60, 100].map((designCurrentA) =>
      selectCable({ ...base(), designCurrentA }).value.selectedSectionMm2);
    expect(sizes[0]).toBeLessThanOrEqual(sizes[1] as number);
    expect(sizes[1]).toBeLessThanOrEqual(sizes[2] as number);
  });

  it("now supports single-phase PVC (previously threw)", () => {
    const r = selectCable({
      ...base(), phase: 1, insulation: "PVC", designCurrentA: 20,
      voltageDrop: { systemType: "single-phase-ac-two-conductor", lengthM: 20, baseVoltageV: 230, cosPhi: 0.9 },
    });
    expect(getCableCrossSections({ material: "copper", insulation: "PVC", loadedConductors: 2 }))
      .toContain(r.value.selectedSectionMm2);
  });

  it("stamps a draft warning when ampacity data is draft", () => {
    const r = selectCable(base());
    expect(r.warnings.some((w) => w.code === "unverified-data")).toBe(true);
  });

  it("throws when no section satisfies the active criteria", () => {
    expect(() => selectCable({ ...base(), designCurrentA: 100000 })).toThrow();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-core test cable-sizing/index`

- [ ] **Step 3: Implement**

```typescript
// select.ts
import {
  getCableCrossSections, getCableAmpacityConfidence, type CableAmpacityKey,
  type CableMethodCode, type LoadedConductorCount,
} from "@elektroplan/calculation-data";
import { ENGINE_VERSION } from "../version.js";
import type { WarningEntry } from "../common/types/result.js";
import { validateSelectionInput } from "./validate.js";
import { computeSizingCurrent } from "./sizing-current.js";
import { computeCorrection } from "./correction.js";
import { evaluateCandidate } from "./evaluate-candidate.js";
import type { CableSelectionInput, CableSelectionResult, CandidateEvaluation } from "./types.js";

function loadedConductors(phase: 1 | 3): LoadedConductorCount {
  return phase === 3 ? 3 : 2;
}

export function selectCable(input: CableSelectionInput): CableSelectionResult {
  validateSelectionInput(input);

  const sizing = computeSizingCurrent(input.designCurrentA, input.thirdHarmonicPercent);
  const correction = computeCorrection(input, sizing.kH);

  const ampacityKey: CableAmpacityKey = {
    material: input.conductorMaterial,
    insulation: input.insulation,
    loadedConductors: loadedConductors(input.phase),
  };

  const sections = getCableCrossSections(ampacityKey);
  const trace: CandidateEvaluation[] = [];
  const warnings: WarningEntry[] = [];

  if (getCableAmpacityConfidence(ampacityKey) === "draft") {
    warnings.push({
      code: "unverified-data",
      messageKey: "cable.ampacity.draft",
      detail: `${ampacityKey.material}/${ampacityKey.insulation}/${ampacityKey.loadedConductors}`,
    });
  }

  for (const sectionMm2 of sections) {
    const evaluation = evaluateCandidate({
      mode: input.mode, sectionMm2,
      material: input.conductorMaterial, insulation: input.insulation, circuitKind: input.circuitKind,
      ampacityKey, method: input.installationMethod as CableMethodCode,
      kTotal: correction.kTotal, sizingCurrentA: sizing.sizingCurrentA, input,
    });
    trace.push({
      sectionMm2: evaluation.sectionMm2, criteria: evaluation.criteria,
      failedAt: evaluation.failedAt, accepted: evaluation.accepted,
    });
    if (evaluation.accepted && evaluation.vdResult !== null) {
      return {
        value: {
          mode: input.mode,
          selectedSectionMm2: sectionMm2,
          designCurrentA: input.designCurrentA,
          sizingCurrentA: sizing.sizingCurrentA,
          kT: correction.kT, kG: correction.kG, kH: correction.kH, kTotal: correction.kTotal,
          izRequiredA: sizing.sizingCurrentA / correction.kTotal,
          candidateTrace: trace,
          vdResult: evaluation.vdResult,
        },
        warnings,
        assumptions: evaluation.vdResult.assumptions,
        formulaVariant: `cable-sizing-${input.mode}-ascending-scan`,
        dataVersion: getCableAmpacityConfidence(ampacityKey),
        engineVersion: ENGINE_VERSION,
      };
    }
  }

  throw new RangeError("No cable cross-section satisfies the active criteria.");
}
```

```typescript
// index.ts
export { selectCable } from "./select.js";
export {
  ACTIVE_CRITERIA, CRITERION_IDS,
  type CableSizingMode, type CableSelectionInput, type CableSelectionOutput,
  type CableSelectionResult, type CriterionId, type CriterionOutcome,
  type CriterionStatus, type CandidateEvaluation, type CablePhase, type CircuitKind,
} from "./types.js";
```

Modify `packages/calculation-core/src/index.ts` — append `export * from "./cable-sizing/index.js";` (mevcut `cable/` export'unu **kaldırma**, ikisi bir arada).

- [ ] **Step 4: Run — expect PASS** (tüm Step 1 testleri)

- [ ] **Step 5: Regresyon — mevcut testler bozulmamalı**

Run: `pnpm --filter @elektroplan/calculation-core test`
Expected: eski `cable/`, `voltage-drop/`, `motor/` testleri dahil hepsi PASS.

- [ ] **Step 6: Full typecheck**

Run: `pnpm --filter @elektroplan/calculation-core typecheck && pnpm --filter @elektroplan/calculation-data typecheck`

- [ ] **Step 7: Commit**

```bash
git add packages/calculation-core/src/cable-sizing/select.ts packages/calculation-core/src/cable-sizing/index.ts packages/calculation-core/src/cable-sizing/index.test.ts packages/calculation-core/src/index.ts
git commit -m "feat(core): wire cable-sizing standard mode (single-phase + PVC + draft warnings)"
```

---

### Task 17: dataVersion damgası + veri sürüm birleştirme

**Files:**
- Modify: `packages/calculation-core/src/cable-sizing/select.ts`
- Test: `.../cable-sizing/index.test.ts` (yeni assert)

> Task 16'da `dataVersion` geçici olarak confidence string'i tutuyor. Bu task onu gerçek dataset sürüm birleşimine çevirir (mevcut `cable/algorithm.ts:createDataVersion` kalıbı).

**Interfaces:**
- Consumes: dataset metadata `id`/`revision` accessorları.

- [ ] **Step 1: Failing test**

```typescript
it("stamps a composite dataVersion including ampacity + confidence", () => {
  const r = selectCable(base());
  expect(r.dataVersion).toContain("cable-ampacity");
  expect(r.dataVersion).toContain("confidence=draft");
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/calculation-core test cable-sizing/index`

- [ ] **Step 3: Implement** — `select.ts`'e ekle:

```typescript
import { getCableAmpacityDataset } from "@elektroplan/calculation-data";

function createDataVersion(key: CableAmpacityKey): string {
  const ds = getCableAmpacityDataset(key);
  return `${ds.metadata.id}:${ds.metadata.revision}|confidence=${ds.confidence}`;
}
```
`return`'de `dataVersion: getCableAmpacityConfidence(ampacityKey)` → `dataVersion: createDataVersion(ampacityKey)`.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/calculation-core/src/cable-sizing/select.ts packages/calculation-core/src/cable-sizing/index.test.ts
git commit -m "feat(core): stamp composite cable dataVersion with confidence"
```

---

## Bölüm 3 — Doğrulama

### Task 18: Tam paket doğrulaması

- [ ] **Step 1: Tüm testler**

Run: `pnpm test`
Expected: tüm paketler PASS.

- [ ] **Step 2: Lint + typecheck + format**

Run: `pnpm lint && pnpm typecheck && pnpm format`
Expected: hata yok.

- [ ] **Step 3: Kapsam el kontrolü** — Hesap modu şu senaryoları doğru veriyor mu (elle bir kez çalıştır, logla):
  - 3F Cu XLPE C, 60 A, 25 m → beklenen küçük kesit
  - 1F Cu PVC C, 20 A, 20 m → tek faz artık çalışıyor (throw yok)
  - Al 10 mm² power → mekanik fail (min 16)
  - Uzun hat → VD ile üst kesit

- [ ] **Step 4: Commit (varsa düzeltmeler)**

```bash
git add -A
git commit -m "chore(core): cable-sizing plan-a verification pass"
```

---

## Kapsam dışı — Plan B (sonraki plan)

Detaylı mod: kriter 3 (cihaz koordinasyonu geçidi), 5 (PE), 6 (kısa devre), 7 (Zs), 8 (nötr) + datasetleri (adyabatik k, PE 54.2, kesme süreleri, Ia, kS, katalog I²t). Ayrıca: tablo-R'ye geçiş, flat-spaced reaktans, kD gömme derinliği, E sütunu, UI 3-mod entegrasyonu, eski `cable/` sizing'in emekliye ayrılması.

---

## Coding Agent Talimatları

1. **Sırayla git.** Task N, Task N−1'in `Produces` bloğuna dayanır. Atlamadan ilerle.
2. **TDD zorunlu.** Her task: önce failing test → çalıştır, fail gör → minimal implementasyon → çalıştır, pass gör → commit. Adım atlanmaz.
3. **`.js` uzantısı.** ESM; tüm relative import'lar `.js` ile biter (kaynak `.ts` olsa bile).
4. **Frozen dosyalara dokunma:** `cable/`, `voltage-drop/`, `protection/`, `motor/`, `iec/ampacity`, `iec/grouping-factors`, `iec/installation-methods`. Task 7 yalnız `temperature-factors/data.json`'a **additive** satır ekler; mevcut değerleri değiştirmez.
5. **Formül duplike etme.** ΔU yalnız `voltage-drop/index.ts`'te; kriter onu çağırır.
6. **Veri değerleri VERILER.md'den.** Ampacity/impedans/faktör sayılarını uydurma — [`Plan/VERILER.md`](../../../Plan/VERILER.md)'den kopyala. Ondalık nokta. B.52.4 Cu 120 D1 = **192**.
7. **`draft`/`null` disiplini.** Doğrulanmamış tablo `confidence: "draft"`. Bulunmayan hücre `null` — asla tahmini sayı.
8. **Test komutu paket-filtreli:** `pnpm --filter @elektroplan/calculation-data test <isim>` / `pnpm --filter @elektroplan/calculation-core test <isim>`.
9. **Regresyon her Bölüm sonunda:** `pnpm --filter @elektroplan/calculation-core test` tümü yeşil kalmalı.
10. **Belirsizlik varsa dur, sor.** Özellikle: harmonic dataset'in `neutralCurrentMultiplier` alanı (Task 10) ve `getTempFactor`'ın PVC `null` kabulü (Task 7) — mevcut şema uymazsa implementasyon öncesi netleştir.
