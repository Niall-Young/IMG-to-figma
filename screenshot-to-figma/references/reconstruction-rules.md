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
  - Source: crop, user-supplied, or image2/image generation
  - Required size and treatment:

## Implementation Notes
- React structure:
- Known approximations:
```

After creating `design.md`, implement the React app from that spec. If the visual implementation changes during verification, update `design.md` so it remains accurate.

## React Reconstruction Rules

- Create a Vite React app per screenshot unless the user asks for multiple screens or an existing project integration.
- Use JavaScript JSX by default. The usual minimum files are `package.json`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/styles.css`, and `assets/`.
- Install and use `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `@hugeicons/react`, and `@hugeicons/core-free-icons`.
- Start the dev server and capture the rendered React page through `http://127.0.0.1:...` or `http://localhost:...`, not `file://`.
- Add `data-figma-capture-root` to the top-level reconstructed page element. Give it explicit `width`, `min-height`, and the screenshot's opaque base background color.
- Match the screenshot first; avoid adding explanatory text, onboarding copy, or controls that are not visible or implied.
- Treat the screenshot as the default and only source of truth. Do not browse the original site, fetch production assets, or use external brand files unless the user explicitly provides or requests those sources.
- Use CSS variables for repeated colors, radii, shadows, and spacing when it helps keep the page coherent.
- Use real text and HTML controls instead of flattening UI to images.
- Do not recreate logos, customer marks, badges, mascots, illustrations, photos, or product imagery as live DOM text. Create separate image assets and insert them with `<img>`.
- Do not hand-draw brand marks, mascots, illustrations, thumbnails, product images, or brand-specific pictorial icons as rough SVG approximations. Crop/extract from the screenshot, use user-supplied assets, use image generation, or rasterize the extracted result into image assets instead.
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

- Open the React app at the screenshot's approximate viewport size.
- Take or inspect a rendered screenshot and compare it against the original.
- Check that text does not overflow controls and that hover/active/disabled states do not shift layout.
- Confirm images load, fonts are ready, SVG icons render, and no visible broken assets remain.
- Confirm dark or colored backgrounds are visible as solid fills, not just transparent gradient overlays. Inspect root and section CSS if the screenshot has a non-white background.
- Scroll through long pages once to trigger lazy content before running capture.
- The Codex in-app browser is acceptable for visual verification, but do not use its `evaluate` surface for Figma capture because it can be read-only and block script injection.

## Figma Capture Rules

- Use `assets/capture-for-design.js` without changing the capture sequence.
- The capture script targets `[data-figma-capture-root]` when present and falls back to `body` only for older reconstructions. New React reconstructions must include `[data-figma-capture-root]`.
- Execute capture in the user's local Chrome through Playwright Core with `scripts/capture_with_chrome.mjs`; do not execute capture through the Codex in-app browser `evaluate`.
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
- Report any remaining mismatch honestly, such as unavailable exact font, inferred hidden state, or generated image differences.
