# Kablo Hesap Motoru — UI Entegrasyon Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.
> **HER TASK'ta ZORUNLU:** herhangi bir kod yazmadan önce `Skill` aracıyla `ponytail:ponytail` skill'ini çağır ve merdivenini uygula — en yalın çalışan çözümü seç, mevcut primitifi yeniden kullan, gereksiz soyutlama ekleme.
> **UI görevlerinde (Task 5–7) EK ZORUNLU:** ponytail'den sonra, JSX/CSS yazımından önce `Skill` aracıyla `frontend-design:frontend-design` skill'ini de çağır ve onu takip et. Sıra: ponytail (ne kadar az kod) → frontend-design (o kodun estetiği). İkisini de çağırmadan yazma.

**Goal:** Yeni `selectCable` motorunu (3 mod: Cetvel / Hesap / Detaylı) IPC zinciri üzerinden UI'a bağla; eski `cable/` motoruna bağlı "Detaylı Hesap" tab'ını emekliye ayır.

**Architecture:** Renderer → preload (`window.elektroPlan.calc.cableSelect`) → main IPC (`calc:cable-select`) → `CalculateService.runCableSelect` → core `selectCable`. Zod şeması `CableSelectionInput`'u aynalar. Cetvel modu dokunulmaz. Hesap ve Detaylı **tek form bileşenini** paylaşır — Detaylı, gelişmiş alanları açar.

**Tech Stack:** React 18 + TypeScript (ESM), `@tanstack/react-query`, CSS Modules, Electron IPC, zod. Mevcut UI primitifleri: `ui/{Button,Card,Field,NumberInput,Select,ResultPanel,ResultRow,ErrorBanner,Spinner,SaveDialog}`.

## Global Constraints

- IPC zinciri **tek yönlü tip kaynağı** `@elektroplan/contracts` — preload ve main oradan import eder, birbirinden değil (`ipc.ts` başlık notu).
- Renderer **asla** fs/SQLite/Electron API'ye doğrudan dokunmaz; her şey preload → IPC → main (master plan §9).
- `calculation-core` public API'sinden yalnız `selectCable` + tipleri kullanılır; core değişmez.
- Mevcut UI primitifleri **yeniden kullanılır** — yeni Button/Card/Input icat etme.
- Tema: `styles/theme.css` `--color-*` token'ları; amber accent (`--color-accent-*`), `data-theme` light/dark. Sabit renk (`#abc`) yazma, token kullan.
- Türkçe arayüz metni (mevcut sayfalarla tutarlı).
- Sayı biçimlendirme: `i18n/format` (`formatNumberTr`, `formatAmp`, `formatPercent`) — elle `toFixed` yok.
- Zod şeması core DTO ile birebir; alan adları `CableSelectionInput` ile aynı.
- Test: renderer'da vitest; contracts/main paket testleri kendi `pnpm --filter` komutuyla.
- **Cetvel modu regresyonu:** `CableRulerMode` ve `calc:cable-ruler` zinciri değişmez.

## Referans imzalar (core, mevcut — doğrulandı)

```typescript
// @elektroplan/calculation-core — cable-sizing/index.ts
function selectCable(input: CableSelectionInput): CableSelectionResult;
type CableSizingMode = "standard" | "detailed";
interface CableSelectionInput {
  mode; designCurrentA; phase: 1|3; circuitKind: "power"|"signal";
  conductorMaterial: "copper"|"aluminum"; insulation: "PVC"|"XLPE/EPR";
  installationMethod: "A1"|"A2"|"B1"|"B2"|"C"|"D1"|"D2";
  ambientTemperatureC; groupedCircuits;
  groupingArrangement: "bunched"|"single-layer-tray-horizontal"|"buried-in-ducts";
  thirdHarmonicPercent; voltageDropLimitPercent;
  voltageDrop: { systemType; lengthM; baseVoltageV; cosPhi };
  extraCorrectionFactor?; detailed?: DetailedOptions;
}
interface CableSelectionOutput {
  mode; selectedSectionMm2; designCurrentA; sizingCurrentA;
  kT; kG; kH; kS; kD; kTotal; izRequiredA;
  selectedDevice: SelectedDevice | null; peSectionMm2: number|null; neutralSectionMm2: number|null;
  candidateTrace: readonly CandidateEvaluation[]; vdResult;
}
interface CandidateEvaluation { sectionMm2; criteria: readonly CriterionOutcome[]; failedAt: CriterionId|null; accepted: boolean; }
interface CriterionOutcome { id: CriterionId; status: "pass"|"fail"|"not-applicable"|"skipped"; detail: Record<string,number|string|null>; }
```

Mevcut IPC kalıbı (aynala): kanal `IPC_CHANNELS.CalcCable` → `register.ts:secureHandle` → `calculate-service.runCable` → preload `calc.cable` → bridge `getBridge().calc.cable(request)`.

---

## Dosya Haritası

**contracts:**
```
packages/contracts/src/ipc.ts        # + CalcCableSelect kanalı
packages/contracts/src/schemas.ts    # + cableSelectRequest/Response şemaları
packages/contracts/src/index.ts      # + export
```
**main:**
```
apps/desktop/main/src/services/calculate-service.ts   # + runCableSelect
apps/desktop/main/src/ipc/register.ts                 # + secureHandle
```
**preload + bridge:**
```
apps/desktop/preload/src/index.ts                     # + calc.cableSelect
apps/desktop/renderer/src/bridge/types.ts             # + CableSelect* tipleri, calc.cableSelect
```
**renderer:**
```
apps/desktop/renderer/src/features/cable/CablePage.tsx           # 3 tab
apps/desktop/renderer/src/features/cable/CableSelectMode.tsx      # YENİ — Hesap+Detaylı form (frontend-design)
apps/desktop/renderer/src/features/cable/CableSelectMode.module.css
apps/desktop/renderer/src/features/cable/CriterionTrace.tsx       # YENİ — trace görselleştirme (frontend-design)
apps/desktop/renderer/src/features/cable/CriterionTrace.module.css
```
**Değişmeyen:** `CableRulerMode.*`, core, `voltage-drop/`, eski `cable/`. `CableDetailedMode.*` Task 7'de kaldırılır.

---

## Bölüm 1 — IPC zinciri

### Task 1: contracts — kanal + zod şema

**Files:**
- Modify: `packages/contracts/src/ipc.ts`
- Modify: `packages/contracts/src/schemas.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: `packages/contracts/src/schema.test.ts` (yeni test ekle)

**Interfaces:**
- Produces: `IPC_CHANNELS.CalcCableSelect = "calc:cable-select"`; `cableSelectRequestSchema`, `cableSelectResponseSchema`; `type CableSelectRequest`, `type CableSelectResponse`.

- [ ] **Step 1: Failing test** — `schema.test.ts`'e ekle

```typescript
import { cableSelectRequestSchema } from "./schemas.js";

describe("cableSelectRequestSchema", () => {
  const base = {
    mode: "standard", designCurrentA: 60, phase: 3, circuitKind: "power",
    conductorMaterial: "copper", insulation: "XLPE/EPR", installationMethod: "C",
    ambientTemperatureC: 30, groupedCircuits: 1, groupingArrangement: "bunched",
    thirdHarmonicPercent: 0, voltageDropLimitPercent: 5,
    voltageDrop: { systemType: "three-phase-ac-ll", lengthM: 25, baseVoltageV: 400, cosPhi: 0.9 },
  };

  it("accepts a valid standard-mode request", () => {
    expect(() => cableSelectRequestSchema.parse(base)).not.toThrow();
  });

  it("accepts detailed mode with the detailed block", () => {
    expect(() => cableSelectRequestSchema.parse({
      ...base, mode: "detailed",
      detailed: {
        earthingSystem: "TN", circuitRole: "final", breakerCurve: "C",
        peLocation: "in-cable", conductorArrangement: "multicore",
        loopImpedance: { method: "estimated" },
      },
    })).not.toThrow();
  });

  it("rejects an installation method outside the D1/D2 set", () => {
    expect(() => cableSelectRequestSchema.parse({ ...base, installationMethod: "E" })).toThrow();
  });

  it("rejects a measured loop impedance without a source impedance", () => {
    expect(() => cableSelectRequestSchema.parse({
      ...base, mode: "detailed",
      detailed: {
        earthingSystem: "TN", circuitRole: "final", breakerCurve: "C",
        peLocation: "in-cable", conductorArrangement: "multicore",
        loopImpedance: { method: "measured" },
      },
    })).toThrow();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/contracts test schema`

- [ ] **Step 3: ipc.ts** — `IPC_CHANNELS`'a ekle (CalcCable satırından sonra):

```typescript
  CalcCableSelect: "calc:cable-select",
```

- [ ] **Step 4: schemas.ts** — mevcut `cableVoltageDropSystemTypeSchema`'yı yeniden kullan; ekle:

```typescript
export const cableSelectVoltageDropSchema = z
  .object({
    systemType: cableVoltageDropSystemTypeSchema,
    lengthM: z.number().positive(),
    baseVoltageV: z.number().positive(),
    cosPhi: z.number().gt(0).max(1),
  })
  .strict();

export const cableLoopImpedanceSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("estimated") }).strict(),
  z.object({ method: z.literal("calculated"), prospectiveEarthFaultKa: z.number().positive() }).strict(),
  z.object({ method: z.literal("measured"), sourceImpedanceOhm: z.number().positive() }).strict(),
]);

export const cableDetailedOptionsSchema = z
  .object({
    earthingSystem: z.enum(["TN", "TT"]),
    circuitRole: z.enum(["final", "distribution"]),
    breakerCurve: z.enum(["B", "C", "D"]),
    peLocation: z.enum(["in-cable", "separate"]),
    conductorArrangement: z.enum(["multicore", "singleCoreTrefoil", "singleCoreFlatTouching"]),
    parallelConductors: z.number().int().positive().optional(),
    soilThermalResistivityKmPerW: z.number().positive().optional(),
    burialDepthM: z.number().positive().optional(),
    shortCircuit: z
      .object({ prospectiveFaultKa: z.number().positive(), clearingTimeS: z.number().positive() })
      .strict()
      .optional(),
    loopImpedance: cableLoopImpedanceSchema,
  })
  .strict();

export const cableSelectRequestSchema = z
  .object({
    mode: z.enum(["standard", "detailed"]),
    designCurrentA: z.number().positive(),
    phase: z.union([z.literal(1), z.literal(3)]),
    circuitKind: z.enum(["power", "signal"]),
    conductorMaterial: z.enum(["copper", "aluminum"]),
    insulation: z.enum(["PVC", "XLPE/EPR"]),
    installationMethod: z.enum(["A1", "A2", "B1", "B2", "C", "D1", "D2"]),
    ambientTemperatureC: z.number().positive(),
    groupedCircuits: z.number().int().positive(),
    groupingArrangement: z.enum(["bunched", "single-layer-tray-horizontal", "buried-in-ducts"]),
    thirdHarmonicPercent: z.number().min(0),
    voltageDropLimitPercent: z.number().positive(),
    voltageDrop: cableSelectVoltageDropSchema,
    extraCorrectionFactor: z.number().positive().optional(),
    detailed: cableDetailedOptionsSchema.optional(),
  })
  .strict()
  .refine((v) => v.mode !== "detailed" || v.detailed !== undefined, {
    message: "detailed mode requires the 'detailed' options block.",
    path: ["detailed"],
  });

// Çıktı: core zaten doğruluyor; hafif output şeması (UI passthrough).
export const cableSelectResponseSchema = z.object({
  value: z.record(z.unknown()),
  warnings: z.array(z.unknown()),
  assumptions: z.array(z.unknown()),
  formulaVariant: z.string(),
  dataVersion: z.string(),
  engineVersion: z.string(),
});

export type CableSelectRequest = z.infer<typeof cableSelectRequestSchema>;
export type CableSelectResponse = z.infer<typeof cableSelectResponseSchema>;
```

> `cableSelectResponseSchema` gevşek (`z.record(z.unknown())`) — core çıktısı zaten tipli ve doğrulanmış; IPC sınırında yeniden tam şema yazmak DRY değil. Renderer tip güvenliğini `bridge/types.ts`'teki `CableSelectionOutput` ile alır.

- [ ] **Step 5: index.ts** — yeni şema/tipleri export et (mevcut cable export'larının yanına).

- [ ] **Step 6: Run — expect PASS** + regresyon

Run: `pnpm --filter @elektroplan/contracts test`

- [ ] **Step 7: Commit**

```bash
git add packages/contracts/src/ipc.ts packages/contracts/src/schemas.ts packages/contracts/src/index.ts packages/contracts/src/schema.test.ts
git commit -m "feat(contracts): add cable-select IPC channel and request schema"
```

---

### Task 2: main service + IPC kaydı

**Files:**
- Modify: `apps/desktop/main/src/services/calculate-service.ts`
- Modify: `apps/desktop/main/src/ipc/register.ts`
- Test: `apps/desktop/main/src/services/calculate-service.test.ts` (yoksa oluştur; varsa ekle)

**Interfaces:**
- Consumes: `selectCable`, `CableSelectionInput`, `CableSelectionResult` (core); `cableSelectRequestSchema` (contracts).
- Produces: `CalculateService.runCableSelect(request: unknown): CableSelectionResult`.

- [ ] **Step 1: Failing test**

```typescript
import { createCalculateService } from "./calculate-service.js";

describe("runCableSelect", () => {
  const service = createCalculateService();
  const base = {
    mode: "standard", designCurrentA: 60, phase: 3, circuitKind: "power",
    conductorMaterial: "copper", insulation: "XLPE/EPR", installationMethod: "C",
    ambientTemperatureC: 30, groupedCircuits: 1, groupingArrangement: "bunched",
    thirdHarmonicPercent: 0, voltageDropLimitPercent: 5,
    voltageDrop: { systemType: "three-phase-ac-ll", lengthM: 25, baseVoltageV: 400, cosPhi: 0.9 },
  };

  it("selects a cross-section for a valid standard request", () => {
    const result = service.runCableSelect(base);
    expect(result.value.selectedSectionMm2).toBeGreaterThan(0);
    expect(result.value.mode).toBe("standard");
  });

  it("rejects an invalid installation method via the schema", () => {
    expect(() => service.runCableSelect({ ...base, installationMethod: "E" })).toThrow();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/desktop-main test calculate-service`
(paket adını `apps/desktop/main/package.json`'dan doğrula; test scripti yoksa `pnpm --filter <ad> test`)

- [ ] **Step 3: calculate-service.ts** — import ekle:

```typescript
import { selectCable } from "@elektroplan/calculation-core";
import type { CableSelectionInput, CableSelectionResult } from "@elektroplan/calculation-core";
import { cableSelectRequestSchema, type CableSelectRequest } from "@elektroplan/contracts";
```
`CalculateService` arayüzüne ekle: `runCableSelect(request: unknown): CableSelectionResult;`
implementasyona ekle (`runCable`'ın yanına):
```typescript
    runCableSelect(request: unknown): CableSelectionResult {
      const parsed: CableSelectRequest = cableSelectRequestSchema.parse(request);
      return selectCable(stripUndefinedDeep(parsed) as CableSelectionInput);
    },
```

> `stripUndefinedDeep` mevcut — opsiyonel alanları (`detailed`, `extraCorrectionFactor`) `undefined` bırakmadan temizler, core'un `exactOptionalPropertyTypes` beklentisiyle uyumlu.

- [ ] **Step 4: register.ts** — `secureHandle` ekle (CalcCable bloğundan sonra):

```typescript
  secureHandle(
    ipcMain,
    IPC_CHANNELS.CalcCableSelect,
    securityOptions,
    (_event, payload) => services.calculate.runCableSelect(payload),
  );
```

- [ ] **Step 5: Run — expect PASS**

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/main/src/services/calculate-service.ts apps/desktop/main/src/ipc/register.ts apps/desktop/main/src/services/calculate-service.test.ts
git commit -m "feat(main): wire runCableSelect service and IPC handler"
```

---

### Task 3: preload + bridge tipleri

**Files:**
- Modify: `apps/desktop/preload/src/index.ts`
- Modify: `apps/desktop/renderer/src/bridge/types.ts`

**Interfaces:**
- Produces: preload `calc.cableSelect(request)`; bridge `CableSelectRequest`, `CableSelectionOutput`, `CableSelectResponse`, `ElektroPlanBridge["calc"]["cableSelect"]`.

- [ ] **Step 1: preload/src/index.ts** — `calc` bloğuna ekle (`cable:` satırından sonra):

```typescript
    cableSelect: (request) => invoke(CHANNELS.CalcCableSelect, request),
```
preload'un kendi tip bloğuna `CableSelectRequest`/`CableSelectResponse` tiplerini ekle (contracts'tan `import type`; mevcut `CableRequest` importunun yanına).

- [ ] **Step 2: bridge/types.ts** — Cable bölümüne (satır ~300) tam çıktı tiplerini ekle (renderer tip güvenliği buradan gelir):

```typescript
export type CableSelectMode = "standard" | "detailed";
export type CableMethodCode = "A1" | "A2" | "B1" | "B2" | "C" | "D1" | "D2";
export type GroupingArrangement = "bunched" | "single-layer-tray-horizontal" | "buried-in-ducts";
export type ConductorArrangement = "multicore" | "singleCoreTrefoil" | "singleCoreFlatTouching";
export type CriterionId =
  | "mechanical" | "thermal" | "device" | "voltageDrop"
  | "pe" | "shortCircuit" | "loopImpedance" | "neutral";
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
export interface SelectedDevice {
  id: string; nominalCurrentA: number; curve: string | null; family: string; i2A: number;
}
export interface CableDetailedOptions {
  earthingSystem: "TN" | "TT";
  circuitRole: "final" | "distribution";
  breakerCurve: "B" | "C" | "D";
  peLocation: "in-cable" | "separate";
  conductorArrangement: ConductorArrangement;
  parallelConductors?: number;
  soilThermalResistivityKmPerW?: number;
  burialDepthM?: number;
  shortCircuit?: { prospectiveFaultKa: number; clearingTimeS: number };
  loopImpedance:
    | { method: "estimated" }
    | { method: "calculated"; prospectiveEarthFaultKa: number }
    | { method: "measured"; sourceImpedanceOhm: number };
}
export interface CableSelectRequest {
  mode: CableSelectMode;
  designCurrentA: number;
  phase: 1 | 3;
  circuitKind: "power" | "signal";
  conductorMaterial: "copper" | "aluminum";
  insulation: "PVC" | "XLPE/EPR";
  installationMethod: CableMethodCode;
  ambientTemperatureC: number;
  groupedCircuits: number;
  groupingArrangement: GroupingArrangement;
  thirdHarmonicPercent: number;
  voltageDropLimitPercent: number;
  voltageDrop: { systemType: CableVoltageDropSystemType; lengthM: number; baseVoltageV: number; cosPhi: number };
  extraCorrectionFactor?: number;
  detailed?: CableDetailedOptions;
}
export interface CableSelectOutput {
  mode: CableSelectMode;
  selectedSectionMm2: number;
  designCurrentA: number;
  sizingCurrentA: number;
  kT: number; kG: number; kH: number; kS: number; kD: number; kTotal: number;
  izRequiredA: number;
  selectedDevice: SelectedDevice | null;
  peSectionMm2: number | null;
  neutralSectionMm2: number | null;
  candidateTrace: readonly CandidateEvaluation[];
  vdResult: CableResponse["value"]["vdResult"];  // mevcut VD tipini yeniden kullan
}
export interface CableSelectResponse {
  value: CableSelectOutput;
  warnings: readonly { code: string; messageKey: string; detail?: string }[];
  assumptions: readonly AssumptionEntry[];
  formulaVariant: string;
  dataVersion: string;
  engineVersion: string;
}
```
`ElektroPlanBridge`'in `calc` alanına ekle: `cableSelect(request: CableSelectRequest): Promise<CableSelectResponse>;`

> `vdResult` tipi mevcut `CableResponse` içinde zaten var mı kontrol et; yoksa `voltage-drop` output tipini oradan al. Amaç: yeni VD tipi kopyalamamak.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @elektroplan/desktop-preload typecheck && pnpm --filter @elektroplan/desktop-renderer typecheck`

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/preload/src/index.ts apps/desktop/renderer/src/bridge/types.ts
git commit -m "feat(preload): expose calc.cableSelect and renderer bridge types"
```

---

## Bölüm 2 — Renderer

### Task 4: 3-mod tab yapısı

**Files:**
- Modify: `apps/desktop/renderer/src/features/cable/CablePage.tsx`
- Modify: `apps/desktop/renderer/src/features/cable/CablePage.module.css` (gerekirse)

**Interfaces:**
- Consumes: `CableRulerMode` (mevcut), `CableSelectMode` (Task 5, `mode` prop alır).
- Produces: 3 tab — `ruler | standard | detailed`.

- [ ] **Step 1: CablePage.tsx'i güncelle** — mod tipini genişlet, tab ekle:

```typescript
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
      {mode === "ruler" ? <CableRulerMode /> : <CableSelectMode mode={mode} />}
    </div>
  );
}
```

> `version: 2` — Task 5 gelene kadar `CableSelectMode` yok, bu adım **derlenmez**. Bu yüzden Task 4 + Task 5 tek incelemede sıralı gider; Task 4'ü ayrı commit'leme, Task 5 sonunda birlikte commit et. (Task 5 Step'inde belirtilir.)

- [ ] **Step 2: Task 5'e geç** (bu task tek başına derlenmez — kasıtlı).

---

### Task 5: Hesap + Detaylı form bileşeni `CableSelectMode`

> **ZORUNLU İLK ADIMLAR (sırayla):** (1) `Skill` aracıyla `ponytail:ponytail` çağır — `CableDetailedMode`'u referans al, mevcut `ui/*` primitiflerini ve form state kalıbını yeniden kullan, yeni soyutlama ekleme. (2) `Skill` aracıyla `frontend-design:frontend-design` çağır — mevcut tasarım sistemine (amber accent, `Card`/`Field`/`Select`/`NumberInput`, `theme.css` token'ları, `data-theme` light/dark) **oturan** bir form tasarla, çakışan yeni estetik değil. İkisini de çağırmadan JSX/CSS yazma.

**Files:**
- Create: `apps/desktop/renderer/src/features/cable/CableSelectMode.tsx`
- Create: `apps/desktop/renderer/src/features/cable/CableSelectMode.module.css`
- Test: `apps/desktop/renderer/src/features/cable/CableSelectMode.test.tsx`

**Interfaces:**
- Consumes: `getBridge().calc.cableSelect`, `CableSelectRequest`, `CableSelectOutput` (bridge), UI primitifleri, `usePersistentPageState`, `calculatorDefaults`.
- Produces: `function CableSelectMode(props: { mode: "standard" | "detailed" }): JSX.Element`.

**Tasarım yönü (frontend-design çağrısından sonra rafine et):**
- Ortak temel form (her iki mod): akım/güç girişi, faz, malzeme, yalıtım (PVC/XLPE), montaj metodu (A1–D2), ortam °C, grup devre + düzenleme, uzunluk, ΔU limiti, sistem tipi, cosφ, h3%.
- **Detaylı modda açılan gelişmiş bölüm** (`mode === "detailed"`): topraklama sistemi (TN/TT), devre rolü (final/dağıtım), kesici eğrisi (B/C/D), PE konumu, iletken dizilimi, paralel iletken, toprak termal direnci (yalnız D1/D2), gömme derinliği, kısa devre (Isc/t), Zs yöntemi (estimated/calculated/measured — yönteme göre ek alan).
- Gelişmiş bölüm görsel olarak **ayrı bir katman** (`<Card>` içinde başlık + ince ayraç), "uzman ayarları" hissi versin — ama form akışını bozmadan.

- [ ] **Step 1: `Skill(ponytail:ponytail)` → `Skill(frontend-design:frontend-design)` çağır** (bu sırayla), tasarım yönünü netleştir, sonra devam et.

- [ ] **Step 2: Failing test** (mantık — form → istek eşlemesi; render smoke)

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CableSelectMode } from "./CableSelectMode";

const cableSelect = vi.fn();
vi.mock("../../bridge/client", () => ({
  isBridgeAvailable: () => true,
  getBridge: () => ({
    calc: { cableSelect },
    data: { installationMethods: () => Promise.resolve(["A1","A2","B1","B2","C","D1","D2"]) },
  }),
}));

function wrap(ui: React.ReactElement) {
  return <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>;
}

describe("CableSelectMode", () => {
  beforeEach(() => cableSelect.mockReset());

  it("sends mode='standard' without a detailed block", async () => {
    cableSelect.mockResolvedValue({ value: { selectedSectionMm2: 16, candidateTrace: [], kTotal: 1 }, warnings: [], assumptions: [] });
    render(wrap(<CableSelectMode mode="standard" />));
    fireEvent.change(screen.getByLabelText(/tasarım akımı|akım/i), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: /hesapla/i }));
    await waitFor(() => expect(cableSelect).toHaveBeenCalled());
    const req = cableSelect.mock.calls[0][0];
    expect(req.mode).toBe("standard");
    expect(req.detailed).toBeUndefined();
  });

  it("includes the detailed block in detailed mode", async () => {
    cableSelect.mockResolvedValue({ value: { selectedSectionMm2: 16, candidateTrace: [], kTotal: 1 }, warnings: [], assumptions: [] });
    render(wrap(<CableSelectMode mode="detailed" />));
    fireEvent.change(screen.getByLabelText(/tasarım akımı|akım/i), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: /hesapla/i }));
    await waitFor(() => expect(cableSelect).toHaveBeenCalled());
    const req = cableSelect.mock.calls[0][0];
    expect(req.mode).toBe("detailed");
    expect(req.detailed).toBeDefined();
    expect(req.detailed.loopImpedance.method).toBeDefined();
  });
});
```

> Test dosya adları/label metinleri implementasyona göre hizala; `getByLabelText` için `Field`/`NumberInput` `label`↔`id` bağını kur (erişilebilirlik zaten gerekli).

- [ ] **Step 3: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/desktop-renderer test CableSelectMode`

- [ ] **Step 4: Implement** — `CableDetailedMode.tsx`'i **referans al** (form state, `usePersistentPageState`, `calculatorDefaults`, `SaveDialog`, `ResultPanel` kalıpları oradan). Farklar:
  - `mode` prop'a göre `detailed` bloğunu koşullu kur ve isteğe ekle.
  - Bridge çağrısı `getBridge().calc.cableSelect(request)`.
  - Persistent state key `elektroplan.page.cable.select.${mode}` (Hesap ve Detaylı ayrı hatırlansın).
  - Montaj metodu seçenekleri `A1..D2` (yeni set; `installationMethods()` query D1/D2 döndürmüyorsa sabit listeden ver — core metot seti `{A1,A2,B1,B2,C,D1,D2}`).
  - Sonuç: `<ResultPanel>` içinde seçilen kesit + kT/kG/kH/kS/kD/kTotal + (detaylı) cihaz/PE/nötr + `<CriterionTrace>` (Task 6).
  - `warnings` → `<ErrorBanner>` veya uyarı satırı (`unverified-data`, `not-applicable` kriterler).

  frontend-design skill'inin yönlendirdiği tasarım kararlarını uygula (tipografi, boşluk, gelişmiş-bölüm katmanı, mikro-etkileşimler token'larla).

- [ ] **Step 5: Run — expect PASS**

- [ ] **Step 6: Task 4 + Task 5 birlikte derleme + typecheck**

Run: `pnpm --filter @elektroplan/desktop-renderer typecheck && pnpm --filter @elektroplan/desktop-renderer test cable`

- [ ] **Step 7: Commit (Task 4 + 5 birlikte)**

```bash
git add apps/desktop/renderer/src/features/cable/CablePage.tsx apps/desktop/renderer/src/features/cable/CableSelectMode.tsx apps/desktop/renderer/src/features/cable/CableSelectMode.module.css apps/desktop/renderer/src/features/cable/CableSelectMode.test.tsx apps/desktop/renderer/src/features/cable/CablePage.module.css
git commit -m "feat(ui): add 3-mode cable page with standard/detailed select form"
```

---

### Task 6: Kriter-trace görselleştirme `CriterionTrace`

> **ZORUNLU İLK ADIMLAR (sırayla):** (1) `Skill` aracıyla `ponytail:ponytail` çağır — trace bir liste + rozet dizisi, en yalın haliyle çöz; ağır grafik kütüphanesi/soyutlama ekleme, CSS ile hallet. (2) `Skill` aracıyla `frontend-design:frontend-design` çağır — bu bileşen sayfanın **akılda kalan öğesi**, "neden bu kesit, komşular neden elendi" sorusunu tek bakışta cevaplamalı; görsel güçlü ama okunur, tema token'larıyla light/dark uyumlu. İkisini de çağırmadan yazma.

**Files:**
- Create: `apps/desktop/renderer/src/features/cable/CriterionTrace.tsx`
- Create: `apps/desktop/renderer/src/features/cable/CriterionTrace.module.css`
- Test: `apps/desktop/renderer/src/features/cable/CriterionTrace.test.tsx`

**Interfaces:**
- Consumes: `CandidateEvaluation[]` (bridge tipi).
- Produces: `function CriterionTrace(props: { trace: readonly CandidateEvaluation[]; selectedSectionMm2: number }): JSX.Element`.

**Tasarım yönü:** her aday kesit bir satır/kart. Kriterler yatay sıralı rozet dizisi (`pass` yeşil ✓ / `fail` kırmızı ✕ / `skipped` gri ⊘ / `not-applicable` soluk —). Elenen adayda `failedAt` kriteri vurgulu. Seçilen kesit belirgin (accent kenarlık/işaret). Uzun trace kaydırılabilir (`overflow-x` kendi kabında; sayfa yatay kaymaz).

- [ ] **Step 1: `Skill(ponytail:ponytail)` → `Skill(frontend-design:frontend-design)` çağır** (bu sırayla), sonra devam.

- [ ] **Step 2: Failing test**

```typescript
import { render, screen } from "@testing-library/react";
import { CriterionTrace } from "./CriterionTrace";

const trace = [
  { sectionMm2: 2.5, failedAt: "thermal", accepted: false,
    criteria: [
      { id: "mechanical", status: "pass", detail: {} },
      { id: "thermal", status: "fail", detail: { izCorrectedA: 30, sizingCurrentA: 60 } },
    ] },
  { sectionMm2: 16, failedAt: null, accepted: true,
    criteria: [
      { id: "mechanical", status: "pass", detail: {} },
      { id: "thermal", status: "pass", detail: {} },
      { id: "voltageDrop", status: "pass", detail: {} },
    ] },
] as const;

describe("CriterionTrace", () => {
  it("marks the selected candidate", () => {
    render(<CriterionTrace trace={trace} selectedSectionMm2={16} />);
    const selected = screen.getByTestId("candidate-16");
    expect(selected).toHaveAttribute("data-selected", "true");
  });

  it("flags the failing criterion on a rejected candidate", () => {
    render(<CriterionTrace trace={trace} selectedSectionMm2={16} />);
    expect(screen.getByTestId("candidate-2.5-thermal")).toHaveAttribute("data-status", "fail");
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

Run: `pnpm --filter @elektroplan/desktop-renderer test CriterionTrace`

- [ ] **Step 4: Implement** — frontend-design kararlarıyla. `data-testid` / `data-status` / `data-selected` kancalarını test için bırak. Kriter etiketleri Türkçe kısa: Mekanik / Termal / Cihaz / Gerilim / PE / K.Devre / Zs / Nötr. Kriter `detail`'ini tooltip/expand ile göster (örn. termal fail'de "27 A < 60 A").

- [ ] **Step 5: Run — expect PASS**

- [ ] **Step 6: `CableSelectMode`'a bağla** — sonuç panelinde `<CriterionTrace trace={result.candidateTrace} selectedSectionMm2={result.selectedSectionMm2} />` render et.

- [ ] **Step 7: Typecheck + commit**

Run: `pnpm --filter @elektroplan/desktop-renderer typecheck`
```bash
git add apps/desktop/renderer/src/features/cable/CriterionTrace.tsx apps/desktop/renderer/src/features/cable/CriterionTrace.module.css apps/desktop/renderer/src/features/cable/CriterionTrace.test.tsx apps/desktop/renderer/src/features/cable/CableSelectMode.tsx
git commit -m "feat(ui): add criterion-trace visualization to cable results"
```

---

### Task 7: Eski `CableDetailedMode` emekliliği + doğrulama

**Files:**
- Delete: `apps/desktop/renderer/src/features/cable/CableDetailedMode.tsx`
- Delete: `apps/desktop/renderer/src/features/cable/CableDetailedMode.module.css`
- Grep + temizle: `CableDetailedMode` importları/referansları.

> Eski bileşen eski `cable/` motoruna (`calc.cable`) bağlıydı. Artık `CableSelectMode` onu kapsıyor. Eski **core `cable/` modülü** ve `calc:cable` kanalı bu planda **silinmez** — başka tüketici (kayıtlar/records replay) olabilir; önce grep, referans yoksa ayrı bir temizlik işine bırak.

- [ ] **Step 1: Referans taraması**

Run: `pnpm --filter @elektroplan/desktop-renderer exec grep -rn "CableDetailedMode" src || true`
Beklenen: yalnız kendi dosyaları + (Task 4 sonrası) `CablePage` artık import etmiyor.

- [ ] **Step 2: Dosyaları sil**, kalan importları temizle.

- [ ] **Step 3: Tam renderer testi + typecheck**

Run: `pnpm --filter @elektroplan/desktop-renderer test && pnpm --filter @elektroplan/desktop-renderer typecheck`

- [ ] **Step 4: Tam repo doğrulaması**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Beklenen: tüm paketler yeşil.

- [ ] **Step 5: Uygulamayı çalıştır ve gör** — `/run` skill'i veya mevcut launch akışıyla uygulamayı aç. Kontrol:
  - 3 tab görünüyor (Cetvel / Hesap / Detaylı).
  - Hesap modu: 60 A, 3F, XLPE, C → kesit + kTotal + trace.
  - Detaylı modu: gelişmiş bölüm açık, TN/final/C → cihaz + PE + nötr + trace.
  - Cetvel modu değişmemiş.
  - Light/dark tema geçişinde trace görselleştirmesi bozulmuyor.
  - Konsol hatası yok (`ERR_DLOPEN` vb. — CLAUDE.md build notu).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(ui): retire legacy CableDetailedMode in favor of cable-select"
```

---

## Kapsam dışı — sonraki iş

- **Kayıt/records entegrasyonu:** yeni `cable-select` sonuçlarının `SaveDialog` ile kaydı + `cableSelectCalculationRecordSchema`. Bu plan hesap+görselleştirmeye odaklı; kaydetme ayrı iş (eski `cable` record path'i bozulmadan).
- **Eski core `cable/` modülü + `calc:cable` kanalının kaldırılması** — records replay bağımlılığı çözülünce.
- **Export (PDF/Excel)** yeni çıktı alanları (cihaz/PE/nötr/trace) için.
- **i18n** — çok dilli metin altyapısına taşınırsa sabit Türkçe stringler çıkarılır.
- **Motor/VD sayfalarıyla tutarlılık** — trace görselleştirme kalıbı oralarda da kullanılabilir.

---

## Coding Agent Talimatları

1. **Zincir sırayla:** Bölüm 1 (contracts → main → preload/bridge) tam bitmeden Bölüm 2'ye geçme; renderer tipleri bridge'e bağlı.
2. **ponytail ZORUNLU (her task):** kod yazmadan **önce** `Skill` aracıyla `ponytail:ponytail` çağır. Merdiven: gerekli mi → mevcut primitif/util var mı → stdlib/native → tek satır → ancak sonra minimum kod. Yeni bileşen/soyutlama eklemeden önce `ui/*` ve mevcut feature'ları kontrol et.
3. **frontend-design ZORUNLU (Task 5–6):** ponytail'den sonra, JSX/CSS yazmadan **önce** `Skill` aracıyla `frontend-design:frontend-design` çağır ve takip et. Sıra: ponytail → frontend-design. İkisi de öneri değil, adım.
4. **Mevcut tasarım sistemine otur:** amber accent, `theme.css` token'ları, `ui/*` primitifleri yeniden kullanılır. Yeni renk paleti/font sistemi icat etme — frontend-design'ı *bu bağlama* uygula.
5. **TDD:** her task failing test → fail gör → implement → pass → commit. UI bileşenlerinde smoke + mantık testi yeter (form→istek eşlemesi, trace durum kancaları).
6. **`.js` uzantısı** core/contracts/main/preload importlarında; renderer'da bundler'a göre (mevcut dosyalardaki kalıbı izle).
7. **Cetvel modu kutsal:** `CableRulerMode` ve `calc:cable-ruler` değişmez; her Bölüm sonunda regresyon.
8. **Tip kaynağı contracts:** preload ve main tipleri `@elektroplan/contracts`'tan alır; renderer çıktı tipleri `bridge/types.ts`'te (core'u kopyalamadan aynala).
9. **Task 4 tek başına derlenmez** (Task 5'in `CableSelectMode`'una bağlı) — ikisini birlikte commit'le.
10. **Silme dikkatli (Task 7):** önce grep, referans yoksa sil. Core `cable/` modülüne ve `calc:cable` kanalına dokunma.
11. **Son adım gerçek uygulama:** Task 7 Step 5'te uygulamayı aç ve gözle doğrula — testler yeşil demek UI çalışıyor demek değil.
12. **Belirsizlik varsa dur, sor.** Özellikle: `installationMethods()` query'sinin D1/D2 döndürüp döndürmediği (Task 5) ve `vdResult` tipinin bridge'de mevcut olup olmadığı (Task 3).
```
