(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // 1) 注入 capture.js
  if (!window.figma?.captureForDesign) {
    const r = await fetch("https://mcp.figma.com/mcp/html-to-design/capture.js");
    const s = await r.text();
    const el = document.createElement("script");
    el.textContent = s;
    document.head.appendChild(el);
    await sleep(1200);
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
  const selector = document.querySelector("[data-figma-capture-root]")
    ? "[data-figma-capture-root]"
    : "body";

  return await window.figma.captureForDesign({
    selector
  });
})();
