// Renders resume/resume.html to public/Ekansh_Verma_Resume.pdf with local Chrome.
// usage: node scripts/build-resume.mjs [chromePath]
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const src = path.join(root, "resume", "resume.html");
const out = path.join(root, "public", "Ekansh_Verma_Resume.pdf");
const chromePath =
  process.argv[2] ??
  (process.platform === "win32"
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : "google-chrome");

const port = 9400 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "resume-"));
const chrome = spawn(chromePath, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], {
  stdio: "ignore",
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page");
    } catch {}
  }
  if (!target) throw new Error("Chrome did not start");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0;
  const waiters = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && waiters.has(msg.id)) waiters.get(msg.id)(msg), waiters.delete(msg.id);
  });
  const send = (method, params = {}) =>
    new Promise((r) => {
      const i = ++id;
      waiters.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params }));
    });

  await send("Page.enable");
  await send("Page.navigate", { url: pathToFileURL(src).href });
  await sleep(1500);
  const pages = await send("Runtime.evaluate", {
    expression: "Math.ceil(document.querySelector('.page').scrollHeight / (297 * 96 / 25.4))",
    returnByValue: true,
  });
  const pdf = await send("Page.printToPDF", {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
  });
  if (!pdf.result?.data) throw new Error(JSON.stringify(pdf.error ?? pdf));
  fs.writeFileSync(out, Buffer.from(pdf.result.data, "base64"));
  console.log(`wrote ${path.relative(root, out)} (about ${pages.result.result.value} page(s))`);
  ws.close();
} finally {
  chrome.kill();
  await sleep(300);
  fs.rmSync(profile, { recursive: true, force: true });
}
