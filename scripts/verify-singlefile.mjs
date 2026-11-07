import fs from "node:fs";
import path from "node:path";

const outDir = path.resolve("dist-single");
const htmlPath = path.join(outDir, "convert.html");

function fail(message) {
  console.error(`Single-file build verification failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(htmlPath)) fail("dist-single/convert.html was not generated");
const html = fs.readFileSync(htmlPath, "utf8");

// The app's module entry must be in the HTML, not linked as a separate entry JS file.
const inlineModule = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].some(
  ([, attrs, body]) => /type=["']module["']/i.test(attrs) && body.trim().length > 0,
);
if (!inlineModule) fail("no inline type=module application script was found");

// mini-coi.js must remain external: service workers cannot be embedded in an HTML file.
if (!fs.existsSync(path.join(outDir, "mini-coi.js"))) {
  fail("mini-coi.js is missing; cross-origin isolation cannot be established");
}
if (!/mini-coi\.js/.test(html)) {
  fail("convert.html no longer references mini-coi.js");
}

// Check every local src/href in the HTML resolves inside the output directory.
const localRefs = new Set();
for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
  const ref = match[1].trim();
  if (!ref || /^(?:[a-z]+:|\/\/|#)/i.test(ref)) continue;
  localRefs.add(ref.split(/[?#]/, 1)[0]);
}
const missing = [];
for (const ref of localRefs) {
  const target = path.resolve(outDir, decodeURIComponent(ref));
  if (!target.startsWith(outDir + path.sep) && target !== outDir) {
    missing.push(`${ref} (path escapes output directory)`);
  } else if (!fs.existsSync(target)) {
    missing.push(ref);
  }
}
if (missing.length) fail(`missing local HTML resources: ${missing.join(", ")}`);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(outDir).map((file) => path.relative(outDir, file).replaceAll(path.sep, "/"));
const sidecars = files.filter((file) => file !== "convert.html");
const audit = {
  html: "convert.html",
  inlineModuleFound: true,
  serviceWorker: "mini-coi.js (required external file)",
  sidecarFileCount: sidecars.length,
  sidecarFiles: sidecars,
  note: "This is an HTML-first bundle, not a self-contained file:// app. Serve the whole folder over localhost or HTTPS.",
};
fs.writeFileSync(path.join(outDir, "singlefile-audit.json"), JSON.stringify(audit, null, 2));

console.log(`Verified ${htmlPath}`);
console.log(`Found ${sidecars.length} required/supporting sidecar files.`);
console.log("The HTML entry JS is inline; worker/runtime assets and mini-coi.js remain external by design.");
