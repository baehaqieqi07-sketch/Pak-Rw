const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
const match = source.match(/const pakRwDashboardAllowedRoots = new Set\(\[([\s\S]*?)\]\);/);
assert.ok(match, "Allowlist dashboard tidak ditemukan di index.js");

const roots = new Set([...match[1].matchAll(/"([A-Za-z0-9_-]+)"/g)].map((item) => item[1]));
assert.ok(roots.has("ktpSystem"), "ktpSystem wajib ada di allowlist dashboard");

function isSafeDashboardPath(input = "") {
  const value = String(input || "").trim();
  if (!/^[A-Za-z0-9_.-]{1,120}$/.test(value)) return false;
  const root = value.split(".")[0];
  if (!roots.has(root)) return false;
  return !/(token|secret|password|mongodb|api[_-]?key|discord[_-]?token)/i.test(value);
}

for (const allowed of [
  "ktpSystem.enabled",
  "ktpSystem.channelId",
  "ktpSystem.cooldownSeconds",
  "ktpSystem.allowUpdate",
  "ktpSystem.panelTitle",
  "ktpSystem.backgroundPath"
]) {
  assert.equal(isSafeDashboardPath(allowed), true, `${allowed} seharusnya diizinkan`);
}

for (const blocked of [
  "ktpSystem.token",
  "ktpSystem.password",
  "ktpSystem.apiKey",
  "unknownRoot.enabled",
  "ktpSystem.enabled;process.exit()"
]) {
  assert.equal(isSafeDashboardPath(blocked), false, `${blocked} seharusnya ditolak`);
}

console.log("✅ Dashboard KTP allowlist tests berhasil.");
