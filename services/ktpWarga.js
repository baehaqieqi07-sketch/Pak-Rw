const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");
const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const { isMongoActive, readStore, writeStore } = require("../db/mongoStore");

const KTP_STORE_KEY = "ktpWarga";
const KTP_LOCAL_PATH = path.join(__dirname, "..", "data", "ktp.json");
const DEFAULT_BACKGROUND_PATH = path.join(__dirname, "..", "assets", "ktp-desa-tulus-background.png");
const KTP_BUTTON_ID = "pakrw_ktp_open";
const KTP_MODAL_ID = "pakrw_ktp_modal";
const KTP_MODAL_FIELDS = Object.freeze({
  fullName: "pakrw_ktp_full_name",
  gender: "pakrw_ktp_gender",
  domicile: "pakrw_ktp_domicile",
  religion: "pakrw_ktp_religion",
  hobby: "pakrw_ktp_hobby"
});

const ktpCooldowns = new Map();


function defaultKtpDesign() {
  return {
    title: { x: 506, y: 66, fontSize: 30, color: "#1f3016", align: "center", visible: true },
    subtitle: { x: 506, y: 94, fontSize: 20, color: "#1f3016", align: "center", visible: true },
    fields: { labelX: 58, colonX: 232, valueX: 264, startY: 190, gap: 57, labelSize: 21, valueSize: 21, labelColor: "#31441f", valueColor: "#1d2915", maxWidth: 430, visible: true },
    photo: { x: 748, y: 154, width: 220, height: 270, radius: 7, borderWidth: 2, borderColor: "#2b401c", frameColor: "#ebe9c7", visible: true },
    date: { x: 858, y: 458, fontSize: 15, valueY: 483, valueSize: 18, color: "#31441f", visible: true },
    status: { x: 858, y: 516, fontSize: 14, color: "#233316", visible: true },
    footerLeft: { x: 24, y: 621, fontSize: 12, color: "#233316", align: "left", visible: true },
    footerRight: { x: 987, y: 621, fontSize: 12, color: "#233316", align: "right", visible: true },
    decorations: []
  };
}

function mergeKtpDesign(raw = {}) {
  const base = defaultKtpDesign();
  const sections = ["title", "subtitle", "fields", "photo", "date", "status", "footerLeft", "footerRight"];
  for (const section of sections) base[section] = { ...base[section], ...(raw?.[section] || {}) };
  base.decorations = Array.isArray(raw?.decorations) ? raw.decorations.slice(0, 20) : [];
  return base;
}

function finiteNumber(value, fallback, min = -10000, max = 10000) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function defaultKtpConfig() {
  return {
    enabled: true,
    channelId: "",
    channelName: "buat-ktp",
    cooldownSeconds: 15,
    allowUpdate: true,
    panelTitle: "KARTU TANDA PENDUDUK DESA TULUS",
    panelDescription: "Klik tombol **Buat KTP** untuk mengisi data warga. Gunakan nama panggilan dan domisili umum saja—jangan tulis alamat rumah, nomor telepon, kata sandi, atau data pribadi sensitif.",
    buttonLabel: "Buat KTP",
    resultContent: "🪪 Kartu Tanda Penduduk milik {user}",
    footerText: "DESA TULUS • Ketik perintah rwktp untuk melihat KTP",
    backgroundPath: "assets/ktp-desa-tulus-background.png",
    backgroundFit: "exact",
    design: defaultKtpDesign(),
    cardTitle: "KARTU TANDA PENDUDUK",
    cardSubtitle: "DESA TULUS",
    privacyNote: "KARTU KOMUNITAS DIGITAL • BUKAN DOKUMEN RESMI",
    numberMode: "random_unique_18_digits_v2",
    rendererVersion: "10.10.94",
    logToConsole: true
  };
}

function getKtpConfig(config = {}) {
  const merged = { ...defaultKtpConfig(), ...(config.ktpSystem || {}) };
  merged.design = mergeKtpDesign(config.ktpSystem?.design || merged.design);
  return merged;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readLocalStore() {
  try {
    if (!fs.existsSync(KTP_LOCAL_PATH)) return { records: {} };
    const parsed = JSON.parse(fs.readFileSync(KTP_LOCAL_PATH, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : { records: {} };
  } catch (error) {
    console.log("[KTP WARGA] Gagal membaca fallback lokal:", error.message);
    return { records: {} };
  }
}

function readKtpStore() {
  const fallback = readLocalStore();
  const source = isMongoActive() ? readStore(KTP_STORE_KEY, fallback) : fallback;
  const safe = source && typeof source === "object" ? source : { records: {} };
  if (!safe.records || typeof safe.records !== "object") safe.records = {};
  return clone(safe);
}

function writeKtpStore(store) {
  const safe = clone(store || { records: {} });
  if (!safe.records || typeof safe.records !== "object") safe.records = {};

  try {
    fs.mkdirSync(path.dirname(KTP_LOCAL_PATH), { recursive: true });
    const temporary = `${KTP_LOCAL_PATH}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(safe, null, 2), "utf8");
    fs.renameSync(temporary, KTP_LOCAL_PATH);
  } catch (error) {
    console.log("[KTP WARGA] Gagal menyimpan fallback lokal:", error.message);
  }

  if (isMongoActive()) writeStore(KTP_STORE_KEY, safe);
  return true;
}

function recordKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function getKtpRecord(guildId, userId) {
  if (!guildId || !userId) return null;
  const store = readKtpStore();
  const key = recordKey(guildId, userId);
  const record = store.records[key] || null;
  return ensureRecordHasUniqueKtpNumber(store, key, record);
}

function saveKtpRecord(record) {
  if (!record?.guildId || !record?.userId) return false;
  const store = readKtpStore();
  store.records[recordKey(record.guildId, record.userId)] = clone(record);
  return writeKtpStore(store);
}

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/<@!?\d+>|<@&\d+>|<#\d+>|@everyone|@here/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeChannelName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolveKtpChannel(guild, config = {}) {
  if (!guild) return null;
  const cfg = getKtpConfig(config);
  const byId = cfg.channelId ? guild.channels.cache.get(String(cfg.channelId)) : null;
  if (byId?.isTextBased?.() && typeof byId.send === "function" && !byId.isThread?.()) return byId;

  const wanted = normalizeChannelName(cfg.channelName || "buat-ktp");
  return guild.channels.cache.find((channel) => {
    if (!channel?.isTextBased?.() || channel.isThread?.() || typeof channel.send !== "function") return false;
    const normalized = normalizeChannelName(channel.name);
    return normalized === wanted || normalized.endsWith(`-${wanted}`) || normalized.includes(wanted);
  }) || null;
}

function isAllowedPanelManager(message) {
  if (!message?.guild || !message?.member) return false;
  return message.author.id === message.guild.ownerId ||
    message.member.permissions.has(PermissionFlagsBits.Administrator) ||
    message.member.permissions.has(PermissionFlagsBits.ManageGuild);
}

function missingBotPermissions(channel, guild) {
  const me = guild?.members?.me;
  const permissions = channel?.permissionsFor?.(me);
  if (!permissions) return ["View Channel", "Send Messages", "Attach Files", "Embed Links", "Read Message History"];

  const checks = [
    [PermissionFlagsBits.ViewChannel, "Lihat Channel"],
    [PermissionFlagsBits.SendMessages, "Kirim Pesan"],
    [PermissionFlagsBits.AttachFiles, "Lampirkan File"],
    [PermissionFlagsBits.EmbedLinks, "Sematkan Tautan"],
    [PermissionFlagsBits.ReadMessageHistory, "Baca Riwayat Pesan"]
  ];
  return checks.filter(([flag]) => !permissions.has(flag)).map(([, label]) => label);
}

function randomNumericString(length) {
  let result = "";
  while (result.length < length) {
    const bytes = crypto.randomBytes(Math.max(16, length * 2));
    for (const byte of bytes) {
      // Hindari bias modulo berlebihan dan hasil tetap numerik.
      if (byte >= 250) continue;
      result += String(byte % 10);
      if (result.length >= length) break;
    }
  }
  return result;
}

function generateUniqueKtpNumber(store = { records: {} }, guildId = "") {
  const records = store?.records && typeof store.records === "object" ? store.records : {};
  const used = new Set(
    Object.values(records)
      .filter((item) => !guildId || String(item?.guildId || "") === String(guildId))
      .map((item) => String(item?.ktpNumber || ""))
      .filter((number) => /^\d{18}$/.test(number))
  );

  for (let attempt = 0; attempt < 500; attempt += 1) {
    const candidate = `32${randomNumericString(16)}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new Error("Gagal membuat nomor KTP unik setelah banyak percobaan.");
}

function makeKtpNumber(guildId, userId, store = null) {
  // userId dipertahankan pada signature agar kompatibel dengan kode lama.
  void userId;
  return generateUniqueKtpNumber(store || readKtpStore(), guildId);
}

function ensureRecordHasUniqueKtpNumber(store, key, record) {
  if (!record) return null;
  const records = store?.records && typeof store.records === "object" ? store.records : {};
  const currentNumber = String(record.ktpNumber || "");
  const duplicateOwner = Object.entries(records).find(([otherKey, item]) =>
    otherKey !== key && String(item?.guildId || "") === String(record.guildId || "") && String(item?.ktpNumber || "") === currentNumber
  );
  const isCurrentNumberValid = /^\d{18}$/.test(currentNumber) && !duplicateOwner;
  const isCurrentVersion = Number(record.ktpNumberVersion || 0) >= 2;

  if (isCurrentNumberValid && isCurrentVersion) return clone(record);

  const updated = {
    ...record,
    ktpNumber: generateUniqueKtpNumber(store, record.guildId),
    ktpNumberVersion: 2,
    numberUpdatedAt: Date.now()
  };
  records[key] = updated;
  writeKtpStore(store);
  return clone(updated);
}

function formatDateWib(timestamp = Date.now()) {
  const parts = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).formatToParts(new Date(timestamp));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.day || "01"}-${map.month || "01"}-${map.year || "2026"}`;
}

function truncateCanvasText(ctx, text, maxWidth) {
  const value = String(text || "-");
  if (ctx.measureText(value).width <= maxWidth) return value;
  let result = value;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) result = result.slice(0, -1);
  return `${result}…`;
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

const KTP_FONT_REGULAR_FAMILY = "PakRW KTP Regular";
const KTP_FONT_BOLD_FAMILY = "PakRW KTP Bold";
let ktpFontState = null;
let canvasFontLogShown = false;

function canvasTextHasVisiblePixels(fontFamily, weight = "normal") {
  try {
    const probe = createCanvas(260, 80);
    const probeCtx = probe.getContext("2d");
    probeCtx.clearRect(0, 0, probe.width, probe.height);
    probeCtx.globalAlpha = 1;
    probeCtx.globalCompositeOperation = "source-over";
    probeCtx.fillStyle = "#ffffff";
    probeCtx.textAlign = "left";
    probeCtx.textBaseline = "alphabetic";
    probeCtx.font = `${weight} 34px ${fontFamily}`;
    probeCtx.fillText("DESA TULUS 123", 8, 52);
    const pixels = probeCtx.getImageData(0, 0, probe.width, probe.height).data;
    let visible = 0;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] > 8) visible += 1;
      if (visible > 80) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function firstExistingFile(candidates = []) {
  return candidates
    .map((candidate) => String(candidate || "").trim())
    .find((candidate) => candidate && fs.existsSync(candidate)) || "";
}

function resolveDejaVuPackageFont(fileName) {
  try {
    const packageRoot = path.dirname(require.resolve("dejavu-fonts-ttf/package.json"));
    return path.join(packageRoot, "ttf", fileName);
  } catch {
    return "";
  }
}

function registerKtpCanvasFonts() {
  if (ktpFontState) return ktpFontState;

  const regularPath = firstExistingFile([
    process.env.KTP_FONT_REGULAR_PATH,
    resolveDejaVuPackageFont("DejaVuSans.ttf"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/TTF/DejaVuSans.ttf",
    "C:\\Windows\\Fonts\\arial.ttf"
  ]);
  const boldPath = firstExistingFile([
    process.env.KTP_FONT_BOLD_PATH,
    resolveDejaVuPackageFont("DejaVuSans-Bold.ttf"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    "C:\\Windows\\Fonts\\arialbd.ttf"
  ]);

  let regularRegistered = false;
  let boldRegistered = false;
  try {
    if (regularPath) regularRegistered = GlobalFonts.registerFromPath(regularPath, KTP_FONT_REGULAR_FAMILY) !== false;
  } catch (error) {
    console.log("[KTP WARGA] Font regular gagal didaftarkan:", error.message);
  }
  try {
    if (boldPath) boldRegistered = GlobalFonts.registerFromPath(boldPath, KTP_FONT_BOLD_FAMILY) !== false;
  } catch (error) {
    console.log("[KTP WARGA] Font bold gagal didaftarkan:", error.message);
  }

  const regularReady = regularRegistered && canvasTextHasVisiblePixels(`"${KTP_FONT_REGULAR_FAMILY}"`);
  const boldReady = boldRegistered && canvasTextHasVisiblePixels(`"${KTP_FONT_BOLD_FAMILY}"`);
  const source = regularPath.includes("node_modules") || boldPath.includes("node_modules")
    ? "npm:dejavu-fonts-ttf"
    : regularPath || boldPath
      ? "font-host"
      : "tidak-ada";

  ktpFontState = {
    ready: regularReady || boldReady,
    regularReady,
    boldReady,
    regularFamily: KTP_FONT_REGULAR_FAMILY,
    boldFamily: KTP_FONT_BOLD_FAMILY,
    source
  };

  if (!canvasFontLogShown) {
    canvasFontLogShown = true;
    if (ktpFontState.ready) {
      console.log(`[KTP WARGA] Font Canvas terdaftar: ${ktpFontState.boldReady ? KTP_FONT_BOLD_FAMILY : KTP_FONT_REGULAR_FAMILY} • ${source}.`);
    } else {
      console.log("[KTP WARGA] Font Canvas khusus belum tersedia; memeriksa fallback host.");
    }
  }
  return ktpFontState;
}

function resolveCanvasFontSpec(weight = 600) {
  const state = registerKtpCanvasFonts();
  if (Number(weight) >= 600 && state.boldReady) {
    return { cssFamily: `"${state.boldFamily}"`, label: state.boldFamily, syntheticBold: false };
  }
  if (state.regularReady) {
    return { cssFamily: `"${state.regularFamily}"`, label: state.regularFamily, syntheticBold: Number(weight) >= 600 };
  }
  if (state.boldReady) {
    return { cssFamily: `"${state.boldFamily}"`, label: state.boldFamily, syntheticBold: false };
  }

  const fallback = ["Arial", "Liberation Sans", "Noto Sans", "DejaVu Sans", "sans-serif"]
    .find((family) => canvasTextHasVisiblePixels(`"${family}"`));
  if (fallback) {
    return { cssFamily: `"${fallback}"`, label: fallback, syntheticBold: Number(weight) >= 600 };
  }

  throw new Error("Font KTP tidak tersedia. Dependency dejavu-fonts-ttf belum terpasang atau gagal dimuat.");
}

function setCanvasFont(ctx, size, weight = 600) {
  const spec = resolveCanvasFontSpec(weight);
  const style = spec.syntheticBold ? "bold " : "";
  ctx.font = `${style}${Math.max(8, Number(size) || 16)}px ${spec.cssFamily}`;
}

function getKtpFontDiagnostics() {
  const state = registerKtpCanvasFonts();
  const active = resolveCanvasFontSpec(700);
  return {
    ready: Boolean(state.ready || active),
    source: state.source,
    regularReady: state.regularReady,
    boldReady: state.boldReady,
    activeFamily: active.label
  };
}

function resetCanvasTextState(ctx) {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function countVisibleAlphaPixels(ctx, width, height, step = 4) {
  const pixels = ctx.getImageData(0, 0, width, height).data;
  let visible = 0;
  for (let index = 3; index < pixels.length; index += 4 * Math.max(1, step)) {
    if (pixels[index] > 8) visible += 1;
  }
  return visible;
}

function drawCoverImage(ctx, image, x, y, width, height) {
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = image.width;
  let sh = image.height;

  if (sourceRatio > targetRatio) {
    sw = image.height * targetRatio;
    sx = (image.width - sw) / 2;
  } else {
    sh = image.width / targetRatio;
    sy = (image.height - sh) / 2;
  }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function drawPanel(ctx, x, y, width, height, radius, fill, stroke = "rgba(41, 61, 26, 0.35)") {
  ctx.save();
  ctx.shadowColor = "rgba(24, 37, 15, 0.22)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  roundedRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.restore();
}

async function loadAvatarImage(avatarUrl) {
  if (!avatarUrl) return null;
  try {
    const response = await axios.get(avatarUrl, {
      responseType: "arraybuffer",
      timeout: 12000,
      maxContentLength: 12 * 1024 * 1024,
      maxBodyLength: 12 * 1024 * 1024,
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,*/*" }
    });
    return await loadImage(Buffer.from(response.data));
  } catch (error) {
    console.log("[KTP WARGA] Avatar tidak dapat dimuat, memakai inisial:", error.message);
    return null;
  }
}

function materializeKtpDesignAsset(relativePath = "") {
  const safeRelative = String(relativePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!safeRelative.startsWith("assets/")) return "";
  const resolved = path.resolve(__dirname, "..", safeRelative);
  const assetsRoot = path.resolve(__dirname, "..", "assets") + path.sep;
  if (!resolved.startsWith(assetsRoot)) return "";
  if (fs.existsSync(resolved)) return resolved;
  const stored = readStore("ktpDesignAssets", { files: {} })?.files?.[safeRelative];
  if (!stored?.data) return resolved;
  try {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, Buffer.from(stored.data, "base64"));
  } catch (error) {
    console.log("[KTP WARGA] Asset dashboard gagal dipulihkan:", error.message);
  }
  return resolved;
}

function resolveBackgroundPath(config = {}) {
  const cfg = getKtpConfig(config);
  const configured = String(cfg.backgroundPath || "").trim();
  if (!configured) return DEFAULT_BACKGROUND_PATH;
  if (path.isAbsolute(configured)) return configured;
  return materializeKtpDesignAsset(configured);
}

function drawKtpField(ctx, label, value, y, options = {}) {
  resetCanvasTextState(ctx);
  const labelX = Number(options.labelX || 72);
  const colonX = Number(options.colonX || 272);
  const valueX = Number(options.valueX || 304);
  const maxWidth = Number(options.maxWidth || 470);
  const valueSize = finiteNumber(options.valueSize, 25, 8, 80);
  const labelSize = finiteNumber(options.labelSize, 21, 8, 80);

  ctx.textAlign = "left";
  ctx.fillStyle = String(options.labelColor || "#31441f");
  setCanvasFont(ctx, labelSize, 700);
  ctx.fillText(String(label || "-"), labelX, y);

  ctx.textAlign = "center";
  ctx.fillStyle = String(options.labelColor || "#31441f");
  setCanvasFont(ctx, labelSize, 800);
  ctx.fillText(":", colonX, y);

  ctx.textAlign = "left";
  ctx.fillStyle = String(options.valueColor || "#1d2915");
  setCanvasFont(ctx, valueSize, 800);
  ctx.fillText(truncateCanvasText(ctx, value || "-", maxWidth), valueX, y);
}

async function renderKtpCard({ record, member, config = {}, avatarUrl = "" }) {
  const cfg = getKtpConfig(config);
  const safeRecord = {
    ...(record || {}),
    userId: cleanText(record?.userId || member?.user?.id || "Tidak tersedia", 32) || "Tidak tersedia",
    ktpNumber: cleanText(record?.ktpNumber || "Belum tersedia", 32) || "Belum tersedia",
    fullName: cleanText(
      record?.fullName ||
      member?.displayName ||
      member?.user?.globalName ||
      member?.user?.username ||
      "Warga Desa",
      40
    ) || "Warga Desa",
    gender: cleanText(record?.gender || "Belum tersedia", 24) || "Belum tersedia",
    domicile: cleanText(record?.domicile || "DESA TULUS", 40) || "DESA TULUS",
    religion: cleanText(record?.religion || "Belum tersedia", 28) || "Belum tersedia",
    hobby: cleanText(record?.hobby || "Belum tersedia", 50) || "Belum tersedia",
    createdAt: Number.isFinite(Number(record?.createdAt)) ? Number(record.createdAt) : Date.now(),
    updatedAt: Number.isFinite(Number(record?.updatedAt)) ? Number(record.updatedAt) : Date.now()
  };

  if (cfg.logToConsole !== false) {
    console.log(`[KTP WARGA] Memulai generator KTP untuk ${safeRecord.userId}.`);
    console.log(`[KTP WARGA] Data render: nama=${safeRecord.fullName} • nomor=${safeRecord.ktpNumber}.`);
  }

  const backgroundPath = resolveBackgroundPath(config);
  if (!fs.existsSync(backgroundPath)) throw new Error(`Background KTP tidak ditemukan: ${backgroundPath}`);

  const background = await loadImage(backgroundPath);
  if (!background?.width || !background?.height) throw new Error("Ukuran background KTP tidak valid.");

  // Canvas KTP selalu 1011x639. Background dapat exact, cover, atau contain dari dashboard.
  const width = 1011;
  const height = 639;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (cfg.logToConsole !== false) {
    console.log(`[KTP WARGA] Canvas berhasil dibuat: ${width}x${height}.`);
  }

  const card = { x: 0, y: 0, w: width, h: height, radius: 0 };

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  const backgroundFit = ["exact", "cover", "contain"].includes(String(cfg.backgroundFit)) ? String(cfg.backgroundFit) : "exact";
  if (backgroundFit === "cover") drawCoverImage(ctx, background, 0, 0, width, height);
  else if (backgroundFit === "contain") {
    const ratio = Math.min(width / background.width, height / background.height);
    const drawWidth = background.width * ratio;
    const drawHeight = background.height * ratio;
    ctx.fillStyle = "#81934b";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(background, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  } else ctx.drawImage(background, 0, 0, width, height);

  const design = mergeKtpDesign(cfg.design);

  // Image tambahan dari dashboard digambar di atas background dan di bawah foto/teks.
  for (const decoration of design.decorations) {
    if (decoration?.visible === false || !decoration?.path) continue;
    try {
      const configuredPath = String(decoration.path).trim();
      const decorationPath = path.isAbsolute(configuredPath) ? configuredPath : materializeKtpDesignAsset(configuredPath);
      if (!fs.existsSync(decorationPath)) continue;
      const image = await loadImage(decorationPath);
      const x = finiteNumber(decoration.x, 0, -width, width * 2);
      const y = finiteNumber(decoration.y, 0, -height, height * 2);
      const drawWidth = finiteNumber(decoration.width, 100, 1, width * 2);
      const drawHeight = finiteNumber(decoration.height, 100, 1, height * 2);
      const opacity = finiteNumber(decoration.opacity, 1, 0, 1);
      const rotation = finiteNumber(decoration.rotation, 0, -360, 360) * Math.PI / 180;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(x + drawWidth / 2, y + drawHeight / 2);
      ctx.rotate(rotation);
      ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
    } catch (error) {
      console.log(`[KTP WARGA] Image dekorasi dilewati: ${error.message}`);
    }
  }

  // Foto dan teks dirender pada layer terpisah agar state clip/font tidak saling menutupi.
  const photoDesign = design.photo;
  const photoFrame = {
    x: finiteNumber(photoDesign.x, 748, -width, width * 2), y: finiteNumber(photoDesign.y, 154, -height, height * 2),
    w: finiteNumber(photoDesign.width, 220, 20, width * 2), h: finiteNumber(photoDesign.height, 270, 20, height * 2)
  };
  if (photoDesign.visible !== false) {
  ctx.save();
  ctx.shadowColor = "rgba(30, 45, 19, 0.24)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;
  roundedRect(ctx, photoFrame.x, photoFrame.y, photoFrame.w, photoFrame.h, finiteNumber(photoDesign.radius, 7, 0, 100));
  ctx.fillStyle = String(photoDesign.frameColor || "rgba(235, 233, 199, 0.91)");
  ctx.fill();
  ctx.restore();
  roundedRect(ctx, photoFrame.x, photoFrame.y, photoFrame.w, photoFrame.h, finiteNumber(photoDesign.radius, 7, 0, 100));
  ctx.lineWidth = finiteNumber(photoDesign.borderWidth, 2, 0, 20);
  ctx.strokeStyle = String(photoDesign.borderColor || "rgba(43, 64, 28, 0.70)");
  ctx.stroke();

  const inset = 10;
  const avatar = await loadAvatarImage(avatarUrl || member?.user?.displayAvatarURL?.({ extension: "png", size: 256, forceStatic: true }));
  if (cfg.logToConsole !== false) {
    console.log(`[KTP WARGA] Avatar ${avatar ? "berhasil dimuat" : "gagal dimuat; memakai placeholder"}.`);
  }
  ctx.save();
  roundedRect(ctx, photoFrame.x + inset, photoFrame.y + inset, photoFrame.w - inset * 2, photoFrame.h - inset * 2, 4);
  ctx.clip();
  if (avatar) {
    drawCoverImage(ctx, avatar, photoFrame.x + inset, photoFrame.y + inset, photoFrame.w - inset * 2, photoFrame.h - inset * 2);
  } else {
    const avatarFallback = ctx.createLinearGradient(photoFrame.x, photoFrame.y, photoFrame.x, photoFrame.y + photoFrame.h);
    avatarFallback.addColorStop(0, "#a8b96f");
    avatarFallback.addColorStop(1, "#506d37");
    ctx.fillStyle = avatarFallback;
    ctx.fillRect(photoFrame.x + inset, photoFrame.y + inset, photoFrame.w - inset * 2, photoFrame.h - inset * 2);

    ctx.fillStyle = "rgba(247, 242, 207, 0.96)";
    ctx.textAlign = "center";
    setCanvasFont(ctx, 76, 900);
    const initials = String(safeRecord.fullName || "W")
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0] || "")
      .join("")
      .toUpperCase();
    ctx.fillText(initials || "W", photoFrame.x + photoFrame.w / 2, photoFrame.y + photoFrame.h / 2 + 26);
  }
  ctx.restore();
  }

  // Garis aksen judul bukan bagian dari validasi teks. Dengan begitu, garis dekorasi
  // tidak dapat membuat test salah mengira tulisan sudah berhasil dirender.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(finiteNumber(design.title.x, width / 2) - 42, finiteNumber(design.subtitle.y, 94) + 18);
  ctx.lineTo(finiteNumber(design.title.x, width / 2) + 42, finiteNumber(design.subtitle.y, 94) + 18);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(42, 63, 27, 0.42)";
  ctx.stroke();
  ctx.restore();

  // Seluruh tulisan dirender pada canvas transparan terpisah. Ini mencegah
  // clip avatar, globalAlpha, atau state gambar lain membuat teks hilang di Railway.
  const textCanvas = createCanvas(width, height);
  const textCtx = textCanvas.getContext("2d");
  resetCanvasTextState(textCtx);
  textCtx.clearRect(0, 0, width, height);

  // Judul kartu.
  if (design.title.visible !== false) {
    textCtx.textAlign = String(design.title.align || "center");
    textCtx.fillStyle = String(design.title.color || "#1f3016");
    setCanvasFont(textCtx, finiteNumber(design.title.fontSize, 30, 8, 80), 900);
    textCtx.fillText(String(cfg.cardTitle || "KARTU TANDA PENDUDUK").toUpperCase(), finiteNumber(design.title.x, width / 2), finiteNumber(design.title.y, 66));
  }
  if (design.subtitle.visible !== false) {
    textCtx.textAlign = String(design.subtitle.align || "center");
    textCtx.fillStyle = String(design.subtitle.color || "#1f3016");
    setCanvasFont(textCtx, finiteNumber(design.subtitle.fontSize, 20, 8, 80), 900);
    textCtx.fillText(String(cfg.cardSubtitle || "DESA TULUS").toUpperCase(), finiteNumber(design.subtitle.x, width / 2), finiteNumber(design.subtitle.y, 94));
  }

  // Data warga: enam baris wajib selalu tertulis pada gambar final.
  const rows = [
    ["No KTP", safeRecord.ktpNumber, 21],
    ["Nama", safeRecord.fullName, 22],
    ["Jenis Kelamin", safeRecord.gender, 21],
    ["Domisili", safeRecord.domicile, 21],
    ["Agama", safeRecord.religion, 21],
    ["Hobi", safeRecord.hobby, 21]
  ];
  if (design.fields.visible !== false) {
    const firstY = finiteNumber(design.fields.startY, 190, -height, height * 2);
    const rowGap = finiteNumber(design.fields.gap, 57, 10, 200);
    rows.forEach(([label, value, valueSize], index) => {
      drawKtpField(textCtx, label, value, firstY + index * rowGap, {
        labelX: finiteNumber(design.fields.labelX, 58), colonX: finiteNumber(design.fields.colonX, 232), valueX: finiteNumber(design.fields.valueX, 264),
        maxWidth: finiteNumber(design.fields.maxWidth, 430, 40, width),
        labelSize: finiteNumber(design.fields.labelSize, 21, 8, 80), valueSize: finiteNumber(design.fields.valueSize, Number(valueSize), 8, 80),
        labelColor: design.fields.labelColor, valueColor: design.fields.valueColor
      });
    });
  }

  // Tanggal, status, dan footer mengikuti posisi dashboard.
  resetCanvasTextState(textCtx);
  if (design.date.visible !== false) {
    textCtx.textAlign = "center";
    textCtx.fillStyle = String(design.date.color || "#31441f");
    setCanvasFont(textCtx, finiteNumber(design.date.fontSize, 15, 8, 80), 800);
    textCtx.fillText("Tanggal Pembuatan:", finiteNumber(design.date.x, photoFrame.x + photoFrame.w / 2), finiteNumber(design.date.y, 458));
    setCanvasFont(textCtx, finiteNumber(design.date.valueSize, 18, 8, 80), 900);
    textCtx.fillText(formatDateWib(safeRecord.createdAt), finiteNumber(design.date.x, photoFrame.x + photoFrame.w / 2), finiteNumber(design.date.valueY, 483));
  }
  if (design.status.visible !== false) {
    textCtx.textAlign = "center";
    textCtx.fillStyle = String(design.status.color || "#233316");
    setCanvasFont(textCtx, finiteNumber(design.status.fontSize, 14, 8, 80), 800);
    textCtx.fillText("WARGA DESA TULUS", finiteNumber(design.status.x, photoFrame.x + photoFrame.w / 2), finiteNumber(design.status.y, 516));
  }
  if (design.footerLeft.visible !== false) {
    textCtx.textAlign = String(design.footerLeft.align || "left");
    textCtx.fillStyle = String(design.footerLeft.color || "#233316");
    setCanvasFont(textCtx, finiteNumber(design.footerLeft.fontSize, 12, 8, 80), 800);
    textCtx.fillText(String(cfg.privacyNote || "KARTU KOMUNITAS DIGITAL • BUKAN DOKUMEN RESMI").toUpperCase(), finiteNumber(design.footerLeft.x, 24), finiteNumber(design.footerLeft.y, height - 18));
  }
  if (design.footerRight.visible !== false) {
    textCtx.textAlign = String(design.footerRight.align || "right");
    textCtx.fillStyle = String(design.footerRight.color || "#233316");
    setCanvasFont(textCtx, finiteNumber(design.footerRight.fontSize, 12, 8, 80), 800);
    textCtx.fillText("PAK RW • DESA TULUS", finiteNumber(design.footerRight.x, width - 24), finiteNumber(design.footerRight.y, height - 18));
  }

  const visibleTextPixels = countVisibleAlphaPixels(textCtx, width, height, 2);
  if (visibleTextPixels < 1200) {
    throw new Error(`Layer teks KTP gagal dirender (${visibleTextPixels} pixel). Font aktif: ${resolveCanvasFontSpec(700).label}.`);
  }

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(textCanvas, 0, 0);
  ctx.restore();

  if (cfg.logToConsole !== false) {
    console.log(`[KTP WARGA] Render teks berhasil: ${visibleTextPixels} pixel • font ${resolveCanvasFontSpec(700).label}.`);
  }

  const buffer = canvas.toBuffer("image/png");
  if (!Buffer.isBuffer(buffer) || buffer.length < 50000 || buffer.subarray(1, 4).toString("ascii") !== "PNG") {
    throw new Error("Hasil render KTP tidak valid atau terlihat kosong.");
  }
  if (cfg.logToConsole !== false) {
    console.log(`[KTP WARGA] Buffer PNG berhasil dibuat: ${buffer.length} bytes.`);
  }
  return buffer;
}

function makeKtpAttachmentName(record = {}) {
  const safeUser = String(record.userId || "warga").replace(/[^0-9a-z_-]/gi, "").slice(-20) || "warga";
  const revision = Number(record.updatedAt || record.createdAt || Date.now());
  return `ktp-desa-tulus-${safeUser}-${revision}.png`;
}

function footerIconUrl(config = {}) {
  return config.embeds?.welcome?.footerIcon ||
    config.embeds?.levelUp?.footerIcon ||
    "https://cdn.discordapp.com/emojis/1516424353934348299.gif?size=44&quality=lossless";
}

function buildKtpButton(config = {}) {
  const cfg = getKtpConfig(config);
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(KTP_BUTTON_ID)
      .setLabel(String(cfg.buttonLabel || "Buat KTP").slice(0, 80))
      .setEmoji("🪪")
      .setStyle(ButtonStyle.Primary)
  );
}

function buildKtpPanelEmbed(config = {}) {
  const cfg = getKtpConfig(config);
  const color = config.embedColor || "#7DBD77";
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`🪪 ${cfg.panelTitle}`)
    .setDescription([
      cfg.panelDescription,
      "",
      "**Alur pembuatan:**",
      "1. Klik tombol **Buat KTP**.",
      "2. Isi lima kolom pada formulir.",
      "3. Pak RW membuat kartu dari background DESA TULUS dan avatar Discord kamu.",
      "4. Kartu dikirim ke channel KTP ini.",
      "",
      "Gunakan nama warga atau nama panggilan. Untuk domisili, cukup kota/kabupaten dan provinsi."
    ].join("\n"))
    .setFooter({ text: "DESA TULUS • Administrasi KTP Warga", iconURL: footerIconUrl(config) })
    .setTimestamp();
}

function buildKtpCardEmbed(config = {}, attachmentName = "ktp-desa-tulus.png") {
  const cfg = getKtpConfig(config);
  return new EmbedBuilder()
    .setColor(config.embedColor || "#7DBD77")
    .setImage(`attachment://${attachmentName}`)
    .setFooter({ text: cfg.footerText || "DESA TULUS • Ketik perintah rwktp untuk melihat KTP", iconURL: footerIconUrl(config) })
    .setTimestamp();
}

function buildKtpModal(record = null) {
  const modal = new ModalBuilder().setCustomId(KTP_MODAL_ID).setTitle("Isi Data KTP Kamu");
  const definitions = [
    [KTP_MODAL_FIELDS.fullName, "Nama Lengkap", "Nama panggilan / nama warga", 40, record?.fullName],
    [KTP_MODAL_FIELDS.gender, "Jenis Kelamin", "Contoh: Laki-laki / Perempuan", 20, record?.gender],
    [KTP_MODAL_FIELDS.domicile, "Domisili", "Contoh: Bogor, Jawa Barat", 35, record?.domicile],
    [KTP_MODAL_FIELDS.religion, "Agama", "Boleh isi: Tidak ingin disebutkan", 24, record?.religion],
    [KTP_MODAL_FIELDS.hobby, "Hobi", "Contoh: Bermain musik", 45, record?.hobby]
  ];

  for (const [customId, label, placeholder, maxLength, value] of definitions) {
    const input = new TextInputBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setPlaceholder(placeholder)
      .setStyle(TextInputStyle.Short)
      .setMinLength(2)
      .setMaxLength(maxLength)
      .setRequired(true);
    if (value) input.setValue(String(value).slice(0, maxLength));
    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }
  return modal;
}

function formatTemplate(template, values = {}) {
  return String(template || "").replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => values[key] ?? `{${key}}`);
}

async function sendTemporaryMessage(channel, content, delayMs = 8000) {
  const sent = await channel.send({ content }).catch(() => null);
  if (sent) {
    const timer = setTimeout(() => sent.delete().catch(() => null), delayMs);
    if (typeof timer.unref === "function") timer.unref();
  }
  return sent;
}

function channelSetupMessage() {
  return "Channel khusus KTP Warga belum diatur. Buat text channel privat bernama `buat-ktp`, lalu pilih channel tersebut melalui Dashboard → Komunitas → KTP Warga.";
}

function wrongChannelMessage(channel) {
  return channel ? `Perintah KTP hanya dapat digunakan di ${channel}.` : "Perintah KTP hanya dapat digunakan di channel khusus KTP Warga.";
}

function getCooldownRemaining(userId, cfg) {
  const duration = Math.max(1, Number(cfg.cooldownSeconds || 15)) * 1000;
  const last = ktpCooldowns.get(userId) || 0;
  const remaining = duration - (Date.now() - last);
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

function setCooldown(userId) {
  ktpCooldowns.set(userId, Date.now());
}

async function publishKtpCard({ targetChannel, member, record, config = {}, buffer }) {
  const cfg = getKtpConfig(config);
  const attachmentName = makeKtpAttachmentName(record);
  const attachment = new AttachmentBuilder(buffer, { name: attachmentName });
  const user = member?.user || targetChannel?.client?.users?.cache?.get?.(record.userId) || null;
  const userMention = user?.id ? `<@${user.id}>` : `<@${record.userId}>`;
  const content = formatTemplate(cfg.resultContent, {
    user: userMention,
    username: user?.username || record.fullName || "Warga",
    displayName: member?.displayName || user?.globalName || record.fullName || "Warga"
  });

  // Setiap pembuatan/pembaruan KTP selalu mengirim kartu baru.
  // Pesan KTP lama tidak diedit atau dihapus agar permintaan user dapat dikirim ulang dengan aman.
  return targetChannel.send({
    content,
    embeds: [buildKtpCardEmbed(config, attachmentName)],
    components: [buildKtpButton(config)],
    files: [attachment]
  });
}

async function sendKtpPanel(channel, config = {}) {
  return channel.send({ embeds: [buildKtpPanelEmbed(config)], components: [buildKtpButton(config)] });
}

async function handleKtpMessageCommand(message, config = {}) {
  if (!message?.guild || message.author?.bot) return false;
  const prefix = String(config.prefix || "rw").toLowerCase();
  const raw = String(message.content || "").trim();
  const lower = raw.toLowerCase();
  const isView = lower === `${prefix}ktp`;
  const isPanel = lower === `${prefix}ktppanel`;
  if (!isView && !isPanel) return false;

  const cfg = getKtpConfig(config);
  if (!cfg.enabled) {
    await sendTemporaryMessage(message.channel, "Fitur KTP Warga sedang dinonaktifkan oleh pengurus.");
    return true;
  }

  const targetChannel = resolveKtpChannel(message.guild, config);

  // Panel tetap wajib berada di channel khusus KTP.
  if (isPanel) {
    if (!targetChannel) {
      await sendTemporaryMessage(message.channel, channelSetupMessage(), 12000);
      return true;
    }
    if (message.channel.id !== targetChannel.id) {
      await sendTemporaryMessage(message.channel, wrongChannelMessage(targetChannel));
      return true;
    }
    if (!isAllowedPanelManager(message)) {
      await sendTemporaryMessage(message.channel, "Perintah ini hanya dapat digunakan oleh owner, Administrator, atau pengurus dengan izin Kelola Server.");
      return true;
    }

    const missingPanelPermissions = missingBotPermissions(targetChannel, message.guild);
    if (missingPanelPermissions.length) {
      await sendTemporaryMessage(message.channel, `Pak RW belum memiliki izin berikut di channel KTP: **${missingPanelPermissions.join(", ")}**.`, 12000);
      return true;
    }

    await sendKtpPanel(targetChannel, config);
    await sendTemporaryMessage(message.channel, "Panel KTP Warga berhasil dikirim.", 5000);
    return true;
  }

  // rwktp dapat digunakan di semua text channel yang dapat dipakai Pak RW.
  const missingViewPermissions = missingBotPermissions(message.channel, message.guild);
  if (missingViewPermissions.length) {
    await sendTemporaryMessage(message.channel, `Pak RW belum memiliki izin berikut di channel ini: **${missingViewPermissions.join(", ")}**.`, 12000);
    return true;
  }

  const record = getKtpRecord(message.guild.id, message.author.id);
  if (!record) {
    const destination = targetChannel ? ` Silakan buat melalui panel di ${targetChannel}.` : ` ${channelSetupMessage()}`;
    await message.channel.send({
      content: `${message.author}, kamu belum memiliki KTP DESA TULUS.${destination}`
    });
    return true;
  }

  try {
    const member = message.member || await message.guild.members.fetch(message.author.id).catch(() => null);
    const buffer = await renderKtpCard({ record, member, config });
    const attachmentName = makeKtpAttachmentName({ ...record, updatedAt: Date.now() });
    await message.channel.send({
      content: formatTemplate(cfg.resultContent, {
        user: `<@${message.author.id}>`,
        username: message.author.username,
        displayName: member?.displayName || message.author.globalName || message.author.username
      }),
      embeds: [buildKtpCardEmbed(config, attachmentName)],
      components: [buildKtpButton(config)],
      files: [new AttachmentBuilder(buffer, { name: attachmentName })]
    });
    if (cfg.logToConsole !== false) {
      console.log(`[KTP WARGA] ${message.author.tag} melihat ulang KTP melalui #${message.channel?.name || message.channelId}.`);
    }
  } catch (error) {
    console.log("[KTP WARGA] Gagal menampilkan KTP:", { guildId: message.guild.id, userId: message.author.id, channelId: message.channelId, error: error.message });
    await sendTemporaryMessage(message.channel, "Pak RW gagal menampilkan KTP. Periksa file background dan permission Lampirkan File di channel ini.", 12000);
  }
  return true;
}

async function handleKtpInteraction(interaction, config = {}) {
  const isKtpButton = interaction.isButton?.() && interaction.customId === KTP_BUTTON_ID;
  const isKtpModal = interaction.isModalSubmit?.() && interaction.customId === KTP_MODAL_ID;
  if (!isKtpButton && !isKtpModal) return false;

  const cfg = getKtpConfig(config);
  if (!interaction.guild) {
    await interaction.reply({ content: "Fitur KTP Warga hanya tersedia di server DESA TULUS.", flags: 64 }).catch(() => null);
    return true;
  }
  if (!cfg.enabled) {
    await interaction.reply({ content: "Fitur KTP Warga sedang dinonaktifkan oleh pengurus.", flags: 64 }).catch(() => null);
    return true;
  }

  const targetChannel = resolveKtpChannel(interaction.guild, config);
  if (!targetChannel) {
    await interaction.reply({ content: channelSetupMessage(), flags: 64 }).catch(() => null);
    return true;
  }
  if (interaction.channelId !== targetChannel.id) {
    await interaction.reply({ content: wrongChannelMessage(targetChannel), flags: 64 }).catch(() => null);
    return true;
  }

  if (isKtpButton) {
    const record = getKtpRecord(interaction.guild.id, interaction.user.id);
    // Warga yang sudah memiliki KTP tetap boleh membuka formulir lagi.
    // Hasil berikutnya akan dikirim sebagai kartu baru, bukan mengedit pesan lama.
    await interaction.showModal(buildKtpModal(record));
    return true;
  }

  const remaining = getCooldownRemaining(interaction.user.id, cfg);
  if (remaining > 0) {
    await interaction.reply({ content: `Tunggu ${remaining} detik sebelum membuat atau memperbarui KTP lagi.`, flags: 64 }).catch(() => null);
    return true;
  }

  await interaction.deferReply({ flags: 64 });
  const missing = missingBotPermissions(targetChannel, interaction.guild);
  if (missing.length) {
    await interaction.editReply(`Pak RW belum memiliki izin berikut di channel KTP: **${missing.join(", ")}**.`);
    return true;
  }

  try {
    const previous = getKtpRecord(interaction.guild.id, interaction.user.id);
    const now = Date.now();
    const storeForNumber = readKtpStore();
    const record = {
      guildId: interaction.guild.id,
      userId: interaction.user.id,
      ktpNumber: previous?.ktpNumber || generateUniqueKtpNumber(storeForNumber, interaction.guild.id),
      ktpNumberVersion: previous?.ktpNumberVersion || 2,
      fullName: cleanText(interaction.fields.getTextInputValue(KTP_MODAL_FIELDS.fullName), 40),
      gender: cleanText(interaction.fields.getTextInputValue(KTP_MODAL_FIELDS.gender), 20),
      domicile: cleanText(interaction.fields.getTextInputValue(KTP_MODAL_FIELDS.domicile), 35),
      religion: cleanText(interaction.fields.getTextInputValue(KTP_MODAL_FIELDS.religion), 24),
      hobby: cleanText(interaction.fields.getTextInputValue(KTP_MODAL_FIELDS.hobby), 45),
      createdAt: previous?.createdAt || now,
      updatedAt: now,
      messageId: previous?.messageId || "",
      messageChannelId: previous?.messageChannelId || ""
    };

    if ([record.fullName, record.gender, record.domicile, record.religion, record.hobby].some((value) => value.length < 2)) {
      await interaction.editReply("Data KTP belum lengkap. Isi semua kolom minimal 2 karakter.");
      return true;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => interaction.member);
    const buffer = await renderKtpCard({ record, member, config });
    const sent = await publishKtpCard({ targetChannel, member, record, config, buffer });
    record.messageId = sent.id;
    record.messageChannelId = targetChannel.id;
    saveKtpRecord(record);
    setCooldown(interaction.user.id);

    if (cfg.logToConsole !== false) {
      console.log(`[KTP WARGA] ${interaction.user.tag} membuat/memperbarui KTP di ${interaction.guild.name}.`);
    }
    await interaction.editReply(`KTP DESA TULUS kamu berhasil ${previous ? "diperbarui" : "dibuat"} dan dikirim ke ${targetChannel}.`);
  } catch (error) {
    console.log("[KTP WARGA] Gagal membuat KTP:", {
      guildId: interaction.guild.id,
      userId: interaction.user.id,
      channelId: interaction.channelId,
      error: error.message
    });
    const safeMessage = /font ktp|layer teks/i.test(String(error.message || ""))
      ? "Pak RW gagal memuat font KTP. Pastikan dependency KTP terpasang lalu redeploy Railway dari commit terbaru."
      : "Pak RW gagal membuat KTP. Periksa background KTP, permission Lampirkan File, dan koneksi bot.";
    await interaction.editReply(safeMessage).catch(() => null);
  }
  return true;
}

module.exports = {
  KTP_BUTTON_ID,
  KTP_MODAL_ID,
  defaultKtpConfig,
  defaultKtpDesign,
  mergeKtpDesign,
  getKtpConfig,
  getKtpRecord,
  saveKtpRecord,
  resolveKtpChannel,
  renderKtpCard,
  buildKtpPanelEmbed,
  buildKtpButton,
  sendKtpPanel,
  handleKtpMessageCommand,
  handleKtpInteraction,
  makeKtpNumber,
  generateUniqueKtpNumber,
  formatDateWib,
  makeKtpAttachmentName,
  getKtpFontDiagnostics
};
