#!/usr/bin/env node

import { copyFileSync, existsSync, readFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const IMAGE_REF_PATTERN = /\.(png|jpe?g)$/i;

function usage() {
  console.error(`Usage:
  node ${path.basename(__filename)} <react-project-dir> [--max-edge 1600] [--max-bytes 1500000] [--dry-run]

Downsamples referenced local PNG/JPEG assets in-place for Figma capture and writes .capture-original backups.`);
}

function parseArgs(argv) {
  const args = {
    maxEdge: 1600,
    maxBytes: 1500000,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (value.startsWith("--")) {
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) throw new Error(`Missing value for ${value}`);
      args[value.slice(2)] = next;
      i += 1;
      continue;
    }
    if (!args.projectDir) args.projectDir = value;
  }

  if (!args.projectDir) {
    usage();
    process.exit(2);
  }

  args.projectDir = path.resolve(args.projectDir);
  args.maxEdge = Number(args.maxEdge);
  args.maxBytes = Number(args.maxBytes);

  if (!Number.isFinite(args.maxEdge) || args.maxEdge < 1) throw new Error("--max-edge must be a positive number.");
  if (!Number.isFinite(args.maxBytes) || args.maxBytes < 1) throw new Error("--max-bytes must be a positive number.");

  return args;
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
  const refs = new Set();

  for (const file of sourceFiles) {
    const text = readFileSync(file, "utf8");
    const patterns = [
      /(?:src|href)=["'`]([^"'`]+\.(?:png|jpe?g))["'`]/gi,
      /url\(["']?([^"')]+\.(?:png|jpe?g))["']?\)/gi,
      /["'`]([^"'`]*(?:\/assets\/|assets\/)[^"'`]+\.(?:png|jpe?g))["'`]/gi,
    ];
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        const ref = match[1];
        if (/^(https?:)?\/\//i.test(ref) || ref.startsWith("data:")) continue;
        refs.add(ref.split(/[?#]/)[0]);
      }
    }
  }

  return [...refs];
}

function resolveAsset(projectDir, ref) {
  const candidates = [];
  if (ref.startsWith("/")) {
    candidates.push(path.join(projectDir, "public", ref));
    candidates.push(path.join(projectDir, ref.slice(1)));
  } else {
    candidates.push(path.join(projectDir, ref));
    candidates.push(path.join(projectDir, "public", ref));
    candidates.push(path.join(projectDir, "src", ref));
  }
  return candidates.find((candidate) => existsSync(candidate));
}

function getImageInfo(file) {
  const output = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", "-g", "hasAlpha", file], {
    encoding: "utf8",
  });
  const width = Number(/pixelWidth:\s*(\d+)/.exec(output)?.[1] || 0);
  const height = Number(/pixelHeight:\s*(\d+)/.exec(output)?.[1] || 0);
  const hasAlpha = /hasAlpha:\s*yes/.test(output);
  return { width, height, hasAlpha };
}

function backupPath(file) {
  const parsed = path.parse(file);
  return path.join(parsed.dir, `${parsed.name}.capture-original${parsed.ext}`);
}

const args = parseArgs(process.argv.slice(2));
const referenced = collectReferencedAssets(args.projectDir)
  .map((ref) => resolveAsset(args.projectDir, ref))
  .filter(Boolean)
  .filter((file, index, files) => files.indexOf(file) === index)
  .filter((file) => IMAGE_REF_PATTERN.test(file));

const report = [];
let changed = 0;

for (const file of referenced) {
  const stat = statSync(file);
  const info = getImageInfo(file);
  const longEdge = Math.max(info.width, info.height);
  const shouldResize = longEdge > args.maxEdge || stat.size > args.maxBytes;
  const sizeRatio = stat.size > args.maxBytes ? Math.sqrt(args.maxBytes / stat.size) : 1;
  const targetEdge = Math.max(128, Math.floor(Math.min(args.maxEdge, longEdge) * Math.min(1, sizeRatio)));

  if (!shouldResize) {
    report.push(`ok ${path.relative(args.projectDir, file)} ${info.width}x${info.height} ${stat.size}B`);
    continue;
  }

  report.push(`resize ${path.relative(args.projectDir, file)} ${info.width}x${info.height} ${stat.size}B -> max ${targetEdge}px`);
  if (args.dryRun) continue;

  const backup = backupPath(file);
  if (!existsSync(backup)) copyFileSync(file, backup);

  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.capture-tmp${path.extname(file)}`);
  execFileSync("sips", ["-Z", String(targetEdge), file, "--out", tmp], { encoding: "utf8" });
  copyFileSync(tmp, file);
  unlinkSync(tmp);
  changed += 1;
}

for (const line of report) console.log(line);
console.log(`Capture asset prep complete: ${referenced.length} referenced image(s), ${changed} resized.`);
