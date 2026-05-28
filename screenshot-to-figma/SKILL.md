---
name: img-to-figma
description: Convert UI screenshots into Figma-pasteable design captures by first writing a design.md UI specification, then reconstructing the screenshot as a high-fidelity Vite React app with Hugeicons React icons and generated image assets when needed, running Figma Code to Canvas capture, and copying the text/html payload to the clipboard. Use when the user provides a UI screenshot and asks to turn it into a Figma design, convert a screenshot to Figma, recreate UI for Figma, generate HTML-to-Figma paste content, or restore a screenshot as editable Figma layers.
---

# IMG to figma

## Overview

Use this skill to turn a user-provided UI screenshot into an editable Figma design through three steps: write `design.md`, rebuild the UI as a local React app, then run Figma Code to Canvas capture and copy the resulting `text/html` payload to the clipboard. Do not directly create or modify Figma files; deliver the capture through an HTML clipboard write or a paste helper page so Figma receives `text/html`, not plain text. Direct Figma Plugin API, Figma MCP, or `use_figma` node creation is a separate workflow, not an automatic fallback for this skill.

For detailed reconstruction standards, read `references/reconstruction-rules.md` before writing `design.md` or implementing the React app.

## Required Workflow

1. Inspect the input screenshot and create `design.md` before writing UI code. Include canvas size, layout grid, component hierarchy, text content, colors, typography, spacing, imagery, Hugeicons mapping, image-generation needs, and visible interaction affordances.
2. Create a Vite React project for the reconstruction unless the user explicitly requests a different React setup. Use JavaScript JSX by default and include `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `@hugeicons/react`, and `@hugeicons/core-free-icons`. Always create `vite.config.js` with `@vitejs/plugin-react`; do not rely on Vite defaults for JSX.
3. Implement the screenshot as interactive React UI, not static pixels. Include default, hover, active/click, focus where relevant, and disabled states for buttons, inputs, tabs, cards, nav items, toggles, menus, and other controls.
4. Use Hugeicons React packages for all generic UI icons. Import `HugeiconsIcon` from `@hugeicons/react` and icon definitions from `@hugeicons/core-free-icons`; choose the closest matching Hugeicons icon for every icon-like glyph. Do not hand-inline Hugeicons SVG, use SVG sprites, icon fonts, external icon scripts, or CDN-only references.
5. Preserve backgrounds as real captured layers. Put `data-figma-capture-root` on the top-level React frame and give that element explicit width/min-height plus an opaque base background color. Do not rely on `body`/`html` background, transparent gradients, blend modes, shadows, or pseudo-elements as the only source of a dark or colored background.
6. For missing raster or visual assets, generate or derive images rather than using blank placeholders:
   - Assume the user only provided the screenshot. Do not fetch the original website/app assets, inspect the live product, or rely on external brand files unless the user explicitly provides a URL/source asset or asks you to use external sources.
   - Treat logos, brand marks, customer marks, badges, mascots, illustrations, photos, and product shots as image assets, not DOM text or CSS-only approximations.
   - For logos/brand marks, create separate image files and insert them with `<img>`. Prefer a crop/cutout from the supplied screenshot when available; otherwise generate or rasterize a logo-like image asset that visually matches the screenshot.
   - Do not substitute brand marks, mascots, illustrations, thumbnails, product images, or brand-specific pictorial icons with rough hand-authored SVG. If a supplied/extracted source is SVG but contains embedded fonts/text or complex illustration, rasterize it to PNG/WebP before capture so Figma imports it as a faithful image asset instead of decomposed low-quality vectors or editable text.
   - Use image2/image generation for mascots, IP characters, illustrations, banners, thumbnails, product imagery, or visual art that is present in the screenshot but not supplied as a cutout.
   - For human/character portraits, hero artwork, illustrations, photos, product imagery, and project/card thumbnails, do not use raw crops from the input screenshot as final assets. Screenshot crops are allowed only as reference images, temporary layout guides, or for tiny/simple marks where the crop is already at final quality.
   - Keep mascots/IP as separate transparent-background assets and preserve the screenshot's pose, action, expression, proportions, and style as closely as possible.
7. Enforce asset provenance before browser verification:
   - In `design.md`, list every non-generic image asset with its final filename and source type: screenshot crop, user-supplied file, image generation output, or deterministic simple logo/texture generation.
   - Human/character portraits, mascots, IP, photos, illustrations, product imagery, screenshots, project/card thumbnails, and hero artwork must come from user-supplied original files or image generation output by default. A screenshot crop may be recorded as `reference crop`, but not as the final source unless it is a tiny/simple asset and `design.md` explains why it is already final-quality.
   - Deterministic SVG/raster generation is allowed only for simple logos, abstract marks, icons, geometric badges, or background textures where the screenshot asset is itself simple geometry.
   - Before invoking image generation, create a marker file such as `tmp/imagegen/<asset>.before`. After the tool returns, immediately persist the generated file with `node /path/to/img-to-figma/scripts/persist_imagegen_asset.mjs --since <marker> --out <react-project>/public/assets/<asset>.png`.
   - After image generation, move or copy the selected bitmap into the React project's `public/assets` or `src/assets` path and reference that exact file. Use `file`, `sips`, and visual inspection to verify the project asset is the generated/cropped bitmap.
   - If the image tool output is visible in chat but no reusable local file can be found or persisted, do not continue with a substitute asset. Retry persistence, ask for explicit CLI fallback/user-supplied file, or stop the Figma handoff as blocked. Never replace the missing generated asset with a hand-authored vector/shape placeholder.
   - Do not later overwrite a generated/cropped bitmap with a same-named generated placeholder script.
   - Run `node /path/to/img-to-figma/scripts/audit_visual_assets.mjs <react-project>` and fix any failures before capture.
8. Prepare image assets for capture:
   - Run `node /path/to/img-to-figma/scripts/prepare_capture_assets.mjs <react-project> --max-edge 1600 --max-bytes 1500000`.
   - This keeps the real generated/cropped images, but downsamples oversized local PNG/JPEG assets to a capture-safe size and writes `.capture-original` backups.
   - Do not skip this when image generation produced large files; oversized images can make Figma HTML-to-design capture time out even when the DOM is simple.
9. Start the React dev server, render the app in a browser, compare it against the screenshot, and revise until the layout, density, component treatment, background fills, and visual hierarchy are acceptably close.
10. Before capturing the reconstructed page, run the minimal capture smoke test:
   - `node /path/to/img-to-figma/scripts/capture_smoke_test.mjs`
   - If the smoke test fails or times out, stop the Figma handoff and report the capture environment as blocked with the exact error and diagnostics. Do not deliver SVG, PNG, PDF, screenshots, a plain HTML file, or direct Figma Plugin/API-created nodes as a substitute for the Figma `text/html` payload.
11. Run the capture script from `assets/capture-for-design.js` in local Chrome through Playwright Core after the React app has loaded and fonts/images are ready. Do not use the Codex in-app browser `evaluate` path for capture; that environment can be read-only and may block script injection.
12. Deliver the result as Figma-pasteable `text/html`:
   - Save the captured `text/html` payload as `figma-capture.txt` beside the React project for traceability only.
   - Write that payload to the system clipboard as HTML before the final response when the environment allows it.
   - If direct clipboard writing is unavailable, create or copy an HTTP-served paste helper page that writes the payload with `ClipboardItem({"text/html": ...})`.
   - Always include a concrete copy route in the final response: either "the Figma `text/html` payload is already on your clipboard; paste into Figma now" or a full `http://127.0.0.1:.../figma-paste-helper.html` URL with a button that copies the payload as `text/html`.
   - Never tell the user to open `figma-capture.txt` and manually copy its visible text; Figma will paste that as a giant text layer instead of editable design layers.
   - Never present an SVG file, importable SVG, screenshot, PNG, PDF, or rebuilt React app as the final Figma handoff. These can be diagnostic artifacts only; they do not satisfy this skill's output contract.

## Capture Procedure

Use `assets/capture-for-design.js` as the canonical script. It captures `[data-figma-capture-root]` when present and falls back to `body` only for older reconstructions. New React reconstructions must provide `[data-figma-capture-root]` with an opaque background.

Run the smoke test once before attempting the real capture:

```bash
node /path/to/img-to-figma/scripts/capture_smoke_test.mjs
```

The smoke test launches local Chrome, serves a tiny local HTML page, runs the same capture script, and validates the Figma `text/html` prefix. If this minimal case times out, the environment cannot currently produce the required Figma payload. Stop and report that blocker instead of exporting SVG.

Before full-page capture, reduce large local image assets:

```bash
node /path/to/img-to-figma/scripts/prepare_capture_assets.mjs \
  /path/to/react-project \
  --max-edge 1600 \
  --max-bytes 1500000
```

If full capture still times out and the smoke test passes, rerun with a smaller image budget such as `--max-edge 1200 --max-bytes 900000`, then visually verify the page before recapturing. Keep the generated/cropped bitmap source; do not replace it with SVG.

Default execution path:

```bash
cd /path/to/react-project
node /path/to/img-to-figma/scripts/capture_with_chrome.mjs \
  --url http://127.0.0.1:5173 \
  --out ./figma-capture.txt \
  --viewport 1440x900
```

Run this helper from the React project directory so it can resolve that project's `playwright-core` dependency. Use the actual skill script path, such as the installed skill path under `$CODEX_HOME/skills/img-to-figma/scripts/capture_with_chrome.mjs`. The helper launches the user's local Chrome (`channel: "chrome"`), opens the React dev server URL, evaluates the same capture script in that page, validates the Figma payload prefix, and writes `figma-capture.txt`.

The Codex in-app browser may still be used for visual verification screenshots, but not for the capture execution step. Do not rewrite the capture logic ad hoc.

## Clipboard Delivery

Figma Code to Canvas requires the payload to be on the clipboard with MIME type `text/html`. A raw chat message, a text file selection, or a normal plain-text copy is not enough.

After capture:

1. Extract the `text/html` clipboard payload. It should begin with `<span data-h2d="<!--(figh2d)`.
2. Save that exact payload to `figma-capture.txt`.
3. Prefer writing the payload directly to the system clipboard:

```bash
swift scripts/copy_figma_payload_to_clipboard.swift /path/to/figma-capture.txt
```

4. If direct clipboard writing is blocked, serve the output folder over HTTP and use an HTML paste helper page with `navigator.clipboard.write([new ClipboardItem({"text/html": blob})])`. Open it from `http://127.0.0.1:...`, not `file://`.
5. In the final response, say whether the clipboard was written. If it was written, tell the user to paste directly into Figma. If not, provide the HTTP helper URL and explicitly warn not to manually copy the text file contents.

Use `figma-capture.txt` as an artifact/debug file, not as the user copy workflow.

## Capture Failure Policy

The only acceptable successful handoff is a Figma HTML-to-design `text/html` payload. SVG is not a fallback for this skill.

- If the smoke test fails: stop before page capture and report the exact smoke-test error.
- Distinguish failure type in the final status: Playwright import/launch failure, remote `capture.js` fetch failure, `window.figma.captureForDesign` runtime timeout, or invalid payload prefix.
- If the smoke test passes but the reconstructed page capture fails: debug the page, simplify or isolate problematic DOM/assets, rerun capture, and keep `design.md`/React artifacts for traceability.
- If capture still cannot produce a payload, say the Figma handoff is blocked. Do not claim completion with SVG, screenshots, PNG, PDF, plain HTML, or a Figma-importable vector file.
- Do not silently switch to Figma Plugin API, Figma MCP, `use_figma`, or direct node creation when the requested deliverable is `figma-capture.txt`/HTML-to-design. That path changes the contract; use it only if the user explicitly changes the request to direct Figma-file generation, and state that no `figma-capture.txt` was produced.
- A paste helper page is valid only when it writes an existing captured `text/html` payload. It is not valid if no payload exists.
- Final responses must not say "paste into Figma" unless either the system clipboard contains `text/html` or a helper page can write that exact `text/html` payload.

## Output Contract

Return these items at the end of the task:

- The `design.md` path.
- The React project path or dev server URL used for capture.
- The generated asset paths, if any.
- Clipboard status: Figma `text/html` copied, plus the HTTP paste helper URL when one exists. This is the user-facing copyable delivery surface.
- The local `figma-capture.txt` path as a backup artifact only.
- A concise note about any fidelity limitations that remain.

## References

- `references/reconstruction-rules.md` - detailed `design.md`, React reconstruction, component-state, asset-generation, Hugeicons, and export rules.
- `assets/capture-for-design.js` - canonical Figma Code to Canvas capture script.
- `scripts/audit_visual_assets.mjs` - local guardrail that fails when complex image assets are referenced from React but generated by hand-authored SVG/shape placeholder scripts.
- `scripts/persist_imagegen_asset.mjs` - helper that copies the newest generated image from `$CODEX_HOME/generated_images` into the React project after image generation.
- `scripts/prepare_capture_assets.mjs` - helper that downsamples oversized local PNG/JPEG assets before Figma capture to avoid payload and timeout failures.
- `scripts/capture_smoke_test.mjs` - minimal environment check for Figma HTML-to-design capture before attempting a full-page capture.
- `scripts/capture_with_chrome.mjs` - Playwright Core helper that runs capture in local Chrome and writes `figma-capture.txt`.
- `scripts/copy_figma_payload_to_clipboard.swift` - macOS helper for writing `figma-capture.txt` to the clipboard as `text/html`.
