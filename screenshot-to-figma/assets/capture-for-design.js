(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const captureTimeoutMs = Number(window.__FIGMA_CAPTURE_TIMEOUT_MS || 40000);
  const withTimeout = (promise, ms, label) => {
    let timeout;
    const timer = new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms.`)), ms);
    });
    return Promise.race([promise, timer]).finally(() => clearTimeout(timeout));
  };
  const isFigmaPayload = (value) =>
    typeof value === "string" && value.startsWith("<span data-h2d=\"<!--(figh2d)");
  const escapeAttribute = (value) =>
    value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const normalizeFigmaPayload = (value) => {
    if (isFigmaPayload(value)) return value;
    if (typeof value !== "string" || !value.includes("data-h2d")) return null;

    const doc = new DOMParser().parseFromString(value, "text/html");
    const span = doc.querySelector("span[data-h2d]");
    const data = span?.getAttribute("data-h2d");
    if (typeof data === "string" && data.startsWith("<!--(figh2d)")) {
      return `<span data-h2d="${escapeAttribute(data)}"></span>`;
    }
    return null;
  };
  const readClipboardHtml = async () => {
    if (!navigator.clipboard?.read) return null;
    const items = await navigator.clipboard.read();
    for (const item of items) {
      if (!item.types.includes("text/html")) continue;
      const blob = await item.getType("text/html");
      const text = await blob.text();
      const payload = normalizeFigmaPayload(text);
      if (payload) return payload;
    }
    return null;
  };
  const waitForClipboardPayload = async (capturePromise, ms) => {
    let captureError = null;
    let clipboardReadError = null;
    capturePromise
      .then((result) => {
        if (result?.success === false) {
          captureError = new Error(result.error || "Figma captureForDesign returned success=false.");
        }
      })
      .catch((error) => {
        captureError = error;
      });

    const startedAt = Date.now();
    while (Date.now() - startedAt < ms) {
      if (captureError) throw captureError;
      try {
        const html = await readClipboardHtml();
        if (html) return html;
      } catch (error) {
        clipboardReadError = error;
      }
      await sleep(250);
    }
    throw new Error(
      `Figma text/html clipboard payload timed out after ${ms}ms.` +
      (clipboardReadError ? ` Last clipboard read error: ${clipboardReadError.message}` : "")
    );
  };

  // 1) 注入 capture.js
  if (!window.figma?.captureForDesign) {
    const controller = new AbortController();
    const abort = setTimeout(() => controller.abort(), 15000);
    const r = await fetch("https://mcp.figma.com/mcp/html-to-design/capture.js", {
      signal: controller.signal
    }).finally(() => clearTimeout(abort));
    if (!r.ok) throw new Error(`Failed to load Figma capture.js: ${r.status}`);
    const s = await r.text();
    console.info(`[img-to-figma] capture.js fetched: ${s.length} bytes`);
    const el = document.createElement("script");
    el.textContent = s;
    document.head.appendChild(el);
    await sleep(1200);
  }

  if (!window.figma) {
    throw new Error("Figma capture runtime unavailable: window.figma is missing after capture.js injection.");
  }
  if (typeof window.figma.captureForDesign !== "function") {
    throw new Error(`Figma capture runtime unavailable: captureForDesign is ${typeof window.figma.captureForDesign}.`);
  }

  // 2) 触发懒加载：滚动到底再回顶
  const step = Math.max(400, Math.floor(window.innerHeight * 0.8));
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await sleep(180);
  }
  await sleep(600);
  window.scrollTo(0, 0);

  // 3) 等图片与字体
  const imgs = Array.from(document.images || []);
  await Promise.allSettled(
    imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => {
      img.addEventListener("load", res, { once: true });
      img.addEventListener("error", res, { once: true });
      setTimeout(res, 4000);
    }))
  );
  if (document.fonts?.ready) await Promise.race([document.fonts.ready, sleep(3000)]);
  await sleep(500);

  // 4) 复制模式抓取
  // Prefer a real React capture root. Body/html background paints are often
  // dropped by html-to-design, so reconstructed pages should provide an
  // explicit element with data-figma-capture-root and an opaque background.
  const selector = window.__FIGMA_CAPTURE_SELECTOR
    || (document.querySelector("[data-figma-capture-root]")
    ? "[data-figma-capture-root]"
    : "body");

  console.info(`[img-to-figma] capture selector: ${selector}; timeout=${captureTimeoutMs}ms`);

  try {
    await navigator.clipboard?.writeText?.(`[img-to-figma pending capture ${Date.now()}]`);
  } catch {
    // Non-fatal: the capture runtime will report a clipboard error if writes are blocked.
  }

  const capturePromise = window.figma.captureForDesign({
    selector,
    verbose: true
  });

  // Figma's current captureForDesign clipboard flow resolves only after its
  // floating toolbar is closed. The handoff artifact is the text/html payload
  // written to the clipboard, so return that payload as soon as it appears.
  return await withTimeout(
    waitForClipboardPayload(capturePromise, captureTimeoutMs),
    captureTimeoutMs + 1000,
    "window.figma.captureForDesign clipboard payload"
  );
})();
