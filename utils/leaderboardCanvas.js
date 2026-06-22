const { createCanvas, loadImage } = require("@napi-rs/canvas");

const WIDTH = 1200;
const HEIGHT = 900;
const FALLBACK_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";
const FALLBACK_ARROW = "➜";

function formatPoints(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0";

  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(number);
}

function getPointValue(item) {
  const raw = item?.points ?? item?.point ?? item?.totalPoints ?? item?.lifetimeTotal ?? item?.score ?? item?.xp ?? item?.exp ?? 0;
  const number = Number(raw);
  return Number.isFinite(number) ? number : 0;
}

function getUserName(item) {
  return item?.displayName || item?.globalName || item?.username || item?.name || "Warga Desa";
}

function getAvatarURL(guild, item) {
  const direct = item?.avatarURL || item?.avatar || item?.displayAvatarURL;
  if (direct && /^https?:\/\//i.test(String(direct))) return direct;

  const userId = item?.userId || item?.id || item?.memberId || item?.discordId;
  try {
    const cachedMember = userId ? guild?.members?.cache?.get(String(userId)) : null;
    const cachedUser = cachedMember?.user || (userId ? guild?.client?.users?.cache?.get(String(userId)) : null);
    const url = cachedUser?.displayAvatarURL?.({ extension: "png", size: 256 });
    if (url) return url;
  } catch {
    // fallback below
  }

  return FALLBACK_AVATAR;
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

async function safeLoadImage(url) {
  try {
    if (!url) return await loadImage(FALLBACK_AVATAR);
    return await loadImage(url);
  } catch {
    try {
      return await loadImage(FALLBACK_AVATAR);
    } catch {
      return null;
    }
  }
}

async function drawCircleAvatar(ctx, image, x, y, size, borderColor = "rgba(248, 250, 252, 0.38)", borderWidth = 3) {
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
  }

  ctx.restore();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.stroke();
}

function drawBackground(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#0F172A");
  gradient.addColorStop(1, "#111827");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

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

function drawHeader(ctx, guild) {
  ctx.fillStyle = "#F8FAFC";
  ctx.font = "bold 48px Arial, Sans";
  ctx.fillText("TOP AKTIF WARGA", 60, 82);

  ctx.fillStyle = "#CBD5E1";
  ctx.font = "22px Arial, Sans";
  const serverName = guild?.name || "Desa Tulus";
  ctx.fillText(`${serverName} Leaderboard • Update 00.00 WIB`, 62, 116);
}

async function drawList(ctx, guild, sorted) {
  const x = 60;
  const y = 150;
  const w = 540;
  const h = 680;

  ctx.save();
  ctx.globalAlpha = 0.90;
  ctx.fillStyle = "#1E293B";
  drawRoundRect(ctx, x, y, w, h, 28);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(148, 163, 184, 0.24)";
  ctx.lineWidth = 2;
  drawRoundRect(ctx, x, y, w, h, 28);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#F8FAFC";
  ctx.font = "bold 28px Arial, Sans";
  ctx.fillText("🏆 Peringkat Warga", x + 28, y + 48);

  if (!sorted.length) {
    ctx.fillStyle = "#CBD5E1";
    ctx.font = "24px Arial, Sans";
    ctx.fillText("Belum ada data aktivitas warga.", x + 35, y + 160);
    ctx.font = "20px Arial, Sans";
    ctx.fillText("Mulai aktif ngobrol untuk masuk leaderboard.", x + 35, y + 195);
    return;
  }

  const rankColors = ["#FACC15", "#CBD5E1", "#F59E0B"];

  for (let i = 0; i < sorted.length; i += 1) {
    const item = sorted[i];
    const rowY = y + 78 + i * 58;
    const rowX = x + 24;
    const rowW = w - 48;
    const rowH = 48;

    ctx.save();
    ctx.globalAlpha = i < 3 ? 0.32 : 0.20;
    ctx.fillStyle = i === 0 ? "#FACC15" : i === 1 ? "#CBD5E1" : i === 2 ? "#F59E0B" : "#334155";
    drawRoundRect(ctx, rowX, rowY, rowW, rowH, 16);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = rankColors[i] || "#38BDF8";
    ctx.font = "bold 20px Arial, Sans";
    ctx.fillText(`#${i + 1}`, rowX + 14, rowY + 31);

    const avatar = await safeLoadImage(getAvatarURL(guild, item));
    await drawCircleAvatar(ctx, avatar, rowX + 58, rowY + 5, 38);

    ctx.fillStyle = "#F8FAFC";
    ctx.font = "bold 19px Arial, Sans";
    const name = fitText(ctx, getUserName(item), 190);
    ctx.fillText(name, rowX + 108, rowY + 28);

    ctx.fillStyle = "#38BDF8";
    ctx.font = "bold 24px Arial, Sans";
    ctx.fillText(FALLBACK_ARROW, rowX + 312, rowY + 31);

    ctx.fillStyle = "#F8FAFC";
    ctx.font = "bold 18px Arial, Sans";
    const points = `${formatPoints(getPointValue(item))} poin`;
    const pointsWidth = ctx.measureText(points).width;
    ctx.fillText(points, rowX + rowW - pointsWidth - 16, rowY + 29);
  }
}

async function drawPodium(ctx, guild, sorted) {
  const areaX = 650;
  const areaY = 175;
  const areaW = 490;
  const areaH = 655;

  ctx.save();
  ctx.globalAlpha = 0.84;
  ctx.fillStyle = "#1E293B";
  drawRoundRect(ctx, areaX, areaY, areaW, areaH, 30);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(148, 163, 184, 0.24)";
  ctx.lineWidth = 2;
  drawRoundRect(ctx, areaX, areaY, areaW, areaH, 30);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#F8FAFC";
  ctx.font = "bold 30px Arial, Sans";
  ctx.fillText("Podium Top 3", areaX + 34, areaY + 52);

  if (!sorted.length) {
    ctx.fillStyle = "#CBD5E1";
    ctx.font = "24px Arial, Sans";
    ctx.fillText("Belum ada podium.", areaX + 34, areaY + 150);
    return;
  }

  async function drawPodiumUser(item, rank, cx, cy, avatarSize, color) {
    const avatar = await safeLoadImage(getAvatarURL(guild, item));

    ctx.fillStyle = color;
    ctx.font = rank === 1 ? "bold 42px Arial, Sans" : "bold 34px Arial, Sans";
    ctx.textAlign = "center";
    ctx.fillText(rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉", cx, cy - 18);

    await drawCircleAvatar(ctx, avatar, cx - avatarSize / 2, cy, avatarSize, color, rank === 1 ? 5 : 4);

    ctx.fillStyle = "#F8FAFC";
    ctx.font = rank === 1 ? "bold 24px Arial, Sans" : "bold 21px Arial, Sans";
    const name = fitText(ctx, getUserName(item), rank === 1 ? 210 : 160);
    ctx.fillText(name, cx, cy + avatarSize + 34);

    ctx.fillStyle = color;
    ctx.font = rank === 1 ? "bold 22px Arial, Sans" : "bold 19px Arial, Sans";
    ctx.fillText(`${formatPoints(getPointValue(item))} poin`, cx, cy + avatarSize + 64);
    ctx.textAlign = "left";
  }

  if (sorted[1]) await drawPodiumUser(sorted[1], 2, areaX + 135, areaY + 305, 120, "#CBD5E1");
  if (sorted[0]) await drawPodiumUser(sorted[0], 1, areaX + 245, areaY + 190, 150, "#FACC15");
  if (sorted[2]) await drawPodiumUser(sorted[2], 3, areaX + 365, areaY + 315, 120, "#F59E0B");

  ctx.fillStyle = "rgba(56, 189, 248, 0.18)";
  drawRoundRect(ctx, areaX + 65, areaY + 560, 360, 56, 18);
  ctx.fill();

  ctx.fillStyle = "#CBD5E1";
  ctx.font = "19px Arial, Sans";
  ctx.fillText("Pak RW • Desa Tulus Leaderboard", areaX + 100, areaY + 595);
}

async function generateLeaderboardImage(guild, topUsers = []) {
  try {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext("2d");

    drawBackground(ctx);
    drawHeader(ctx, guild);

    const sorted = Array.isArray(topUsers)
      ? [...topUsers].filter(Boolean).sort((a, b) => getPointValue(b) - getPointValue(a)).slice(0, 10)
      : [];

    await drawList(ctx, guild, sorted);
    await drawPodium(ctx, guild, sorted);

    ctx.fillStyle = "rgba(203, 213, 225, 0.8)";
    ctx.font = "18px Arial, Sans";
    ctx.fillText("Pak RW • Desa Tulus Leaderboard", 60, 870);

    return canvas.toBuffer("image/png");
  } catch (error) {
    console.error("[LEADERBOARD_CANVAS_ERROR]", error?.message || error);

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext("2d");
    drawBackground(ctx);

    ctx.fillStyle = "#F8FAFC";
    ctx.font = "bold 48px Arial, Sans";
    ctx.fillText("TOP AKTIF WARGA", 60, 90);

    ctx.fillStyle = "#CBD5E1";
    ctx.font = "26px Arial, Sans";
    ctx.fillText("Leaderboard sedang diproses ulang.", 60, 170);
    ctx.fillText("Coba lagi sebentar ya.", 60, 210);

    return canvas.toBuffer("image/png");
  }
}

module.exports = {
  generateLeaderboardImage,
  formatPoints,
  getPointValue,
  getUserName,
  fitText,
  drawRoundRect,
  drawCircleAvatar,
  safeLoadImage
};
