"use strict";
const assert = require("node:assert/strict");
const manager = require("../services/afkVoiceManager");

assert.equal(manager.DEFAULTS.guildId, "1504495052217651343");
assert.equal(manager.DEFAULTS.enabled, false);
assert.equal(manager.DEFAULTS.selfMute, true);
assert.equal(manager.DEFAULTS.selfDeaf, true);
assert.equal(manager.DEFAULTS.autoReconnect, true);
assert.equal(manager.DEFAULTS.reconnectDelayMs, 5000);
assert.equal(manager.DEFAULTS.maxReconnectDelayMs, 60000);

for (const code of [
  "FEATURE_DISABLED", "CHANNEL_NOT_SELECTED", "CHANNEL_NOT_FOUND", "CHANNEL_WRONG_TYPE",
  "CHANNEL_WRONG_GUILD", "GUILD_NOT_FOUND", "MISSING_VIEW_CHANNEL",
  "MISSING_CONNECT_PERMISSION", "CHANNEL_FULL"
]) assert.equal(manager._isRetryableErrorCode(code), false, `${code} tidak boleh membuat loop reconnect`);

for (const code of ["BOT_NOT_READY", "VOICE_ADAPTER_UNAVAILABLE", "VOICE_JOIN_ERROR", "VOICE_CONNECT_TIMEOUT", "VOICE_DISCONNECTED"])
  assert.equal(manager._isRetryableErrorCode(code), true, `${code} harus boleh retry bertahap`);

const status = manager.getAfkVoiceStatus();
assert.equal(status.state, "Dinonaktifkan");
assert.equal(status.enabled, false);
assert.equal(status.selfMute, true);
assert.equal(status.selfDeaf, true);
assert.equal(status.autoReconnect, true);
manager._resetForTests();
console.log("AFK Voice lifecycle tests: konfigurasi, status nyata, dan kebijakan reconnect berhasil");
