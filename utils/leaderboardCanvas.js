const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");

const WIDTH = 1200;
const HEIGHT = 900;
const FALLBACK_ARROW = "➜";
const PROJECT_ROOT = path.resolve(__dirname, "..");
const FONT_FAMILY = "PakRwSans";
let FONT_READY = false;

function setupCanvasFonts() {
  if (FONT_READY) return true;
  const candidates = [];
  try { candidates.push(require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans.ttf")); } catch {}
  try { candidates.push(require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf")); } catch {}
  candidates.push(
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"
  );

  let registered = 0;
  for (const file of candidates) {
    try {
      if (file && fs.existsSync(file) && GlobalFonts.registerFromPath(file, FONT_FAMILY)) registered += 1;
    } catch {}
  }

  try { GlobalFonts.loadSystemFonts(); } catch {}
  FONT_READY = true;
  if (process.env.PAKRW_DEBUG_LEADERBOARD === "1") {
    console.log(`[LEADERBOARD_IMAGE] font bootstrap registered=${registered}`);
  }
  return registered > 0;
}
setupCanvasFonts();

function font(size, weight = "400") {
  const safeWeight = String(weight || "400");
  return `${safeWeight} ${Number(size) || 18}px "${FONT_FAMILY}", "DejaVu Sans", sans-serif`;
}

function formatPoints(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(number);
}

function getPointValue(item) {
  const raw = item?.points ?? item?.point ?? item?.totalPoints ?? item?.totalPoint ?? item?.lifetimeTotal ?? item?.monthly?.total ?? item?.score ?? item?.xp ?? item?.exp ?? 0;
  const number = Number(raw);
  return Number.isFinite(number) ? number : 0;
}

function getNumberField(item, keys = []) {
  for (const key of keys) {
    const value = key.split(".").reduce((obj, part) => obj?.[part], item);
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return 0;
}

function getUserId(item) {
  return String(item?.userId || item?.id || item?.memberId || item?.discordId || item?.discordID || item?.user_id || "").trim();
}

function compactDiscordId(id = "") {
  const value = String(id || "").trim();
  if (!value) return "ID belum terbaca";
  if (value.length <= 10) return value;
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

function cleanText(text = "", fallback = "Warga Desa") {
  const value = String(text ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
  return value || fallback;
}

function getUserName(item) {
  return cleanText(item?.displayName || item?.globalName || item?.username || item?.name || item?.tag, "Warga Desa");
}

function getUsername(item) {
  return cleanText(item?.username || item?.tag || item?.displayName || item?.name, "warga-desa");
}

function getAvatarURL(guild, item) {
  const direct = item?.avatarURL || item?.avatarUrl || item?.avatar || item?.displayAvatarURL;
  if (direct && /^https?:\/\//i.test(String(direct))) return String(direct);

  const userId = getUserId(item);
  try {
    const cachedMember = userId ? guild?.members?.cache?.get(String(userId)) : null;
    const cachedUser = cachedMember?.user || (userId ? guild?.client?.users?.cache?.get(String(userId)) : null);
    const url = cachedMember?.displayAvatarURL?.({ extension: "png", size: 256 }) || cachedUser?.displayAvatarURL?.({ extension: "png", size: 256 });
    if (url) return url;
  } catch {}
  return null;
}

function summarizeLeaderboardDebugRows(rows = [], limit = 3) {
  if (!Array.isArray(rows)) return rows;
  return rows.slice(0, limit).map((item, index) => ({
    rank: index + 1,
    userId: getUserId(item),
    displayName: getUserName(item),
    username: getUsername(item),
    points: getPointValue(item),
    hasAvatar: Boolean(item?.avatarURL || item?.avatarUrl || item?.avatar || item?.displayAvatarURL)
  }));
}

function logLeaderboardDebug(label, value) {
  if (process.env.PAKRW_DEBUG_LEADERBOARD !== "1") return;
  if (Array.isArray(value)) {
    console.log(`[LEADERBOARD_IMAGE] ${label}: total=${value.length}`, summarizeLeaderboardDebugRows(value));
    return;
  }
  console.log(`[LEADERBOARD_IMAGE] ${label}:`, value);
}

function normalizeLeaderboardUsers(topUsers = []) {
  if (!Array.isArray(topUsers)) return [];
  return topUsers
    .filter(Boolean)
    .map((item) => {
      const displayName = getUserName(item);
      const points = getPointValue(item);
      return {
        ...item,
        userId: getUserId(item),
        displayName,
        username: item?.username || displayName,
        avatarURL: item?.avatarURL || item?.avatarUrl || item?.avatar || item?.displayAvatarURL || null,
        points: Number.isFinite(points) ? points : 0,
        level: Number(item?.level || 0) || 0,
        chat: getNumberField(item, ["lifetimeChat", "chat", "monthly.chat"]),
        voice: getNumberField(item, ["lifetimeVoice", "voice", "monthly.voice"])
      };
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);
}

async function hydrateLeaderboardUsers(guild, topUsers = []) {
  const normalizedUsers = normalizeLeaderboardUsers(topUsers);
  logLeaderboardDebug("normalized", normalizedUsers);

  const hydrated = [];
  for (const item of normalizedUsers) {
    let displayName = item.displayName || "Warga Desa";
    let username = item.username || displayName;
    let avatarURL = item.avatarURL || null;

    if (item.userId && guild?.members?.fetch) {
      const member = await guild.members.fetch(item.userId).catch(() => null);
      if (member) {
        displayName = member.displayName || member.user?.globalName || member.user?.username || displayName;
        username = member.user?.username || username || displayName;
        avatarURL = member.user?.displayAvatarURL?.({ extension: "png", size: 256 }) || member.displayAvatarURL?.({ extension: "png", size: 256 }) || avatarURL;
      }
    }

    hydrated.push({ ...item, displayName, username, avatarURL });
  }

  logLeaderboardDebug("hydrated", hydrated);
  if (process.env.PAKRW_DEBUG_LEADERBOARD === "1") {
    console.log(`[LEADERBOARD_IMAGE] hydrated total=${hydrated.length} first=${hydrated[0]?.displayName || "-"} points=${hydrated[0]?.points || 0}`);
  }
  return hydrated;
}

function fitText(ctx, text, maxWidth) {
  const clean = cleanText(text, "—");
  if (!maxWidth || ctx.measureText(clean).width <= maxWidth) return clean;
  let output = clean;
  while (output.length > 0 && ctx.measureText(`${output}...`).width > maxWidth) {
    output = output.slice(0, -1);
  }
  return output.length > 0 ? `${output}...` : "...";
}

function drawSafeText(ctx, text, x, y, options = {}) {
  const {
    font: fontValue = font(18, "700"),
    color = "#F8FAFC",
    align = "left",
    baseline = "middle",
    maxWidth = null
  } = options;

  const safeText = cleanText(text, "—");
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.font = fontValue;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  const output = maxWidth ? fitText(ctx, safeText, maxWidth) : safeText;
  ctx.fillText(output, x, y);
  ctx.restore();
}

function drawRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, w, h, r, fillStyle, strokeStyle = "", lineWidth = 1) {
  ctx.save();
  ctx.globalAlpha = 1;
  drawRoundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function safeLocalAssetPath(input = "") {
  const relative = String(input || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!relative || !relative.startsWith("assets/")) return "";
  const resolved = path.resolve(PROJECT_ROOT, relative);
  const assetsRoot = path.resolve(PROJECT_ROOT, "assets") + path.sep;
  return resolved.startsWith(assetsRoot) ? resolved : "";
}

async function safeLoadImage(source) {
  try {
    if (!source) return null;
    const value = String(source || "").trim();
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return await loadImage(value);
    const localPath = safeLocalAssetPath(value) || (path.isAbsolute(value) ? value : "");
    if (localPath && fs.existsSync(localPath)) return await loadImage(localPath);
    return null;
  } catch (error) {
    if (process.env.PAKRW_DEBUG_LEADERBOARD === "1") console.log("[LEADERBOARD_IMAGE_LOAD_FALLBACK]", error?.message || error);
    return null;
  }
}

async function loadAvatar(guild, item) {
  return safeLoadImage(getAvatarURL(guild, item));
}

async function drawCircleAvatar(ctx, image, x, y, size, borderColor = "rgba(248, 250, 252, 0.38)", borderWidth = 3, initial = "W") {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (image) {
    ctx.drawImage(image, x, y, size, size);
  } else {
    const fallbackGradient = ctx.createLinearGradient(x, y, x + size, y + size);
    fallbackGradient.addColorStop(0, "#334155");
    fallbackGradient.addColorStop(1, "#0F172A");
    ctx.fillStyle = fallbackGradient;
    ctx.fillRect(x, y, size, size);
    drawSafeText(ctx, cleanText(initial, "W").slice(0, 1).toUpperCase(), x + size / 2, y + size / 2 + 1, {
      font: font(Math.max(18, Math.floor(size * 0.42)), "800"),
      color: "#CBD5E1",
      align: "center"
    });
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCoverImage(ctx, img, x, y, w, h) {
  if (!img?.width || !img?.height) return false;
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let drawW = w;
  let drawH = h;
  let drawX = x;
  let drawY = y;
  if (imgRatio > boxRatio) {
    drawH = h;
    drawW = h * imgRatio;
    drawX = x - (drawW - w) / 2;
  } else {
    drawW = w;
    drawH = w / imgRatio;
    drawY = y - (drawH - h) / 2;
  }
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  return true;
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function normalizeLeaderboardConfig(config = {}) {
  const source = config && typeof config === "object" ? config : {};
  const backgroundMode = ["default", "url", "upload"].includes(String(source.backgroundMode || "")) ? String(source.backgroundMode) : "default";
  const backgroundUploadPath = String(source.backgroundUploadPath || source.backgroundPath || "assets/leaderboard/background.png").trim();
  return {
    enabled: source.enabled !== false,
    useImage: source.useImage !== false,
    useQuoteFormat: source.useQuoteFormat !== false,
    backgroundMode,
    backgroundUrl: String(source.backgroundUrl || "").trim(),
    backgroundPath: backgroundUploadPath,
    backgroundUploadPath,
    backgroundOverlay: clampNumber(source.backgroundOverlay, 0.52, 0, 0.9),
    backgroundBlur: clampNumber(source.backgroundBlur, 0, 0, 18),
    backgroundDarken: clampNumber(source.backgroundDarken, 0.42, 0, 0.85),
    backgroundFit: String(source.backgroundFit || "cover").trim() || "cover",
    imageTheme: String(source.imageTheme || "desa_tulus_ktp").trim() || "desa_tulus_ktp",
    color: String(source.color || "#FACC15").trim() || "#FACC15",
    fallbackArrow: String(source.fallbackArrow || FALLBACK_ARROW).trim() || FALLBACK_ARROW,
    footer: String(source.footer || "Pak RW • Desa Tulus Leaderboard").trim() || "Pak RW • Desa Tulus Leaderboard",
    title: String(source.title || "TOP AKTIF WARGA SEPANJANG WAKTU").trim() || "TOP AKTIF WARGA SEPANJANG WAKTU",
    updateTime: String(source.updateTime || "00:00").trim() || "00:00",
    timezone: String(source.timezone || "Asia/Jakarta").trim() || "Asia/Jakarta"
  };
}

async function drawBackground(ctx, config = {}) {
  const cfg = normalizeLeaderboardConfig(config);
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#07111F");
  gradient.addColorStop(0.55, "#0F172A");
  gradient.addColorStop(1, "#111827");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  let customSource = "";
  if (cfg.backgroundMode === "url" && cfg.backgroundUrl) customSource = cfg.backgroundUrl;
  if (cfg.backgroundMode === "upload") customSource = cfg.backgroundUploadPath || cfg.backgroundPath || "assets/leaderboard/background.png";

  const customBackground = customSource ? await safeLoadImage(customSource) : null;
  if (customBackground) {
    ctx.save();
    if (cfg.backgroundBlur > 0) ctx.filter = `blur(${cfg.backgroundBlur}px)`;
    drawCoverImage(ctx, customBackground, 0, 0, WIDTH, HEIGHT);
    ctx.restore();
  } else {
    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = "#38BDF8";
    ctx.beginPath();
    ctx.arc(990, 105, 240, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = "#22C55E";
    ctx.beginPath();
    ctx.arc(160, 780, 290, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 1;
    for (let i = 0; i < 28; i += 1) {
      ctx.beginPath();
      ctx.moveTo(70 + i * 48, 0);
      ctx.lineTo(-130 + i * 48, HEIGHT);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = 1;
  const overlay = Math.max(cfg.backgroundOverlay, cfg.backgroundDarken);
  ctx.fillStyle = `rgba(7, 17, 31, ${overlay})`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();
}

function drawHeader(ctx, guild, cfg, totalRows) {
  fillRoundRect(ctx, 58, 38, 1084, 84, 26, "rgba(15, 23, 42, 0.78)", "rgba(148, 163, 184, 0.20)", 2);
  fillRoundRect(ctx, 82, 60, 58, 40, 14, "rgba(250, 204, 21, 0.16)", "rgba(250, 204, 21, 0.42)", 2);
  drawSafeText(ctx, "RW", 111, 82, { font: font(21, "900"), color: "#FACC15", align: "center" });
  drawSafeText(ctx, "KARTU LEADERBOARD WARGA", 158, 70, { font: font(34, "900"), color: "#F8FAFC", maxWidth: 600 });
  const serverName = guild?.name || "Desa Tulus";
  const updateTime = String(cfg.updateTime || "00:00").replace(":", ".");
  drawSafeText(ctx, `${serverName} • Update ${updateTime} WIB • ${Number(totalRows || 0)} warga`, 160, 100, { font: font(17, "600"), color: "#CBD5E1", maxWidth: 640 });

  fillRoundRect(ctx, 920, 58, 185, 42, 16, "rgba(56, 189, 248, 0.15)", "rgba(56, 189, 248, 0.28)", 1);
  drawSafeText(ctx, "MODE KTP AKTIF", 1012, 80, { font: font(15, "900"), color: "#38BDF8", align: "center" });
}

function rankColor(rank) {
  if (rank === 1) return "#FACC15";
  if (rank === 2) return "#CBD5E1";
  if (rank === 3) return "#F59E0B";
  return "#38BDF8";
}

function rankLabel(rank) {
  return `#${String(rank).padStart(2, "0")}`;
}

async function drawKtpCard(ctx, guild, item, rank, x, y, w, h) {
  const color = rankColor(rank);
  const exists = Boolean(item);
  const name = exists ? getUserName(item) : "Belum ada warga";
  const username = exists ? getUsername(item) : "aktifkan level untuk tampil";
  const userId = exists ? getUserId(item) : "";
  const points = exists ? getPointValue(item) : 0;
  const level = exists ? Number(item?.level || 0) || 0 : 0;
  const chat = exists ? getNumberField(item, ["lifetimeChat", "chat", "monthly.chat"]) : 0;
  const voice = exists ? getNumberField(item, ["lifetimeVoice", "voice", "monthly.voice"]) : 0;
  const avatar = exists ? await loadAvatar(guild, item) : null;

  const bg = rank <= 3 ? "rgba(30, 41, 59, 0.92)" : "rgba(30, 41, 59, 0.82)";
  fillRoundRect(ctx, x, y, w, h, 24, bg, "rgba(148, 163, 184, 0.22)", 2);
  fillRoundRect(ctx, x + 14, y + 14, 72, h - 28, 18, "rgba(15, 23, 42, 0.72)", "rgba(148, 163, 184, 0.12)", 1);

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  drawRoundRect(ctx, x, y, 9, h, 10);
  ctx.fill();
  ctx.restore();

  drawSafeText(ctx, rankLabel(rank), x + 50, y + 37, { font: font(20, "900"), color, align: "center" });
  drawSafeText(ctx, "RANK", x + 50, y + 63, { font: font(11, "800"), color: "#94A3B8", align: "center" });

  await drawCircleAvatar(ctx, avatar, x + 98, y + 25, 72, color, rank <= 3 ? 4 : 3, name);

  drawSafeText(ctx, "KTP WARGA DESA TULUS", x + 188, y + 29, { font: font(12, "900"), color: "#38BDF8", maxWidth: 220 });
  drawSafeText(ctx, name, x + 188, y + 58, { font: font(23, "900"), color: "#F8FAFC", maxWidth: 180 });
  drawSafeText(ctx, `@${username}`, x + 188, y + 86, { font: font(14, "700"), color: "#CBD5E1", maxWidth: 150 });
  drawSafeText(ctx, `ID ${compactDiscordId(userId)}`, x + 188, y + 109, { font: font(12, "700"), color: "#94A3B8", maxWidth: 150 });

  fillRoundRect(ctx, x + w - 178, y + 23, 150, 58, 18, "rgba(15, 23, 42, 0.68)", "rgba(248, 250, 252, 0.10)", 1);
  drawSafeText(ctx, "TOTAL POIN", x + w - 103, y + 42, { font: font(11, "900"), color: "#94A3B8", align: "center" });
  drawSafeText(ctx, formatPoints(points), x + w - 103, y + 66, { font: font(22, "900"), color: rank <= 3 ? color : "#F8FAFC", align: "center", maxWidth: 132 });

  fillRoundRect(ctx, x + w - 178, y + 87, 150, 30, 13, "rgba(56, 189, 248, 0.11)", "rgba(56, 189, 248, 0.20)", 1);
  drawSafeText(ctx, `LEVEL ${level || 0}`, x + w - 103, y + 103, { font: font(13, "900"), color: "#38BDF8", align: "center", maxWidth: 132 });
}

// drawPodium legacy token: replaced by KTP grid renderer so image is never empty.
async function drawKtpGrid(ctx, guild, sorted) {
  const cardW = 520;
  const cardH = 132;
  const gapX = 40;
  const gapY = 10;
  const startX = 60;
  const startY = 145;

  for (let i = 0; i < 10; i += 1) {
    const col = i < 5 ? 0 : 1;
    const row = i % 5;
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);
    await drawKtpCard(ctx, guild, sorted[i], i + 1, x, y, cardW, cardH);
  }
}

function drawFooter(ctx, cfg) {
  fillRoundRect(ctx, 60, 845, 1080, 36, 14, "rgba(15, 23, 42, 0.66)", "rgba(148, 163, 184, 0.16)", 1);
  drawSafeText(ctx, cfg.footer || "Pak RW • Desa Tulus Leaderboard", 82, 864, { font: font(14, "800"), color: "#CBD5E1", maxWidth: 480 });
  drawSafeText(ctx, "Text KTP aktif • nama, ID, poin, level", 1118, 864, { font: font(13, "700"), color: "#94A3B8", align: "right", maxWidth: 450 });
}

async function generateLeaderboardImage(guild, topUsers = [], leaderboardConfig = {}) {
  setupCanvasFonts();
  const cfg = normalizeLeaderboardConfig(leaderboardConfig);
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  try {
    const hydratedUsers = await hydrateLeaderboardUsers(guild, topUsers);
    if (process.env.PAKRW_DEBUG_LEADERBOARD === "1") {
      console.log(`[LEADERBOARD_IMAGE] render ktp total=${hydratedUsers.length} first=${hydratedUsers[0]?.displayName || "-"}`);
    }

    await drawBackground(ctx, cfg);
    drawHeader(ctx, guild, cfg, hydratedUsers.length);
    await drawKtpGrid(ctx, guild, hydratedUsers);
    drawFooter(ctx, cfg);

    return canvas.toBuffer("image/png");
  } catch (error) {
    console.error("[LEADERBOARD_CANVAS_ERROR]", error?.message || error);

    const fallbackCanvas = createCanvas(WIDTH, HEIGHT);
    const fallbackCtx = fallbackCanvas.getContext("2d");
    await drawBackground(fallbackCtx, cfg);
    drawHeader(fallbackCtx, guild, cfg, 0);
    fillRoundRect(fallbackCtx, 80, 180, 1040, 420, 28, "rgba(30, 41, 59, 0.9)", "rgba(148, 163, 184, 0.22)", 2);
    drawSafeText(fallbackCtx, "KTP LEADERBOARD SEDANG DIPROSES", 120, 260, { font: font(38, "900"), color: "#F8FAFC", maxWidth: 900 });
    drawSafeText(fallbackCtx, "Data warga aman. Gambar akan dibuat ulang otomatis.", 120, 320, { font: font(24, "700"), color: "#CBD5E1", maxWidth: 900 });
    drawFooter(fallbackCtx, cfg);
    return fallbackCanvas.toBuffer("image/png");
  }
}

module.exports = {
  WIDTH,
  HEIGHT,
  FALLBACK_ARROW,
  generateLeaderboardImage,
  normalizeLeaderboardUsers,
  hydrateLeaderboardUsers,
  normalizeLeaderboardConfig,
  formatPoints,
  getPointValue,
  getUserName,
  fitText,
  drawSafeText,
  drawRoundRect,
  drawCircleAvatar,
  drawCoverImage,
  drawBackground,
  safeLoadImage
};
