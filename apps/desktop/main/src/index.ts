import path from "node:path";
import { fileURLToPath, pathToFileURL, URL } from "node:url";

import { app, BrowserWindow, ipcMain, session } from "electron";

import { registerIpcHandlers } from "./ipc/register.js";
import { createServices, type AppServices } from "./services/index.js";

const isDevelopment = process.env.NODE_ENV === "development";
const devServerUrl =
  process.env.ELECTRON_RENDERER_URL ?? process.env.VITE_DEV_SERVER_URL;

let services: AppServices | null = null;

function resolveBundledEntry(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}

function getPreloadEntry(): string {
  return resolveBundledEntry("../../preload/dist/index.js");
}

function getRendererHtmlEntry(): string {
  return resolveBundledEntry("../../renderer/dist/index.html");
}

function hardenWindow(window: BrowserWindow): void {
  // Never allow the renderer to open new windows.
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  // Block navigation away from the trusted origin.
  const trustedFileUrl = pathToFileURL(getRendererHtmlEntry()).href;

  window.webContents.on("will-navigate", (event, url) => {
    const allowed =
      isDevelopment && devServerUrl
        ? url.startsWith(devServerUrl)
        : url === trustedFileUrl || url.startsWith(`${trustedFileUrl}#`);
    if (!allowed) {
      event.preventDefault();
    }
  });
}

// Production loads are a trusted, bundled file:// origin, so script/style can
// be restricted to 'self'. Dev mode additionally needs the Vite dev server
// origin (for its HMR client, websocket, and inline/eval-based module
// transforms) — that relaxation only ever applies when isDevelopment is set,
// never in a packaged build.
function buildContentSecurityPolicy(): string {
  if (isDevelopment && devServerUrl) {
    return [
      `default-src 'self' ${devServerUrl}`,
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${devServerUrl}`,
      `style-src 'self' 'unsafe-inline' ${devServerUrl}`,
      `connect-src 'self' ${devServerUrl} ws://localhost:* ws://127.0.0.1:*`,
      `img-src 'self' data: ${devServerUrl}`,
      "font-src 'self' data:",
    ].join("; ");
  }

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
  ].join("; ");
}

function installContentSecurityPolicy(): void {
  const csp = buildContentSecurityPolicy();

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    });
  });
}

function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1200,
    minHeight: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: getPreloadEntry(),
      contextIsolation: true,
      nodeIntegration: false,
      // NOTE: sandbox must stay false — the preload is an ESM module
      // ("type":"module"); Electron's sandbox only supports CommonJS preloads,
      // so sandbox:true prevents contextBridge from exposing window.elektroPlan.
      sandbox: false
    }
  });

  hardenWindow(mainWindow);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  if (isDevelopment && devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(getRendererHtmlEntry());
  }

  return mainWindow;
}

function closeServices(): void {
  if (services !== null) {
    try {
      services.close();
    } catch {
      // Swallow shutdown errors.
    }
    services = null;
  }
}

app.whenReady().then(() => {
  installContentSecurityPolicy();

  const databasePath = path.join(app.getPath("userData"), "elektroplan.db");
  services = createServices({ databasePath });

  services.materials.seedIfEmpty().then((result) => {
    if (result.seeded) {
      console.log(`[materials] Seeded ${result.categoriesAdded} categories, ${result.materialsAdded} materials (${result.dataVersion})`);
    }
  }).catch((err: unknown) => {
    console.error('[materials] Seed failed (non-fatal):', err);
  });

  registerIpcHandlers(ipcMain, services, {
    isDevelopment,
    ...(devServerUrl === undefined ? {} : { devServerUrl }),
  });

  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}).catch((error: unknown) => {
  console.error("Failed to start ElektroPlan.", error);
  app.quit();
});

app.on("window-all-closed", () => {
  // Do not close services here: on darwin the app process stays alive after
  // all windows close, and a later "activate" would reopen a window whose
  // already-registered IPC handlers still reference the closed database.
  // Services are torn down once, on "before-quit", matching actual app
  // lifetime.
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  closeServices();
});
