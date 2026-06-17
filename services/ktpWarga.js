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
    footerText: "DESA TULUS • Ketik rwktp untuk melihat KTP",
    backgroundPath: "assets/ktp-desa-tulus-background.png",
    cardTitle: "KARTU TANDA PENDUDUK",
    cardSubtitle: "DESA TULUS",
    privacyNote: "KARTU KOMUNITAS DIGITAL • BUKAN DOKUMEN RESMI",
    numberMode: "random_unique_18_digits_v2",
    rendererVersion: "10.10.81",
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
  ctx.font = `${weight} ${size}px sans-serif`;
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
    const response = await axios.get(avatarUrl, { responseType: "arraybuffer", timeout: 10000, maxContentLength: 5 * 1024 * 1024 });
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

async function renderKtpCard({ record, member, config = {}, avatarUrl = "" }) {
  const cfg = getKtpConfig(config);
  const width = 1011;
  const height = 638;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const backgroundPath = resolveBackgroundPath(config);
  if (!fs.existsSync(backgroundPath)) throw new Error(`Background KTP tidak ditemukan: ${backgroundPath}`);
  const background = await loadImage(backgroundPath);
  drawCoverImage(ctx, background, 0, 0, width, height);

  // Lapisan kontras ringan agar background tetap terlihat tetapi semua data terbaca jelas.
  ctx.fillStyle = "rgba(29, 46, 18, 0.16)";
  ctx.fillRect(0, 0, width, height);

  drawPanel(ctx, 24, 22, width - 48, height - 44, 24, "rgba(239, 244, 207, 0.18)", "rgba(229, 237, 195, 0.48)");

  // Header resmi DESA TULUS.
  drawPanel(ctx, 38, 34, width - 76, 92, 18, "rgba(37, 62, 24, 0.92)", "rgba(229, 218, 151, 0.62)");
  ctx.textAlign = "center";
  ctx.fillStyle = "#f7f4db";
  setCanvasFont(ctx, 34, 800);
  ctx.fillText(String(cfg.cardTitle || "KARTU TANDA PENDUDUK").toUpperCase(), width / 2, 75);
  ctx.fillStyle = "#dfe9b7";
  setCanvasFont(ctx, 21, 700);
  ctx.fillText(String(cfg.cardSubtitle || "DESA TULUS").toUpperCase(), width / 2, 104);

  const dataPanel = { x: 38, y: 144, w: 650, h: 410 };
  const photoPanel = { x: 711, y: 144, w: 264, h: 410 };
  drawPanel(ctx, dataPanel.x, dataPanel.y, dataPanel.w, dataPanel.h, 18, "rgba(250, 250, 230, 0.88)", "rgba(53, 77, 35, 0.48)");
  drawPanel(ctx, photoPanel.x, photoPanel.y, photoPanel.w, photoPanel.h, 18, "rgba(250, 250, 230, 0.88)", "rgba(53, 77, 35, 0.48)");

  const rows = [
    ["NO KTP DESA", record.ktpNumber],
    ["NAMA WARGA", record.fullName],
    ["JENIS KELAMIN", record.gender],
    ["DOMISILI", record.domicile],
    ["AGAMA", record.religion],
    ["HOBI", record.hobby]
  ];

  const rowX = dataPanel.x + 22;
  const rowW = dataPanel.w - 44;
  const rowH = 52;
  const rowGap = 8;
  const firstY = dataPanel.y + 22;

  ctx.textAlign = "left";
  rows.forEach(([label, rawValue], index) => {
    const y = firstY + index * (rowH + rowGap);
    roundedRect(ctx, rowX, y, rowW, rowH, 11);
    ctx.fillStyle = index === 0 ? "rgba(83, 111, 48, 0.18)" : "rgba(255, 255, 247, 0.58)";
    ctx.fill();
    ctx.strokeStyle = "rgba(74, 99, 45, 0.20)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#47602f";
    setCanvasFont(ctx, 14, 800);
    ctx.fillText(label, rowX + 16, y + 19);

    ctx.fillStyle = "#192612";
    setCanvasFont(ctx, index === 0 ? 23 : 22, 800);
    const fitted = truncateCanvasText(ctx, rawValue || "-", rowW - 32);
    ctx.fillText(fitted, rowX + 16, y + 44);
  });

  const photoX = photoPanel.x + 28;
  const photoY = photoPanel.y + 27;
  const photoW = photoPanel.w - 56;
  const photoH = 238;
  drawPanel(ctx, photoX, photoY, photoW, photoH, 14, "rgba(110, 132, 72, 0.78)", "rgba(41, 61, 26, 0.58)");

  const avatar = await loadAvatarImage(avatarUrl || member?.user?.displayAvatarURL?.({ extension: "png", size: 512 }));
  ctx.save();
  roundedRect(ctx, photoX + 7, photoY + 7, photoW - 14, photoH - 14, 10);
  ctx.clip();
  if (avatar) {
    drawCoverImage(ctx, avatar, photoX + 7, photoY + 7, photoW - 14, photoH - 14);
  } else {
    const gradient = ctx.createLinearGradient(photoX, photoY, photoX + photoW, photoY + photoH);
    gradient.addColorStop(0, "#6d8548");
    gradient.addColorStop(1, "#405c2e");
    ctx.fillStyle = gradient;
    ctx.fillRect(photoX + 7, photoY + 7, photoW - 14, photoH - 14);
    ctx.fillStyle = "#f8f4d9";
    ctx.textAlign = "center";
    setCanvasFont(ctx, 76, 800);
    const initials = String(record.fullName || "W").split(/\s+/).slice(0, 2).map((word) => word[0] || "").join("").toUpperCase();
    ctx.fillText(initials || "W", photoX + photoW / 2, photoY + photoH / 2 + 25);
  }
  ctx.restore();

  // Informasi penerbitan dibuat padat dan tidak kosong.
  ctx.textAlign = "center";
  ctx.fillStyle = "#486032";
  setCanvasFont(ctx, 14, 800);
  ctx.fillText("TANGGAL PEMBUATAN", photoPanel.x + photoPanel.w / 2, photoY + photoH + 37);
  ctx.fillStyle = "#192612";
  setCanvasFont(ctx, 22, 800);
  ctx.fillText(formatDateWib(record.createdAt), photoPanel.x + photoPanel.w / 2, photoY + photoH + 65);

  roundedRect(ctx, photoPanel.x + 28, photoY + photoH + 84, photoPanel.w - 56, 48, 12);
  ctx.fillStyle = "rgba(65, 96, 42, 0.14)";
  ctx.fill();
  ctx.strokeStyle = "rgba(65, 96, 42, 0.25)";
  ctx.stroke();
  ctx.fillStyle = "#2e4722";
  setCanvasFont(ctx, 16, 800);
  ctx.fillText("WARGA DESA TULUS", photoPanel.x + photoPanel.w / 2, photoY + photoH + 114);

  // Footer tetap ringkas agar kartu tidak terlihat berantakan.
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(244, 247, 218, 0.94)";
  setCanvasFont(ctx, 14, 800);
  ctx.fillText(String(cfg.privacyNote || "KARTU KOMUNITAS DIGITAL • BUKAN DOKUMEN RESMI").toUpperCase(), 43, 594);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(244, 247, 218, 0.94)";
  setCanvasFont(ctx, 16, 800);
  ctx.fillText("PAK RW • DESA TULUS", width - 43, 594);

  return canvas.toBuffer("image/png");
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

function buildKtpCardEmbed(config = {}) {
  const cfg = getKtpConfig(config);
  return new EmbedBuilder()
    .setColor(config.embedColor || "#7DBD77")
    .setImage("attachment://ktp-desa-tulus.png")
    .setFooter({ text: cfg.footerText || "DESA TULUS • Ketik rwktp untuk melihat KTP", iconURL: footerIconUrl(config) })
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
  const attachment = new AttachmentBuilder(buffer, { name: "ktp-desa-tulus.png" });
  const content = formatTemplate(cfg.resultContent, { user: `${member}`, username: member.user.username, displayName: member.displayName });
  const payload = {
    content,
    embeds: [buildKtpCardEmbed(config)],
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
    await message.channel.send({
      content: formatTemplate(cfg.resultContent, { user: `${member}`, username: member.user.username, displayName: member.displayName }),
      embeds: [buildKtpCardEmbed(config)],
      components: [buildKtpButton(config)],
      files: [new AttachmentBuilder(buffer, { name: "ktp-desa-tulus.png" })]
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
  formatDateWib
};
