# ElektroPlan-V2 — instructions for coding agents

## Release builds: better-sqlite3 native ABI (read before every `apps/desktop` build)

`better-sqlite3`'s native binary is shared (pnpm hardlinked store) between `packages/storage`'s local test run (needs system-Node ABI) and the packaged Electron app (needs Electron's ABI). Rebuilding for one silently breaks the other, and `electron-builder`'s `npmRebuild: true` does **not** reliably fix this in this environment (it logs success without actually rebuilding). Full root cause and the exact fix procedure: [docs/native-module-abi-builds.md](docs/native-module-abi-builds.md).

**Before packaging a release build, always:**
1. `rm -rf apps/desktop/bundle` (clear stale copy)
2. `npm run build:bundle-inputs && node scripts/bundle.mjs` (from `apps/desktop`)
3. Manually run `better-sqlite3`'s own `prebuild-install` targeting the current Electron version inside `bundle/node_modules/better-sqlite3` (exact command in the doc above)
4. Package with `npx electron-builder --win --config.npmRebuild=false` — do NOT let electron-builder run its own native rebuild step
5. **Verify by launching the actual exe** (`win-unpacked/ElektroPlan.exe` and the portable exe) with a short timeout and check stderr for `ERR_DLOPEN_FAILED` — do not trust the build log alone as evidence it worked

Skipping step 5 is how a broken build has shipped before. Do not report a build as done without it.
