"use strict";

const assert = require("node:assert/strict");
const {
  MAX_LEVEL,
  LEVEL_ROLE_TIER_DEFINITIONS,
  clampLevel,
  getLevelTier,
  getLevelRoleTiers
} = require("../level/levelRoleTiers");

const roles = Object.fromEntries(
  LEVEL_ROLE_TIER_DEFINITIONS.map((tier, index) => [String(tier.level), String(100000000000000000n + BigInt(index))])
);
const config = { levelSystem: { enabled: true, autoLevelRole: true, roles } };

const cases = [
  [1, "Warga Anyar"], [4, "Warga Anyar"],
  [5, "Warga Tetap"], [9, "Warga Tetap"],
  [10, "Warga Aktif"], [19, "Warga Aktif"],
  [20, "Warga Teladan"], [29, "Warga Teladan"],
  [30, "Tokoh Warga"], [49, "Tokoh Warga"],
  [50, "Sesepuh Desa"], [99, "Sesepuh Desa"],
  [100, "Penggerak Desa"], [149, "Penggerak Desa"],
  [150, "Tokoh Desa"], [199, "Tokoh Desa"],
  [200, "Pemuka Desa"], [299, "Pemuka Desa"],
  [300, "Panutan Desa"], [399, "Panutan Desa"],
  [400, "Kehormatan Desa"], [499, "Kehormatan Desa"],
  [500, "Legenda Desa"], [749, "Legenda Desa"],
  [750, "Kebanggaan Desa"], [999, "Kebanggaan Desa"],
  [1000, "Karuhun Desa"], [1001, "Karuhun Desa"]
];

for (const [level, expected] of cases) {
  assert.equal(getLevelTier(level, config).name, expected, `Level ${level}`);
}

assert.equal(MAX_LEVEL, 1000);
assert.equal(clampLevel(0), 1);
assert.equal(clampLevel(5000), 1000);
assert.equal(getLevelRoleTiers(config).length, 14);
assert.equal(new Set(getLevelRoleTiers(config).map((tier) => tier.name)).size, 14);

console.log("✅ Auto Level Role tier tests: 28 boundary cases passed.");
