const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const WIDTH = 1200;
const HEIGHT = 900;
const FALLBACK_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";
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

function getUserName(item) {
  return String(item?.displayName || item?.globalName || item?.username || item?.name || item?.tag || "Warga Desa").replace(/\s+/g, " ").trim() || "Warga Desa";
}

function getUserId(item) {
  return String(item?.userId || item?.id || item?.memberId || item?.discordId || item?.discordID || item?.user_id || "").trim();
}

function getAvatarURL(guild, item) {
  const direct = item?.avatarURL || item?.avatarUrl || item?.avatar || item?.displayAvatarURL;
  if (direct && /^https?:\/\//i.test(String(direct))) return direct;

  const userId = getUserId(item);
  try {
    const cachedMember = userId ? guild?.members?.cache?.get(String(userId)) : null;
    const cachedUser = cachedMember?.user || (userId ? guild?.client?.users?.cache?.get(String(userId)) : null);
    const url = cachedMember?.displayAvatarURL?.({ extension: "png", size: 256 }) || cachedUser?.displayAvatarURL?.({ extension: "png", size: 256 });
    if (url) return url;
  } catch {
    // fallback below
  }

  return null;
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

function fitText(ctx, text, maxWidth) {
  const clean = String(text || "Warga Desa").replace(/\s+/g, " ").trim() || "Warga Desa";
  if (ctx.measureText(clean).width <= maxWidth) return clean;

  let output = clean;
  while (output.length > 0 && ctx.measureText(`${output}...`).width > maxWidth) {
    output = output.slice(0, -1);
  }

  return output.length > 0 ? `${output}...` : "...";
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

function drawStaticArrow(ctx, x, y, color = "#38BDF8") {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 22, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 22, y);
  ctx.lineTo(x + 14, y - 7);
  ctx.lineTo(x + 14, y + 7);
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
  ctx.fillStyle = rank === 1 ? "#0F172A" : "#111827";
  ctx.font = "bold 19px Arial, Sans";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(rank), cx, cy + 1);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
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
    ctx.fillStyle = "#CBD5E1";
    ctx.font = `bold ${Math.max(16, Math.floor(size * 0.42))}px Arial, Sans`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(initial || "W").trim().slice(0, 1).toUpperCase(), x + size / 2, y + size / 2 + 1);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.stroke();
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
  return {
    useImage: source.useImage !== false,
    backgroundMode,
    backgroundUrl: String(source.backgroundUrl || "").trim(),
    backgroundPath: String(source.backgroundPath || "assets/leaderboard/background.png").trim(),
    backgroundOverlay: clampNumber(source.backgroundOverlay, 0.55, 0, 0.9),
    backgroundBlur: clampNumber(source.backgroundBlur, 0, 0, 18),
    backgroundDarken: clampNumber(source.backgroundDarken, 0.45, 0, 0.85),
    backgroundFit: String(source.backgroundFit || "cover").trim() || "cover",
    imageTheme: String(source.imageTheme || "desa_tulus_dark").trim() || "desa_tulus_dark",
    color: String(source.color || "#FACC15").trim() || "#FACC15",
    fallbackArrow: String(source.fallbackArrow || FALLBACK_ARROW).trim() || FALLBACK_ARROW,
    footer: String(source.footer || "Pak RW • Desa Tulus Leaderboard").trim() || "Pak RW • Desa Tulus Leaderboard"
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
  if (cfg.backgroundMode === "upload") customSource = cfg.backgroundPath || "assets/leaderboard/background.png";

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

  ctx.globalAlpha = 1;
  const overlay = Math.max(cfg.backgroundOverlay, cfg.backgroundDarken);
  ctx.fillStyle = `rgba(15, 23, 42, ${overlay})`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#F8FAFC";
}

function drawHeader(ctx, guild) {
  ctx.globalAlpha = 1;
  drawTrophyIcon(ctx, 60, 43);
  ctx.fillStyle = "#F8FAFC";
  ctx.font = "bold 46px Arial, Sans";
  ctx.fillText("TOP AKTIF WARGA", 125, 82);

  ctx.fillStyle = "#CBD5E1";
  ctx.font = "22px Arial, Sans";
  const serverName = guild?.name || "Desa Tulus";
  ctx.fillText(`${serverName} Leaderboard • Update 00.00 WIB`, 62, 116);
}

async function drawList(ctx, guild, sorted, cfg) {
  const x = 60;
  const y = 145;
  const w = 640;
  const h = 690;

  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(30, 41, 59, 0.88)";
  drawRoundRect(ctx, x, y, w, h, 28);
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
  ctx.lineWidth = 2;
  drawRoundRect(ctx, x, y, w, h, 28);
  ctx.stroke();

  ctx.fillStyle = "#F8FAFC";
  ctx.font = "bold 28px Arial, Sans";
  ctx.fillText("🏆 Peringkat Warga", x + 30, y + 48);

  const rowX = 90;
  const rowStartY = 220;
  const rowW = 580;
  const rowH = 56;
  const gap = 5;
  const rankColors = ["#FACC15", "#CBD5E1", "#F59E0B"];

  if (!sorted.length) {
    for (let i = 0; i < 10; i += 1) {
      const rowY = rowStartY + i * (rowH + gap);
      ctx.fillStyle = "rgba(51, 65, 85, 0.55)";
      drawRoundRect(ctx, rowX, rowY, rowW, rowH, 16);
      ctx.fill();
      ctx.fillStyle = "#CBD5E1";
      ctx.font = "bold 18px Arial, Sans";
      ctx.fillText(`#${i + 1}`, rowX + 14, rowY + 35);
      ctx.font = "18px Arial, Sans";
      ctx.fillText("Belum ada data warga", rowX + 112, rowY + 35);
    }
    return;
  }

  for (let i = 0; i < 10; i += 1) {
    const item = sorted[i];
    const rowY = rowStartY + i * (rowH + gap);

    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(51, 65, 85, 0.55)";
    drawRoundRect(ctx, rowX, rowY, rowW, rowH, 16);
    ctx.fill();

    if (!item) {
      ctx.fillStyle = "#CBD5E1";
      ctx.font = "bold 18px Arial, Sans";
      ctx.fillText(`#${i + 1}`, rowX + 14, rowY + 35);
      ctx.font = "18px Arial, Sans";
      ctx.fillText("Belum ada", rowX + 112, rowY + 35);
      continue;
    }

    ctx.fillStyle = rankColors[i] || "#38BDF8";
    ctx.font = "bold 18px Arial, Sans";
    ctx.fillText(`#${i + 1}`, rowX + 14, rowY + 35);

    const name = getUserName(item);
    const avatar = await loadAvatar(guild, item);
    await drawCircleAvatar(ctx, avatar, rowX + 60, rowY + 9, 38, rankColors[i] || "rgba(248, 250, 252, 0.38)", i < 3 ? 4 : 3, name);

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#F8FAFC";
    ctx.font = "bold 18px Arial, Sans";
    ctx.fillText(fitText(ctx, name, 250), rowX + 112, rowY + 35);

    drawStaticArrow(ctx, rowX + 365, rowY + 31, "#38BDF8");

    const pointsText = `${formatPoints(getPointValue(item))} poin`;
    ctx.fillStyle = "#F8FAFC";
    ctx.font = "bold 17px Arial, Sans";
    const pointsWidth = ctx.measureText(pointsText).width;
    ctx.fillText(pointsText, rowX + rowW - pointsWidth - 18, rowY + 35);
  }
}

async function drawPodium(ctx, guild, sorted) {
  const areaX = 735;
  const areaY = 145;
  const areaW = 405;
  const areaH = 690;

  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(30, 41, 59, 0.88)";
  drawRoundRect(ctx, areaX, areaY, areaW, areaH, 30);
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
  ctx.lineWidth = 2;
  drawRoundRect(ctx, areaX, areaY, areaW, areaH, 30);
  ctx.stroke();

  ctx.fillStyle = "#F8FAFC";
  ctx.font = "bold 30px Arial, Sans";
  ctx.fillText("Podium Top 3", areaX + 34, areaY + 52);

  async function drawPodiumUser(item, rank, cx, avatarY, avatarSize, color) {
    ctx.textAlign = "center";
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";

    if (!item) {
      ctx.fillStyle = "rgba(51, 65, 85, 0.55)";
      drawRoundRect(ctx, cx - avatarSize / 2 - 16, avatarY - 22, avatarSize + 32, avatarSize + 108, 24);
      ctx.fill();
      drawMedalBadge(ctx, rank, cx, avatarY - 24, color);
      await drawCircleAvatar(ctx, null, cx - avatarSize / 2, avatarY, avatarSize, color, rank === 1 ? 5 : 4, "W");
      ctx.fillStyle = "#CBD5E1";
      ctx.font = "bold 18px Arial, Sans";
      ctx.fillText("Belum ada", cx, avatarY + avatarSize + 32);
      ctx.fillText("0 poin", cx, avatarY + avatarSize + 60);
      ctx.textAlign = "left";
      return;
    }

    const name = getUserName(item);
    const avatar = await loadAvatar(guild, item);

    drawMedalBadge(ctx, rank, cx, avatarY - 24, color);

    await drawCircleAvatar(ctx, avatar, cx - avatarSize / 2, avatarY, avatarSize, color, rank === 1 ? 5 : 4, name);

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#F8FAFC";
    ctx.font = rank === 1 ? "bold 23px Arial, Sans" : "bold 20px Arial, Sans";
    ctx.fillText(fitText(ctx, name, rank === 1 ? 210 : 154), cx, avatarY + avatarSize + 34);

    ctx.fillStyle = color;
    ctx.font = rank === 1 ? "bold 21px Arial, Sans" : "bold 18px Arial, Sans";
    ctx.fillText(`${formatPoints(getPointValue(item))} poin`, cx, avatarY + avatarSize + (rank === 1 ? 52 : 63));
    ctx.textAlign = "left";
  }

  await drawPodiumUser(sorted[0], 1, 935, 245, 135, "#FACC15");
  await drawPodiumUser(sorted[1], 2, 850, 475, 105, "#CBD5E1");
  await drawPodiumUser(sorted[2], 3, 1020, 475, 105, "#F59E0B");

  ctx.fillStyle = "rgba(56, 189, 248, 0.18)";
  drawRoundRect(ctx, areaX + 36, areaY + 608, 333, 50, 16);
  ctx.fill();

  ctx.fillStyle = "#CBD5E1";
  ctx.font = "18px Arial, Sans";
  ctx.fillText("Pak RW • Desa Tulus Leaderboard", areaX + 70, areaY + 640);
}

async function generateLeaderboardImage(guild, topUsers = [], leaderboardConfig = {}) {
  console.log("[LEADERBOARD_IMAGE] raw top users:", topUsers);
  console.log("[LEADERBOARD_IMAGE] total users:", Array.isArray(topUsers) ? topUsers.length : "not array");
  console.log("[LEADERBOARD_IMAGE] first user:", Array.isArray(topUsers) ? topUsers[0] : null);

  const cfg = normalizeLeaderboardConfig(leaderboardConfig);
  try {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext("2d");

    await drawBackground(ctx, cfg);
    drawHeader(ctx, guild);

    const sorted = normalizeLeaderboardUsers(topUsers);

    await drawList(ctx, guild, sorted, cfg);
    await drawPodium(ctx, guild, sorted);

    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(203, 213, 225, 0.86)";
    ctx.font = "18px Arial, Sans";
    ctx.fillText(cfg.footer || "Pak RW • Desa Tulus Leaderboard", 60, 870);

    return canvas.toBuffer("image/png");
  } catch (error) {
    console.error("[LEADERBOARD_CANVAS_ERROR]", error?.message || error);

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext("2d");
    await drawBackground(ctx, cfg);

    ctx.fillStyle = "#F8FAFC";
    ctx.font = "bold 48px Arial, Sans";
    ctx.fillText("🏆 TOP AKTIF WARGA", 60, 90);

    ctx.fillStyle = "#CBD5E1";
    ctx.font = "26px Arial, Sans";
    ctx.fillText("Leaderboard sedang diproses ulang.", 60, 170);
    ctx.fillText("Coba lagi sebentar ya.", 60, 210);

    return canvas.toBuffer("image/png");
  }
}

module.exports = {
  WIDTH,
  HEIGHT,
  FALLBACK_ARROW,
  generateLeaderboardImage,
  normalizeLeaderboardUsers,
  normalizeLeaderboardConfig,
  formatPoints,
  getPointValue,
  getUserName,
  fitText,
  drawRoundRect,
  drawCircleAvatar,
  drawCoverImage,
  drawBackground,
  drawStaticArrow,
  drawMedalBadge,
  safeLoadImage
};
