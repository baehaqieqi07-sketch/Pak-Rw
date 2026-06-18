"use strict";

const {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  generateDependencyReport
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
  gatewayJoinTimeoutMs: 15000,
  transportReadyTimeoutMs: 45000,
  healthCheckIntervalMs: 30000,
  updatedAt: null,
  updatedBy: null
});

let clientRef = null;
let configReader = null;
let reconnectTimer = null;
let healthTimer = null;
let reconnectAttempts = 0;
let shuttingDown = false;
let manualDisconnect = false;
let suppressVoiceStateUntil = 0;
let operation = Promise.resolve();
let lastActionAt = 0;
let voiceStateListener = null;
let activeConnection = null;
let activeAttemptController = null;
let activeConnectPromise = null;
let activeConnectKey = "";
let attemptSequence = 0;
let lastHealthRepairAt = 0;
let dependencyReportLogged = false;

const intentionalConnections = new WeakSet();
const attachedConnections = new WeakSet();
const disconnectCheckTimers = new WeakMap();
const connectionAttemptIds = new WeakMap();

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
  lastWarning: "",
  errorCode: "",
  transportState: null,
  transportReady: false,
  connectionMode: "none",
  updatedAt: new Date().toISOString()
};

function nowIso() { return new Date().toISOString(); }
function sleep(ms, signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve(false);
    const timer = setTimeout(() => {
      cleanup();
      resolve(true);
    }, ms);
    timer.unref?.();
    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      resolve(false);
    };
    const cleanup = () => signal?.removeEventListener?.("abort", onAbort);
    signal?.addEventListener?.("abort", onAbort, { once: true });
  });
}
function readConfig() {
  const raw = typeof configReader === "function" ? configReader() : {};
  return { ...DEFAULTS, ...(raw?.afkVoice || raw || {}) };
}
function setRuntime(patch) {
  Object.assign(runtime, patch, { updatedAt: nowIso(), reconnectAttempts });
}
function clearReconnectTimer({ resetAttempts = false } = {}) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  if (resetAttempts) reconnectAttempts = 0;
}
function clearHealthTimer() {
  if (healthTimer) clearInterval(healthTimer);
  healthTimer = null;
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
function voicePresenceMatches(config = readConfig()) {
  return Boolean(config.channelId) && currentBotVoiceChannelId(config.guildId) === String(config.channelId || "");
}
function isActuallyConnected(config = readConfig()) {
  // Untuk bot AFK, voice state Discord adalah sumber kebenaran utama. Transport UDP
  // boleh belum Ready selama akun bot benar-benar sudah terlihat di channel tujuan.
  return voicePresenceMatches(config);
}
function connectedRuntime(guild, channel, connection = actualConnection(guild?.id), warning = "") {
  reconnectAttempts = 0;
  clearReconnectTimer();
  const ready = connectionIsReady(connection);
  setRuntime({
    state: "Terhubung",
    guildId: guild.id,
    channelId: channel.id,
    channelName: channel.name,
    categoryName: channel.parent?.name || "Tanpa kategori",
    connectedAt: runtime.connectedAt || nowIso(),
    lastError: "",
    lastWarning: warning,
    errorCode: "",
    transportState: connection?.state?.status || null,
    transportReady: ready,
    connectionMode: ready ? "full" : "afk-gateway"
  });
}

function abortActiveAttempt() {
  if (activeAttemptController && !activeAttemptController.signal.aborted) {
    activeAttemptController.abort();
  }
  activeAttemptController = null;
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
  const timer = disconnectCheckTimers.get(connection);
  if (timer) clearTimeout(timer);
  disconnectCheckTimers.delete(connection);
  try { connection.removeAllListeners(); } catch {}
  try { connection.destroy(); } catch {}
  if (activeConnection === connection) activeConnection = null;
  return true;
}

function destroyExistingConnection(guildId, { intentional = true } = {}) {
  const connection = actualConnection(guildId);
  if (!connection) return false;
  return destroyConnectionObject(connection, { intentional });
}

function scheduleReconnect(reason = "Koneksi terputus", errorCode = "VOICE_DISCONNECTED") {
  const cfg = readConfig();
  if (shuttingDown || manualDisconnect || !cfg.enabled || cfg.autoReconnect === false || !isRetryableErrorCode(errorCode)) return false;

  // Jangan menghancurkan bot yang sebenarnya sudah berada di channel. Ini adalah
  // fallback penting untuk AFK-only saat transport UDP belum mencapai Ready.
  if (voicePresenceMatches(cfg)) {
    const guild = clientRef?.guilds?.cache?.get?.(String(cfg.guildId));
    const channel = guild?.channels?.cache?.get?.(String(cfg.channelId));
    if (guild && channel) connectedRuntime(guild, channel, actualConnection(cfg.guildId), reason);
    return false;
  }

  // Satu timer saja. Event error, disconnected, voiceStateUpdate, dan timeout tidak
  // boleh membuat empat countdown reconnect yang saling bertabrakan.
  if (reconnectTimer) return false;

  reconnectAttempts += 1;
  const base = Math.max(1000, Number(cfg.reconnectDelayMs) || 5000);
  const max = Math.max(base, Number(cfg.maxReconnectDelayMs) || 60000);
  const delay = Math.min(max, base * Math.max(1, 2 ** Math.min(reconnectAttempts - 1, 5)));
  setRuntime({
    state: "Menghubungkan Ulang",
    lastError: reason,
    lastWarning: "",
    errorCode,
    transportReady: false,
    connectionMode: "none"
  });
  console.log(`[AFK VOICE] Koneksi terputus. Reconnect dalam ${Math.round(delay / 1000)} detik.`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectAfkVoice({ reason: "auto-reconnect" }).catch((error) => {
      console.log(`[AFK VOICE] Reconnect gagal: ${error?.message || error}`);
      scheduleReconnect(error?.message || "Reconnect gagal.", "VOICE_RECONNECT_FAILED");
    });
  }, delay);
  reconnectTimer.unref?.();
  return true;
}

async function waitForBotVoiceState(guild, channelId, timeoutMs = 15000, signal = null) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (signal?.aborted) return false;
    const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
    if (String(me?.voice?.channelId || "") === String(channelId)) return true;
    const continued = await sleep(250, signal);
    if (!continued) return false;
  }
  return false;
}

function waitForConnectionReady(connection, timeoutMs = 45000) {
  return new Promise((resolve) => {
    if (!connection) return resolve(false);
    if (connectionIsReady(connection)) return resolve(true);
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      connection.off?.(VoiceConnectionStatus.Ready, onReady);
      connection.off?.(VoiceConnectionStatus.Destroyed, onDestroyed);
      resolve(value);
    };
    const onReady = () => finish(true);
    const onDestroyed = () => finish(false);
    const timer = setTimeout(() => finish(false), Math.max(1000, Number(timeoutMs) || 45000));
    timer.unref?.();
    connection.once?.(VoiceConnectionStatus.Ready, onReady);
    connection.once?.(VoiceConnectionStatus.Destroyed, onDestroyed);
  });
}

function scheduleDisconnectedCheck(connection, guild, channel) {
  if (!connection || disconnectCheckTimers.has(connection)) return;
  const timer = setTimeout(() => {
    disconnectCheckTimers.delete(connection);
    if (shuttingDown || manualDisconnect || intentionalConnections.has(connection) || activeConnection !== connection) return;
    const cfg = readConfig();
    if (voicePresenceMatches(cfg)) {
      connectedRuntime(guild, channel, connection, "Transport voice sedang memulihkan sesi; mode AFK tetap aktif.");
      return;
    }
    destroyConnectionObject(connection, { intentional: true });
    setRuntime({ state: "Terputus", lastDisconnectedAt: nowIso(), transportReady: false, connectionMode: "none" });
    scheduleReconnect("Sesi voice Discord benar-benar terputus.", "VOICE_DISCONNECTED");
  }, 8000);
  timer.unref?.();
  disconnectCheckTimers.set(connection, timer);
}

function attachConnectionListeners(connection, guild, channel, attemptId) {
  if (!connection || attachedConnections.has(connection)) return;
  attachedConnections.add(connection);
  connectionAttemptIds.set(connection, attemptId);

  connection.on("stateChange", (oldState, newState) => {
    if (activeConnection !== connection || intentionalConnections.has(connection)) return;
    setRuntime({ transportState: newState?.status || null, transportReady: newState?.status === VoiceConnectionStatus.Ready });
    if (oldState?.status !== newState?.status) {
      console.log(`[AFK VOICE] Transport: ${oldState?.status || "unknown"} → ${newState?.status || "unknown"}.`);
    }
  });

  connection.on(VoiceConnectionStatus.Ready, () => {
    if (activeConnection !== connection || intentionalConnections.has(connection)) return;
    connectedRuntime(guild, channel, connection);
    console.log("[AFK VOICE] Transport voice Ready. Pak RW terhubung penuh.");
  });

  connection.on(VoiceConnectionStatus.Disconnected, () => {
    if (shuttingDown || manualDisconnect || intentionalConnections.has(connection) || activeConnection !== connection) return;
    setRuntime({
      state: voicePresenceMatches(readConfig()) ? "Terhubung" : "Terputus",
      lastDisconnectedAt: nowIso(),
      lastWarning: "Transport voice terputus sementara dan sedang dipulihkan.",
      errorCode: "VOICE_DISCONNECTED",
      transportReady: false,
      connectionMode: voicePresenceMatches(readConfig()) ? "afk-gateway" : "none"
    });
    scheduleDisconnectedCheck(connection, guild, channel);
  });

  connection.on(VoiceConnectionStatus.Destroyed, () => {
    if (shuttingDown || manualDisconnect || intentionalConnections.has(connection) || activeConnection !== connection) return;
    activeConnection = null;
    setRuntime({ state: "Terputus", lastDisconnectedAt: nowIso(), transportReady: false, connectionMode: "none" });
    if (voicePresenceMatches(readConfig())) {
      // Gateway masih menunjukkan bot di channel, jadi bangun ulang transport sekali saja.
      setTimeout(() => connectAfkVoice({ reason: "transport-rebuild" }).catch(() => null), 1000).unref?.();
      return;
    }
    scheduleReconnect("Koneksi voice dihancurkan oleh Discord.", "VOICE_DESTROYED");
  });

  connection.on("error", (error) => {
    if (shuttingDown || intentionalConnections.has(connection) || activeConnection !== connection) return;
    const message = error?.message || String(error);
    const present = voicePresenceMatches(readConfig());
    setRuntime({
      state: present ? "Terhubung" : "Gagal Terhubung",
      lastError: present ? "" : message,
      lastWarning: present ? `Transport voice: ${message}` : "",
      errorCode: present ? "VOICE_TRANSPORT_WARNING" : "VOICE_CONNECTION_ERROR",
      transportReady: connectionIsReady(connection),
      connectionMode: present ? (connectionIsReady(connection) ? "full" : "afk-gateway") : "none"
    });
    console.log(`[AFK VOICE] Peringatan transport: ${message}`);
    if (!present) scheduleReconnect(message, "VOICE_CONNECTION_ERROR");
  });
}

async function monitorTransport(connection, guild, channel, attemptId, timeoutMs) {
  const ready = await waitForConnectionReady(connection, timeoutMs);
  if (shuttingDown || activeConnection !== connection || connectionAttemptIds.get(connection) !== attemptId) return;
  if (ready) {
    connectedRuntime(guild, channel, connection);
    return;
  }
  if (voicePresenceMatches(readConfig())) {
    const warning = "Pak RW sudah berada di voice channel. Transport UDP belum Ready, tetapi mode AFK 24/7 tetap dipertahankan.";
    connectedRuntime(guild, channel, connection, warning);
    console.log(`[AFK VOICE] ${warning}`);
    return;
  }
  destroyConnectionObject(connection, { intentional: true });
  setRuntime({
    state: "Gagal Terhubung",
    lastError: "Pak RW tidak terdeteksi di voice channel setelah proses koneksi.",
    errorCode: "VOICE_CONNECT_TIMEOUT",
    lastDisconnectedAt: nowIso(),
    transportReady: false,
    connectionMode: "none"
  });
  scheduleReconnect("Pak RW tidak terdeteksi di voice channel setelah proses koneksi.", "VOICE_CONNECT_TIMEOUT");
}

async function connectInternal({ reason = "manual", force = false, signal = null } = {}) {
  const cfg = readConfig();
  manualDisconnect = false;

  if (!cfg.enabled) {
    setRuntime({ state: "Dinonaktifkan", lastError: "", lastWarning: "", errorCode: "", connectionMode: "none", transportReady: false });
    return { success: false, message: "AFK Voice 24/7 sedang dinonaktifkan.", errorCode: "FEATURE_DISABLED", data: getAfkVoiceStatus() };
  }

  setRuntime({
    state: reconnectAttempts ? "Menghubungkan Ulang" : "Sedang Menghubungkan",
    lastAttemptAt: nowIso(),
    lastError: "",
    lastWarning: "",
    errorCode: "",
    guildId: String(cfg.guildId || ""),
    channelId: String(cfg.channelId || ""),
    connectionMode: "none"
  });

  const valid = await validateAfkVoiceChannel(cfg);
  if (!valid.ok) {
    const state = ["CHANNEL_NOT_FOUND", "CHANNEL_NOT_SELECTED", "CHANNEL_WRONG_TYPE", "CHANNEL_WRONG_GUILD"].includes(valid.errorCode)
      ? "Channel Tidak Ditemukan"
      : valid.errorCode?.startsWith("MISSING_") || valid.errorCode === "CHANNEL_FULL"
        ? "Izin Tidak Cukup"
        : "Gagal Terhubung";
    setRuntime({ state, lastError: valid.message, lastWarning: "", errorCode: valid.errorCode, transportReady: false, connectionMode: "none" });
    console.log(`[AFK VOICE] Gagal terhubung: ${valid.message}`);
    scheduleReconnect(valid.message, valid.errorCode);
    return { success: false, message: valid.message, errorCode: valid.errorCode, data: getAfkVoiceStatus() };
  }

  if (signal?.aborted) return { success: false, message: "Percobaan koneksi sebelumnya dibatalkan karena ada pengaturan baru.", errorCode: "CONNECT_SUPERSEDED", data: getAfkVoiceStatus() };

  const { guild, channel } = valid;
  let current = actualConnection(guild.id);

  if (!force && current && String(current.joinConfig?.channelId || "") === channel.id && voicePresenceMatches(cfg)) {
    activeConnection = current;
    attachConnectionListeners(current, guild, channel, connectionAttemptIds.get(current) || ++attemptSequence);
    connectedRuntime(guild, channel, current, connectionIsReady(current) ? "" : "Mode AFK aktif; transport voice masih menstabilkan koneksi.");
    return { success: true, message: `Pak RW sudah berada di ${channel.name}.`, data: getAfkVoiceStatus() };
  }

  if (current && (force || String(current.joinConfig?.channelId || "") !== channel.id)) {
    suppressVoiceStateUntil = Date.now() + 5000;
    destroyConnectionObject(current, { intentional: true });
    current = null;
    await sleep(500, signal);
  }

  if (signal?.aborted) return { success: false, message: "Percobaan koneksi dibatalkan karena ada pengaturan baru.", errorCode: "CONNECT_SUPERSEDED", data: getAfkVoiceStatus() };

  console.log(`[AFK VOICE] Menghubungkan Pak RW ke: ${channel.name} (${channel.id}) • ${reason}`);

  let connection;
  const attemptId = ++attemptSequence;
  try {
    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfMute: cfg.selfMute !== false,
      selfDeaf: cfg.selfDeaf !== false
    });
    activeConnection = connection;
    attachConnectionListeners(connection, guild, channel, attemptId);
  } catch (error) {
    const message = error?.message || "Voice adapter gagal membuat koneksi.";
    setRuntime({ state: "Gagal Terhubung", lastError: message, errorCode: "VOICE_JOIN_ERROR", transportReady: false, connectionMode: "none" });
    console.log(`[AFK VOICE] Gagal membuat koneksi: ${message}`);
    scheduleReconnect(message, "VOICE_JOIN_ERROR");
    return { success: false, message: "Pak RW gagal membuat koneksi voice. Coba hubungkan ulang beberapa detik lagi.", errorCode: "VOICE_JOIN_ERROR", data: getAfkVoiceStatus() };
  }

  const joinedGateway = await waitForBotVoiceState(
    guild,
    channel.id,
    Math.max(5000, Number(cfg.gatewayJoinTimeoutMs) || DEFAULTS.gatewayJoinTimeoutMs),
    signal
  );

  if (signal?.aborted) {
    if (activeConnection === connection) destroyConnectionObject(connection, { intentional: true });
    return { success: false, message: "Percobaan koneksi dibatalkan karena ada pengaturan baru.", errorCode: "CONNECT_SUPERSEDED", data: getAfkVoiceStatus() };
  }

  if (!joinedGateway) {
    destroyConnectionObject(connection, { intentional: true });
    const message = "Discord tidak menempatkan Pak RW ke voice channel dalam batas waktu.";
    setRuntime({ state: "Gagal Terhubung", lastError: message, errorCode: "VOICE_GATEWAY_TIMEOUT", lastDisconnectedAt: nowIso(), transportReady: false, connectionMode: "none" });
    console.log(`[AFK VOICE] Gagal terhubung: ${message}`);
    scheduleReconnect(message, "VOICE_GATEWAY_TIMEOUT");
    return { success: false, message: `${message} Periksa izin Connect/View Channel dan region voice.`, errorCode: "VOICE_GATEWAY_TIMEOUT", data: getAfkVoiceStatus() };
  }

  // Begitu voice state Discord menunjukkan bot sudah masuk, fitur AFK dianggap sukses.
  // Jangan langsung menghancurkan koneksi hanya karena handshake UDP belum Ready.
  connectedRuntime(
    guild,
    channel,
    connection,
    connectionIsReady(connection) ? "" : "Pak RW sudah masuk voice; transport voice sedang menstabilkan koneksi."
  );
  console.log(`[AFK VOICE] Pak RW sudah masuk ke ${channel.name}.`);

  monitorTransport(
    connection,
    guild,
    channel,
    attemptId,
    Math.max(10000, Number(cfg.transportReadyTimeoutMs) || DEFAULTS.transportReadyTimeoutMs)
  ).catch((error) => console.log(`[AFK VOICE] Monitor transport gagal: ${error?.message || error}`));

  return { success: true, message: `Pak RW berhasil masuk dan AFK di ${channel.name}.`, data: getAfkVoiceStatus() };
}

function connectAfkVoice(options = {}) {
  const cfg = readConfig();
  const key = `${cfg.guildId}:${cfg.channelId}`;
  const force = Boolean(options.force);
  if (!force && activeConnectPromise && activeConnectKey === key) return activeConnectPromise;
  if (force) abortActiveAttempt();

  const controller = new AbortController();
  activeAttemptController = controller;
  const promise = queue(() => connectInternal({ ...options, force, signal: controller.signal }));
  activeConnectPromise = promise;
  activeConnectKey = key;
  promise.finally(() => {
    if (activeConnectPromise === promise) {
      activeConnectPromise = null;
      activeConnectKey = "";
    }
    if (activeAttemptController === controller) activeAttemptController = null;
  }).catch(() => null);
  return promise;
}

function reconnectAfkVoice() {
  abortActiveAttempt();
  return queue(async () => {
    const cfg = readConfig();
    clearReconnectTimer({ resetAttempts: true });
    manualDisconnect = true;
    suppressVoiceStateUntil = Date.now() + 5000;
    destroyExistingConnection(cfg.guildId, { intentional: true });
    manualDisconnect = false;
    await sleep(600);
    const controller = new AbortController();
    activeAttemptController = controller;
    try {
      return await connectInternal({ reason: "dashboard-reconnect", force: true, signal: controller.signal });
    } finally {
      if (activeAttemptController === controller) activeAttemptController = null;
    }
  });
}

function moveAfkVoiceChannel() {
  return reconnectAfkVoice();
}

function disconnectAfkVoice({ disable = false } = {}) {
  abortActiveAttempt();
  return queue(async () => {
    clearReconnectTimer({ resetAttempts: true });
    manualDisconnect = true;
    suppressVoiceStateUntil = Date.now() + 5000;
    const cfg = readConfig();
    destroyExistingConnection(cfg.guildId, { intentional: true });
    activeConnection = null;
    setRuntime({
      state: disable ? "Dinonaktifkan" : "Terputus",
      connectedAt: null,
      lastDisconnectedAt: nowIso(),
      channelName: "",
      categoryName: "",
      lastError: "",
      lastWarning: "",
      errorCode: "",
      transportState: null,
      transportReady: false,
      connectionMode: "none"
    });
    console.log(disable ? "[AFK VOICE] Fitur dinonaktifkan melalui dashboard." : "[AFK VOICE] Koneksi diputuskan.");
    setTimeout(() => { manualDisconnect = false; }, 1500).unref?.();
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
  const actualChannelId = currentBotVoiceChannelId(cfg.guildId);
  const present = Boolean(cfg.channelId) && actualChannelId === String(cfg.channelId || "");
  let state = runtime.state;

  if (!cfg.enabled) state = "Dinonaktifkan";
  else if (present) state = "Terhubung";
  else if (connectionState === VoiceConnectionStatus.Connecting || connectionState === VoiceConnectionStatus.Signalling) state = "Sedang Menghubungkan";
  else if (reconnectTimer) state = "Menghubungkan Ulang";
  else if (connectionState === VoiceConnectionStatus.Disconnected) state = "Terputus";

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
    voiceStateConnected: present,
    transportReady: connectionIsReady(connection),
    connectionMode: present ? (connectionIsReady(connection) ? "full" : "afk-gateway") : "none",
    reconnectAttempts,
    hasReconnectTimer: Boolean(reconnectTimer),
    connectInProgress: Boolean(activeConnectPromise)
  };
}

function runHealthCheck() {
  if (healthTimer || !clientRef) return;
  const intervalMs = Math.max(10000, Number(readConfig().healthCheckIntervalMs) || DEFAULTS.healthCheckIntervalMs);
  healthTimer = setInterval(() => {
    if (shuttingDown) return;
    const cfg = readConfig();
    if (!cfg.enabled || !cfg.channelId) return;
    const present = voicePresenceMatches(cfg);
    const connection = actualConnection(cfg.guildId);

    if (present) {
      const guild = clientRef.guilds.cache.get(String(cfg.guildId));
      const channel = guild?.channels?.cache?.get?.(String(cfg.channelId));
      if (guild && channel) connectedRuntime(guild, channel, connection, connectionIsReady(connection) ? "" : runtime.lastWarning);

      if (!connection && Date.now() - lastHealthRepairAt > 30000) {
        lastHealthRepairAt = Date.now();
        connectAfkVoice({ reason: "health-transport-rebuild" }).catch(() => null);
      }
      return;
    }

    if (!reconnectTimer && !activeConnectPromise && Date.now() - lastHealthRepairAt > 10000) {
      lastHealthRepairAt = Date.now();
      scheduleReconnect("Health check mendeteksi Pak RW tidak berada di channel AFK.", "VOICE_HEALTH_MISSING");
    }
  }, intervalMs);
  healthTimer.unref?.();
}

function initializeAfkVoiceManager({ client, getConfig }) {
  if (clientRef && voiceStateListener) clientRef.off?.("voiceStateUpdate", voiceStateListener);
  clearHealthTimer();
  clientRef = client;
  configReader = getConfig;
  shuttingDown = false;

  voiceStateListener = (oldState, newState) => {
    if (!clientRef?.user || newState?.id !== clientRef.user.id) return;
    const cfg = readConfig();
    if (shuttingDown || manualDisconnect || Date.now() < suppressVoiceStateUntil || !cfg.enabled) return;
    const targetId = String(cfg.channelId || "");
    if (!targetId) return;

    if (String(newState.channelId || "") === targetId) {
      const channel = newState.channel || newState.guild.channels.cache.get(targetId);
      if (channel) connectedRuntime(newState.guild, channel, actualConnection(newState.guild.id), connectionIsReady(actualConnection(newState.guild.id)) ? "" : "Pak RW sudah masuk voice; transport voice sedang menstabilkan koneksi.");
      return;
    }

    if (String(oldState.channelId || "") === targetId || newState.channelId) {
      setRuntime({
        state: "Terputus",
        lastDisconnectedAt: nowIso(),
        lastError: "Pak RW tidak lagi berada di voice channel AFK tersimpan.",
        lastWarning: "",
        errorCode: "VOICE_STATE_LEFT_TARGET",
        transportReady: false,
        connectionMode: "none"
      });
      scheduleReconnect("Pak RW tidak lagi berada di voice channel AFK tersimpan.", "VOICE_STATE_LEFT_TARGET");
    }
  };
  clientRef?.on?.("voiceStateUpdate", voiceStateListener);

  const cfg = readConfig();
  runtime.guildId = String(cfg.guildId || "");
  runtime.channelId = String(cfg.channelId || "");
  setRuntime({ state: cfg.enabled ? "Terputus" : "Dinonaktifkan" });
  runHealthCheck();

  if (!dependencyReportLogged) {
    dependencyReportLogged = true;
    try {
      const summary = generateDependencyReport().split("\n").filter((line) => /@discordjs\/voice|discord\.js/.test(line)).join(" • ");
      console.log(`[AFK VOICE] Runtime Node ${process.version}${summary ? ` • ${summary}` : ""}`);
    } catch {}
  }
  console.log("[AFK VOICE] Konfigurasi Pak RW dimuat dengan single-flight reconnect.");
  return module.exports;
}

async function shutdownAfkVoice() {
  shuttingDown = true;
  abortActiveAttempt();
  clearReconnectTimer({ resetAttempts: true });
  clearHealthTimer();
  manualDisconnect = true;
  suppressVoiceStateUntil = Date.now() + 5000;
  const cfg = readConfig();
  destroyExistingConnection(cfg.guildId, { intentional: true });
  activeConnection = null;
  if (clientRef && voiceStateListener) clientRef.off?.("voiceStateUpdate", voiceStateListener);
  setRuntime({ state: "Terputus", lastDisconnectedAt: nowIso(), transportReady: false, connectionMode: "none" });
}

function checkActionRateLimit(windowMs = 1800) {
  const now = Date.now();
  if (now - lastActionAt < windowMs) return false;
  lastActionAt = now;
  return true;
}

function resetForTests() {
  abortActiveAttempt();
  clearReconnectTimer({ resetAttempts: true });
  clearHealthTimer();
  manualDisconnect = false;
  shuttingDown = false;
  suppressVoiceStateUntil = 0;
  lastActionAt = 0;
  lastHealthRepairAt = 0;
  operation = Promise.resolve();
  activeConnectPromise = null;
  activeConnectKey = "";
  activeConnection = null;
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
    lastWarning: "",
    errorCode: "",
    transportState: null,
    transportReady: false,
    connectionMode: "none",
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
  _voicePresenceMatches: voicePresenceMatches,
  _isActuallyConnected: isActuallyConnected,
  _resetForTests: resetForTests
};
