"use strict";
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const manager = require("../services/afkVoiceManager");

assert.equal(manager.DEFAULTS.guildId, "1504495052217651343");
assert.equal(manager.DEFAULTS.enabled, false);
assert.equal(manager.DEFAULTS.selfMute, true);
assert.equal(manager.DEFAULTS.selfDeaf, true);
assert.equal(manager.DEFAULTS.autoReconnect, true);
assert.equal(manager.DEFAULTS.reconnectDelayMs, 5000);
assert.equal(manager.DEFAULTS.maxReconnectDelayMs, 60000);
assert.equal(manager.DEFAULTS.gatewayJoinTimeoutMs, 15000);
assert.equal(manager.DEFAULTS.transportReadyTimeoutMs, 45000);
assert.equal(manager.DEFAULTS.healthCheckIntervalMs, 30000);

for (const code of [
  "FEATURE_DISABLED", "CHANNEL_NOT_SELECTED", "CHANNEL_NOT_FOUND", "CHANNEL_WRONG_TYPE",
  "CHANNEL_WRONG_GUILD", "GUILD_NOT_FOUND", "MISSING_VIEW_CHANNEL",
  "MISSING_CONNECT_PERMISSION", "CHANNEL_FULL"
]) assert.equal(manager._isRetryableErrorCode(code), false, `${code} tidak boleh membuat loop reconnect`);

for (const code of [
  "BOT_NOT_READY", "VOICE_ADAPTER_UNAVAILABLE", "VOICE_JOIN_ERROR", "VOICE_CONNECT_TIMEOUT",
  "VOICE_GATEWAY_TIMEOUT", "VOICE_DISCONNECTED", "VOICE_HEALTH_MISSING"
]) assert.equal(manager._isRetryableErrorCode(code), true, `${code} harus boleh retry bertahap`);

let status = manager.getAfkVoiceStatus();
assert.equal(status.state, "Dinonaktifkan");
assert.equal(status.enabled, false);
assert.equal(status.selfMute, true);
assert.equal(status.selfDeaf, true);
assert.equal(status.autoReconnect, true);

// AFK-only fallback: saat Discord voice state sudah menunjukkan bot berada di
// channel tujuan, manager harus menganggapnya terhubung walaupun transport UDP
// belum Ready. Ini mencegah siklus destroy/reconnect "The operation was aborted".
const guildId = "1504495052217651343";
const channelId = "1516848430713012244";
const channel = { id: channelId, name: "💼│kantor-pejabat", parent: { name: "Kantor Desa" } };
const guild = {
  id: guildId,
  members: { me: { voice: { channelId } } },
  channels: { cache: new Map([[channelId, channel]]) }
};
class FakeClient extends EventEmitter {
  constructor() {
    super();
    this.user = { id: "999999999999999999" };
    this.guilds = { cache: new Map([[guildId, guild]]) };
  }
}
const fakeClient = new FakeClient();
manager.initializeAfkVoiceManager({
  client: fakeClient,
  getConfig: () => ({
    afkVoice: {
      enabled: true,
      guildId,
      channelId,
      selfMute: true,
      selfDeaf: true,
      autoReconnect: true,
      reconnectDelayMs: 5000,
      maxReconnectDelayMs: 60000
    }
  })
});
assert.equal(manager._voicePresenceMatches(), true);
assert.equal(manager._isActuallyConnected(), true);
assert.equal(manager.scheduleReconnect("uji fallback", "VOICE_DISCONNECTED"), false);
status = manager.getAfkVoiceStatus();
assert.equal(status.state, "Terhubung");
assert.equal(status.voiceStateConnected, true);
assert.equal(status.hasReconnectTimer, false);

manager._resetForTests();
console.log("AFK Voice lifecycle tests: single-flight reconnect, fallback gateway, dan status nyata berhasil");
