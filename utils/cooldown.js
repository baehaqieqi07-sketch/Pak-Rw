const cooldown = new Map();

function isCooldown(userId, ms = 5000) {
  const now = Date.now();
  const expiredAt = cooldown.get(userId);

  if (expiredAt && expiredAt > now) return true;

  cooldown.set(userId, now + ms);

  setTimeout(() => {
    const currentExpiredAt = cooldown.get(userId);
    if (!currentExpiredAt || currentExpiredAt <= Date.now()) {
      cooldown.delete(userId);
    }
  }, ms + 500);

  return false;
}

function getRemaining(userId) {
  const expiredAt = cooldown.get(userId) || 0;
  return Math.max(0, Math.ceil((expiredAt - Date.now()) / 1000));
}

module.exports = { isCooldown, getRemaining };
