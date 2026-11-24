// Tells Bing, Yandex and other IndexNow engines about every URL in the live sitemap.
// usage: node scripts/indexnow.mjs   (run after a deploy has finished)
import fs from "node:fs";
import path from "node:path";

const host = "www.ekanshverma.site";
const keyFile = fs.readdirSync(path.resolve(import.meta.dirname, "..", "public")).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error("IndexNow key file missing from public/");
const key = keyFile.replace(".txt", "");

const sitemap = await (await fetch(`https://${host}/sitemap.xml`)).text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
urlList.push(`https://${host}/llms.txt`);

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${keyFile}`, urlList }),
});
console.log(`IndexNow: ${res.status} ${res.statusText} for ${urlList.length} URLs`);
