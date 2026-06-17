"use strict";

const {
  joinVoiceChannel,
  getVoiceConnection,
  entersState,
  VoiceConnectionStatus
} = require("@discordjs/voice");
const { ChannelType, PermissionsBitField } = require("discord.js");

const DEFAULTS = Object.freeze({
  enabled: false,
  guildId: "1504495052217651343",
  channelId: "",
  selfMute: true,
  selfDeaf: true,
  autoReconnect: true,
  reconnectDelayMs: 5000,
  maxReconnectDelayMs: 60000,
  updatedAt: null,
  updatedBy: null
});

let clientRef = null;
let configReader = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let manualDisconnect = false;
let shuttingDown = false;
let operation = Promise.resolve();
let lastActionAt = 0;

const runtime = {
  state: "Dinonaktifkan",
  guildId: "",
  channelId: "",
  channelName: "",
  categoryName: "",
  connectedAt: null,
  lastAttemptAt: null,
  reconnectAttempts: 0,
  lastError: "",
  errorCode: "",
  updatedAt: new Date().toISOString()
};

function nowIso() { return new Date().toISOString(); }
function readConfig() {
  const raw = typeof configReader === "function" ? configReader() : {};
  return { ...DEFAULTS, ...(raw?.afkVoice || raw || {}) };
}
function setRuntime(patch) {
  Object.assign(runtime, patch, { updatedAt: nowIso(), reconnectAttempts });
}
function clearReconnectTimer() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
}
function queue(task) {
  operation = operation.then(task, task);
  return operation;
}
function voiceType(channel) {
  return channel?.type === ChannelType.GuildVoice;
}

async function validateAfkVoiceChannel(config = readConfig()) {
  if (!clientRef?.isReady?.()) return { ok: false, errorCode: "BOT_NOT_READY", message: "Bot Pak RW belum online di Discord." };
  const guildId = String(config.guildId || DEFAULTS.guildId);
  const guild = clientRef.guilds.cache.get(guildId) || await clientRef.guilds.fetch(guildId).catch(() => null);
  if (!guild) return { ok: false, errorCode: "GUILD_NOT_FOUND", message: "Server DESA TULUS tidak ditemukan." };
  const channelId = String(config.channelId || "");
  if (!channelId) return { ok: false, errorCode: "CHANNEL_NOT_SELECTED", message: "Channel Voice AFK belum dipilih." };
  const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !voiceType(channel)) return { ok: false, errorCode: "CHANNEL_NOT_FOUND", message: "Channel Voice AFK tidak ditemukan atau bukan voice channel." };
  const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
  if (!me) return { ok: false, errorCode: "BOT_MEMBER_NOT_FOUND", message: "Data member bot Pak RW belum tersedia." };
  const perms = channel.permissionsFor(me);
  if (!perms?.has(PermissionsBitField.Flags.ViewChannel)) return { ok: false, errorCode: "MISSING_VIEW_CHANNEL", message: "Pak RW tidak memiliki izin View Channel pada voice tersebut." };
  if (!perms?.has(PermissionsBitField.Flags.Connect)) return { ok: false, errorCode: "MISSING_CONNECT_PERMISSION", message: "Pak RW tidak memiliki izin Connect pada voice tersebut." };
  return { ok: true, guild, channel, me };
}

function destroyExistingConnection(guildId, { intentional = true } = {}) {
  const connection = getVoiceConnection(String(guildId || runtime.guildId || DEFAULTS.guildId));
  if (!connection) return false;
  manualDisconnect = intentional;
  try { connection.removeAllListeners(); } catch {}
  try { connection.destroy(); } catch {}
  return true;
}

function scheduleReconnect(reason = "Koneksi terputus") {
  const cfg = readConfig();
  if (shuttingDown || manualDisconnect || !cfg.enabled || cfg.autoReconnect === false) return;
  clearReconnectTimer();
  reconnectAttempts += 1;
  const base = Math.max(1000, Number(cfg.reconnectDelayMs) || 5000);
  const max = Math.max(base, Number(cfg.maxReconnectDelayMs) || 60000);
  const delay = Math.min(max, base * Math.max(1, 2 ** Math.min(reconnectAttempts - 1, 5)));
  setRuntime({ state: "Menghubungkan Ulang", lastError: reason });
  console.log(`[AFK VOICE] Koneksi terputus. Reconnect dalam ${Math.round(delay / 1000)} detik.`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectAfkVoice({ reason: "auto-reconnect" }).catch(() => {});
  }, delay);
  reconnectTimer.unref?.();
}

async function connectInternal({ reason = "manual" } = {}) {
  const cfg = readConfig();
  manualDisconnect = false;
  clearReconnectTimer();
  if (!cfg.enabled) {
    setRuntime({ state: "Dinonaktifkan", lastError: "", errorCode: "" });
    return { success: false, message: "AFK Voice 24/7 sedang dinonaktifkan.", errorCode: "FEATURE_DISABLED", data: getAfkVoiceStatus() };
  }

  setRuntime({ state: reconnectAttempts ? "Menghubungkan Ulang" : "Sedang Menghubungkan", lastAttemptAt: nowIso(), lastError: "", errorCode: "" });
  const valid = await validateAfkVoiceChannel(cfg);
  if (!valid.ok) {
    const state = valid.errorCode === "CHANNEL_NOT_FOUND" || valid.errorCode === "CHANNEL_NOT_SELECTED" ? "Channel Tidak Ditemukan" : valid.errorCode?.startsWith("MISSING_") ? "Izin Tidak Cukup" : "Gagal Terhubung";
    setRuntime({ state, lastError: valid.message, errorCode: valid.errorCode, channelId: String(cfg.channelId || ""), guildId: String(cfg.guildId || "") });
    console.log(`[AFK VOICE] Gagal terhubung: ${valid.message}`);
    if (cfg.autoReconnect !== false && !["CHANNEL_NOT_FOUND", "CHANNEL_NOT_SELECTED"].includes(valid.errorCode)) scheduleReconnect(valid.message);
    return { success: false, message: valid.message, errorCode: valid.errorCode, data: getAfkVoiceStatus() };
  }

  const { guild, channel } = valid;
  const current = getVoiceConnection(guild.id);
  if (current && current.joinConfig.channelId === channel.id && current.state.status === VoiceConnectionStatus.Ready) {
    reconnectAttempts = 0;
    setRuntime({ state: "Terhubung", guildId: guild.id, channelId: channel.id, channelName: channel.name, categoryName: channel.parent?.name || "Tanpa kategori", connectedAt: runtime.connectedAt || nowIso(), lastError: "", errorCode: "" });
    return { success: true, message: `Pak RW sudah terhubung ke ${channel.name}.`, data: getAfkVoiceStatus() };
  }

  if (current) destroyExistingConnection(guild.id, { intentional: true });
  manualDisconnect = false;
  console.log(`[AFK VOICE] Menghubungkan Pak RW ke: ${channel.name} (${channel.id})`);
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfMute: cfg.selfMute !== false,
    selfDeaf: cfg.selfDeaf !== false
  });

  connection.on("stateChange", (oldState, newState) => {
    if (newState.status === VoiceConnectionStatus.Destroyed && !shuttingDown && !manualDisconnect) {
      scheduleReconnect("Koneksi voice dihancurkan oleh Discord.");
    }
  });
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    if (shuttingDown || manualDisconnect) return;
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5000)
      ]);
    } catch {
      try { connection.destroy(); } catch {}
      scheduleReconnect("Sesi voice Discord terputus.");
    }
  });
  connection.on("error", (error) => {
    const message = error?.message || String(error);
    setRuntime({ state: "Gagal Terhubung", lastError: message, errorCode: "VOICE_CONNECTION_ERROR" });
    console.log(`[AFK VOICE] Gagal terhubung: ${message}`);
    scheduleReconnect(message);
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 20000);
    reconnectAttempts = 0;
    setRuntime({ state: "Terhubung", guildId: guild.id, channelId: channel.id, channelName: channel.name, categoryName: channel.parent?.name || "Tanpa kategori", connectedAt: nowIso(), lastError: "", errorCode: "" });
    console.log("[AFK VOICE] Pak RW berhasil terhubung.");
    return { success: true, message: `Pak RW berhasil terhubung ke ${channel.name}.`, data: getAfkVoiceStatus() };
  } catch (error) {
    const message = error?.message || "Koneksi voice melewati batas waktu.";
    try { connection.destroy(); } catch {}
    setRuntime({ state: "Gagal Terhubung", lastError: message, errorCode: "VOICE_CONNECT_TIMEOUT" });
    console.log(`[AFK VOICE] Gagal terhubung: ${message}`);
    scheduleReconnect(message);
    return { success: false, message: "Pak RW gagal terhubung ke voice channel.", errorCode: "VOICE_CONNECT_TIMEOUT", data: getAfkVoiceStatus() };
  }
}

function connectAfkVoice(options = {}) { return queue(() => connectInternal(options)); }
async function reconnectAfkVoice() {
  const cfg = readConfig();
  destroyExistingConnection(cfg.guildId, { intentional: true });
  manualDisconnect = false;
  reconnectAttempts = 0;
  return connectAfkVoice({ reason: "dashboard-reconnect" });
}
async function moveAfkVoiceChannel() { return reconnectAfkVoice(); }
async function disconnectAfkVoice({ disable = false } = {}) {
  return queue(async () => {
    clearReconnectTimer();
    manualDisconnect = true;
    reconnectAttempts = 0;
    const cfg = readConfig();
    destroyExistingConnection(cfg.guildId, { intentional: true });
    setRuntime({ state: disable ? "Dinonaktifkan" : "Terputus", connectedAt: null, channelName: "", categoryName: "", lastError: "", errorCode: "" });
    console.log(disable ? "[AFK VOICE] Fitur dinonaktifkan melalui dashboard." : "[AFK VOICE] Koneksi diputuskan.");
    return { success: true, message: disable ? "AFK Voice 24/7 dinonaktifkan dan Pak RW sudah keluar dari voice." : "Pak RW sudah keluar dari voice.", data: getAfkVoiceStatus() };
  });
}
function getAfkVoiceStatus() {
  const cfg = readConfig();
  const connection = getVoiceConnection(String(cfg.guildId || DEFAULTS.guildId));
  return {
    ...runtime,
    enabled: Boolean(cfg.enabled),
    configuredGuildId: String(cfg.guildId || ""),
    configuredChannelId: String(cfg.channelId || ""),
    connectionState: connection?.state?.status || null,
    reconnectAttempts,
    hasReconnectTimer: Boolean(reconnectTimer)
  };
}
function initializeAfkVoiceManager({ client, getConfig }) {
  clientRef = client;
  configReader = getConfig;
  const cfg = readConfig();
  runtime.guildId = String(cfg.guildId || "");
  runtime.channelId = String(cfg.channelId || "");
  setRuntime({ state: cfg.enabled ? "Terputus" : "Dinonaktifkan" });
  return module.exports;
}
async function shutdownAfkVoice() {
  shuttingDown = true;
  clearReconnectTimer();
  manualDisconnect = true;
  const cfg = readConfig();
  destroyExistingConnection(cfg.guildId, { intentional: true });
  setRuntime({ state: "Terputus" });
}
function checkActionRateLimit(windowMs = 1800) {
  const now = Date.now();
  if (now - lastActionAt < windowMs) return false;
  lastActionAt = now;
  return true;
}
function resetForTests() {
  clearReconnectTimer(); reconnectAttempts = 0; manualDisconnect = false; shuttingDown = false; lastActionAt = 0;
  Object.assign(runtime, { state: "Dinonaktifkan", guildId: "", channelId: "", channelName: "", categoryName: "", connectedAt: null, lastAttemptAt: null, reconnectAttempts: 0, lastError: "", errorCode: "", updatedAt: nowIso() });
}

module.exports = {
  DEFAULTS,
  initializeAfkVoiceManager,
  connectAfkVoice,
  disconnectAfkVoice,
  reconnectAfkVoice,
  moveAfkVoiceChannel,
  getAfkVoiceStatus,
  scheduleReconnect,
  validateAfkVoiceChannel,
  destroyExistingConnection,
  shutdownAfkVoice,
  checkActionRateLimit,
  _resetForTests: resetForTests
};
