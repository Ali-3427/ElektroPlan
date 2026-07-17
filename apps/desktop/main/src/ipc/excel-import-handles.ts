import { randomUUID } from "node:crypto";

// Materials import goes through two IPC round-trips: MaterialsPickExcel opens
// a native file dialog and hands the renderer an opaque handle (never the
// real path); MaterialsImportExcel later redeems that handle. Handles used to
// only ever be deleted on a *successful* import — a pick with no follow-up
// (user cancels, or an error happens before the import call) leaked an entry
// for the lifetime of the process. A TTL bounds that growth and makes the
// "expired" wording in the import error message actually true.
export const EXCEL_IMPORT_HANDLE_TTL_MS = 5 * 60 * 1000;

export interface ExcelImportHandleStore {
  /** Registers a resolved file path and returns an opaque handle for it. */
  create(filePath: string): string;
  /** Redeems a handle exactly once, returning its file path, or undefined if unknown/expired/already redeemed. */
  resolve(handle: string): string | undefined;
}

export function createExcelImportHandleStore(
  ttlMs: number = EXCEL_IMPORT_HANDLE_TTL_MS,
): ExcelImportHandleStore {
  const filePathsByHandle = new Map<string, string>();
  const expiryTimers = new Map<string, NodeJS.Timeout>();

  function forget(handle: string): void {
    filePathsByHandle.delete(handle);
    const timer = expiryTimers.get(handle);
    if (timer !== undefined) {
      clearTimeout(timer);
      expiryTimers.delete(handle);
    }
  }

  return {
    create(filePath) {
      const handle = randomUUID();
      filePathsByHandle.set(handle, filePath);
      const timer = setTimeout(() => forget(handle), ttlMs);
      timer.unref?.();
      expiryTimers.set(handle, timer);
      return handle;
    },
    resolve(handle) {
      const filePath = filePathsByHandle.get(handle);
      if (filePath === undefined) {
        return undefined;
      }
      forget(handle);
      return filePath;
    },
  };
}
