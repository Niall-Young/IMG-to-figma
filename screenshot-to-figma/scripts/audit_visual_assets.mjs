#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

const COMPLEX_ASSET_PATTERN =
  /(hero|portrait|avatar|mascot|character|illustration|photo|product|thumbnail|screenshot|project|banner|artwork)/i;
const SVG_GENERATOR_PATTERN =
  /(<svg[\s>]|svgWrap|sharp\s*\(\s*Buffer\.from\s*\(\s*svg|\.toFile\s*\(|canvas|getContext\s*\()/i;
const CROP_SOURCE_PATTERN =
  /(source\s*:\s*[^\n]*(crop|cutout|screenshot|原图|原截图|截图|切图)|来自原截图|来自截图|raw crop|screenshot crop|input screenshot crop)/i;
const GENERATED_SOURCE_PATTERN =
  /(image\s*generation|image2|generated bitmap|generated asset|生成图|图片生成|生图|generated output|user-supplied|用户提供|original file)/i;

function usage() {
  console.error(`Usage:
  node ${path.basename(__filename)} <react-project-dir>`);
}

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function collectReferencedAssets(projectDir) {
  const sourceFiles = walk(projectDir).filter((file) => /\.(jsx?|tsx?|css|html)$/.test(file));
  const assets = new Set();

  for (const file of sourceFiles) {
    const text = readFileSync(file, "utf8");
    const patterns = [
      /(?:src|href)=["'`]([^"'`]+\.(?:png|jpe?g|webp|gif|svg))["'`]/gi,
      /url\(["']?([^"')]+\.(?:png|jpe?g|webp|gif|svg))["']?\)/gi,
      /["'`]([^"'`]*(?:\/assets\/|assets\/)[^"'`]+\.(?:png|jpe?g|webp|gif|svg))["'`]/gi,
    ];

    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        const ref = match[1];
        if (/^(https?:)?\/\//i.test(ref) || ref.startsWith("data:")) continue;
        assets.add(ref);
      }
    }
  }

  return [...assets];
}

function resolveAsset(projectDir, ref) {
  const cleanRef = ref.split(/[?#]/)[0];
  const candidates = [];

  if (cleanRef.startsWith("/")) {
    candidates.push(path.join(projectDir, "public", cleanRef));
    candidates.push(path.join(projectDir, cleanRef.slice(1)));
  } else {
    candidates.push(path.join(projectDir, cleanRef));
    candidates.push(path.join(projectDir, "public", cleanRef));
    candidates.push(path.join(projectDir, "src", cleanRef));
  }

  return candidates.find((candidate) => existsSync(candidate));
}

function collectGeneratorHits(projectDir) {
  const scriptDirs = [path.join(projectDir, "scripts"), path.join(projectDir, "tools")];
  const files = scriptDirs.flatMap((dir) => walk(dir)).filter((file) => /\.(mjs|cjs|js|ts)$/.test(file));
  const hits = new Map();

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    if (!SVG_GENERATOR_PATTERN.test(text)) continue;

    for (const match of text.matchAll(/["'`]([^"'`]+\.(?:png|jpe?g|webp))["'`]/gi)) {
      const filename = path.basename(match[1]);
      if (!COMPLEX_ASSET_PATTERN.test(filename)) continue;
      if (!hits.has(filename)) hits.set(filename, []);
      hits.get(filename).push(file);
    }
  }

  return hits;
}

function readDesignSpec(projectDir) {
  const candidates = [path.join(projectDir, "design.md"), path.join(projectDir, "DESIGN.md")];
  const file = candidates.find((candidate) => existsSync(candidate));
  if (!file) return null;
  return {
    file,
    text: readFileSync(file, "utf8"),
  };
}

function findDesignContexts(designText, filename) {
  const stem = path.basename(filename, path.extname(filename));
  const needles = [filename, stem].filter(Boolean);
  const contexts = [];

  for (const needle of needles) {
    let index = designText.toLowerCase().indexOf(needle.toLowerCase());
    while (index !== -1) {
      contexts.push(designText.slice(Math.max(0, index - 600), Math.min(designText.length, index + 900)));
      index = designText.toLowerCase().indexOf(needle.toLowerCase(), index + needle.length);
    }
  }

  return contexts;
}

const projectDir = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!projectDir || !existsSync(projectDir)) {
  usage();
  process.exit(2);
}

const referencedAssets = collectReferencedAssets(projectDir);
const generatorHits = collectGeneratorHits(projectDir);
const designSpec = readDesignSpec(projectDir);
const failures = [];

for (const ref of referencedAssets) {
  const resolved = resolveAsset(projectDir, ref);
  const filename = path.basename(ref);

  if (!resolved) {
    failures.push(`Missing referenced image asset: ${ref}`);
    continue;
  }

  const size = statSync(resolved).size;
  if (size === 0) {
    failures.push(`Empty image asset: ${resolved}`);
  }

  if (COMPLEX_ASSET_PATTERN.test(filename) && generatorHits.has(filename)) {
    const scripts = [...new Set(generatorHits.get(filename))].map((file) => path.relative(projectDir, file));
    failures.push(
      `Complex image asset "${filename}" appears to be generated by SVG/shape code in ${scripts.join(", ")}. Use a screenshot crop, user-supplied file, or image generation output instead.`,
    );
  }

  if (COMPLEX_ASSET_PATTERN.test(filename) && designSpec) {
    const contexts = findDesignContexts(designSpec.text, filename);
    const hasGeneratedContext = contexts.some((context) => GENERATED_SOURCE_PATTERN.test(context));
    const hasCropContext = contexts.some((context) => CROP_SOURCE_PATTERN.test(context));

    if (contexts.length === 0) {
      failures.push(`Complex image asset "${filename}" is not recorded in ${path.basename(designSpec.file)} with source provenance.`);
    } else if (hasCropContext && !hasGeneratedContext) {
      failures.push(
        `Complex image asset "${filename}" is recorded as a screenshot crop/cutout source in ${path.basename(designSpec.file)}. Use the crop only as a reference and persist an image generation output or user-supplied original as the final asset.`,
      );
    } else if (!hasGeneratedContext) {
      failures.push(
        `Complex image asset "${filename}" does not have an image generation output or user-supplied original source recorded in ${path.basename(designSpec.file)}.`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("Visual asset audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Visual asset audit passed: ${referencedAssets.length} referenced image asset(s) checked.`);
