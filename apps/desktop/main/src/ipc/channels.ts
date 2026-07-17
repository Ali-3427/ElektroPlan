// The channel map and envelope type are the single source of truth shared
// with apps/desktop/preload/src/index.ts. They live in @elektroplan/contracts
// (both main and preload already depend on it, and preload cannot depend on
// main directly) so a rename here is a compiler error in preload, not a
// silent runtime desync.
export { IPC_CHANNELS, type IpcChannel, type IpcEnvelope } from "@elektroplan/contracts";
