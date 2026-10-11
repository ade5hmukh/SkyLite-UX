import { consola } from "consola";

// A standalone page for old tablets (iOS 12) that can't run the main app.
async function readAsset(name: string): Promise<string> {
  const raw = await useStorage("assets:server").getItemRaw(`kiosk/${name}`);
  if (typeof raw === "string")
    return raw;
  return raw ? Buffer.from(raw as Uint8Array).toString("utf8") : "";
}

function toScriptJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const who = typeof query.who === "string" ? query.who : "";

  let data = null;
  try {
    data = await getKioskData(who);
  }
  catch (error) {
    consola.error("Kiosk: Failed to load initial data:", error);
  }

  const [css, js] = await Promise.all([readAsset("kiosk.css"), readAsset("kiosk.js")]);

  setHeader(event, "Content-Type", "text/html; charset=utf-8");
  setHeader(event, "Cache-Control", "no-store");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#06b6d4">
<link rel="apple-touch-icon" href="/icon-192.png">
<title>SkyLite Kiosk</title>
<style>${css}</style>
</head>
<body>
<div id="app"><div class="loading">Loading…</div></div>
<div id="celebration"></div>
<script>window.KIOSK_DATA = ${toScriptJson(data)}; window.KIOSK_WHO = ${toScriptJson(who)};</script>
<script>${js}</script>
</body>
</html>`;
});
