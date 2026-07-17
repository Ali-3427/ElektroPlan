# Code Quality Fixes — Parallel Workstreams Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the correctness bugs and cleanup findings documented in the 2026-07-07 code-simplifier scans (six findings docs under `docs/plans/`), organized as six independent workstreams — one per package/app — so separate coding agents can execute them **in parallel, each on its own branch**, without touching each other's files.

**Architecture:** Each workstream = one git branch off `master`, confined to a single package or app directory. Verified file-path analysis below confirms **zero cross-workstream file overlap** — all six can run simultaneously in separate worktrees with no merge conflicts. Each workstream commits incrementally (one task = one commit) and ends by opening its own PR back to `master`; merge order between workstreams doesn't matter.

**Tech Stack:** TypeScript 5.8, vitest, pnpm workspaces + Turborepo, zod, better-sqlite3, Electron, React, TanStack Query.

**Source docs (read the relevant one before starting a workstream — it has full context, quoted code, and reasoning this plan summarizes):**
- `docs/plans/2026-07-07-calculation-core-code-quality-findings.md`
- `docs/plans/2026-07-07-calculation-data-code-quality-findings.md`
- `docs/plans/2026-07-07-storage-code-quality-findings.md`
- `docs/plans/2026-07-07-contracts-exporters-code-quality-findings.md`
- `docs/plans/2026-07-07-desktop-main-preload-code-quality-findings.md`
- `docs/plans/2026-07-07-desktop-renderer-code-quality-findings.md`

**Verify commands (shared, run from repo root unless noted):**
- `pnpm --filter @elektroplan/calculation-core typecheck` / `test`
- `pnpm --filter @elektroplan/calculation-data typecheck` / `test`
- `pnpm --filter @elektroplan/storage typecheck` / `test`
- `pnpm --filter @elektroplan/contracts typecheck` / `test`
- `pnpm --filter @elektroplan/exporters typecheck` ; `node packages/exporters/smoke.mjs`
- `cd apps/desktop/main && npx tsc --noEmit` ; `pnpm --filter @elektroplan/desktop-main test`
- `cd apps/desktop/preload && npx tsc --noEmit`
- `cd apps/desktop/renderer && npx tsc --noEmit` (no renderer test harness exists — verification also requires manually exercising the app per task)

**File-overlap check (why these six can run fully in parallel):**

| Workstream | Directory | Touches files outside its directory? |
|---|---|---|
| A — calculation-core | `packages/calculation-core/` | No |
| B — calculation-data | `packages/calculation-data/` | No |
| C — storage | `packages/storage/` | No |
| D — contracts + exporters | `packages/contracts/`, `packages/exporters/` | No (two packages, but disjoint from A/B/C/E/F) |
| E — desktop main + preload | `apps/desktop/main/`, `apps/desktop/preload/` | No |
| F — desktop renderer | `apps/desktop/renderer/` | No |

None of A–F import each other's *source* files directly at the file-path level during editing (they consume each other only via built package exports), so no workstream's edits will conflict with another's at the git-diff level.

---

## Workstream A — calculation-core

**Branch:** `fix/calculation-core`
**Reference:** `docs/plans/2026-07-07-calculation-core-code-quality-findings.md`

### Task A1: Resolve the resistance-model conflict (F1)

**Files:**
- Read: `decisions.md`, `packages/calculation-core/FREEZE_CHECKLIST.md`
- Modify: `packages/calculation-core/src/voltage-drop-tree/optimizer.ts:77-79` (`getConductivity`)
- Reference (do not modify unless F1 says to): `packages/calculation-core/src/voltage-drop/resistance.ts`, `packages/calculation-core/src/common/constants/index.ts`

**Step 1 — Decide: is `optimizer.ts`'s simplified conductivity model intentional?**

Run: `git log -p --follow packages/calculation-core/src/voltage-drop-tree/optimizer.ts | grep -A5 -B5 getConductivity`

Check `decisions.md` and `FREEZE_CHECKLIST.md` for any mention of a "legacy" or "simplified" voltage-drop-tree mode. **If you find explicit evidence this is an intentional simplified/legacy mode, stop here, add a code comment explaining why it diverges from `resistance.ts`, and skip to Task A2.** Otherwise (no evidence of intent — most likely case per the scan), continue to Step 2.

**Step 2 — Write the failing test**

Add to `packages/calculation-core/src/voltage-drop-tree/index.test.ts` (or a new file testing `optimizer.ts` directly if one doesn't exist for it):

```ts
import { describe, expect, it } from "vitest";
import { RHO_COPPER_20 } from "../common/constants";
// import the function under test — adapt to optimizer.ts's actual exports

describe("optimizer resistance model matches primary voltage-drop engine", () => {
  it("derives copper resistance consistent with RHO_COPPER_20", () => {
    // Pick a known section (e.g. 16 mm^2) and known length, compute resistance
    // via optimizer's getConductivity-based path and via resistance.ts's
    // RHO-based path, and assert they agree within a small tolerance.
    // Exact assertion depends on each function's public signature — inspect
    // both files first and adapt.
  });
});
```

Run it, confirm it currently **fails** (the two models disagree).

**Step 3 — Make `optimizer.ts` use the shared resistance model**

Replace the hardcoded `getConductivity` (56/35 S·m/mm²) with a call into the same resistance calculation `voltage-drop/resistance.ts` uses (RHO constants + temperature correction via `alpha`/`conductorTempC`). This likely means importing the resistance function from `../voltage-drop/resistance` (or extracting it into `common/` if it isn't already exported in a reusable form — check first).

**Step 4 — Run the test, confirm it passes**

Run: `pnpm --filter @elektroplan/calculation-core exec vitest run src/voltage-drop-tree -t "resistance model"`
Expected: PASS.

**Step 5 — Run the full package test suite**

Run: `pnpm --filter @elektroplan/calculation-core test`
Expected: all PASS. If `optimizer.ts`'s existing snapshot/expected-value tests change, verify the new numbers are more correct (match `resistance.ts`'s model), not just different.

**Step 6 — Commit**

```bash
git add packages/calculation-core/src/voltage-drop-tree/optimizer.ts packages/calculation-core/src/voltage-drop-tree/index.test.ts
git commit -m "fix(calculation-core): unify voltage-drop-tree resistance model with primary engine"
```

---

### Task A2: Fix 3-phase LN/LL current bug in motor-derived-outputs (F3)

**Files:**
- Modify: `packages/calculation-core/src/motor-derived-outputs/formulas.ts:14-28` (`calcDerivedCurrent`)
- Reference: `packages/calculation-core/src/motor/formulas.ts` (the correct LL/LN branch to mirror)
- Test: `packages/calculation-core/src/motor-derived-outputs/index.test.ts`

**Step 1 — Write the failing test**

```ts
it("computes 3-phase LN current with correct voltage handling (not just SQRT3 blindly)", () => {
  // Construct an input with phase: 3 and a line-to-neutral voltage mode,
  // matching whatever shape motor/formulas.ts's LN branch expects.
  // Assert the resulting current matches the LN formula, not the LL one.
  // Use motor/formulas.ts's own test cases as a reference for expected values.
});
```

Run it, confirm it **fails** (current is off by a factor of √3).

**Step 2 — Mirror the LL/LN branch from `motor/formulas.ts` into `calcDerivedCurrent`**

Read `motor/formulas.ts`'s 3-phase branch first, then apply the equivalent branch to `motor-derived-outputs/formulas.ts:14-28`, replacing the unconditional `SQRT3` usage.

**Step 3 — Run the test, confirm it passes**

Run: `pnpm --filter @elektroplan/calculation-core exec vitest run src/motor-derived-outputs -t "LN current"`

**Step 4 — Run the full package suite + worked examples**

Run: `pnpm --filter @elektroplan/calculation-core test`
Run: worked-examples runner — check `tests/worked-examples/fixtures/motor-3phase-LN-standard.json` still matches after this fix (this fixture existing suggests LN is already tested at the integration level; if it was passing before with wrong values, the fixture's expected output may need correcting too — verify by hand against the motor formula, don't just make the test pass).

**Step 5 — Commit**

```bash
git add packages/calculation-core/src/motor-derived-outputs/
git commit -m "fix(calculation-core): correct 3-phase LN/LL current calc in motor-derived-outputs"
```

---

### Task A3: Consolidate power-to-current formula (F5 + F6)

**Files:**
- Create: `packages/calculation-core/src/common/power-to-current.ts` (or extend an existing shared file if more appropriate — check `common/` structure first)
- Modify: `packages/calculation-core/src/voltage-drop/power-to-current.ts`
- Modify: `packages/calculation-core/src/motor/formulas.ts:4-43`
- Modify: `packages/calculation-core/src/motor-derived-outputs/formulas.ts` (after Task A2 lands)
- Modify: `packages/calculation-core/src/voltage-drop-tree/optimizer.ts:85-96` (after Task A1 lands)

**Step 1 — Do this task after A1 and A2 are merged**, since it consolidates code both of those tasks touch. If running in true parallel, this task should be picked up last within workstream A, or done as a follow-up branch.

**Step 2 — Extract one shared implementation**

Write a single parameterized function (by phase count and LL/LN mode) in `common/` implementing `1000·P / (k·V·cosφ·η)`, covering all four current call sites' needs. Also fold `calcInputPower`/`calcApparentPower` (motor) and `calcMotorInputPower`/`calcMotorApparentPower` (motor-derived-outputs) into one shared pair of functions (F6).

**Step 3 — Replace all four call sites** (`voltage-drop/power-to-current.ts`, `motor/formulas.ts`, `motor-derived-outputs/formulas.ts`, `optimizer.ts`) to call the shared implementation instead of reimplementing it.

**Step 4 — Run full suite**

Run: `pnpm --filter @elektroplan/calculation-core test`
Expected: all PASS, no behavior change (this task is a pure consolidation given A1/A2 already fixed the underlying bugs).

**Step 5 — Commit**

```bash
git add packages/calculation-core/src
git commit -m "refactor(calculation-core): consolidate power-to-current formula into common/"
```

---

### Task A4: Standardize cosPhi validation (F4)

**Files:**
- Modify: `packages/calculation-core/src/voltage-drop/index.ts:66,104,198,153,168` (F12 also lives here)
- Modify: `packages/calculation-core/src/motor/validate.ts:44,46`
- Modify: `packages/calculation-core/src/motor-derived-outputs/validate.ts:33,37`
- Reference: `packages/calculation-core/src/common/validation/guards.ts`

**Step 1 — Pick the canonical guard**

Use `assertInRange(cosPhi, 0, 1)` (exclusive at 0) as the single guard everywhere `cosPhi` is validated. Remove the redundant `assertPositive` calls that currently sit alongside `assertInRange` in `motor/validate.ts` and `motor-derived-outputs/validate.ts`.

**Step 2 — Fix the double-validation + masking in `voltage-drop/index.ts` (F12)**

Remove the duplicate `requireACCosPhi` call (keep only one, in `validateVoltageDropInput`). In `calculateVoltageDropBySystem`, remove the `cosPhi ?? 0` masking (lines 153, 168) now that validation guarantees `cosPhi` is defined by the time this code runs — if TypeScript complains `cosPhi` might be undefined, that means validation isn't actually guaranteeing it at the type level; fix the type/flow so it does, rather than re-adding the `?? 0` fallback.

**Step 3 — Run the full suite**

Run: `pnpm --filter @elektroplan/calculation-core test`

**Step 4 — Commit**

```bash
git add packages/calculation-core/src/voltage-drop/index.ts packages/calculation-core/src/motor/validate.ts packages/calculation-core/src/motor-derived-outputs/validate.ts
git commit -m "fix(calculation-core): standardize cosPhi validation, remove double-check and masking"
```

---

### Task A5: Batch low-risk cleanup (F2, F8, F9, F10, F11)

**Files:**
- Modify: `packages/calculation-core/src/voltage-drop-tree/optimizer.ts:78,106` (F2 — name the `56`/`35` and `100`/`200` constants; place alongside `RHO_*`/`ALPHA_*` in `common/constants/index.ts`)
- Modify: `packages/calculation-core/src/voltage-drop/index.ts:9` (F8 — remove unused `assertInRange` import, only if A4 didn't already consume it)
- Modify: `packages/calculation-core/src/cable/algorithm.ts:81-86` (F9 — remove unused `_installationMethod` param from `determineLoadedConductors`, update all call sites)
- Modify: `packages/calculation-core/src/voltage-drop-group/algorithm.ts:168-170` (F10 — simplify the redundant ternary to one branch)
- Note only, no code change required: F11 (`optimizer.ts` complexity) — defer extraction to a separate future session per the findings doc; don't restructure it as part of this batch.

**Step 1 — Apply each change above, one at a time, running typecheck after each:**

Run: `pnpm --filter @elektroplan/calculation-core typecheck` after every individual change in this batch.

**Step 2 — Run full suite**

Run: `pnpm --filter @elektroplan/calculation-core test`

**Step 3 — Commit**

```bash
git add packages/calculation-core/src
git commit -m "chore(calculation-core): name magic constants, drop dead param/import, simplify redundant ternary"
```

---

## Workstream B — calculation-data

**Branch:** `fix/calculation-data`
**Reference:** `docs/plans/2026-07-07-calculation-data-code-quality-findings.md`

### Task B1: Shared metadata-validation helper (F1)

**Files:**
- Modify: `packages/calculation-data/src/dataset/load-json-dataset.ts` (add the shared helper here)
- Modify: `packages/calculation-data/src/iec/ampacity/dataset.ts:20-49`
- Modify: `packages/calculation-data/src/iec/grouping-factors/dataset.ts:10-39`
- Modify: `packages/calculation-data/src/iec/harmonic-factors/dataset.ts:11-54`
- Modify: `packages/calculation-data/src/iec/temperature-factors/dataset.ts:8-22`
- Modify: `packages/calculation-data/src/iec/protection-catalog/dataset.ts:17-114`

**Step 1 — Write the failing test** (new or extend `packages/calculation-data/src/*/dataset.test.ts` if such files exist — check first; if not, add a focused test file, e.g. `packages/calculation-data/src/dataset/load-json-dataset.test.ts`):

```ts
import { describe, expect, it } from "vitest";
import { assertReferenceMetadata } from "./load-json-dataset";

describe("assertReferenceMetadata", () => {
  it("throws when standard/revision/validFrom don't match expected", () => {
    expect(() =>
      assertReferenceMetadata(
        { standard: "wrong", revision: "1", validFrom: "2024-01-01" },
        { standard: "IEC 60364-5-52", revision: "1", validFrom: "2024-01-01" },
        "ampacity",
      ),
    ).toThrow();
  });

  it("passes when metadata matches", () => {
    const meta = { standard: "IEC 60364-5-52", revision: "1", validFrom: "2024-01-01" };
    expect(() => assertReferenceMetadata(meta, meta, "ampacity")).not.toThrow();
  });
});
```

Run it, confirm it fails (`assertReferenceMetadata` doesn't exist yet).

**Step 2 — Implement `assertReferenceMetadata` in `load-json-dataset.ts`**, taking the expected `{ standard, revision, validFrom }` as a parameter (not a constant) so `protection-catalog`'s different standard (`"project-seed-catalog"`) still works.

**Step 3 — Run the new test, confirm it passes.**

**Step 4 — Replace each of the 5 duplicated `assertRequiredMetadata`-style checks** with a call to the shared helper, passing each module's own expected-metadata constants.

**Step 5 — Run full package suite**

Run: `pnpm --filter @elektroplan/calculation-data test`
Run: `node packages/calculation-data/tests/run-iec-datasets.mjs`
Expected: all PASS, identical behavior.

**Step 6 — Commit**

```bash
git add packages/calculation-data/src
git commit -m "refactor(calculation-data): extract shared assertReferenceMetadata helper"
```

---

### Task B2: Consolidate ascending + schema-shape guards (F2, F3)

**Files:**
- Modify: `packages/calculation-data/src/dataset/load-json-dataset.ts` (add `assertAscending`, `assertColumnsMatchSchema` helpers)
- Modify: `packages/calculation-data/src/iec/ampacity/dataset.ts:86-91`
- Modify: `packages/calculation-data/src/iec/grouping-factors/dataset.ts:23-25`
- Modify: `packages/calculation-data/src/iec/temperature-factors/dataset.ts:43-48`
- Modify: `packages/calculation-data/src/iec/cable-ruler/dataset.ts:85-92`
- Modify: `packages/calculation-data/src/iec/motor-ruler/dataset.ts:57-64`
- Modify: `packages/calculation-data/src/iec/protection-catalog/dataset.ts:21-35`

**Step 1 — Write failing tests** for `assertAscending(values, label)` and `assertColumnsMatchSchema(columns, expected, label)` in the same test file as B1.

**Step 2 — Implement both helpers**, then replace each of the 6 duplicated inline checks with calls to them.

**Step 3 — Run full suite**

Run: `pnpm --filter @elektroplan/calculation-data test`

**Step 4 — Commit**

```bash
git add packages/calculation-data/src
git commit -m "refactor(calculation-data): extract shared assertAscending and assertColumnsMatchSchema helpers"
```

---

### Task B3: Standardize not-found convention (F4) — decision required first

**Files:**
- Modify: `packages/calculation-data/src/profiles/voltage-drop-limits/accessors.ts:8-15` (`getDefaultProfile`)
- Modify: `packages/calculation-data/src/iec/harmonic-factors/accessors.ts:36-38,53-55` (`getHarmonicFactor`)
- Reference (do not change convention without checking callers): `iec/ampacity/accessors.ts`, `iec/grouping-factors/accessors.ts`, `iec/temperature-factors/accessors.ts`, `iec/motor-ruler/accessors.ts`, `profiles/voltage-drop-limits/accessors.ts` (`getProfileById`), `iec/protection-catalog` (`lookupProtectionDevice`)

**Step 1 — Before changing anything, grep every call site of `getDefaultProfile` and `getHarmonicFactor`** in `packages/calculation-core` to see whether callers already handle a thrown error, an `undefined`, or neither:

Run: `grep -rn "getDefaultProfile\|getHarmonicFactor" packages/calculation-core/src`

**Step 2 — Pick the majority convention** (per the findings doc, most accessors return `undefined` on miss — recommend standardizing on that) and confirm with the user/decisions.md if any caller relies on the throw behavior for control flow (e.g. a try/catch around `getDefaultProfile`). **If a caller relies on the throw, do not silently change it — flag it and stop this task rather than guessing.**

**Step 3 — If safe to proceed:** change `getDefaultProfile` to return `undefined` on miss instead of throwing (update its callers to handle `undefined`), and make `getHarmonicFactor` consistently return `undefined` on both the negative-input and null-factor cases instead of throwing.

**Step 4 — Run full suite + calculation-core suite** (since it's the consumer)

Run: `pnpm --filter @elektroplan/calculation-data test`
Run: `pnpm --filter @elektroplan/calculation-core test`

**Step 5 — Commit**

```bash
git add packages/calculation-data/src
git commit -m "fix(calculation-data): standardize not-found convention across accessors to undefined"
```

---

### Task B4: Batch low-risk cleanup (F5, F6, F7, F9, F10)

**Files:**
- Modify: `packages/calculation-data/src/iec/cable-ruler/accessors.ts:8-10`, `packages/calculation-data/src/profiles/voltage-drop-limits/accessors.ts:23-25` (F5 — pick one "data version" string format, likely `` `${id}:${revision}` ``, apply everywhere)
- Modify: `packages/calculation-data/src/iec/cable-ruler/dataset.ts:12`, `packages/calculation-data/src/iec/motor-ruler/dataset.ts:12`, `packages/calculation-data/src/profiles/voltage-drop-limits/dataset.ts:13` (F6 — either derive expected count from `metadata.expectedRowCount` in the JSON, or drop the hardcoded guard if B2's ascending/schema checks make it redundant)
- Modify: each `dataset.ts`'s `DATASET_PATH` usage (F7 — derive from `metadata.id` instead of a repeated literal)
- Remove: unused exports `VOLTAGE_DROP_LIMITS_DATASET_STATUS`, `DEFAULT_ASSUMPTIONS_DATASET_STATUS`, `getVoltageDropDataVersion` if F9 confirms zero external consumers (re-check with `grep -rn` across the whole repo, not just calculation-core, before deleting)
- Remove: stray `packages/calculation-data/scripts/build-materials-seed.d.ts` (F10)

**Step 1 — Apply each change, running typecheck after each.**

Run: `pnpm --filter @elektroplan/calculation-data typecheck`

**Step 2 — Run full suite**

Run: `pnpm --filter @elektroplan/calculation-data test`

**Step 3 — Commit**

```bash
git add packages/calculation-data
git commit -m "chore(calculation-data): unify data-version format, remove dead exports and stray file"
```

---

## Workstream C — storage

**Branch:** `fix/storage`
**Reference:** `docs/plans/2026-07-07-storage-code-quality-findings.md`

### Task C1: Remove redundant pre-read on every write (F1)

**Files:**
- Modify: `packages/storage/src/repositories.ts:192-198, 353-359, 445-450, 605-611, 743-749, 822-830`

**Step 1 — Write a test confirming `created_at` is preserved across an update without a pre-read.**

Check `packages/storage/src/index.test.ts` for the existing "upsert preserves created_at on update" test (likely already exists, given F1 was found by reading this exact behavior). If it exists, it's your regression guard — run it first to confirm it currently passes:

Run: `pnpm --filter @elektroplan/storage exec vitest run -t "created_at"`

If no such test exists, add one before touching the implementation:

```ts
it("preserves created_at across an update, without a pre-read", () => {
  const first = repositories.groups.upsert({ id: "g1", title: "A", version: { contractVersion: "1" } });
  const second = repositories.groups.upsert({ id: "g1", title: "B", version: { contractVersion: "1" } });
  expect(second.createdAt).toBe(first.createdAt);
  expect(second.updatedAt).not.toBe(first.updatedAt);
});
```

**Step 2 — Remove the pre-read `getById` calls** at each of the six listed locations, relying solely on the `ON CONFLICT ... DO UPDATE SET created_at = <table>.created_at` SQL clause (confirm this clause exists at each site before removing the JS-side fallback — if any repo is missing it in SQL, add it there instead of removing the JS pre-read for that one).

**Step 3 — Run the test, confirm it still passes** (no behavior change, one fewer query per write).

**Step 4 — Run full suite**

Run: `pnpm --filter @elektroplan/storage test`

**Step 5 — Commit**

```bash
git add packages/storage/src/repositories.ts packages/storage/src/index.test.ts
git commit -m "perf(storage): remove redundant pre-read on write, rely on SQL-level created_at preservation"
```

---

### Task C2: Fix category-delete throw/boolean inconsistency (F10)

**Files:**
- Modify: `packages/storage/src/repositories.ts` (`materialCategories.delete`)
- Reference: `packages/storage/src/migrations.ts:105` (the `ON DELETE RESTRICT` FK)
- Test: `packages/storage/src/material-repos.test.ts`

**Step 1 — Write the failing test**

```ts
it("materialCategories.delete returns false for a referenced category instead of throwing", () => {
  const category = repositories.materialCategories.upsert({ id: "cat-1", name: "Cable", /* ... */ });
  repositories.materials.upsert(buildMaterialFixture({ id: "mat-1", categoryId: "cat-1" }));

  expect(repositories.materialCategories.delete("cat-1")).toBe(false);
});
```

Run it, confirm it currently **fails** (throws instead of returning `false`).

**Step 2 — Catch the FK-constraint error inside `materialCategories.delete`** and return `false` for that specific case (rethrow any other unexpected error), matching every sibling repo's `delete()` contract.

**Step 3 — Run the test, confirm it passes.**

**Step 4 — Run full suite**

Run: `pnpm --filter @elektroplan/storage test`

**Step 5 — Commit**

```bash
git add packages/storage/src/repositories.ts packages/storage/src/material-repos.test.ts
git commit -m "fix(storage): materialCategories.delete returns false instead of throwing on FK conflict"
```

---

### Task C3: Fix all-empty grouping collapse on deserialize (F11)

**Files:**
- Modify: `packages/storage/src/serialization.ts:162-177` (`deserializeRecord`)
- Test: `packages/storage/src/index.test.ts`

**Step 1 — Write the failing test**

```ts
it("round-trips a record with a legitimately all-empty grouping object", () => {
  const written = repositories.records.upsert(
    buildRecordFixture({ id: "rec-empty-grouping", grouping: {} }), // adapt shape to actual GroupingInput type
  );
  const read = repositories.records.getById("rec-empty-grouping");
  expect(read?.grouping).toEqual({});
});
```

Run it, confirm it fails (grouping is dropped entirely instead of round-tripping as `{}`).

**Step 2 — Fix `deserializeRecord`** to distinguish "grouping was never set" (`null`/absent in the DB) from "grouping was set but all fields are empty" — likely means checking a sentinel column/flag rather than "some field is non-null", or storing an explicit marker. Read the surrounding serialize function first to see how it currently writes an empty grouping, and make the read side symmetric with it.

**Step 3 — Run the test, confirm it passes.**

**Step 4 — Run full suite**

Run: `pnpm --filter @elektroplan/storage test`

**Step 5 — Commit**

```bash
git add packages/storage/src/serialization.ts packages/storage/src/index.test.ts
git commit -m "fix(storage): round-trip all-empty grouping instead of collapsing it on read"
```

---

### Task C4: Batch low-risk cleanup (F2, F5, F6, F7, F8, F9)

**Files:**
- Modify: `packages/storage/src/migrations.ts:70-88` (F2 — add a comment explaining migration 2 is a no-op for fresh DBs, or guard with `PRAGMA table_info` instead of string-matching the error)
- Modify: `packages/storage/src/repositories.ts:218,239,261` and Groups/Materials/Assignments equivalents (F5 — extract per-table column-list constants)
- Modify: `packages/storage/src/repositories.ts:759` (F6 — make `MaterialAssignmentsRepository.getById` public, add to its interface, matching siblings)
- Note only, no change: F7 (double Zod validation) — low value to fix in isolation, skip unless doing a larger repository-pattern refactor later.
- Modify: `packages/storage/src/contracts.ts` (F8 — either remove this pass-through file and have consumers import `@elektroplan/contracts` directly, or confirm via grep it's still pulling its weight; check `apps/desktop/main` imports first)
- Modify: `packages/storage/src/migrations.ts:261,268` (F9 — `recordMigration`/`runWrapped` to `function` declarations, per CLAUDE.md convention)

**Step 1 — Apply each change, running typecheck after each.**

Run: `pnpm --filter @elektroplan/storage typecheck`

**Step 2 — Run full suite**

Run: `pnpm --filter @elektroplan/storage test`

**Step 3 — Commit**

```bash
git add packages/storage
git commit -m "chore(storage): document migration 2 no-op, dedupe column lists, expose getById consistently"
```

---

## Workstream D — contracts + exporters

**Branch:** `fix/contracts-exporters`
**Reference:** `docs/plans/2026-07-07-contracts-exporters-code-quality-findings.md`

### Task D1: Verify and fix PDF `/Length` byte-count bug (F6)

**Files:**
- Modify: `packages/exporters/src/pdf.ts:190`
- Test: extend `packages/exporters/smoke.mjs` or add a focused test

**Step 1 — Reproduce first.** Generate a PDF export with a record containing Turkish characters (ğ, ş, ı, ö, ü, ç) in a title or value field. Open the resulting PDF in a viewer, or programmatically check whether `/Length` matches the actual byte length of the stream content.

```js
// scratch check — adapt to actual exportPresentationToPdf signature
const pdfBytes = exportPresentationToPdf(/* doc with Turkish text */);
// parse out the /Length value and compare to the actual stream byte length
```

**Step 2 — If confirmed broken:** in `pdf.ts:190`, change `/Length ${content.length}` to compute the byte length via the same `encodeUtf8` (or `TextEncoder`, if F10 already landed) used to emit the file, not the JS string's UTF-16 code-unit count.

**Step 3 — Re-run the reproduction from Step 1, confirm the PDF is now well-formed** (viewer opens it without error, and/or `/Length` matches actual byte count).

**Step 4 — Run exporters smoke test**

Run: `node packages/exporters/smoke.mjs`

**Step 5 — Commit**

```bash
git add packages/exporters/src/pdf.ts
git commit -m "fix(exporters): correct PDF /Length to use byte count instead of UTF-16 code-unit count"
```

---

### Task D2: Fix manualCurrentResponseSchema drift (F1) — decision required first

**Files:**
- Modify: `packages/contracts/src/schemas.ts:597,602-606`

**Step 1 — Check existing stored records.** Since this schema governs data already persisted via `packages/storage`, changing it to the full `createCalculationResultSchema` envelope is a **breaking change** to the stored shape. Check whether any manual-current records already exist in a real user database (ask the user, or check `apps/desktop/main/src/services/records-service.ts` for how manual-current records are created) before deciding scope.

**Step 2 — Pick the smaller, non-breaking fix** (recommended, per the findings doc): tighten `currentA` in `manualCurrentResponseSchema` to match the request schema's `z.number().finite().nonnegative()`, without adopting the full envelope. Only widen to the full envelope if the user explicitly wants manual-current records to carry warnings/assumptions/versions like other calculators.

**Step 3 — Write a test confirming the response schema now rejects what the request schema rejects**

```ts
it("manualCurrentResponseSchema rejects NaN/Infinity/negative currentA, matching the request schema", () => {
  expect(() => manualCurrentResponseSchema.parse({ value: { currentA: Number.NaN } })).toThrow();
  expect(() => manualCurrentResponseSchema.parse({ value: { currentA: -1 } })).toThrow();
});
```

**Step 4 — Run the test, confirm it passes.**

**Step 5 — Run full suite**

Run: `pnpm --filter @elektroplan/contracts test`

**Step 6 — Commit**

```bash
git add packages/contracts/src/schemas.ts
git commit -m "fix(contracts): tighten manualCurrentResponseSchema currentA to match request schema"
```

---

### Task D3: Share PDF/Excel flattening logic (F7)

**Files:**
- Modify: `packages/exporters/src/pdf.ts`
- Modify: `packages/exporters/src/shared.ts:92-281` (`flattenValue`, `buildRecordSectionRows`)

**Step 1 — Do this task after D1 lands** (both touch `pdf.ts`).

**Step 2 — Compare output on a few real records.** Before refactoring, export the same set of records to both Excel and PDF (current code) and note any fields/rows that already differ — this is your regression baseline; the fix should make PDF match Excel's field set, not silently change Excel's.

**Step 3 — Change `pdf.ts` to consume `CalculationsExport` directly** (like `excel.ts`/`json.ts` do) and call `buildRecordSectionRows` from `shared.ts` instead of a separately pre-flattened `PdfPresentationDocument`. This is the largest single change in this workstream — expect to touch how the PDF presentation layer in `apps/desktop` (if it builds `PdfPresentationDocument`) hands data to the exporter; check `apps/desktop/main/src/services/export-service.ts` for that boundary first.

**Step 4 — Re-run the comparison from Step 2**, confirm PDF output now matches Excel's field/row set for the same records.

**Step 5 — Run exporters smoke test + contracts/calculation-core tests if types moved**

Run: `node packages/exporters/smoke.mjs`

**Step 6 — Commit**

```bash
git add packages/exporters/src
git commit -m "refactor(exporters): share record-flattening logic between PDF and Excel"
```

---

### Task D4: Batch low-risk cleanup (contracts F2–F5, exporters F8–F10)

**Files:**
- Modify: `packages/contracts/src/schemas.ts:135-147,204-235` (F2 — align `sectionMm2`/`lengthM`/power field strictness between `voltageDropInputBaseSchema` and the group segment schema; recommend tightening the looser one to `.positive()` rather than loosening the stricter one — check with calculation-core call sites first for any that rely on 0 being valid)
- Modify: `packages/contracts/src/schemas.ts:237-256,266-285,306-322` (F3 — extract one shared base object for the ~13 repeated settings fields)
- Modify: `packages/contracts/src/schemas.ts:50,362` (F4 — collapse `motorPhaseSchema`/`cablePhaseSchema` into one)
- Modify: `packages/contracts/src/schemas.ts:7` (F5 — drop the `conductorMaterialSchema = ampacityMaterialSchema` alias, pick one name, update usages)
- Modify: `packages/exporters/src/excel.ts:19,138` (F8 — remove unused "body" style, or apply it if it was meant to be used — check with the user/design intent first since this could be a missing-feature bug rather than dead code)
- Modify: `packages/exporters/src/excel.ts:22-32` (F9 — fix `inferCellType`'s boolean branch to emit `1`/`0` per SpreadsheetML spec, even though currently unreachable — cheap correctness insurance)
- Modify: `packages/exporters/src/shared.ts:18-57` (F10 — replace hand-rolled `encodeUtf8` with `new TextEncoder().encode()`; do this **before** D1 if picked up first, since D1 depends on correct byte-length computation)

**Step 1 — Apply each change, running typecheck after each.**

Run: `pnpm --filter @elektroplan/contracts typecheck`
Run: `pnpm --filter @elektroplan/exporters typecheck`

**Step 2 — Run full suites**

Run: `pnpm --filter @elektroplan/contracts test`
Run: `node packages/exporters/smoke.mjs`

**Step 3 — Commit**

```bash
git add packages/contracts/src packages/exporters/src
git commit -m "chore(contracts,exporters): dedupe schema fields, fix boolean cell type, replace hand-rolled UTF-8 encoder"
```

---

## Workstream E — desktop main + preload

**Branch:** `fix/desktop-main-preload`
**Reference:** `docs/plans/2026-07-07-desktop-main-preload-code-quality-findings.md`

### Task E1: Fix percent-encoding path bug (F2)

**Files:**
- Modify: `apps/desktop/main/src/index.ts:15-23` (`resolveBundledEntry`)

**Step 1 — Reproduce.** Confirm the bug by constructing a `file://` URL with an encoded space (`%20`) and checking that the current `.pathname`-based approach leaves it encoded.

```ts
// scratch check
const url = new URL("file:///C:/Users/John%20Doe/app/index.html");
console.log(url.pathname); // shows %20, not a space — this is the bug
```

**Step 2 — Replace with `fileURLToPath`**

```ts
import { fileURLToPath } from "node:url";
// ...
const resolvedPath = fileURLToPath(url);
```

**Step 3 — Re-run the reproduction, confirm the path now has a literal space.**

**Step 4 — Verify**

Run: `cd apps/desktop/main && npx tsc --noEmit`

**Step 5 — Commit**

```bash
git add apps/desktop/main/src/index.ts
git commit -m "fix(desktop-main): decode percent-encoded paths via fileURLToPath"
```

---

### Task E2: Fix macOS closed-DB-after-reactivate bug (F1)

**Files:**
- Modify: `apps/desktop/main/src/index.ts:105-132`

**Step 1 — Confirm the repro path by reading, don't guess.** Trace `window-all-closed` → `closeServices()` → `activate` → new `BrowserWindow` in `index.ts:105-132`, and confirm the IPC handlers registered in `register.ts:224` do indeed close over the original `services` reference (not a getter/proxy that would already pick up a fresh instance).

**Step 2 — Pick the fix direction.** Recommended: only call `closeServices()` on `before-quit` (matching actual app lifetime), not on `window-all-closed`. This is the smaller, safer change — it avoids introducing re-initialization logic in `activate`.

**Step 3 — Apply the fix**: move (or remove) the `closeServices()` call from the `window-all-closed` handler; add it to (or confirm it already exists on) `before-quit`.

**Step 4 — Verify manually** (this is platform-specific and has no automated test): on macOS, close all windows, confirm the app stays running (dock icon persists) and the database is untouched; click the dock icon to reactivate, confirm a new window opens and IPC calls (e.g. loading records) still work. Document this manual check in the PR description since it can't run in this environment.

**Step 5 — Verify build**

Run: `cd apps/desktop/main && npx tsc --noEmit`

**Step 6 — Commit**

```bash
git add apps/desktop/main/src/index.ts
git commit -m "fix(desktop-main): stop closing storage on window-all-closed, only on before-quit"
```

---

### Task E3: Standardize IPC/service validation boundary (F3) — decision required first

**Files:**
- Modify: `apps/desktop/main/src/ipc/register.ts` (multiple handlers: lines ~101-229)
- Reference: `apps/desktop/main/src/services/records-service.ts`, `settings-service.ts`, `calculate-service.ts`, `materials-service.ts`

**Step 1 — Confirm every service actually zod-validates its own inputs** before removing the `register.ts`-level `assert*` guards — grep each service file for zod `.parse`/`.safeParse` calls to be sure none of them silently trust their caller.

Run: `grep -rn "\.parse(\|\.safeParse(" apps/desktop/main/src/services`

**Step 2 — If confirmed, remove the redundant `register.ts`-level checks** (`assertIdPayload`, `assertKeyPayload`, `assertDuplicateGroupPayload`, `assertGroupTotalCurrentPayload`, `assertMaterialsImportPayload` where they duplicate a service-level check) and make `register.ts` a thin dispatcher, matching the calc/materials handlers that already just pass payload straight through.

**Step 3 — Verify each affected handler still rejects bad input** — write or extend `apps/desktop/main/src/services/*.test.ts` for the paths that lose their `register.ts`-level guard, confirming the service-level zod schema still catches the same bad-input cases the removed guard used to catch.

**Step 4 — Run service tests**

Run: `pnpm --filter @elektroplan/desktop-main test`

**Step 5 — Verify build**

Run: `cd apps/desktop/main && npx tsc --noEmit`

**Step 6 — Commit**

```bash
git add apps/desktop/main/src/ipc/register.ts apps/desktop/main/src/services
git commit -m "refactor(desktop-main): remove redundant IPC-layer validation, rely on service-level zod schemas"
```

---

### Task E4: De-duplicate channel map + envelope type (F4)

**Files:**
- Create: `apps/desktop/main/src/ipc/channels.ts` stays the source of truth (or create a new shared location if the build graph requires — check whether `preload` can import from `main` at build time first)
- Modify: `apps/desktop/preload/src/index.ts:17,25`

**Step 1 — Do this after E3 lands** (both touch `register.ts`/`channels.ts` area).

**Step 2 — Check whether preload can import main's `channels.ts` directly** given the Electron build setup (main and preload are typically bundled separately — verify via `apps/desktop/main/package.json` / `apps/desktop/preload/package.json` / the bundler config in `apps/desktop/scripts/bundle.mjs` whether a shared import is feasible, or whether the constant needs to move to a package both can depend on, e.g. `packages/contracts`).

**Step 3 — Move `IPC_CHANNELS`/`IpcEnvelope` to whichever location Step 2 determines is buildable by both**, and have both `main` and `preload` import from that single source instead of maintaining two hand-copied definitions.

**Step 4 — Verify both builds**

Run: `cd apps/desktop/main && npx tsc --noEmit`
Run: `cd apps/desktop/preload && npx tsc --noEmit`

**Step 5 — Commit**

```bash
git add apps/desktop/main/src/ipc/channels.ts apps/desktop/preload/src/index.ts
git commit -m "refactor(desktop): share IPC channel map and envelope type between main and preload"
```

---

### Task E5: Add Content-Security-Policy (F5)

**Files:**
- Modify: `apps/desktop/main/src/index.ts` (near the existing `hardenWindow` function from the 2026-06-26 plan)

**Step 1 — Add a CSP header via `session.defaultSession.webRequest.onHeadersReceived`**, restricting to `default-src 'self'` plus whatever the renderer actually needs (check current dev-server usage — dev mode likely needs to allow the Vite dev server origin; production `file://` loads should be strict).

```ts
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      "Content-Security-Policy": [
        isDevelopment
          ? `default-src 'self' ${devServerUrl}; script-src 'self' 'unsafe-inline' ${devServerUrl}`
          : `default-src 'self'; script-src 'self'`,
      ],
    },
  });
});
```

**Step 2 — Verify manually**: run the app in dev mode, confirm no CSP console errors block normal operation; run a packaged build, confirm the same.

**Step 3 — Verify build**

Run: `cd apps/desktop/main && npx tsc --noEmit`

**Step 4 — Commit**

```bash
git add apps/desktop/main/src/index.ts
git commit -m "feat(desktop-main): add Content-Security-Policy header"
```

---

### Task E6: Batch low-risk cleanup (F6, F7, F8, F9)

**Files:**
- Modify: `apps/desktop/main/src/ipc/register.ts:229,473,476` (F6 — fix `excelImportHandles` leak: either add a real TTL/expiry with cleanup, or clear stale handles on a reasonable trigger; update the "expired, or invalid" message to match actual behavior)
- Modify: `apps/desktop/main/src/ipc/register.ts:397` (F7 — remove `value as never` cast, fix `setSetting`'s type so `JsonValue` is satisfied without a cast)
- Modify: `apps/desktop/main/src/ipc/register.ts:101` (F8 — make `assertOptionalGroupId`'s error message generic, not hardcoded to `"records:list"`)
- Modify: `apps/desktop/main/src/index.ts:36`, `apps/desktop/main/src/services/index.ts:57` (F9 — remove unused `AppServices.storage` exposure if truly unconsumed; re-check with grep first)

**Step 1 — Apply each change, running typecheck after each.**

Run: `cd apps/desktop/main && npx tsc --noEmit`

**Step 2 — Run service tests**

Run: `pnpm --filter @elektroplan/desktop-main test`

**Step 3 — Commit**

```bash
git add apps/desktop/main/src
git commit -m "chore(desktop-main): fix handle leak, remove unsafe cast, generalize error message, drop unused surface"
```

---

## Workstream F — desktop renderer

**Branch:** `fix/desktop-renderer`
**Reference:** `docs/plans/2026-07-07-desktop-renderer-code-quality-findings.md`

**Note:** this workstream has **no automated test harness** for the renderer (confirmed in both this doc and the earlier `2026-06-26` plan). Every task's verification is `tsc --noEmit` plus manually exercising the affected page(s) in the running app. Budget real time for manual testing — do not skip it because "typecheck passed."

### Task F1: Converge calculator pages on the direct state-persistence pattern

**Files:**
- Modify: `apps/desktop/renderer/src/features/cable/CableDetailedMode.tsx:296-373`
- Modify: `apps/desktop/renderer/src/features/cable/CableRulerMode.tsx:64-76`
- Modify: `apps/desktop/renderer/src/features/voltageDrop/VoltageDropPage.tsx:91-130`
- Reference (the pattern to converge on): `apps/desktop/renderer/src/features/motor/FormulaMode.tsx:61`, `apps/desktop/renderer/src/features/motor/TableMode.tsx:41`

**Step 1 — Do one page at a time, in this order (increasing risk): `CableRulerMode` → `CableDetailedMode` → `VoltageDropPage`.**

**Step 2 — For `CableRulerMode.tsx`:** remove the mirrored `useState` hooks (lines 64-76) and the sync `useEffect`; replace with direct `pageState`/`setPageState` reads and writes, matching `FormulaMode.tsx:61`'s pattern exactly.

**Step 3 — Manual verify `CableRulerMode`**: run the app, open the Cable Ruler page, enter values, navigate away and back, confirm state persists exactly as before. Check the browser/Electron devtools console for new warnings.

**Step 4 — Verify build**

Run: `cd apps/desktop/renderer && npx tsc --noEmit`

**Step 5 — Commit** (one commit per page, so a regression in one page doesn't block the others)

```bash
git add apps/desktop/renderer/src/features/cable/CableRulerMode.tsx
git commit -m "refactor(desktop-renderer): converge CableRulerMode on direct pageState pattern"
```

**Step 6 — Repeat Steps 2-5 for `CableDetailedMode.tsx`** (larger — ~18 mirrored states), then for `VoltageDropPage.tsx` (also touches F4's in-flight-ref logic; leave that part alone for now, F4 handles it separately).

---

### Task F2: Extract shared ResultRow component (F2)

**Files:**
- Create: `apps/desktop/renderer/src/ui/ResultRow.tsx`
- Create: `apps/desktop/renderer/src/ui/ResultRow.module.css` (consolidating `.resultRow`/`.resultLabel`/`.resultValue`/`.highlight`/`.resultGrid` from the four feature CSS modules)
- Modify: `apps/desktop/renderer/src/features/cable/CableDetailedMode.tsx:699` (remove local `RRow`)
- Modify: `apps/desktop/renderer/src/features/cable/CableRulerMode.tsx:207` (remove local `ResultRow`)
- Modify: `apps/desktop/renderer/src/features/motor/FormulaMode.tsx:279` (remove local `ResultRow`)
- Modify: `apps/desktop/renderer/src/features/motor/TableMode.tsx:230` (remove local `TRow`)
- Modify: the four corresponding `.module.css` files (remove the now-duplicated classes, keep only page-specific overrides if any)

**Step 1 — Do this after F1 lands** for the cable/voltageDrop pages it touches, to avoid stacking two structural changes on the same lines.

**Step 2 — Write `ResultRow.tsx`** using whichever of the four existing implementations is most complete (compare all four first — the findings doc says they're "byte-for-byte identical," but confirm before assuming zero drift).

**Step 3 — Replace each local component with an import of the shared one**, one file at a time, verifying visually after each (open the page, compare rendering to a screenshot/memory of before).

**Step 4 — Verify build**

Run: `cd apps/desktop/renderer && npx tsc --noEmit`

**Step 5 — Commit**

```bash
git add apps/desktop/renderer/src/ui/ResultRow.tsx apps/desktop/renderer/src/ui/ResultRow.module.css apps/desktop/renderer/src/features
git commit -m "refactor(desktop-renderer): extract shared ResultRow component, remove 4 duplicates"
```

---

### Task F3: Consolidate query keys into query/keys.ts (F3)

**Files:**
- Modify: `apps/desktop/renderer/src/query/keys.ts` (add the missing key factories)
- Modify: `apps/desktop/renderer/src/features/materials/useMaterialsData.ts:4` (`MATERIAL_QUERIES`)
- Modify: `apps/desktop/renderer/src/features/materials/materialMutations.ts:10,42,47,61`
- Modify: `apps/desktop/renderer/src/features/projects/projectMutations.ts:89,99,109`
- Modify: `apps/desktop/renderer/src/features/projects/useRecordAssignments.ts:7`
- Modify: `apps/desktop/renderer/src/features/projects/ProjectQuickPanel.tsx:466,499`
- Modify: `apps/desktop/renderer/src/features/projects/AssignMaterialPopover.tsx:120`
- Modify: `apps/desktop/renderer/src/features/materials/BulkEditDialog.tsx:131`

**Step 1 — Inventory every literal query key first**

Run: `grep -rn '\["assignments"\]\|\["materials"\]\|\["group-cable-suggest"\]' apps/desktop/renderer/src`

**Step 2 — Add matching key factories to `query/keys.ts`**, following whatever convention already exists there for cable/motor/projects keys.

**Step 3 — Replace each literal/ad-hoc key** across the 8 files above with the shared factory, one file at a time.

**Step 4 — Manual verify after each file**: exercise the corresponding UI flow (create/edit/delete a material, assign/unassign a material to a record) and confirm the UI updates immediately without a manual refresh — this is exactly the kind of bug a key-name typo would cause, so this is the real regression test here, not just typecheck.

**Step 5 — Verify build**

Run: `cd apps/desktop/renderer && npx tsc --noEmit`

**Step 6 — Commit**

```bash
git add apps/desktop/renderer/src/query/keys.ts apps/desktop/renderer/src/features
git commit -m "refactor(desktop-renderer): consolidate scattered query keys into query/keys.ts"
```

---

### Task F4: Standardize race-guarding on submit (F4)

**Files:**
- Modify: `apps/desktop/renderer/src/features/cable/CableDetailedMode.tsx` (`handleSubmit`, ~line 449)
- Modify: `apps/desktop/renderer/src/features/cable/CableRulerMode.tsx` (~line 88)
- Modify: `apps/desktop/renderer/src/features/motor/TableMode.tsx` (`handleCalc`, ~line 64)
- Reference: `apps/desktop/renderer/src/features/motor/FormulaMode.tsx:66,111-133` (the `requestSeq` ref pattern to copy)

**Step 1 — Copy the `requestSeq` ref pattern from `FormulaMode.tsx`** into each of the three unguarded handlers: increment a ref on each submit, capture the value at call time, and ignore the response if the ref has moved on by the time it resolves.

**Step 2 — Manual verify**: on each page, trigger two submits in quick succession (e.g. change an input and hit calculate twice fast) and confirm only the latest result is ever shown, never a stale one landing after a newer one.

**Step 3 — Verify build**

Run: `cd apps/desktop/renderer && npx tsc --noEmit`

**Step 4 — Commit**

```bash
git add apps/desktop/renderer/src/features/cable apps/desktop/renderer/src/features/motor/TableMode.tsx
git commit -m "fix(desktop-renderer): guard against stale async submit responses across all calculator pages"
```

---

### Task F5: Batch low-risk cleanup (F5, F6, F7, F8)

**Files:**
- Modify: `apps/desktop/renderer/src/features/materials/useMaterialsData.ts:11,18` (F5 — add `isBridgeAvailable()` to `enabled`, matching cable/motor/projects queries)
- Modify: `apps/desktop/renderer/src/features/projects/useRecordAssignments.ts` (F5 — same)
- Modify: `apps/desktop/renderer/src/features/shared/usePersistentPageState.ts:80` (F6 — remove the unused `reset` return value, or wire it up if there's a clear use case — check with the user first since removing a public hook return is a minor API change other future code might have wanted)
- Modify: `apps/desktop/renderer/src/features/materials/materialMutations.ts:4,61` (F7 — remove the redundant re-export of `MATERIAL_QUERIES`, update its consumers to import from `useMaterialsData` directly)
- Note only, no change: F8 (large files `VoltageDropPage.tsx`, `ProjectsPage.tsx`) — defer to a dedicated extraction task in a future session; don't bundle a large structural extraction into this cleanup batch.

**Step 1 — Apply each change, running typecheck after each.**

Run: `cd apps/desktop/renderer && npx tsc --noEmit`

**Step 2 — Manual verify**: exercise the materials page and projects/assignments flow once more after the `isBridgeAvailable()` gating change, confirming no new query-firing errors in devtools console when the bridge is unavailable (if testable in your environment) or simply that normal operation is unaffected.

**Step 3 — Commit**

```bash
git add apps/desktop/renderer/src/features
git commit -m "chore(desktop-renderer): gate materials/assignments queries on bridge availability, drop dead reset and re-export"
```

---

## Done criteria (per workstream)

- **A (calculation-core):** `pnpm --filter @elektroplan/calculation-core typecheck && test` pass; worked-examples fixtures for motor LN/LL and voltage-drop re-verified by hand, not just "tests green."
- **B (calculation-data):** `pnpm --filter @elektroplan/calculation-data typecheck && test` pass; `node packages/calculation-data/tests/run-iec-datasets.mjs` passes.
- **C (storage):** `pnpm --filter @elektroplan/storage typecheck && test` pass.
- **D (contracts+exporters):** `pnpm --filter @elektroplan/contracts typecheck && test` pass; `node packages/exporters/smoke.mjs` passes; a real Turkish-character PDF export opens cleanly in a viewer.
- **E (desktop-main-preload):** `main` and `preload` both typecheck clean; `pnpm --filter @elektroplan/desktop-main test` passes; macOS reactivate behavior manually verified (or explicitly flagged as untested if no macOS machine available).
- **F (desktop-renderer):** renderer typechecks clean; every affected page manually exercised (cable, motor, voltage drop, materials, projects) with no visible behavior regression and no new console errors.

## Integration note

Each workstream branch opens its own PR to `master` independently — since the file-overlap table above confirms zero shared files, PRs can be reviewed and merged in any order without rebasing against each other. After all six land, run the full monorepo suite once (`pnpm typecheck && pnpm test && pnpm lint`) as a final integration check.
