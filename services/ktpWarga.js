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
const { createCanvas, loadImage } = require("@napi-rs/canvas");
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
    cardTitle: "KARTU TANDA PENDUDUK",
    cardSubtitle: "DESA TULUS",
    privacyNote: "KARTU KOMUNITAS DIGITAL • BUKAN DOKUMEN RESMI",
    numberMode: "random_unique_18_digits_v2",
    rendererVersion: "10.10.87",
    logToConsole: true
  };
}

function getKtpConfig(config = {}) {
  return { ...defaultKtpConfig(), ...(config.ktpSystem || {}) };
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

function setCanvasFont(ctx, size, weight = 600) {
  ctx.font = `${weight} ${size}px "DejaVu Sans"`;
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

function resolveBackgroundPath(config = {}) {
  const cfg = getKtpConfig(config);
  const configured = String(cfg.backgroundPath || "").trim();
  if (!configured) return DEFAULT_BACKGROUND_PATH;
  if (path.isAbsolute(configured)) return configured;
  return path.join(__dirname, "..", configured);
}

function drawVillageTheme(ctx, width, height, frame = {}) {
  const x = Number(frame.x || 0);
  const y = Number(frame.y || 0);
  const w = Number(frame.w || width);
  const h = Number(frame.h || height);

  ctx.save();
  roundedRect(ctx, x, y, w, h, Number(frame.radius || 20));
  ctx.clip();

  // Garis lanskap dibuat sangat tipis agar tema perdesaan terasa tanpa membuat kartu ramai.
  ctx.globalAlpha = 0.052;
  ctx.strokeStyle = "#29401d";
  ctx.lineWidth = 2;

  const baseY = y + h - 78;
  ctx.beginPath();
  ctx.moveTo(x + 20, baseY);
  ctx.quadraticCurveTo(x + 128, baseY - 50, x + 238, baseY);
  ctx.quadraticCurveTo(x + 344, baseY - 76, x + 470, baseY);
  ctx.quadraticCurveTo(x + 575, baseY - 43, x + 690, baseY);
  ctx.stroke();

  for (let index = 0; index < 2; index += 1) {
    const lineY = y + h - 48 + index * 17;
    ctx.beginPath();
    ctx.moveTo(x + 22, lineY);
    ctx.bezierCurveTo(x + 165, lineY - 10, x + 310, lineY + 7, x + 475, lineY - 3);
    ctx.bezierCurveTo(x + 610, lineY - 10, x + 720, lineY + 7, x + 820, lineY - 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawVillageWatermark(ctx, frame = {}) {
  const x = Number(frame.x || 0);
  const y = Number(frame.y || 0);
  const w = Number(frame.w || 1011);
  const h = Number(frame.h || 638);
  const radius = Number(frame.radius || 20);
  const centerX = x + w * 0.505;
  const centerY = y + h * 0.535;

  ctx.save();
  roundedRect(ctx, x, y, w, h, radius);
  ctx.clip();

  // Emblem utama sengaja sangat transparan: terlihat sebagai watermark, bukan elemen depan.
  ctx.globalAlpha = 0.052;
  ctx.strokeStyle = "#203617";
  ctx.fillStyle = "#203617";
  ctx.lineWidth = 2.4;

  // Lingkaran emblem.
  ctx.beginPath();
  ctx.arc(centerX, centerY - 18, 112, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(centerX, centerY - 18, 101, 0, Math.PI * 2);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Matahari dan gunung sederhana.
  ctx.beginPath();
  ctx.arc(centerX + 47, centerY - 83, 15, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(centerX - 84, centerY - 19);
  ctx.lineTo(centerX - 31, centerY - 70);
  ctx.lineTo(centerX + 7, centerY - 30);
  ctx.lineTo(centerX + 43, centerY - 63);
  ctx.lineTo(centerX + 88, centerY - 18);
  ctx.stroke();

  // Bale desa kecil di tengah emblem.
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(centerX - 34, centerY + 1);
  ctx.lineTo(centerX, centerY - 23);
  ctx.lineTo(centerX + 34, centerY + 1);
  ctx.stroke();
  ctx.strokeRect(centerX - 26, centerY + 1, 52, 29);
  ctx.beginPath();
  ctx.moveTo(centerX, centerY + 1);
  ctx.lineTo(centerX, centerY + 30);
  ctx.stroke();

  // Sawah berupa tiga lengkung halus.
  ctx.lineWidth = 1.8;
  for (let index = 0; index < 3; index += 1) {
    const fieldY = centerY + 45 + index * 12;
    ctx.beginPath();
    ctx.bezierCurveTo(
      centerX - 88,
      fieldY - 8,
      centerX - 25,
      fieldY + 8,
      centerX,
      fieldY
    );
    ctx.bezierCurveTo(
      centerX + 25,
      fieldY - 8,
      centerX + 72,
      fieldY + 7,
      centerX + 88,
      fieldY
    );
    ctx.stroke();
  }

  // Nama desa menjadi inti watermark seperti contoh, tetapi tetap tidak menonjol.
  ctx.globalAlpha = 0.072;
  ctx.textAlign = "center";
  setCanvasFont(ctx, 43, 900);
  ctx.fillText("DESA TULUS", centerX, centerY + 70);
  ctx.globalAlpha = 0.058;
  setCanvasFont(ctx, 11, 800);
  ctx.fillText("RUKUN • NYAMAN • TULUS", centerX, centerY + 91);

  ctx.restore();
}

function drawKtpField(ctx, label, value, y, options = {}) {
  const labelX = Number(options.labelX || 72);
  const colonX = Number(options.colonX || 272);
  const valueX = Number(options.valueX || 304);
  const maxWidth = Number(options.maxWidth || 470);
  const valueSize = Number(options.valueSize || 25);

  ctx.textAlign = "left";
  ctx.fillStyle = "#31441f";
  setCanvasFont(ctx, 21, 700);
  ctx.fillText(String(label || "-"), labelX, y);

  ctx.textAlign = "center";
  ctx.fillStyle = "#31441f";
  setCanvasFont(ctx, 21, 800);
  ctx.fillText(":", colonX, y);

  ctx.textAlign = "left";
  ctx.fillStyle = "#1d2915";
  setCanvasFont(ctx, valueSize, 800);
  ctx.fillText(truncateCanvasText(ctx, value || "-", maxWidth), valueX, y);
}

async function renderKtpCard({ record, member, config = {}, avatarUrl = "" }) {
  const cfg = getKtpConfig(config);
  const backgroundPath = resolveBackgroundPath(config);
  if (!fs.existsSync(backgroundPath)) throw new Error(`Background KTP tidak ditemukan: ${backgroundPath}`);

  const background = await loadImage(backgroundPath);
  if (!background?.width || !background?.height) throw new Error("Ukuran background KTP tidak valid.");

  // Ukuran mengikuti background resmi agar pola tidak terpotong atau melebar tidak proporsional.
  const width = 1011;
  const height = 638;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const card = { x: 14, y: 14, w: width - 28, h: height - 28, radius: 22 };

  // Area luar menjadi bingkai padat; background hanya dirender di dalam garis kartu.
  const outerGradient = ctx.createLinearGradient(0, 0, width, height);
  outerGradient.addColorStop(0, "#60783d");
  outerGradient.addColorStop(1, "#415b2c");
  ctx.fillStyle = outerGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  roundedRect(ctx, card.x, card.y, card.w, card.h, card.radius);
  ctx.clip();
  ctx.drawImage(background, card.x, card.y, card.w, card.h);

  // Gradasi sangat tipis untuk menjaga teks terbaca tanpa menghilangkan pola asli.
  const tint = ctx.createLinearGradient(card.x, card.y, card.x + card.w, card.y);
  tint.addColorStop(0, "rgba(205, 219, 121, 0.22)");
  tint.addColorStop(0.62, "rgba(130, 157, 72, 0.10)");
  tint.addColorStop(1, "rgba(51, 78, 31, 0.22)");
  ctx.fillStyle = tint;
  ctx.fillRect(card.x, card.y, card.w, card.h);

  // Cahaya lembut hanya pada area data agar tampak premium dan tidak ramai.
  const softGlow = ctx.createRadialGradient(310, 300, 40, 310, 300, 430);
  softGlow.addColorStop(0, "rgba(231, 236, 164, 0.20)");
  softGlow.addColorStop(1, "rgba(231, 236, 164, 0)");
  ctx.fillStyle = softGlow;
  ctx.fillRect(card.x, card.y, card.w, card.h);
  ctx.restore();

  drawVillageTheme(ctx, width, height, card);
  drawVillageWatermark(ctx, card);

  // Garis bingkai digambar terakhir agar tegas dan seluruh background tetap di dalamnya.
  ctx.save();
  roundedRect(ctx, card.x, card.y, card.w, card.h, card.radius);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(37, 59, 24, 0.72)";
  ctx.stroke();
  roundedRect(ctx, card.x + 7, card.y + 7, card.w - 14, card.h - 14, 17);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(227, 235, 162, 0.22)";
  ctx.stroke();
  ctx.restore();

  // Judul kartu.
  ctx.textAlign = "center";
  ctx.fillStyle = "#1f3016";
  setCanvasFont(ctx, 30, 900);
  ctx.fillText(String(cfg.cardTitle || "KARTU TANDA PENDUDUK").toUpperCase(), width / 2, 68);
  setCanvasFont(ctx, 20, 900);
  ctx.fillText(String(cfg.cardSubtitle || "DESA TULUS").toUpperCase(), width / 2, 96);

  ctx.beginPath();
  ctx.moveTo(width / 2 - 48, 111);
  ctx.lineTo(width / 2 + 48, 111);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(42, 63, 27, 0.28)";
  ctx.stroke();

  // Data warga: jarak, garis dasar, dan kolom dibuat konsisten.
  const rows = [
    ["No KTP", record.ktpNumber, 21],
    ["Nama", record.fullName, 22],
    ["Jenis Kelamin", record.gender, 21],
    ["Domisili", record.domicile, 21],
    ["Agama", record.religion, 21],
    ["Hobi", record.hobby, 21]
  ];
  const firstY = 194;
  const rowGap = 58;
  rows.forEach(([label, value, valueSize], index) => {
    drawKtpField(ctx, label, value, firstY + index * rowGap, {
      labelX: 62,
      colonX: 236,
      valueX: 267,
      maxWidth: 405,
      valueSize
    });
  });

  // Foto warga dibuat lebih proporsional dengan frame yang lembut, tidak terlalu putih atau tebal.
  const photoFrame = { x: 724, y: 151, w: 226, h: 274 };
  ctx.save();
  ctx.shadowColor = "rgba(30, 45, 19, 0.24)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;
  roundedRect(ctx, photoFrame.x, photoFrame.y, photoFrame.w, photoFrame.h, 7);
  ctx.fillStyle = "rgba(235, 233, 199, 0.91)";
  ctx.fill();
  ctx.restore();
  roundedRect(ctx, photoFrame.x, photoFrame.y, photoFrame.w, photoFrame.h, 7);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(43, 64, 28, 0.70)";
  ctx.stroke();

  const inset = 10;
  const avatar = await loadAvatarImage(avatarUrl || member?.user?.displayAvatarURL?.({ extension: "png", size: 256, forceStatic: true }));
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
    const initials = String(record.fullName || "W")
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0] || "")
      .join("")
      .toUpperCase();
    ctx.fillText(initials || "W", photoFrame.x + photoFrame.w / 2, photoFrame.y + photoFrame.h / 2 + 26);
  }
  ctx.restore();

  // Tanggal dan status ditempatkan tepat di bawah foto dengan hirarki jelas.
  ctx.textAlign = "center";
  ctx.fillStyle = "#31441f";
  setCanvasFont(ctx, 15, 800);
  ctx.fillText("Tanggal Pembuatan:", photoFrame.x + photoFrame.w / 2, 460);
  ctx.fillStyle = "#1d2915";
  setCanvasFont(ctx, 18, 900);
  ctx.fillText(formatDateWib(record.createdAt), photoFrame.x + photoFrame.w / 2, 485);

  ctx.fillStyle = "rgba(35, 51, 22, 0.88)";
  setCanvasFont(ctx, 14, 800);
  ctx.fillText("WARGA DESA TULUS", photoFrame.x + photoFrame.w / 2, 518);

  // Footer selalu berada di dalam garis kartu.
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(35, 51, 22, 0.78)";
  setCanvasFont(ctx, 12, 800);
  ctx.fillText(String(cfg.privacyNote || "KARTU KOMUNITAS DIGITAL • BUKAN DOKUMEN RESMI").toUpperCase(), card.x + 22, card.y + card.h - 18);

  ctx.textAlign = "right";
  ctx.fillText("PAK RW • DESA TULUS", card.x + card.w - 22, card.y + card.h - 18);

  const buffer = canvas.toBuffer("image/png");
  if (!Buffer.isBuffer(buffer) || buffer.length < 50000 || buffer.subarray(1, 4).toString("ascii") !== "PNG") {
    throw new Error("Hasil render KTP tidak valid atau terlihat kosong.");
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
  const payload = {
    content,
    embeds: [buildKtpCardEmbed(config, attachmentName)],
    components: [buildKtpButton(config)],
    files: [attachment]
  };

  let sent = null;
  if (record.messageId && record.messageChannelId === targetChannel.id) {
    const oldMessage = await targetChannel.messages.fetch(record.messageId).catch(() => null);
    if (oldMessage?.author?.id === targetChannel.client.user.id) {
      sent = await oldMessage.edit({ ...payload, attachments: [] }).catch((error) => {
        console.log("[KTP WARGA] Gagal memperbarui kartu lama, mengirim kartu baru:", error.message);
        return null;
      });
    }
  }
  if (!sent) sent = await targetChannel.send(payload);
  return sent;
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
  if (!targetChannel) {
    await sendTemporaryMessage(message.channel, channelSetupMessage(), 12000);
    return true;
  }
  if (message.channel.id !== targetChannel.id) {
    await sendTemporaryMessage(message.channel, wrongChannelMessage(targetChannel));
    return true;
  }

  const missing = missingBotPermissions(targetChannel, message.guild);
  if (missing.length) {
    await sendTemporaryMessage(message.channel, `Pak RW belum memiliki izin berikut di channel KTP: **${missing.join(", ")}**.`, 12000);
    return true;
  }

  if (isPanel) {
    if (!isAllowedPanelManager(message)) {
      await sendTemporaryMessage(message.channel, "Perintah ini hanya dapat digunakan oleh owner, Administrator, atau pengurus dengan izin Kelola Server.");
      return true;
    }
    await sendKtpPanel(targetChannel, config);
    await sendTemporaryMessage(message.channel, "Panel KTP Warga berhasil dikirim.", 5000);
    return true;
  }

  const record = getKtpRecord(message.guild.id, message.author.id);
  if (!record) {
    await message.channel.send({
      content: `${message.author}, kamu belum memiliki KTP DESA TULUS. Klik tombol di bawah untuk membuatnya.`,
      components: [buildKtpButton(config)]
    });
    return true;
  }

  try {
    const member = message.member;
    const buffer = await renderKtpCard({ record, member, config });
    const attachmentName = makeKtpAttachmentName(record);
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
  } catch (error) {
    console.log("[KTP WARGA] Gagal menampilkan KTP:", { guildId: message.guild.id, userId: message.author.id, error: error.message });
    await sendTemporaryMessage(message.channel, "Pak RW gagal menampilkan KTP. Periksa file background dan permission Lampirkan File.", 12000);
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
    if (record && cfg.allowUpdate === false) {
      await interaction.reply({ content: "KTP kamu sudah dibuat dan pembaruan sedang dinonaktifkan oleh pengurus.", flags: 64 });
      return true;
    }
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
    await interaction.editReply("Pak RW gagal membuat KTP. Periksa background KTP, permission Lampirkan File, dan koneksi bot.").catch(() => null);
  }
  return true;
}

module.exports = {
  KTP_BUTTON_ID,
  KTP_MODAL_ID,
  defaultKtpConfig,
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
  makeKtpAttachmentName
};
