"use strict";

const MAX_LEVEL = 1000;

// Satu-satunya sumber nama dan batas tingkatan level Pak RW.
// Role ID dibaca dari config.levelSystem.roles berdasarkan angka minimum level.
const LEVEL_ROLE_TIER_DEFINITIONS = Object.freeze([
  Object.freeze({ level: 1, name: "Warga Anyar" }),
  Object.freeze({ level: 5, name: "Warga Tetap" }),
  Object.freeze({ level: 10, name: "Warga Aktif" }),
  Object.freeze({ level: 20, name: "Warga Teladan" }),
  Object.freeze({ level: 30, name: "Tokoh Warga" }),
  Object.freeze({ level: 50, name: "Sesepuh Desa" }),
  Object.freeze({ level: 100, name: "Penggerak Desa" }),
  Object.freeze({ level: 150, name: "Tokoh Desa" }),
  Object.freeze({ level: 200, name: "Pemuka Desa" }),
  Object.freeze({ level: 300, name: "Panutan Desa" }),
  Object.freeze({ level: 400, name: "Kehormatan Desa" }),
  Object.freeze({ level: 500, name: "Legenda Desa" }),
  Object.freeze({ level: 750, name: "Kebanggaan Desa" }),
  Object.freeze({ level: 1000, name: "Karuhun Desa" })
]);

function clampLevel(level) {
  return Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(level) || 1)));
}

function normalizeRoleId(value) {
  const roleId = String(value || "").trim();
  return /^\d{16,22}$/.test(roleId) ? roleId : "";
}

function getLevelSystemConfig(config = {}) {
  const levelSystem = config.levelSystem && typeof config.levelSystem === "object"
    ? config.levelSystem
    : {};
  const legacyLevel = config.level && typeof config.level === "object"
    ? config.level
    : {};

  return {
    enabled: levelSystem.enabled !== false && legacyLevel.enabled !== false,
    maxLevel: MAX_LEVEL,
    levelChannelId: String(levelSystem.levelChannelId || config.levelChannelId || "").trim(),
    autoLevelRole: levelSystem.autoLevelRole !== false,
    roles: levelSystem.roles && typeof levelSystem.roles === "object"
      ? levelSystem.roles
      : {}
  };
}

function getLevelRoleTiers(config = {}) {
  const system = getLevelSystemConfig(config);
  return LEVEL_ROLE_TIER_DEFINITIONS.map((tier) => ({
    ...tier,
    roleId: normalizeRoleId(system.roles[String(tier.level)])
  }));
}

function getLevelTier(level, config = {}) {
  const safeLevel = clampLevel(level);
  const tiers = getLevelRoleTiers(config);
  for (let index = tiers.length - 1; index >= 0; index -= 1) {
    if (safeLevel >= tiers[index].level) return tiers[index];
  }
  return tiers[0];
}

function getConfiguredLevelRoleIds(config = {}) {
  return getLevelRoleTiers(config)
    .map((tier) => tier.roleId)
    .filter(Boolean);
}

module.exports = {
  MAX_LEVEL,
  LEVEL_ROLE_TIER_DEFINITIONS,
  clampLevel,
  getLevelSystemConfig,
  getLevelRoleTiers,
  getLevelTier,
  getConfiguredLevelRoleIds
};
