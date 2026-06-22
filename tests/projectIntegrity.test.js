const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
const dashboardPackage = readJson("dashboard/package.json");
const dashboardLock = readJson("dashboard/package-lock.json");
const config = readJson("config.json");
const configExample = readJson("config.example.json");

const expectedVersion = packageJson.version;
assert.match(expectedVersion, /^\d+\.\d+\.\d+$/, "Versi package utama harus berbentuk semver.");
assert.equal(packageLock.version, expectedVersion, "Versi package-lock utama tidak sinkron.");
assert.equal(dashboardPackage.version, expectedVersion, "Versi dashboard tidak sinkron.");
assert.equal(dashboardLock.version, expectedVersion, "Versi package-lock dashboard tidak sinkron.");
assert.equal(config.version, expectedVersion, "Versi config aktif tidak sinkron.");
assert.equal(configExample.version, expectedVersion, "Versi config contoh tidak sinkron.");

assert.notEqual(packageJson.dependencies["@napi-rs/canvas"], "latest", "Dependency runtime tidak boleh memakai tag latest.");
assert.equal(packageJson.overrides?.undici, "6.27.0", "Patch keamanan undici harus tetap dikunci.");
assert.ok(fs.existsSync(path.join(root, "dashboard", "tsconfig.json")), "Dashboard wajib memiliki tsconfig.json.");

const nodeVersion = fs.readFileSync(path.join(root, ".nvmrc"), "utf8").trim();
const discloudConfig = fs.readFileSync(path.join(root, "discloud.config"), "utf8");
assert.match(packageJson.engines?.node || "", /22/, "Node engine utama harus tetap pada Node 22.");
assert.match(discloudConfig, new RegExp(`^VERSION=${nodeVersion.replace(/\./g, "\\.")}$`, "m"), "Versi Node DisCloud tidak sinkron dengan .nvmrc.");

const dashboardHtml = fs.readFileSync(path.join(root, "dashboard", "dist", "index.html"), "utf8");
const localAssets = [...dashboardHtml.matchAll(/(?:src|href)="\/dashboard\/([^"?#]+)[^\"]*"/g)].map((match) => match[1]);
assert.ok(localAssets.length > 0, "Build dashboard tidak mereferensikan asset lokal.");
for (const relativeAsset of localAssets) {
  assert.ok(fs.existsSync(path.join(root, "dashboard", "dist", relativeAsset)), `Asset build dashboard hilang: ${relativeAsset}`);
}

console.log(`✅ Project integrity test berhasil: metadata v${expectedVersion}, lockfile, dependency aman, TypeScript, dan asset dashboard sinkron.`);
