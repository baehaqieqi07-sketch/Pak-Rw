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
let voiceStateListener = null;

const intentionalConnections = new WeakSet();
const recoveringConnections = new WeakSet();

const runtime = {
  state: "Dinonaktifkan",
  guildId: "",
  channelId: "",
  channelName: "",
  categoryName: "",
  connectedAt: null,
  lastDisconnectedAt: null,
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
function isRetryableErrorCode(errorCode = "") {
  return ![
    "FEATURE_DISABLED",
    "CHANNEL_NOT_SELECTED",
    "CHANNEL_NOT_FOUND",
    "CHANNEL_WRONG_TYPE",
    "CHANNEL_WRONG_GUILD",
    "GUILD_NOT_FOUND",
    "MISSING_VIEW_CHANNEL",
    "MISSING_CONNECT_PERMISSION",
    "CHANNEL_FULL"
  ].includes(String(errorCode || ""));
}
function actualConnection(guildId) {
  return getVoiceConnection(String(guildId || runtime.guildId || DEFAULTS.guildId));
}
function connectionIsReady(connection) {
  return connection?.state?.status === VoiceConnectionStatus.Ready;
}
function currentBotVoiceChannelId(guildId) {
  const guild = clientRef?.guilds?.cache?.get?.(String(guildId || ""));
  return String(guild?.members?.me?.voice?.channelId || "");
}
function isActuallyConnected(config = readConfig(), connection = actualConnection(config.guildId)) {
  return connectionIsReady(connection) && currentBotVoiceChannelId(config.guildId) === String(config.channelId || "");
}
function connectedRuntime(guild, channel) {
  reconnectAttempts = 0;
  clearReconnectTimer();
  setRuntime({
    state: "Terhubung",
    guildId: guild.id,
    channelId: channel.id,
    channelName: channel.name,
    categoryName: channel.parent?.name || "Tanpa kategori",
    connectedAt: runtime.connectedAt || nowIso(),
    lastError: "",
    errorCode: ""
  });
}

async function validateAfkVoiceChannel(config = readConfig()) {
  if (!clientRef?.isReady?.()) return { ok: false, errorCode: "BOT_NOT_READY", message: "Bot Pak RW belum online di Discord." };

  const guildId = String(config.guildId || DEFAULTS.guildId);
  const guild = clientRef.guilds.cache.get(guildId) || await clientRef.guilds.fetch(guildId).catch(() => null);
  if (!guild) return { ok: false, errorCode: "GUILD_NOT_FOUND", message: "Server DESA TULUS tidak ditemukan." };

  const channelId = String(config.channelId || "");
  if (!channelId) return { ok: false, errorCode: "CHANNEL_NOT_SELECTED", message: "Channel Voice AFK belum dipilih." };

  const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
  if (!channel) return { ok: false, errorCode: "CHANNEL_NOT_FOUND", message: "Channel Voice AFK tidak ditemukan." };
  if (String(channel.guildId || guild.id) !== guild.id) return { ok: false, errorCode: "CHANNEL_WRONG_GUILD", message: "Channel Voice AFK bukan milik server DESA TULUS." };
  if (!voiceType(channel)) return { ok: false, errorCode: "CHANNEL_WRONG_TYPE", message: "Channel yang dipilih bukan voice channel biasa." };
  if (typeof guild.voiceAdapterCreator !== "function") return { ok: false, errorCode: "VOICE_ADAPTER_UNAVAILABLE", message: "Adapter voice Discord belum siap. Coba hubungkan ulang beberapa detik lagi." };

  const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
  if (!me) return { ok: false, errorCode: "BOT_MEMBER_NOT_FOUND", message: "Data member bot Pak RW belum tersedia." };

  const perms = channel.permissionsFor(me);
  if (!perms?.has(PermissionsBitField.Flags.ViewChannel)) return { ok: false, errorCode: "MISSING_VIEW_CHANNEL", message: "Pak RW tidak memiliki izin View Channel pada voice tersebut." };
  if (!perms?.has(PermissionsBitField.Flags.Connect)) return { ok: false, errorCode: "MISSING_CONNECT_PERMISSION", message: "Pak RW tidak memiliki izin Connect pada voice tersebut." };

  const alreadyThere = me.voice?.channelId === channel.id;
  const channelFull = Number(channel.userLimit || 0) > 0 && Number(channel.members?.size || 0) >= Number(channel.userLimit || 0);
  if (channelFull && !alreadyThere && !perms.has(PermissionsBitField.Flags.MoveMembers)) {
    return { ok: false, errorCode: "CHANNEL_FULL", message: "Voice channel sedang penuh dan Pak RW tidak memiliki izin Move Members untuk melewati batas pengguna." };
  }

  return { ok: true, guild, channel, me };
}

function destroyConnectionObject(connection, { intentional = true } = {}) {
  if (!connection) return false;
  if (intentional) intentionalConnections.add(connection);
  try { connection.removeAllListeners(); } catch {}
  try { connection.destroy(); } catch {}
  return true;
}

function destroyExistingConnection(guildId, { intentional = true } = {}) {
  const connection = actualConnection(guildId);
  if (!connection) return false;
  manualDisconnect = intentional;
  return destroyConnectionObject(connection, { intentional });
}

function scheduleReconnect(reason = "Koneksi terputus", errorCode = "VOICE_DISCONNECTED") {
  const cfg = readConfig();
  if (shuttingDown || manualDisconnect || !cfg.enabled || cfg.autoReconnect === false || !isRetryableErrorCode(errorCode)) return false;
  if (isActuallyConnected(cfg)) return false;

  clearReconnectTimer();
  reconnectAttempts += 1;
  const base = Math.max(1000, Number(cfg.reconnectDelayMs) || 5000);
  const max = Math.max(base, Number(cfg.maxReconnectDelayMs) || 60000);
  const delay = Math.min(max, base * Math.max(1, 2 ** Math.min(reconnectAttempts - 1, 5)));
  setRuntime({ state: "Menghubungkan Ulang", lastError: reason, errorCode });
  console.log(`[AFK VOICE] Koneksi terputus. Reconnect dalam ${Math.round(delay / 1000)} detik.`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectAfkVoice({ reason: "auto-reconnect" }).catch((error) => {
      console.log(`[AFK VOICE] Reconnect gagal: ${error?.message || error}`);
    });
  }, delay);
  reconnectTimer.unref?.();
  return true;
}

async function waitForBotVoiceState(guild, channelId, timeoutMs = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
    if (me?.voice?.channelId === channelId) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

function attachConnectionListeners(connection, guild, channel) {
  connection.on(VoiceConnectionStatus.Ready, () => {
    if (!intentionalConnections.has(connection)) connectedRuntime(guild, channel);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    if (shuttingDown || manualDisconnect || intentionalConnections.has(connection) || recoveringConnections.has(connection)) return;
    recoveringConnections.add(connection);
    setRuntime({ state: "Terputus", lastDisconnectedAt: nowIso(), lastError: "Sesi voice Discord terputus.", errorCode: "VOICE_DISCONNECTED" });
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5000)
      ]);
      await entersState(connection, VoiceConnectionStatus.Ready, 20000);
      connectedRuntime(guild, channel);
    } catch {
      destroyConnectionObject(connection, { intentional: true });
      scheduleReconnect("Sesi voice Discord terputus.", "VOICE_DISCONNECTED");
    } finally {
      recoveringConnections.delete(connection);
    }
  });

  connection.on(VoiceConnectionStatus.Destroyed, () => {
    if (shuttingDown || manualDisconnect || intentionalConnections.has(connection)) return;
    setRuntime({ state: "Terputus", lastDisconnectedAt: nowIso(), lastError: "Koneksi voice dihancurkan oleh Discord.", errorCode: "VOICE_DESTROYED" });
    scheduleReconnect("Koneksi voice dihancurkan oleh Discord.", "VOICE_DESTROYED");
  });

  connection.on("error", (error) => {
    if (shuttingDown || intentionalConnections.has(connection)) return;
    const message = error?.message || String(error);
    setRuntime({ state: "Gagal Terhubung", lastError: message, errorCode: "VOICE_CONNECTION_ERROR" });
    console.log(`[AFK VOICE] Gagal terhubung: ${message}`);
    scheduleReconnect(message, "VOICE_CONNECTION_ERROR");
  });
}

async function connectInternal({ reason = "manual" } = {}) {
  const cfg = readConfig();
  manualDisconnect = false;
  clearReconnectTimer();

  if (!cfg.enabled) {
    setRuntime({ state: "Dinonaktifkan", lastError: "", errorCode: "" });
    return { success: false, message: "AFK Voice 24/7 sedang dinonaktifkan.", errorCode: "FEATURE_DISABLED", data: getAfkVoiceStatus() };
  }

  setRuntime({
    state: reconnectAttempts ? "Menghubungkan Ulang" : "Sedang Menghubungkan",
    lastAttemptAt: nowIso(),
    lastError: "",
    errorCode: "",
    guildId: String(cfg.guildId || ""),
    channelId: String(cfg.channelId || "")
  });

  const valid = await validateAfkVoiceChannel(cfg);
  if (!valid.ok) {
    const state = ["CHANNEL_NOT_FOUND", "CHANNEL_NOT_SELECTED", "CHANNEL_WRONG_TYPE", "CHANNEL_WRONG_GUILD"].includes(valid.errorCode)
      ? "Channel Tidak Ditemukan"
      : valid.errorCode?.startsWith("MISSING_") || valid.errorCode === "CHANNEL_FULL"
        ? "Izin Tidak Cukup"
        : "Gagal Terhubung";
    setRuntime({ state, lastError: valid.message, errorCode: valid.errorCode });
    console.log(`[AFK VOICE] Gagal terhubung: ${valid.message}`);
    scheduleReconnect(valid.message, valid.errorCode);
    return { success: false, message: valid.message, errorCode: valid.errorCode, data: getAfkVoiceStatus() };
  }

  const { guild, channel } = valid;
  const current = actualConnection(guild.id);
  if (current && current.joinConfig.channelId === channel.id && connectionIsReady(current)) {
    const voiceStateReady = await waitForBotVoiceState(guild, channel.id, 3000);
    if (voiceStateReady) {
      connectedRuntime(guild, channel);
      return { success: true, message: `Pak RW sudah terhubung ke ${channel.name}.`, data: getAfkVoiceStatus() };
    }
  }

  if (current) destroyExistingConnection(guild.id, { intentional: true });
  manualDisconnect = false;
  console.log(`[AFK VOICE] Menghubungkan Pak RW ke: ${channel.name} (${channel.id}) • ${reason}`);

  let connection;
  try {
    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfMute: cfg.selfMute !== false,
      selfDeaf: cfg.selfDeaf !== false
    });
  } catch (error) {
    const message = error?.message || "Voice adapter gagal membuat koneksi.";
    setRuntime({ state: "Gagal Terhubung", lastError: message, errorCode: "VOICE_JOIN_ERROR" });
    console.log(`[AFK VOICE] Gagal membuat koneksi: ${message}`);
    scheduleReconnect(message, "VOICE_JOIN_ERROR");
    return { success: false, message: "Pak RW gagal membuat koneksi voice. Coba hubungkan ulang beberapa detik lagi.", errorCode: "VOICE_JOIN_ERROR", data: getAfkVoiceStatus() };
  }

  attachConnectionListeners(connection, guild, channel);

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30000);
    const voiceStateReady = await waitForBotVoiceState(guild, channel.id, 8000);
    if (!voiceStateReady) throw new Error("Koneksi Ready tetapi voice state bot belum masuk ke channel tujuan.");
    connectedRuntime(guild, channel);
    console.log("[AFK VOICE] Pak RW berhasil terhubung.");
    return { success: true, message: `Pak RW berhasil terhubung ke ${channel.name}.`, data: getAfkVoiceStatus() };
  } catch (error) {
    const message = error?.message || "Koneksi voice melewati batas waktu.";
    destroyConnectionObject(connection, { intentional: true });
    setRuntime({ state: "Gagal Terhubung", lastError: message, errorCode: "VOICE_CONNECT_TIMEOUT", lastDisconnectedAt: nowIso() });
    console.log(`[AFK VOICE] Gagal terhubung: ${message}`);
    scheduleReconnect(message, "VOICE_CONNECT_TIMEOUT");
    return { success: false, message: "Pak RW gagal terhubung ke voice channel. Periksa permission dan coba hubungkan ulang.", errorCode: "VOICE_CONNECT_TIMEOUT", data: getAfkVoiceStatus() };
  }
}

function connectAfkVoice(options = {}) {
  return queue(() => connectInternal(options));
}

function reconnectAfkVoice() {
  return queue(async () => {
    const cfg = readConfig();
    clearReconnectTimer();
    manualDisconnect = true;
    destroyExistingConnection(cfg.guildId, { intentional: true });
    manualDisconnect = false;
    reconnectAttempts = 0;
    return connectInternal({ reason: "dashboard-reconnect" });
  });
}

function moveAfkVoiceChannel() {
  return reconnectAfkVoice();
}

function disconnectAfkVoice({ disable = false } = {}) {
  return queue(async () => {
    clearReconnectTimer();
    manualDisconnect = true;
    reconnectAttempts = 0;
    const cfg = readConfig();
    destroyExistingConnection(cfg.guildId, { intentional: true });
    setRuntime({
      state: disable ? "Dinonaktifkan" : "Terputus",
      connectedAt: null,
      lastDisconnectedAt: nowIso(),
      channelName: "",
      categoryName: "",
      lastError: "",
      errorCode: ""
    });
    console.log(disable ? "[AFK VOICE] Fitur dinonaktifkan melalui dashboard." : "[AFK VOICE] Koneksi diputuskan.");
    return {
      success: true,
      message: disable ? "AFK Voice 24/7 dinonaktifkan dan Pak RW sudah keluar dari voice." : "Pak RW sudah keluar dari voice.",
      data: getAfkVoiceStatus()
    };
  });
}

function getAfkVoiceStatus() {
  const cfg = readConfig();
  const connection = actualConnection(cfg.guildId);
  const connectionState = connection?.state?.status || null;
  let state = runtime.state;
  const actualChannelId = currentBotVoiceChannelId(cfg.guildId);
  if (!cfg.enabled) state = "Dinonaktifkan";
  else if (connectionState === VoiceConnectionStatus.Ready && actualChannelId === String(cfg.channelId || "")) state = "Terhubung";
  else if (connectionState === VoiceConnectionStatus.Connecting || connectionState === VoiceConnectionStatus.Signalling) state = "Sedang Menghubungkan";
  else if (connectionState === VoiceConnectionStatus.Ready && actualChannelId !== String(cfg.channelId || "")) state = reconnectTimer ? "Menghubungkan Ulang" : "Terputus";
  else if (connectionState === VoiceConnectionStatus.Disconnected && !reconnectTimer) state = "Terputus";

  return {
    ...runtime,
    state,
    enabled: Boolean(cfg.enabled),
    selfMute: cfg.selfMute !== false,
    selfDeaf: cfg.selfDeaf !== false,
    autoReconnect: cfg.autoReconnect !== false,
    configuredGuildId: String(cfg.guildId || ""),
    configuredChannelId: String(cfg.channelId || ""),
    connectionState,
    actualChannelId,
    reconnectAttempts,
    hasReconnectTimer: Boolean(reconnectTimer)
  };
}

function initializeAfkVoiceManager({ client, getConfig }) {
  if (clientRef && voiceStateListener) clientRef.off?.("voiceStateUpdate", voiceStateListener);
  clientRef = client;
  configReader = getConfig;
  shuttingDown = false;

  voiceStateListener = (oldState, newState) => {
    if (!clientRef?.user || newState?.id !== clientRef.user.id) return;
    const cfg = readConfig();
    if (shuttingDown || manualDisconnect || !cfg.enabled) return;
    const targetId = String(cfg.channelId || "");
    if (!targetId) return;

    if (newState.channelId === targetId) {
      const channel = newState.channel;
      if (channel) connectedRuntime(newState.guild, channel);
      return;
    }

    if (oldState.channelId === targetId || newState.channelId) {
      setRuntime({ state: "Terputus", lastDisconnectedAt: nowIso(), lastError: "Pak RW tidak lagi berada di voice channel AFK tersimpan.", errorCode: "VOICE_STATE_LEFT_TARGET" });
      scheduleReconnect("Pak RW tidak lagi berada di voice channel AFK tersimpan.", "VOICE_STATE_LEFT_TARGET");
    }
  };
  clientRef?.on?.("voiceStateUpdate", voiceStateListener);

  const cfg = readConfig();
  runtime.guildId = String(cfg.guildId || "");
  runtime.channelId = String(cfg.channelId || "");
  setRuntime({ state: cfg.enabled ? "Terputus" : "Dinonaktifkan" });
  console.log("[AFK VOICE] Konfigurasi Pak RW dimuat.");
  return module.exports;
}

async function shutdownAfkVoice() {
  shuttingDown = true;
  clearReconnectTimer();
  manualDisconnect = true;
  const cfg = readConfig();
  destroyExistingConnection(cfg.guildId, { intentional: true });
  if (clientRef && voiceStateListener) clientRef.off?.("voiceStateUpdate", voiceStateListener);
  setRuntime({ state: "Terputus", lastDisconnectedAt: nowIso() });
}

function checkActionRateLimit(windowMs = 1800) {
  const now = Date.now();
  if (now - lastActionAt < windowMs) return false;
  lastActionAt = now;
  return true;
}

function resetForTests() {
  clearReconnectTimer();
  reconnectAttempts = 0;
  manualDisconnect = false;
  shuttingDown = false;
  lastActionAt = 0;
  operation = Promise.resolve();
  if (clientRef && voiceStateListener) clientRef.off?.("voiceStateUpdate", voiceStateListener);
  clientRef = null;
  configReader = null;
  voiceStateListener = null;
  Object.assign(runtime, {
    state: "Dinonaktifkan",
    guildId: "",
    channelId: "",
    channelName: "",
    categoryName: "",
    connectedAt: null,
    lastDisconnectedAt: null,
    lastAttemptAt: null,
    reconnectAttempts: 0,
    lastError: "",
    errorCode: "",
    updatedAt: nowIso()
  });
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
  _isRetryableErrorCode: isRetryableErrorCode,
  _resetForTests: resetForTests
};
