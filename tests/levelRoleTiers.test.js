"use strict";

const assert = require("node:assert/strict");
const {
  MAX_LEVEL,
  LEVEL_ROLE_TIER_DEFINITIONS,
  clampLevel,
  getLevelTier,
  getLevelRoleTiers
} = require("../level/levelRoleTiers");

const config = { levelSystem: { enabled: true, autoLevelRole: true, roles: {}, autoRoleMode: "dynamic_on_demand" } };

const cases = [
  [1, "Warga Anyar (Lvl. 1)"], [4, "Warga Anyar (Lvl. 1)"],
  [5, "Warga Tetap (Lvl. 5)"], [9, "Warga Tetap (Lvl. 5)"],
  [10, "Warga Aktif (Lvl. 10)"], [19, "Warga Aktif (Lvl. 10)"],
  [20, "Warga Teladan (Lvl. 20)"], [29, "Warga Teladan (Lvl. 20)"],
  [30, "Tokoh Warga (Lvl. 30)"], [49, "Tokoh Warga (Lvl. 30)"],
  [50, "Sesepuh Desa (Lvl. 50)"], [99, "Sesepuh Desa (Lvl. 50)"],
  [100, "Penggerak Desa (Lvl. 100)"], [149, "Penggerak Desa (Lvl. 100)"],
  [150, "Tokoh Desa (Lvl. 150)"], [199, "Tokoh Desa (Lvl. 150)"],
  [200, "Pemuka Desa (Lvl. 200)"], [299, "Pemuka Desa (Lvl. 200)"],
  [300, "Panutan Desa (Lvl. 300)"], [399, "Panutan Desa (Lvl. 300)"],
  [400, "Kehormatan Desa (Lvl. 400)"], [499, "Kehormatan Desa (Lvl. 400)"],
  [500, "Legenda Desa (Lvl. 500)"], [749, "Legenda Desa (Lvl. 500)"],
  [750, "Kebanggaan Desa (Lvl. 750)"], [999, "Kebanggaan Desa (Lvl. 750)"],
  [1000, "Karuhun Desa (Lvl. Max)"], [1001, "Karuhun Desa (Lvl. Max)"]
];

for (const [level, expected] of cases) {
  assert.equal(getLevelTier(level, config).roleName, expected, `Level ${level}`);
}

assert.equal(MAX_LEVEL, 1000);
assert.equal(clampLevel(0), 1);
assert.equal(clampLevel(5000), 1000);
assert.equal(getLevelRoleTiers(config).length, 14);
assert.equal(new Set(getLevelRoleTiers(config).map((tier) => tier.roleName)).size, 14);
assert.equal(getLevelTier(1000, config).roleName, "Karuhun Desa (Lvl. Max)");
assert.equal(getLevelRoleTiers(config).every((tier) => tier.roleId === ""), true);

console.log("✅ Auto Level Role dynamic tier tests: 28 boundary cases passed, role manual tidak dipakai, Lvl Max benar.");
