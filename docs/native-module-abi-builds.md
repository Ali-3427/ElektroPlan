# better-sqlite3 native ABI: recurring build failure and fix

## Symptom

Two different failures, both `ERR_DLOPEN_FAILED` / "was compiled against a different Node.js version using NODE_MODULE_VERSION X. This version requires Y":

1. **`pnpm --filter @elektroplan/storage test` fails** — happens when the shared native binary currently on disk is built for **Electron's** ABI, but the test runs under **system Node**.
2. **The packaged Electron app (`apps/desktop/release/*.exe`) silently fails to launch** — no window, no error dialog, process exits almost immediately with exit code 0, or (with `--enable-logging`) prints `ERR_DLOPEN_FAILED` to stderr. Happens when the shared native binary is built for **system Node's** ABI instead of **Electron's**.

## Root cause

`better-sqlite3` ships a compiled native addon (`better_sqlite3.node`) tied to one specific ABI (`NODE_MODULE_VERSION`). System Node.js and the Electron version this app bundles (`electron@35.7.5`, ABI 133 as of writing) have **different** ABIs even though both are "Node.js".

pnpm's store is content-addressable and hardlinks a single physical copy of `better-sqlite3`'s build output across every place that resolves `better-sqlite3@<version>` — the root workspace, `packages/storage`, and whatever gets copied into `apps/desktop/bundle/node_modules` for packaging. **Rebuilding the native binary for one target silently overwrites it for every other consumer sharing that store entry.**

So the two failure modes above are two sides of the same coin:
- Fix (1) by rebuilding for system Node (e.g. `pnpm rebuild better-sqlite3`, or running `npm run install` inside the package) → this breaks (2) the next time you package a release build.
- electron-builder's `npmRebuild: true` (via `@electron/rebuild`) is *supposed* to fix this automatically during packaging by rebuilding for Electron's ABI right before packaging — **but in this environment it does not reliably work.** It logs `preparing... finished` for `better-sqlite3` and exits 0, but does **not** actually replace a wrong-ABI binary. Most likely cause: no Visual Studio Build Tools installed locally, so `node-gyp rebuild` (the fallback when no prebuilt binary is fetched) fails silently somewhere in `@electron/rebuild`'s pipeline without surfacing an error or aborting the build.

**Do not trust the `electron-builder`/`@electron/rebuild` build log as evidence the native module is correct.** It will report success either way. The only reliable check is launching the actual packaged `.exe` and watching for the dlopen error.

## The fix that works

Run this sequence when producing a release build, in order:

```bash
# 1. Clear any stale intermediate copy
rm -rf apps/desktop/bundle

# 2. Rebuild all workspace packages + produce a fresh bundle/
cd apps/desktop
npm run build:bundle-inputs
node scripts/bundle.mjs

# 3. Manually force a correct Electron-targeted rebuild of the COPY inside bundle/
#    (do not rely on step 4's --config.npmRebuild — do this instead of it)
cd bundle/node_modules/better-sqlite3
npm_config_target=35.7.5 npm_config_arch=x64 \
  npm_config_disturl=https://electronjs.org/headers npm_config_runtime=electron \
  node ../prebuild-install/bin.js --target=35.7.5 --arch=x64 --runtime=electron
cd ../../..

# 4. Package WITHOUT letting electron-builder's own rebuild step run
#    (it's the thing that silently breaks this — disable it explicitly)
npx electron-builder --win --config.npmRebuild=false
```

(Replace `35.7.5` with the current `electron` devDependency version in `apps/desktop/package.json` if it changes.)

## Mandatory verification — do not skip

After packaging, actually launch the exe and confirm it stays running, before telling the user the build is ready:

```bash
cd apps/desktop/release/win-unpacked
timeout 15 "./ElektroPlan.exe" --enable-logging > /tmp/out.log 2>/tmp/err.log
echo "exit: $?"   # 124 (timeout killed it = still running = GOOD). 0 immediately = BROKEN.
cat /tmp/err.log  # must NOT contain ERR_DLOPEN_FAILED
```

Also spot-check the portable exe in `apps/desktop/release/` the same way — it's built from the same `bundle/`, but verify it too since it's what gets handed to the user.

## After packaging: restoring local test capability

Once you've verified the release build, `packages/storage`'s local `pnpm test` will now fail again (the root pnpm store's binary may be Electron-ABI depending on what you touched). If you need to run storage tests afterward, re-run in the package directory:

```bash
cd packages/storage
npm run install --prefix ../../node_modules/.pnpm/better-sqlite3@<version>/node_modules/better-sqlite3
# or simply:
pnpm rebuild better-sqlite3
```

**This will re-break the next release build** unless you repeat the full sequence above before packaging again. There is currently no isolation between the "dev/test" ABI need (system Node) and the "release build" ABI need (Electron) for this shared native module — treat every release build as needing the full clean sequence above, regardless of what you did most recently.

## Longer-term fix (not done, flagged as follow-up)

The real fix is giving the Electron app's native dependency its own non-shared copy so local test runs and release packaging stop fighting over one file — e.g. a pnpm `.npmrc` setting that prevents hardlinking for this package, or an explicit rebuild step that runs immediately before *every* consuming action (test vs. package) rather than assuming ambient state is correct. Not implemented; workaround above is what to use until then.
