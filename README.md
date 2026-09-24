# ElektroPlan

Desktop app for electrical engineering calculations, built on **IEC 60364-5-52**.

ElektroPlan helps electrical engineers size cables, check motor currents, evaluate voltage drop across full distribution topologies, and coordinate protection devices — all offline, all traceable back to the standard clauses and datasets behind each number.

**Download:** [latest release](https://github.com/Ali-3427/ElektroPlan/releases/latest) — portable exe or Windows installer.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project layout](#project-layout)
- [Development](#development)
- [Testing](#testing)
- [Building a release](#building-a-release)
- [Standards & scope](#standards--scope)
- [License](#license)

## Features

### Cable sizing

Two ways to size a cable, sharing one engine:

- **Cetvel (Ruler) mode** — quick lookup against a pre-computed ampacity table, no per-circuit derating.
- **Hesap / Detaylı (Standard / Detailed) mode** — full sizing against ampacity, temperature/grouping/harmonic correction factors (`kT`/`kG`/`kH`), and voltage-drop limits, walking the standard cross-section ladder until a candidate passes every applicable criterion. Detailed mode adds earthing system, breaker curve, PE conductor placement, conductor arrangement, short-circuit withstand, and earth-loop impedance (estimated / calculated / measured) — each with its own pass/fail criterion.
- Every calculation returns a **candidate trace**: which cross-sections were tried, which criterion eliminated each one, and why the winning section was accepted — surfaced in the UI so the answer is never a black box.
- Installation methods A1, A2, B1, B2, C, D1, D2; copper or aluminum; PVC or XLPE/EPR insulation.

### Motor calculations

Input/apparent power and full-load current for 1-phase and 3-phase motors, in two modes:

- **Formula mode** — direct calculation from power, voltage, power factor, and efficiency.
- **Table mode** — lookup against a standard motor ampacity table (`getMotorTableEntries`), with per-voltage availability checks.

Handles line-line and line-neutral voltage conventions for 3-phase circuits.

### Voltage drop

- Single-segment and grouped-segment calculations.
- Full **segment-tree topology** support for multi-branch distribution runs, with an optimizer that finds where drop is being lost across the tree.
- Line-line and line-neutral system types, with configurable cosφ and length.

### Protection coordination

Breaker/fuse catalog lookup cross-checked against the selected cable's ampacity and short-circuit withstand, so device and conductor sizing stay consistent within one flow.

### Materials catalog

- Categorized material database with a collapsible category tree.
- Bulk edit and Excel import/export, so an existing bill-of-materials can be brought in rather than re-typed.

### Project records

- Save calculation results into a project, assign materials to line items, and revisit any past calculation later — every saved record keeps the assumptions and correction factors that produced it, not just the final number.
- Export to Excel, PDF, or JSON via the shared `exporters` package.

### Everything else

- **Offline-first** — SQLite-backed local storage (`better-sqlite3`), no network dependency for calculations.
- **Light / Dark / Cream** themes, consistent across every page.
- **Turkish UI**, IEC-sourced datasets versioned independently from the calculation engine (`dataVersion` vs. `engineVersion`), so a dataset update never silently changes a past saved result's meaning.

## Tech stack

| Layer | Stack |
|---|---|
| Desktop shell | Electron (main / preload / renderer processes) |
| UI | React 18 + TypeScript, CSS Modules, `@tanstack/react-query` |
| IPC contracts | `zod` schemas as the single source of truth, shared by main and preload |
| Storage | SQLite via `better-sqlite3` |
| Export | Excel / PDF / JSON via `packages/exporters` |
| Monorepo | pnpm workspaces + Turborepo, TypeScript project references |
| Testing | `node:test` (contracts/main), `vitest` + Testing Library (renderer), Playwright (e2e), property-based tests, worked-examples fixtures |

## Project layout

```
apps/
  desktop/
    main/       # Electron main process — IPC handlers, services (calculate, materials, records, export, settings)
    preload/    # contextBridge API surface — the only bridge renderer has to main
    renderer/   # React UI (feature-based: cable, motor, voltageDrop, materials, projects, settings)
packages/
  calculation-core/   # calculation engine (cable, cable-sizing, motor, voltage-drop, voltage-drop-group/tree, protection)
  calculation-data/   # IEC reference datasets (ampacity, grouping/temperature/harmonic factors, motor tables, protection catalog)
  storage/            # SQLite-backed repositories (better-sqlite3)
  contracts/          # shared IPC types/schemas (zod) — main and preload both import from here, never from each other
  exporters/          # Excel/PDF/JSON export
tests/
  e2e/                # Playwright
  property/           # property-based tests
  worked-examples/    # fixture-driven calculation verification against known-correct results
```

The renderer never touches the filesystem, SQLite, or any Electron API directly — every operation goes renderer → preload → IPC → main, validated against a `zod` schema at the boundary.

## Development

```bash
pnpm install
pnpm --filter @elektroplan/desktop-renderer dev   # renderer only (Vite, no Electron)
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

Scope any command to one package with `--filter`, e.g.:

```bash
pnpm --filter @elektroplan/desktop-renderer test
pnpm --filter @elektroplan/calculation-core test
```

## Testing

Different layers use the tool that fits them, not one framework everywhere:

- **`packages/contracts`, `apps/desktop/main`** — `node:test`, run against compiled output.
- **`apps/desktop/renderer`** — `vitest` + `@testing-library/react` + `jsdom`.
- **`tests/e2e`** — Playwright, drives the packaged app end-to-end.
- **`tests/property`** — property-based tests against the calculation engine.
- **`tests/worked-examples`** — fixture-driven verification against hand-worked IEC examples, so a refactor can't silently change a correct answer.

## Building a release

```bash
cd apps/desktop
npm run build:bundle-inputs
node scripts/bundle.mjs
npx electron-builder --win
```

`better-sqlite3` is a native module tied to a specific Node ABI. System Node and the bundled Electron version use *different* ABIs, and pnpm's shared store means rebuilding for one silently breaks the other for local testing. See [`docs/native-module-abi-builds.md`](docs/native-module-abi-builds.md) for the exact rebuild sequence and the mandatory post-build verification step (launch the actual `.exe` — never trust the build log alone).

## Standards & scope

Calculations follow **IEC 60364** (v1 scope). Every dataset carries its own `DatasetMetadata` (standard, revision, source, `validFrom`) and datasets version independently from the calculation engine — core modules never hardcode ruleset tables, they read through typed accessors (`getAmpacity`, `getTempFactor`, `getGroupingFactor`, `lookupProtectionDevice`, etc.) so the standard-vs-implementation boundary stays auditable.

## License

Apache License 2.0 — see [LICENSE](LICENSE).
