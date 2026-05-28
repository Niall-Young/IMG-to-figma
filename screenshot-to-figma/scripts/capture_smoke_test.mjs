#!/usr/bin/env node

import http from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const skillRoot = path.resolve(__dirname, "..");

async function loadPlaywrightCore() {
  const normalize = (mod) => {
    const playwright = mod?.chromium ? mod : mod?.default;
    if (!playwright?.chromium?.launch) {
      throw new Error("Could not load Playwright chromium launcher.");
    }
    return playwright;
  };

  try {
    return normalize(await import("playwright-core"));
  } catch (error) {
    try {
      const cwdRequire = createRequire(path.join(process.cwd(), "package.json"));
      const resolved = cwdRequire.resolve("playwright-core");
      return normalize(await import(pathToFileURL(resolved).href));
    } catch {
      throw new Error(
        "Playwright import/launch failure: missing or incompatible playwright-core. Run this helper from an environment where playwright-core is installed, or install it in the React project with `npm i -D playwright-core`.",
        { cause: error },
      );
    }
  }
}

async function withTimeout(promise, ms, label) {
  let timeout;
  const timer = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms.`)), ms);
  });

  try {
    return await Promise.race([promise, timer]);
  } finally {
    clearTimeout(timeout);
  }
}

function createServer() {
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Figma capture smoke test</title>
    <style>
      body { margin: 0; background: #111827; font-family: Arial, sans-serif; }
      [data-figma-capture-root] {
        width: 240px;
        height: 120px;
        box-sizing: border-box;
        padding: 24px;
        background: #111827;
        color: #f8fafc;
        border: 2px solid #38bdf8;
      }
      .block {
        width: 96px;
        height: 32px;
        background: #38bdf8;
        border-radius: 6px;
      }
    </style>
  </head>
  <body>
    <main id="smoke-test" data-figma-capture-root>
      <div class="block"></div>
      <p>Smoke</p>
    </main>
  </body>
</html>`;

  const server = http.createServer((_, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

function attachPageDiagnostics(page) {
  const logs = [];
  page.on("console", (message) => {
    logs.push(`[console:${message.type()}] ${message.text()}`);
  });
  page.on("pageerror", (error) => {
    logs.push(`[pageerror] ${error.message}`);
  });
  return logs;
}

async function readSmokeDiagnostics(page) {
  return await page.evaluate(() => {
    const target = document.querySelector("#smoke-test");
    return {
      captureForDesignType: typeof window.figma?.captureForDesign,
      hasFigma: Boolean(window.figma),
      targetExists: Boolean(target),
      targetRect: target
        ? {
            height: Math.round(target.getBoundingClientRect().height),
            width: Math.round(target.getBoundingClientRect().width),
          }
        : null,
    };
  });
}

const scriptPath = path.join(skillRoot, "assets", "capture-for-design.js");
const captureSource = readFileSync(scriptPath, "utf8");
const { chromium } = await loadPlaywrightCore();
const { server, url } = await createServer();

let browser;
let context;

try {
  browser = await chromium.launch({ channel: "chrome", headless: false });
  context = await browser.newContext({ viewport: { width: 320, height: 180 } });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: url });

  const page = await context.newPage();
  const pageLogs = attachPageDiagnostics(page);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.bringToFront().catch(() => {});
  await page.waitForFunction(() => document.querySelector("#smoke-test"), null, { timeout: 5000 });
  await page.evaluate(() => {
    window.__FIGMA_CAPTURE_SELECTOR = "#smoke-test";
    window.__FIGMA_CAPTURE_TIMEOUT_MS = 30000;
  });

  let payload;
  try {
    payload = await withTimeout(page.evaluate(captureSource), 35000, "Figma capture smoke test");
  } catch (error) {
    const diagnostics = await readSmokeDiagnostics(page).catch((diagnosticError) => ({
      diagnosticError: diagnosticError.message,
    }));
    console.error("Figma capture smoke diagnostics:");
    console.error(JSON.stringify(diagnostics, null, 2));
    if (pageLogs.length > 0) {
      console.error("Browser console/page errors:");
      for (const line of pageLogs.slice(-25)) console.error(line);
    }
    throw error;
  }

  if (typeof payload !== "string" || !payload.startsWith("<span data-h2d=\"<!--(figh2d)")) {
    throw new Error("Invalid payload prefix: smoke test did not return a Figma text/html payload.");
  }

  console.log("Figma capture smoke test passed.");
} finally {
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));
}
