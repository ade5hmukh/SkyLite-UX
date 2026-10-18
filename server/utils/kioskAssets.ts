import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

type KioskAssets = { css: string; js: string; version: string };

let cached: Promise<KioskAssets> | null = null;

async function readAsset(name: string): Promise<string> {
  const raw = await useStorage("assets:server").getItemRaw(`kiosk/${name}`);
  if (typeof raw === "string")
    return raw;
  return raw ? Buffer.from(raw as Uint8Array).toString("utf8") : "";
}

/** The kiosk page's CSS and JS, plus a version that changes whenever either does (open pages reload on a new one). */
export function getKioskAssets(): Promise<KioskAssets> {
  if (!cached) {
    cached = Promise.all([readAsset("kiosk.css"), readAsset("kiosk.js")])
      .then(([css, js]) => ({ css, js, version: createHash("sha1").update(css).update(js).digest("hex").slice(0, 12) }))
      .catch((error) => {
        cached = null;
        throw error;
      });
  }
  return cached;
}
