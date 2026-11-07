import { spawn } from "node:child_process";
import puppeteer from "puppeteer";

const host = "127.0.0.1";
const port = 4187;
const url = `http://${host}:${port}/convert.html`;
const server = spawn(
  "bun",
  ["run", "vite", "preview", "--host", host, "--port", String(port), "--strictPort", "--outDir", "dist-single"],
  { stdio: "ignore" },
);
let browser;

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error("Vite preview did not become ready within 30 seconds");
}

try {
  await waitForServer();
  browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForFunction(
    () => document.querySelector("#app")?.childElementCount > 0,
    { timeout: 90_000 },
  );
  const isolated = await page.evaluate(() => globalThis.crossOriginIsolated === true);
  if (!isolated) throw new Error("browser page did not become cross-origin isolated");
  if (pageErrors.length) throw new Error(`browser runtime errors: ${pageErrors.join(" | ")}`);

  console.log("Browser smoke test passed: app mounted and cross-origin isolation is active.");
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
