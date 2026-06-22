const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const WIDTH = 1200;
const HEIGHT = 900;
const FALLBACK_ARROW = "➜";
const PROJECT_ROOT = path.resolve(__dirname, "..");

function formatPoints(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(number);
}

function getPointValue(item) {
  const raw = item?.points ?? item?.point ?? item?.totalPoints ?? item?.totalPoint ?? item?.lifetimeTotal ?? item?.score ?? item?.xp ?? item?.exp ?? 0;
  const number = Number(raw);
  return Number.isFinite(number) ? number : 0;
}

function getUserId(item) {
  return String(item?.userId || item?.id || item?.memberId || item?.discordId || item?.discordID || item?.user_id || "").trim();
}

function getUserName(item) {
  return String(item?.displayName || item?.globalName || item?.username || item?.name || item?.tag || "Warga Desa")
    .replace(/\s+/g, " ")
    .trim() || "Warga Desa";
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
  } catch {
    // fallback handled by drawCircleAvatar
  }

  return null;
}

function summarizeLeaderboardDebugRows(rows = [], limit = 3) {
  if (!Array.isArray(rows)) return rows;
  return rows.slice(0, limit).map((item, index) => ({
    rank: index + 1,
    userId: getUserId(item),
    displayName: getUserName(item),
    points: getPointValue(item),
    hasAvatar: Boolean(item?.avatarURL || item?.avatarUrl || item?.avatar || item?.displayAvatarURL)
  }));
}

function logLeaderboardDebug(label, value) {
  const verbose = String(process.env.PAKRW_VERBOSE_LEADERBOARD_DEBUG || "").trim() === "1";
  if (verbose) {
    console.log(`[LEADERBOARD_IMAGE] ${label}:`, value);
    return;
  }
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
        points: Number.isFinite(points) ? points : 0
      };
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);
}

async function hydrateLeaderboardUsers(guild, topUsers = []) {
  const normalizedUsers = normalizeLeaderboardUsers(topUsers);
  logLeaderboardDebug("normalized", normalizedUsers);
  console.log("[LEADERBOARD_IMAGE] normalized total:", normalizedUsers.length);
  logLeaderboardDebug("normalized first", normalizedUsers.slice(0, 1));

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

  console.log("[LEADERBOARD_IMAGE] hydrated total:", hydrated.length);
  logLeaderboardDebug("hydrated first", hydrated.slice(0, 1));
  return hydrated;
}

function fitText(ctx, text, maxWidth) {
  const clean = String(text || "Warga Desa").replace(/\s+/g, " ").trim() || "Warga Desa";
  if (!maxWidth || ctx.measureText(clean).width <= maxWidth) return clean;

  let output = clean;
  while (output.length > 0 && ctx.measureText(`${output}...`).width > maxWidth) {
    output = output.slice(0, -1);
  }
  return output.length > 0 ? `${output}...` : "...";
}

function drawSafeText(ctx, text, x, y, options = {}) {
  const {
    font = "bold 18px Arial, Sans",
    color = "#F8FAFC",
    align = "left",
    baseline = "middle",
    maxWidth = null
  } = options;

  const safeText = String(text ?? "").trim() || "—";

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.font = font;
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
    console.log("[LEADERBOARD_IMAGE_LOAD_FALLBACK]", error?.message || error);
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
    drawSafeText(ctx, String(initial || "W").slice(0, 1).toUpperCase(), x + size / 2, y + size / 2 + 1, {
      font: `bold ${Math.max(16, Math.floor(size * 0.42))}px Arial, Sans`,
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
    backgroundOverlay: clampNumber(source.backgroundOverlay, 0.55, 0, 0.9),
    backgroundBlur: clampNumber(source.backgroundBlur, 0, 0, 18),
    backgroundDarken: clampNumber(source.backgroundDarken, 0.45, 0, 0.85),
    backgroundFit: String(source.backgroundFit || "cover").trim() || "cover",
    imageTheme: String(source.imageTheme || "desa_tulus_dark").trim() || "desa_tulus_dark",
    color: String(source.color || "#FACC15").trim() || "#FACC15",
    fallbackArrow: String(source.fallbackArrow || FALLBACK_ARROW).trim() || FALLBACK_ARROW,
    footer: String(source.footer || "Pak RW • Desa Tulus Leaderboard").trim() || "Pak RW • Desa Tulus Leaderboard",
    title: String(source.title || "🏆 TOP AKTIF WARGA SEPANJANG WAKTU").trim() || "🏆 TOP AKTIF WARGA SEPANJANG WAKTU",
    updateTime: String(source.updateTime || "00:00").trim() || "00:00",
    timezone: String(source.timezone || "Asia/Jakarta").trim() || "Asia/Jakarta"
  };
}

async function drawBackground(ctx, config = {}) {
  const cfg = normalizeLeaderboardConfig(config);
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#0F172A");
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
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "#38BDF8";
    ctx.beginPath();
    ctx.arc(930, 140, 220, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.10;
    ctx.fillStyle = "#22C55E";
    ctx.beginPath();
    ctx.arc(160, 790, 265, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 1;
    for (let i = 0; i < 24; i += 1) {
      ctx.beginPath();
      ctx.moveTo(80 + i * 52, 0);
      ctx.lineTo(-120 + i * 52, HEIGHT);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = 1;
  const overlay = Math.max(cfg.backgroundOverlay, cfg.backgroundDarken);
  ctx.fillStyle = `rgba(15, 23, 42, ${overlay})`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();
}

function drawTrophyIcon(ctx, x, y) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#FACC15";
  drawRoundRect(ctx, x + 10, y + 8, 34, 26, 8);
  ctx.fill();
  ctx.strokeStyle = "#FACC15";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x + 10, y + 20, 10, Math.PI * 0.75, Math.PI * 1.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 44, y + 20, 10, Math.PI * 1.65, Math.PI * 0.25);
  ctx.stroke();
  ctx.fillStyle = "#F59E0B";
  ctx.fillRect(x + 24, y + 34, 6, 17);
  drawRoundRect(ctx, x + 13, y + 50, 28, 7, 4);
  ctx.fill();
  ctx.restore();
}

function drawStaticArrow(ctx, x, y, color = "#38BDF8") {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 25, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 25, y);
  ctx.lineTo(x + 15, y - 8);
  ctx.lineTo(x + 15, y + 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMedalBadge(ctx, rank, cx, cy, color) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawSafeText(ctx, String(rank), cx, cy + 1, {
    font: "bold 19px Arial, Sans",
    color: rank === 1 ? "#0F172A" : "#111827",
    align: "center"
  });
}

function drawHeader(ctx, guild, cfg) {
  drawTrophyIcon(ctx, 60, 43);
  drawSafeText(ctx, "TOP AKTIF WARGA", 125, 82, {
    font: "bold 46px Arial, Sans",
    color: "#F8FAFC"
  });

  const serverName = guild?.name || "Desa Tulus";
  const updateTime = String(cfg.updateTime || "00:00").replace(":", ".");
  drawSafeText(ctx, `${serverName} Leaderboard • Update ${updateTime} WIB`, 62, 116, {
    font: "22px Arial, Sans",
    color: "#CBD5E1"
  });
}

async function drawList(ctx, guild, sorted) {
  const x = 60;
  const y = 150;
  const w = 660;
  const h = 680;
  const rowX = 90;
  const rowStartY = 230;
  const rowW = 600;
  const rowH = 52;
  const gap = 10;
  const rankColors = ["#FACC15", "#CBD5E1", "#F59E0B"];

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(30, 41, 59, 0.88)";
  drawRoundRect(ctx, x, y, w, h, 28);
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
  ctx.lineWidth = 2;
  drawRoundRect(ctx, x, y, w, h, 28);
  ctx.stroke();
  ctx.restore();

  drawSafeText(ctx, "PERINGKAT WARGA", x + 30, y + 46, {
    font: "bold 28px Arial, Sans",
    color: "#F8FAFC"
  });

  for (let i = 0; i < 10; i += 1) {
    const item = sorted[i];
    const rowY = rowStartY + i * (rowH + gap);

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(51, 65, 85, 0.55)";
    drawRoundRect(ctx, rowX, rowY, rowW, rowH, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.14)";
    ctx.lineWidth = 1;
    drawRoundRect(ctx, rowX, rowY, rowW, rowH, 16);
    ctx.stroke();
    ctx.restore();

    const rankColor = rankColors[i] || "#38BDF8";
    drawSafeText(ctx, `#${i + 1}`, rowX + 15, rowY + 27, {
      font: "bold 18px Arial, Sans",
      color: rankColor
    });

    if (!item) {
      await drawCircleAvatar(ctx, null, rowX + 62, rowY + 7, 38, "rgba(248, 250, 252, 0.24)", 3, "W");
      drawSafeText(ctx, "Belum ada", rowX + 112, rowY + 27, { font: "bold 18px Arial, Sans", color: "#CBD5E1", maxWidth: 250 });
      drawStaticArrow(ctx, rowX + 370, rowY + 27, "#38BDF8");
      drawSafeText(ctx, "0 poin", rowX + rowW - 20, rowY + 27, { font: "bold 17px Arial, Sans", color: "#F8FAFC", align: "right" });
      continue;
    }

    const name = getUserName(item);
    const avatar = await loadAvatar(guild, item);
    await drawCircleAvatar(ctx, avatar, rowX + 62, rowY + 7, 38, rankColor, i < 3 ? 4 : 3, name);

    drawSafeText(ctx, name, rowX + 112, rowY + 27, {
      font: "bold 18px Arial, Sans",
      color: "#F8FAFC",
      maxWidth: 250
    });

    drawStaticArrow(ctx, rowX + 370, rowY + 27, "#38BDF8");

    drawSafeText(ctx, `${formatPoints(getPointValue(item))} poin`, rowX + rowW - 20, rowY + 27, {
      font: "bold 17px Arial, Sans",
      color: "#F8FAFC",
      align: "right",
      maxWidth: 190
    });
  }
}

async function drawPodium(ctx, guild, sorted) {
  const areaX = 755;
  const areaY = 150;
  const areaW = 385;
  const areaH = 680;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(30, 41, 59, 0.88)";
  drawRoundRect(ctx, areaX, areaY, areaW, areaH, 30);
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
  ctx.lineWidth = 2;
  drawRoundRect(ctx, areaX, areaY, areaW, areaH, 30);
  ctx.stroke();
  ctx.restore();

  drawSafeText(ctx, "Podium Top 3", areaX + 34, areaY + 50, {
    font: "bold 30px Arial, Sans",
    color: "#F8FAFC"
  });

  async function drawPodiumUser(item, rank, cx, avatarY, avatarSize, color) {
    const cardW = rank === 1 ? 250 : 165;
    const cardH = rank === 1 ? 230 : 202;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = rank === 1 ? "rgba(250, 204, 21, 0.09)" : "rgba(51, 65, 85, 0.42)";
    drawRoundRect(ctx, cx - cardW / 2, avatarY - 42, cardW, cardH, 24);
    ctx.fill();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
    ctx.lineWidth = 1;
    drawRoundRect(ctx, cx - cardW / 2, avatarY - 42, cardW, cardH, 24);
    ctx.stroke();
    ctx.restore();

    drawMedalBadge(ctx, rank, cx, avatarY - 22, color);

    const name = item ? getUserName(item) : "Belum ada";
    const avatar = item ? await loadAvatar(guild, item) : null;
    await drawCircleAvatar(ctx, avatar, cx - avatarSize / 2, avatarY, avatarSize, color, rank === 1 ? 5 : 4, name);

    drawSafeText(ctx, name, cx, avatarY + avatarSize + 32, {
      font: rank === 1 ? "bold 23px Arial, Sans" : "bold 20px Arial, Sans",
      color: "#F8FAFC",
      align: "center",
      maxWidth: rank === 1 ? 215 : 155
    });

    drawSafeText(ctx, `${formatPoints(item ? getPointValue(item) : 0)} poin`, cx, avatarY + avatarSize + (rank === 1 ? 57 : 60), {
      font: rank === 1 ? "bold 21px Arial, Sans" : "bold 18px Arial, Sans",
      color,
      align: "center",
      maxWidth: rank === 1 ? 220 : 160
    });
  }

  await drawPodiumUser(sorted[0], 1, 948, 245, 135, "#FACC15");
  await drawPodiumUser(sorted[1], 2, 860, 485, 105, "#CBD5E1");
  await drawPodiumUser(sorted[2], 3, 1035, 485, 105, "#F59E0B");

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(56, 189, 248, 0.18)";
  drawRoundRect(ctx, areaX + 36, areaY + 602, 313, 50, 16);
  ctx.fill();
  ctx.restore();

  drawSafeText(ctx, "Pak RW • Desa Tulus Leaderboard", areaX + areaW / 2, areaY + 628, {
    font: "18px Arial, Sans",
    color: "#CBD5E1",
    align: "center",
    maxWidth: 290
  });
}

async function generateLeaderboardImage(guild, topUsers = [], leaderboardConfig = {}) {
  logLeaderboardDebug("raw topUsers", topUsers);
  console.log("[LEADERBOARD_IMAGE] is array:", Array.isArray(topUsers));
  console.log("[LEADERBOARD_IMAGE] total:", Array.isArray(topUsers) ? topUsers.length : 0);
  logLeaderboardDebug("first", Array.isArray(topUsers) ? topUsers.slice(0, 1) : null);

  const cfg = normalizeLeaderboardConfig(leaderboardConfig);
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  try {
    await drawBackground(ctx, cfg);
    drawHeader(ctx, guild, cfg);

    const hydratedUsers = await hydrateLeaderboardUsers(guild, topUsers);

    await drawList(ctx, guild, hydratedUsers, cfg);
    await drawPodium(ctx, guild, hydratedUsers);

    drawSafeText(ctx, cfg.footer || "Pak RW • Desa Tulus Leaderboard", 60, 870, {
      font: "18px Arial, Sans",
      color: "rgba(203, 213, 225, 0.86)",
      maxWidth: 480
    });

    return canvas.toBuffer("image/png");
  } catch (error) {
    console.error("[LEADERBOARD_CANVAS_ERROR]", error?.message || error);

    const fallbackCanvas = createCanvas(WIDTH, HEIGHT);
    const fallbackCtx = fallbackCanvas.getContext("2d");
    await drawBackground(fallbackCtx, cfg);
    drawSafeText(fallbackCtx, "🏆 TOP AKTIF WARGA", 60, 90, { font: "bold 48px Arial, Sans", color: "#F8FAFC" });
    drawSafeText(fallbackCtx, "Leaderboard sedang diproses ulang.", 60, 170, { font: "26px Arial, Sans", color: "#CBD5E1" });
    drawSafeText(fallbackCtx, "Coba lagi sebentar ya.", 60, 210, { font: "26px Arial, Sans", color: "#CBD5E1" });
    drawSafeText(fallbackCtx, cfg.footer || "Pak RW • Desa Tulus Leaderboard", 60, 870, { font: "18px Arial, Sans", color: "#CBD5E1" });
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
  drawStaticArrow,
  drawMedalBadge,
  safeLoadImage
};
