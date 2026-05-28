# Screenshot Reconstruction Rules

## Screenshot Analysis Checklist

Capture these facts in `design.md` before writing React code:

- Canvas and viewport: screenshot dimensions, likely device class, scroll state, safe areas, and background treatment.
- Layout: main regions, grids, columns, alignment anchors, spacing rhythm, content density, and fixed or sticky areas.
- Visual system: color roles, typography scale, font weight, line height, radius, borders, shadows, translucency, blur, gradients, and elevation.
- Components: nav, buttons, inputs, cards, tabs, toggles, tables, menus, modals, charts, media blocks, badges, and empty/loading/error states when visible.
- Content: exact visible text where legible; preserve line breaks and truncation patterns.
- Assets: photos, illustrations, thumbnails, logos, mascots/IP, icons, avatars, and background textures.
- Interactions: hover affordances, selected state, active/click feedback, disabled styling, focus rings, expanded/collapsed state, and scroll-triggered behavior.

## design.md Requirements

Create `design.md` as the first artifact. It is the implementation contract for the React reconstruction, not a loose note.

Use this structure unless the screenshot requires a small adjustment:

```markdown
# Design Spec

## Canvas
- Size:
- Device/viewport:
- Background:
- Capture root/background layers:

## Layout
- Regions:
- Grid/columns:
- Spacing rhythm:
- Fixed/sticky areas:

## Visual System
- Colors:
- Typography:
- Radius/borders/shadows:
- Effects:

## Components
- Component:
  - Structure:
  - States:
  - Measurements:
  - Text:

## Icons
- Screenshot glyph:
  - Hugeicons icon:
  - Size/stroke/color:

## Image Assets
- Asset:
  - Source: user-supplied original, image generation output, or final-quality simple crop
  - Reference crop: yes/no; path when used as image-generation reference
  - Final file:
  - Required size and treatment:
  - Verification: visually inspected in the rendered app, transparent corners checked when applicable

## Implementation Notes
- React structure:
- Known approximations:
```

After creating `design.md`, implement the React app from that spec. If the visual implementation changes during verification, update `design.md` so it remains accurate.

## React Reconstruction Rules

- Create a Vite React app per screenshot unless the user asks for multiple screens or an existing project integration.
- Use JavaScript JSX by default. The usual minimum files are `package.json`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/styles.css`, and `assets/`.
- Install and use `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `@hugeicons/react`, and `@hugeicons/core-free-icons`.
- Always create `vite.config.js` with the React plugin:

```js
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
});
```

Do not omit this file; missing React plugin configuration can produce runtime JSX errors such as `React is not defined`.
- Start the dev server and capture the rendered React page through `http://127.0.0.1:...` or `http://localhost:...`, not `file://`.
- Add `data-figma-capture-root` to the top-level reconstructed page element. Give it explicit `width`, `min-height`, and the screenshot's opaque base background color.
- Match the screenshot first; avoid adding explanatory text, onboarding copy, or controls that are not visible or implied.
- Treat the screenshot as the default and only source of truth. Do not browse the original site, fetch production assets, or use external brand files unless the user explicitly provides or requests those sources.
- Use CSS variables for repeated colors, radii, shadows, and spacing when it helps keep the page coherent.
- Use real text and HTML controls instead of flattening UI to images.
- Do not recreate logos, customer marks, badges, mascots, illustrations, photos, or product imagery as live DOM text. Create separate image assets and insert them with `<img>`.
- Do not hand-draw brand marks, mascots, illustrations, thumbnails, product images, or brand-specific pictorial icons as rough SVG approximations. Crop/extract from the screenshot, use user-supplied assets, use image generation, or rasterize the extracted result into image assets instead.
- For human/character portraits, mascots, IP, photos, illustrations, product imagery, screenshots, project thumbnails, and hero artwork, never use hand-authored SVG/Canvas/CSS shapes as the source, even if the result is rasterized to PNG/WebP. That produces a placeholder, not the requested visual asset.
- For human/character portraits, hero artwork, illustrations, photos, product imagery, and project/card thumbnails, never use a low-resolution crop from the input screenshot as the final asset. Use the crop only as an image-generation reference or temporary layout guide, then replace it with the persisted generated bitmap.
- A screenshot crop is allowed as a final asset only for tiny/simple marks, UI badges, icons, or logos when the crop is already at final display quality. For complex visual content, `Source: screenshot crop` in `design.md` is a failed reconstruction unless the user explicitly asked for exact raw screenshot crops.
- If image generation is used, the final React asset must be the selected generated bitmap or a direct crop/post-process of it. Do not create a script that later overwrites the same filename with an approximate SVG-generated PNG.
- Give fixed-format UI elements stable dimensions with `width`, `height`, `aspect-ratio`, grid tracks, or `min/max` constraints so states do not cause layout shift.
- Avoid placeholder rectangles. If the screenshot contains visual content and no source asset is available, generate or approximate the asset.
- Keep generated React code local and deterministic enough that browser capture works from the dev server without remote runtime dependencies besides installed npm packages.

## Background Capture Rules

Figma html-to-design can drop background paint when it lives only on `html`, `body`, transparent gradients, blend effects, or pseudo-elements. Dark UIs are especially fragile, so backgrounds must be explicit captured DOM layers.

- Put the screenshot's base fill on `[data-figma-capture-root]`, not only on `body` or `#root`.
- For every full-width band, panel, card, hero, footer, and canvas-sized region, set an explicit opaque `background-color` that matches the screenshot before adding gradients or overlays.
- If a region uses gradients, use an opaque base plus gradient overlays. Never use only transparent gradients over a transparent parent for a dark background.
- Prefer real child elements for decorative background layers that must appear in Figma, for example `<div className="bg-layer" aria-hidden="true" />`. Do not rely on `::before` or `::after` as the only visible background.
- Avoid `mix-blend-mode`, `backdrop-filter`, and shadow-only fills as required background structure; use them only as secondary polish over a solid layer.
- CSS pattern:

```css
html,
body,
#root {
  margin: 0;
  min-height: 100%;
  background: #0b1220;
}

.capture-root {
  position: relative;
  width: 1440px;
  min-height: 100vh;
  overflow: hidden;
  background-color: #0b1220;
}

.section-dark {
  position: relative;
  background-color: #111a2b;
  background-image: linear-gradient(135deg, rgba(40, 82, 150, 0.28), rgba(8, 13, 24, 0));
}
```

```jsx
export default function App() {
  return (
    <main className="capture-root" data-figma-capture-root>
      <section className="section-dark">...</section>
    </main>
  );
}
```

## Component State Requirements

Implement stateful components with React state and CSS where needed:

- Buttons and icon buttons: default, `:hover`, `:active`, `:focus-visible`, and `[disabled]`.
- Inputs and textareas: default, hover/focus, filled, invalid if visible, placeholder, and disabled.
- Tabs/nav/segmented controls: default, hover, active/selected, and disabled where applicable.
- Cards/list rows: default, hover or selected if clickable, pressed if the screenshot implies click behavior.
- Toggles/checkboxes/radios: checked, unchecked, disabled, focus-visible.
- Dropdowns/menus/modals: closed and open behavior if visible or expected from the screenshot.

Use `data-state`, `aria-selected`, `aria-expanded`, `aria-disabled`, or native attributes to make state explicit and easy for Figma capture to interpret.

## Hugeicons Rules

- Use Hugeicons as the default icon source: https://hugeicons.com/ and https://docs.hugeicons.com/.
- In React, import the renderer from `@hugeicons/react` and free icon definitions from `@hugeicons/core-free-icons`.
- Use `HugeiconsIcon` for each generic UI icon:

```jsx
import { HugeiconsIcon } from "@hugeicons/react";
import { Home01Icon } from "@hugeicons/core-free-icons";

<HugeiconsIcon icon={Home01Icon} size={24} color="currentColor" strokeWidth={1.5} />
```

- Do not hand-inline Hugeicons SVG in JSX as the default path.
- Do not use `<symbol>`, `<use href="#...">`, SVG sprites, icon fonts, web components, external icon scripts, or CDN-only references. Figma html-to-design often cannot resolve them and imports empty icon boxes.
- Match icon size, stroke width, cap/join style, and optical alignment to the screenshot.
- If an exact icon is unavailable, choose the nearest semantic and visual match from Hugeicons.
- Do not mix in Lucide, Heroicons, Font Awesome, Material Icons, emoji, or custom hand-drawn icon systems unless the user explicitly asks.
- If an icon is part of a brand illustration, logo, mascot, product image, or screenshot-specific pictorial art, treat it as an image asset instead of a generic Hugeicons UI icon.

## Image Generation Rules

Use image2/image generation when the screenshot includes an IP character, visual illustration, product image, mascot, or other asset that is not supplied as a cutout or extractable image.

For complex visual assets visible in the screenshot, crop the screenshot only to create a reference/input image for generation. Do not stop at the crop. The final file referenced by React must be the generated bitmap persisted into the project.

Required prompt core from the skill owner:

```text
最大深度的去理解图片上的界面样式，高精度还原组件的效果，要求样式与交互与组件保持一致。同时保证每个组件都具有可交互性(默认、鼠标移入、点击、禁用)。
```

For mascots/IP characters, extend the prompt:

```text
界面上的吉祥物 IP 保留为单独的透明底图片，替换进 React 页面；保持吉祥物动作、姿态、表情、比例、风格、光照和边缘处理的一致性。
```

For missing illustrations or photos:

```text
当没有切图时，使用 image2 图片生成器生成对应的图片内容，例如吉祥物、IP、视觉插画等；保持与截图一致的风格、色彩、透视、光照和精细度，不添加截图中没有的文字。
```

Save generated assets in the React project `assets/` directory, use descriptive filenames, and embed them with `<img>` tags. For transparent mascots, prefer PNG/WebP with alpha and validate that corners are transparent.

### Image Generation Persistence

The generated bitmap must become a real project file before any React implementation or capture is considered complete. A chat-visible image is not enough.

Required sequence for each generated image asset:

1. Create a marker immediately before invoking image generation:
   ```bash
   mkdir -p /path/to/react-project/tmp/imagegen
   touch /path/to/react-project/tmp/imagegen/hero-portrait.before
   ```
2. Invoke the image generation tool using the prompt recorded in `design.md`.
3. Persist the newest generated file into the React project:
   ```bash
   node /path/to/img-to-figma/scripts/persist_imagegen_asset.mjs \
     --since /path/to/react-project/tmp/imagegen/hero-portrait.before \
     --out /path/to/react-project/public/assets/hero-portrait.png
   ```
4. Validate the persisted file:
   ```bash
   file /path/to/react-project/public/assets/hero-portrait.png
   sips -g pixelWidth -g pixelHeight -g hasAlpha /path/to/react-project/public/assets/hero-portrait.png
   ```
5. Visually inspect the exact project file and the rendered page. The project file must show the intended generated/cropped subject, not an approximation with the same filename.
6. Record the final file path and source type in `design.md`.

If `persist_imagegen_asset.mjs` cannot find a new generated image under `$CODEX_HOME/generated_images`, manually inspect `$CODEX_HOME/generated_images` by mtime once. If there is still no reusable file, stop before capture and report that the image generation output could not be persisted. Do not create a local SVG/Canvas/CSS stand-in just to keep moving. Use a user-supplied file or explicit CLI fallback only after the user agrees.

### Capture Image Size Budget

Figma HTML-to-design capture can time out when local images are much larger than their displayed size because the capture payload must load and encode those images. Large image generation outputs must be preserved as source artifacts, but the React page used for capture should reference capture-sized copies.

Rules:

- Default capture budget: max long edge `1600px`, max file size about `1.5MB` for each referenced local PNG/JPEG.
- For images displayed under 600px wide, prefer max long edge `1200px`; for small thumbnails, `800px` is usually enough.
- Keep alpha when the screenshot needs transparency. Downsample PNGs instead of replacing transparent cutouts with JPEG.
- Do not upscale small assets.
- Keep a backup of the original generated/cropped file before resizing.

Run before browser verification and again before retrying a timed-out full capture:

```bash
node /path/to/img-to-figma/scripts/prepare_capture_assets.mjs \
  /path/to/react-project \
  --max-edge 1600 \
  --max-bytes 1500000
```

If full capture times out after the smoke test passes, first check image dimensions and rerun this helper with a stricter budget such as `--max-edge 1200 --max-bytes 900000`. Then visually re-check the page and rerun the official capture. Do not switch to SVG fallback.

## Asset Provenance and Audit

For every non-generic image in the React app, `design.md` must record the final file path and source type. This is not optional for hero artwork, portraits, mascots, illustrations, photos, product imagery, screenshots, or project thumbnails.

Allowed source types:

- User-supplied local file.
- Image generation output, optionally post-processed for transparency, crop, color, or size.
- Final-quality screenshot crop only for tiny/simple assets where `design.md` explicitly records that crop quality is sufficient.
- Deterministic generation only for simple logos, abstract marks, geometric badges, generic icons, and background textures.

Hard failure conditions:

- A complex visual asset is created by `sharp`, Canvas, CSS, or SVG path code from scratch instead of using crop/user-supplied/image-generated bitmap input.
- A complex visual asset such as a portrait, hero image, illustration, product image, or card/project thumbnail is recorded in `design.md` as a screenshot crop/原截图/切图 final source instead of image generation output or user-supplied original.
- A script writes a file such as `hero-portrait.png`, `avatar.png`, `mascot.png`, `illustration.png`, `product.png`, `thumbnail.png`, or `project-*.png` from a hand-authored SVG body.
- An image generation output was shown in the conversation but was not copied into the React project and verified as the file referenced by `<img>`.
- The rendered page references a filename that differs from the verified generated/cropped bitmap.

Before capture, run the audit helper from the React project context:

```bash
node /path/to/img-to-figma/scripts/audit_visual_assets.mjs /path/to/react-project
```

Then visually inspect every hero/portrait/mascot/product/thumbnail image in the rendered page. The audit helper catches common script-based placeholder regressions; visual inspection is still required because a valid PNG can contain the wrong subject.

## Logo and Brand Mark Rules

- Logos and customer marks are image assets. Never leave them as editable page text, even if the mark is word-only.
- If a supplied or extracted logo source is SVG with embedded fonts, `<text>`, complex paths, or effects that Figma capture may split into poor layers, rasterize it to a transparent PNG/WebP and use that bitmap in React.
- Priority order:
  1. Use a supplied original logo/cutout if the user provides one.
  2. Crop or extract the mark from the screenshot when the resolution is sufficient.
  3. Use image generation or deterministic raster/vector generation to create a separate logo-like image asset matching the screenshot.
- Insert each mark with `<img src="...">` and fixed dimensions that match the screenshot.
- Keep transparent backgrounds unless the screenshot shows a filled logo tile.
- If the exact trademark asset cannot be recovered, report that the logo is a visually matched approximation.
- Do not use DOM text styled with CSS as the final logo implementation; Figma will import it as text, not as a logo asset.

## Browser Verification

Before capture:

- Run `scripts/prepare_capture_assets.mjs` so generated/cropped bitmap assets are capture-sized rather than full-resolution originals.
- Open the React app at the screenshot's approximate viewport size.
- Take or inspect a rendered screenshot and compare it against the original.
- Check that text does not overflow controls and that hover/active/disabled states do not shift layout.
- Confirm images load, fonts are ready, SVG icons render, and no visible broken assets remain.
- Confirm each hero/portrait/mascot/product/thumbnail image is the intended generated/cropped bitmap, not a same-named placeholder produced by a local asset script.
- Confirm dark or colored backgrounds are visible as solid fills, not just transparent gradient overlays. Inspect root and section CSS if the screenshot has a non-white background.
- Scroll through long pages once to trigger lazy content before running capture.
- The Codex in-app browser is acceptable for visual verification, but do not use its `evaluate` surface for Figma capture because it can be read-only and block script injection.

## Figma Capture Rules

- Use `assets/capture-for-design.js` without changing the capture sequence.
- The capture script targets `[data-figma-capture-root]` when present and falls back to `body` only for older reconstructions. New React reconstructions must include `[data-figma-capture-root]`.
- Before full-page capture, run `scripts/capture_smoke_test.mjs`. If the minimal HTML block cannot produce a Figma `text/html` payload, the environment is blocked; stop and report the exact error instead of substituting another format.
- If the smoke test passes but full capture times out, treat oversized images as the first suspect. Run `scripts/prepare_capture_assets.mjs` with a stricter budget before simplifying DOM or reporting a blocker.
- Capture helpers must report which failure class occurred: Playwright import/launch failure, remote `capture.js` fetch failure, `window.figma.captureForDesign` runtime timeout, or invalid payload prefix. Include browser console/page errors and `window.figma` diagnostics when available.
- Execute capture in the user's local Chrome through Playwright Core with `scripts/capture_with_chrome.mjs`; do not execute capture through the Codex in-app browser `evaluate`.
- Do not switch to Figma Plugin API, Figma MCP, `use_figma`, or direct node creation as a fallback when the requested handoff is HTML-to-design capture. Direct Figma-file generation is a different workflow and must be explicitly requested by the user; it does not produce `figma-capture.txt`.
- Run the helper against the React dev server URL:

```bash
cd /path/to/react-project
node /path/to/img-to-figma/scripts/capture_with_chrome.mjs \
  --url http://127.0.0.1:5173 \
  --out ./figma-capture.txt \
  --viewport 1440x900
```

- Use the actual skill script path, such as the installed skill path under `$CODEX_HOME/skills/img-to-figma/scripts/capture_with_chrome.mjs`. If the helper cannot import `playwright-core`, install it in the React project with `npm i -D playwright-core` and rerun the helper from that project directory. The helper launches local Chrome with `channel: "chrome"`.
- Treat the capture result as an HTML clipboard payload, not readable user text.
- The payload should begin with `<span data-h2d="<!--(figh2d)` and must be copied to Figma as MIME type `text/html`.
- Save the payload as `figma-capture.txt` next to the React project for traceability only.
- Do not tell users to manually select/copy the visible contents of `figma-capture.txt`; that produces a giant text layer in Figma.
- On macOS, prefer `swift scripts/copy_figma_payload_to_clipboard.swift <figma-capture.txt>` and verify `clipboard info` includes `«class HTML»`.
- If browser clipboard copy is needed, open a helper page through `http://127.0.0.1`, not `file://`; `file://` pages often fail or degrade clipboard writes.
- The final user-facing copy route is clipboard-first: say the Figma `text/html` payload is already on the clipboard and can be pasted into Figma. Only provide a paste helper URL if direct clipboard write fails.
- Never use SVG as a substitute output when Figma capture fails. SVG, PNG, PDF, screenshots, and the React app itself are diagnostic artifacts only and do not satisfy the skill's output contract.
- Never report direct Figma Plugin/API-created nodes as this skill's success output unless the user has explicitly changed the requested deliverable away from `figma-capture.txt`/HTML clipboard capture.
- If smoke capture succeeds but full capture fails, isolate the failure by removing or simplifying suspect DOM/assets, then rerun the official capture. If no valid payload can be produced, report the capture blocker and do not claim a Figma-ready result.
- Report any remaining mismatch honestly, such as unavailable exact font, inferred hidden state, or generated image differences.
