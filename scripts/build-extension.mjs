import { build } from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");

await mkdir(dist, { recursive: true });

await Promise.all([
  build({
    entryPoints: [resolve(root, "src/background/serviceWorker.ts")],
    outfile: resolve(dist, "serviceWorker.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "chrome120",
    sourcemap: true
  }),
  build({
    entryPoints: [resolve(root, "src/content/contentScript.ts")],
    outfile: resolve(dist, "contentScript.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "chrome120",
    loader: {
      ".css": "text"
    },
    sourcemap: true
  }),
  copyFile(resolve(root, "manifest.json"), resolve(dist, "manifest.json"))
]);
