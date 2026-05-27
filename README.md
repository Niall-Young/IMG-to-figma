# IMG to figma

`IMG to figma` 是一个 Codex Skill，用来把用户提供的 UI 截图还原成可粘贴到 Figma 的设计稿内容。

它的核心路径不是直接操作 Figma 文件，而是先根据截图梳理 `design.md` UI 设计规范，再创建 Vite React 项目高保真还原界面，最后通过 Figma Code to Canvas 的 capture 流程生成 `text/html` 剪贴板内容并直接写入系统剪贴板。用户直接粘贴到 Figma 后，得到可编辑的设计图层。

## 能力

- 解析 UI 截图中的布局、字号、颜色、间距、层级、图片、图标和组件状态，并先输出 `design.md`。
- 创建 Vite React 项目，使用 JSX 和 CSS 还原截图中的界面。
- 为按钮、输入框、导航、卡片、标签页等组件补齐默认、hover、active/click、focus 和 disabled 状态。
- 默认使用 `@hugeicons/react` 和 `@hugeicons/core-free-icons` 作为基础 UI 图标来源。
- 对 logo、品牌标识、吉祥物、IP、插画、照片、缩略图等视觉资产，使用截图裁切、用户提供素材或 image2/image generation 生成独立图片资产，不用粗糙 SVG 或 DOM 文本硬凑。
- 用本机 Chrome + Playwright Core 执行 Figma Code to Canvas capture，并优先把结果作为 `text/html` 写入系统剪贴板；失败时提供本地复制页。

## 关键原则

- 默认只有用户截图是可信输入；除非用户明确提供 URL 或素材，否则不去抓原网站资源。
- 基础线性图标、面型图标全部使用 Hugeicons React 包。
- 插画、IP、吉祥物、照片、产品图、复杂品牌图形优先作为图片资产处理。
- Codex 内置浏览器只用于视觉检查；capture 必须通过本机 Chrome + Playwright Core 执行，避免只读 evaluate 环境阻止注入脚本。
- `figma-capture.txt` 只是调试备份产物，不能让用户手动复制其文本内容，否则 Figma 会粘成一大段文字。
- 最终交付必须明确说明：Figma `text/html` payload 是否已经写入剪贴板，或提供可点击的本地 paste helper URL。

## 目录结构

```text
screenshot-to-figma/
  SKILL.md
  agents/
    openai.yaml
  assets/
    capture-for-design.js
  references/
    reconstruction-rules.md
  scripts/
    capture_with_chrome.mjs
    copy_figma_payload_to_clipboard.swift
```

## 安装

当前界面显示名是 `IMG to figma`，内部触发名是 `img-to-figma`。安装到 Codex 本地 skills 目录：

```bash
mkdir -p ~/.codex/skills/img-to-figma
cp -R screenshot-to-figma/SKILL.md \
  screenshot-to-figma/agents \
  screenshot-to-figma/assets \
  screenshot-to-figma/references \
  screenshot-to-figma/scripts \
  ~/.codex/skills/img-to-figma/
```

安装后重启 Codex，让新 skill 生效。

## 使用方式

在 Codex 中上传 UI 截图，然后使用：

```text
Use $img-to-figma to turn this UI screenshot into design.md, rebuild it in React with Hugeicons, and copy the Figma payload to my clipboard.
```

也可以用中文自然语言触发，例如：

```text
把这张 UI 截图转成可以粘贴到 Figma 的设计稿。
```

## 输出

一次完整执行应返回：

- `design.md` 路径。
- React 项目路径或用于 capture 的本地 dev server URL。
- 生成或裁切的图片资产路径。
- Figma capture 结果是否已作为 `text/html` 写入剪贴板。
- 如果不能直接写剪贴板，则返回本地 `figma-paste-helper.html` 地址。
- `figma-capture.txt` 调试备份路径。
- 剩余还原误差说明。

## 校验

使用 Codex 内置的 skill 校验脚本：

```bash
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py screenshot-to-figma
```

预期输出：

```text
Skill is valid!
```
