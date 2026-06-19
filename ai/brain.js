const axios = require("axios");
const { readStore, writeStore } = require("../db/mongoStore");

let config = {};
try {
  config = require("../config.json");
} catch {
  config = require("../config.example.json");
}

const DEFAULT_SMART_MODEL = "openai/gpt-5.4";
const DEFAULT_ECONOMY_MODEL = "openai/gpt-5.4-mini";
const LEGACY_MODELS = new Set([
  "openai/gpt-4o-mini",
  "openai/gpt-5-mini",
  "openai/gpt-5.2-pro"
]);
const MAX_MEMORY_USERS = 600;
const MAX_MEMORY_TURNS = 10;
const MAX_MEMORY_TEXT = 520;
let lastAiRequestAt = 0;
let aiDailyState = { day: "", count: 0 };
const aiResponseCache = new Map();
let volatileMemoryRoot = { users: {} };

let volatileAiLimitState = { status: "normal", failCount: 0, updatedAt: Date.now() };
const aiUserCooldown = new Map();
const aiChannelCooldown = new Map();
const aiSpamWindows = new Map();
const aiDailyUserState = new Map();

const DEFAULT_AI_LIMITS = Object.freeze({
  autoRecovery: true,
  rateLimitCooldownSeconds: 300,
  providerErrorCooldownSeconds: 120,
  creditRecheckSeconds: 1800,
  authRecheckSeconds: 3600,
  tokenBudget: 3000,
  maxPromptChars: 8500,
  maxSystemChars: 1800,
  maxMemoryChars: 900,
  maxHistoryTurns: 2,
  maxUserMessageChars: 1500,
  maxReplyTokens: 500,
  safeReplyTokens: 350,
  curhatSystemChars: 1000,
  curhatMemoryChars: 700,
  curhatHistoryTurns: 2,
  curhatMaxReplyTokens: 450,
  cooldownUserSeconds: 10,
  cooldownChannelSeconds: 3,
  dailyLimitPerUser: 30,
  dailyLimitOwner: 999,
  spamWindowSeconds: 30,
  spamMaxMessages: 5,
  fallbackMaxCharsMember: 350,
  fallbackMaxCharsOwner: 700,
  tokenLimitRetryMax: 1,
  providerRetryMax: 1,
  storeLimitFallbackMemory: false,
  memorySummaryOnly: true,
  showResetTime: true
});

function envOrConfigNumber(configKey, envKey, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const raw = config.ai?.[configKey] ?? process.env[envKey];
  const n = Number(raw);
  const value = Number.isFinite(n) ? n : fallback;
  return Math.max(min, Math.min(max, value));
}

function envOrConfigBool(configKey, envKey, fallback) {
  const raw = config.ai?.[configKey] ?? process.env[envKey];
  if (raw === undefined || raw === null || raw === "") return fallback;
  return ["1", "true", "yes", "on", "aktif", "nyala"].includes(String(raw).toLowerCase().trim());
}

function aiBudgetConfig() {
  return {
    autoRecovery: envOrConfigBool("autoRecovery", "AI_AUTO_RECOVERY", DEFAULT_AI_LIMITS.autoRecovery),
    rateLimitCooldownSeconds: envOrConfigNumber("rateLimitCooldownSeconds", "AI_RATE_LIMIT_COOLDOWN_SECONDS", DEFAULT_AI_LIMITS.rateLimitCooldownSeconds, 10, 86400),
    providerErrorCooldownSeconds: envOrConfigNumber("providerErrorCooldownSeconds", "AI_PROVIDER_ERROR_COOLDOWN_SECONDS", DEFAULT_AI_LIMITS.providerErrorCooldownSeconds, 10, 86400),
    creditRecheckSeconds: envOrConfigNumber("creditRecheckSeconds", "AI_CREDIT_RECHECK_SECONDS", DEFAULT_AI_LIMITS.creditRecheckSeconds, 60, 86400),
    authRecheckSeconds: envOrConfigNumber("authRecheckSeconds", "AI_AUTH_RECHECK_SECONDS", DEFAULT_AI_LIMITS.authRecheckSeconds, 60, 86400),
    tokenBudget: envOrConfigNumber("tokenBudget", "AI_TOKEN_BUDGET", DEFAULT_AI_LIMITS.tokenBudget, 600, 12000),
    maxPromptChars: envOrConfigNumber("maxPromptChars", "AI_MAX_PROMPT_CHARS", DEFAULT_AI_LIMITS.maxPromptChars, 1200, 40000),
    maxSystemChars: envOrConfigNumber("maxSystemChars", "AI_MAX_SYSTEM_CHARS", DEFAULT_AI_LIMITS.maxSystemChars, 400, 12000),
    maxMemoryChars: envOrConfigNumber("maxMemoryChars", "AI_MAX_MEMORY_CHARS", DEFAULT_AI_LIMITS.maxMemoryChars, 0, 6000),
    maxHistoryTurns: envOrConfigNumber("maxHistoryTurns", "AI_MAX_HISTORY_TURNS", DEFAULT_AI_LIMITS.maxHistoryTurns, 0, 10),
    maxUserMessageChars: envOrConfigNumber("maxUserMessageChars", "AI_MAX_USER_MESSAGE_CHARS", DEFAULT_AI_LIMITS.maxUserMessageChars, 120, 8000),
    maxReplyTokens: envOrConfigNumber("maxReplyTokens", "AI_MAX_REPLY_TOKENS", DEFAULT_AI_LIMITS.maxReplyTokens, 80, 2000),
    safeReplyTokens: envOrConfigNumber("safeReplyTokens", "AI_SAFE_REPLY_TOKENS", DEFAULT_AI_LIMITS.safeReplyTokens, 80, 1500),
    curhatSystemChars: envOrConfigNumber("curhatSystemChars", "AI_CURHAT_SYSTEM_CHARS", DEFAULT_AI_LIMITS.curhatSystemChars, 300, 8000),
    curhatMemoryChars: envOrConfigNumber("curhatMemoryChars", "AI_CURHAT_MEMORY_CHARS", DEFAULT_AI_LIMITS.curhatMemoryChars, 0, 5000),
    curhatHistoryTurns: envOrConfigNumber("curhatHistoryTurns", "AI_CURHAT_HISTORY_TURNS", DEFAULT_AI_LIMITS.curhatHistoryTurns, 0, 6),
    curhatMaxReplyTokens: envOrConfigNumber("curhatMaxReplyTokens", "AI_CURHAT_MAX_REPLY_TOKENS", DEFAULT_AI_LIMITS.curhatMaxReplyTokens, 80, 1200),
    cooldownUserSeconds: envOrConfigNumber("cooldownUserSeconds", "AI_COOLDOWN_USER", DEFAULT_AI_LIMITS.cooldownUserSeconds, 0, 3600),
    cooldownChannelSeconds: envOrConfigNumber("cooldownChannelSeconds", "AI_COOLDOWN_CHANNEL", DEFAULT_AI_LIMITS.cooldownChannelSeconds, 0, 3600),
    dailyLimitPerUser: envOrConfigNumber("dailyLimitPerUser", "AI_DAILY_LIMIT_PER_USER", DEFAULT_AI_LIMITS.dailyLimitPerUser, 0, 9999),
    dailyLimitOwner: envOrConfigNumber("dailyLimitOwner", "AI_DAILY_LIMIT_OWNER", DEFAULT_AI_LIMITS.dailyLimitOwner, 0, 99999),
    spamWindowSeconds: envOrConfigNumber("spamWindowSeconds", "AI_SPAM_WINDOW_SECONDS", DEFAULT_AI_LIMITS.spamWindowSeconds, 5, 600),
    spamMaxMessages: envOrConfigNumber("spamMaxMessages", "AI_SPAM_MAX_MESSAGES", DEFAULT_AI_LIMITS.spamMaxMessages, 1, 100),
    fallbackMaxCharsMember: envOrConfigNumber("fallbackMaxCharsMember", "AI_FALLBACK_MAX_CHARS_MEMBER", DEFAULT_AI_LIMITS.fallbackMaxCharsMember, 120, 1200),
    fallbackMaxCharsOwner: envOrConfigNumber("fallbackMaxCharsOwner", "AI_FALLBACK_MAX_CHARS_OWNER", DEFAULT_AI_LIMITS.fallbackMaxCharsOwner, 200, 2000),
    tokenLimitRetryMax: envOrConfigNumber("tokenLimitRetryMax", "AI_TOKEN_LIMIT_RETRY_MAX", DEFAULT_AI_LIMITS.tokenLimitRetryMax, 0, 2),
    providerRetryMax: envOrConfigNumber("providerRetryMax", "AI_PROVIDER_RETRY_MAX", DEFAULT_AI_LIMITS.providerRetryMax, 0, 2),
    storeLimitFallbackMemory: envOrConfigBool("storeLimitFallbackMemory", "AI_STORE_LIMIT_FALLBACK_MEMORY", DEFAULT_AI_LIMITS.storeLimitFallbackMemory),
    memorySummaryOnly: envOrConfigBool("memorySummaryOnly", "AI_MEMORY_SUMMARY_ONLY", DEFAULT_AI_LIMITS.memorySummaryOnly),
    showResetTime: envOrConfigBool("showResetTime", "AI_SHOW_RESET_TIME", DEFAULT_AI_LIMITS.showResetTime)
  };
}

function estimateTokens(text = "") {
  return Math.ceil(String(text || "").length / 4);
}

function truncateText(text = "", max = 1000) {
  const clean = cleanText(text);
  if (!max || clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 3)).trim()}...`;
}

function formatWibTime(ts) {
  if (!ts) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date(ts)).replace(/\./g, ":") + " WIB";
  } catch {
    return `${new Date(ts).toISOString()} WIB`;
  }
}

function getAiLimitState() {
  const stored = readStore("aiLimitState", null);
  const state = stored && typeof stored === "object" ? stored : volatileAiLimitState;
  return {
    status: state.status || "normal",
    reason: state.reason || "",
    model: state.model || "",
    provider: state.provider || "openrouter",
    lastError: state.lastError || "",
    retryAfterAt: Number(state.retryAfterAt || 0),
    lastCheckedAt: Number(state.lastCheckedAt || 0),
    failCount: Number(state.failCount || 0),
    updatedAt: Number(state.updatedAt || Date.now())
  };
}

function setAiLimitState(patch = {}) {
  const next = {
    ...getAiLimitState(),
    ...patch,
    updatedAt: Date.now(),
    provider: patch.provider || "openrouter"
  };
  volatileAiLimitState = next;
  writeStore("aiLimitState", next);
  return next;
}

function resetAiLimitState(reason = "manual_reset") {
  return setAiLimitState({
    status: "normal",
    reason,
    model: "",
    lastError: "",
    retryAfterAt: 0,
    lastCheckedAt: Date.now(),
    failCount: 0
  });
}

function getRetryAfterMs(err, fallbackSeconds) {
  const header = err?.response?.headers?.["retry-after"] || err?.response?.headers?.["Retry-After"];
  if (header) {
    const n = Number(header);
    if (Number.isFinite(n)) return Math.max(1000, Math.min(n * 1000, 24 * 60 * 60 * 1000));
    const date = Date.parse(header);
    if (Number.isFinite(date)) return Math.max(1000, date - Date.now());
  }
  return Math.max(1000, Number(fallbackSeconds || 60) * 1000);
}

function classifyAiError(err = {}) {
  const status = Number(err?.response?.status || err?.status || 0);
  const raw = typeof err === "string" ? err : JSON.stringify(err?.response?.data || err?.message || err || "");
  const msg = raw.toLowerCase();
  if (status === 401 || msg.includes("invalid api key") || msg.includes("missing authentication") || msg.includes("unauthorized")) return { type: "auth_error", status, raw };
  if (status === 402 || msg.includes("insufficient credits") || msg.includes("credit limit") || msg.includes("payment required") || msg.includes("paid account")) return { type: "credit_limit", status, raw };
  if (msg.includes("prompt tokens limit exceeded") || msg.includes("context length exceeded") || msg.includes("maximum context length") || /\d+\s*>\s*\d+/.test(msg)) return { type: "token_limit", status, raw };
  if (status === 429 || msg.includes("rate limit") || msg.includes("too many requests") || msg.includes("quota") || msg.includes("temporarily unavailable") || msg.includes("overloaded")) return { type: "rate_limit", status, raw };
  if ([500, 502, 503, 504].includes(status) || msg.includes("timeout") || msg.includes("model unavailable") || msg.includes("provider") || msg.includes("network")) return { type: "provider_error", status, raw };
  return { type: "unknown", status, raw };
}

function applyAiErrorState(err, model = "") {
  const cfg = aiBudgetConfig();
  const info = classifyAiError(err);
  const now = Date.now();
  const failCount = getAiLimitState().failCount + 1;
  const lastError = truncateText(info.raw, 360);
  console.log(`AI ERROR CLASSIFIED: ${info.type}`);

  if (info.type === "rate_limit") {
    const ms = getRetryAfterMs(err, cfg.rateLimitCooldownSeconds);
    const retryAfterAt = now + ms;
    console.log(`AI COOLDOWN SET: retryAfterAt=${formatWibTime(retryAfterAt)}`);
    setAiLimitState({ status: "rate_limited", reason: info.type, model, lastError, retryAfterAt, lastCheckedAt: now, failCount });
  } else if (info.type === "credit_limit") {
    const retryAfterAt = now + cfg.creditRecheckSeconds * 1000;
    console.log(`AI CREDIT LOCK: recheckAt=${formatWibTime(retryAfterAt)}`);
    setAiLimitState({ status: "credit_locked", reason: info.type, model, lastError, retryAfterAt, lastCheckedAt: now, failCount });
  } else if (info.type === "auth_error") {
    const retryAfterAt = now + cfg.authRecheckSeconds * 1000;
    console.log("AI AUTH LOCK: check env/api key");
    setAiLimitState({ status: "auth_locked", reason: info.type, model, lastError, retryAfterAt, lastCheckedAt: now, failCount });
  } else if (info.type === "provider_error") {
    const retryAfterAt = now + cfg.providerErrorCooldownSeconds * 1000;
    console.log(`AI PROVIDER COOLDOWN: retryAfterAt=${formatWibTime(retryAfterAt)}`);
    setAiLimitState({ status: "provider_cooldown", reason: info.type, model, lastError, retryAfterAt, lastCheckedAt: now, failCount });
  }
  return info;
}

function canAttemptAiFromState(context = {}) {
  const cfg = aiBudgetConfig();
  if (!cfg.autoRecovery) return { allowed: true, state: getAiLimitState(), reason: "auto_recovery_off" };
  const state = getAiLimitState();
  const now = Date.now();
  if (!state.status || state.status === "normal") return { allowed: true, state, reason: "normal" };
  if (state.retryAfterAt && now >= state.retryAfterAt) {
    console.log("AI RECOVERY CHECK: cooldown expired, trying normal AI again");
    setAiLimitState({ ...state, lastCheckedAt: now });
    return { allowed: true, state: getAiLimitState(), reason: "cooldown_expired" };
  }
  return { allowed: false, state, reason: state.status };
}

function summarizeAiLimitStatus() {
  const state = getAiLimitState();
  return {
    ...state,
    retryAfterText: state.retryAfterAt ? formatWibTime(state.retryAfterAt) : "-",
    modelActive: getEconomyModel(),
    smartModel: getSmartModel(),
    tokenBudget: aiBudgetConfig().tokenBudget
  };
}

function localLimitFallback(userText = "", mode = "normal", context = {}, reason = "limit", state = null) {
  const ctx = normalizeAiContext(context);
  const owner = Boolean(ctx.isOwner);
  const cfg = aiBudgetConfig();
  const reset = state?.retryAfterAt ? formatWibTime(state.retryAfterAt).split(" ").slice(-2).join(" ") : "sebentar lagi";
  const text = cleanText(userText).toLowerCase();
  let reply = "";

  if (mode === "curhat" || hasAny(text, ["kangen", "sedih", "capek", "cape", "takut", "bingung", "marah", "kecewa"])) {
    reply = reason === "token_limit"
      ? "Konteksnya kepanjangan tadi, jadi Pak RW ringkas dulu ya. Yang paling kerasa di hati sekarang bagian mana?"
      : "Pak RW lagi jawab singkat dulu ya, tapi tetap Pak RW baca. Yang kamu rasain sekarang berat banget kah?";
  } else if (reason === "rate_limited") {
    reply = owner ? `AI Pak RW lagi kena rate limit. Coba normal lagi sekitar ${reset}. Sementara Pak RW jawab lokal dulu.` : "Pak RW lagi jawab singkat dulu ya. AI-nya lagi istirahat bentar, tapi Pak RW tetap bantu kok.";
  } else if (reason === "provider_cooldown") {
    reply = owner ? `Provider AI lagi penuh/timeout. Coba lagi sekitar ${reset}.` : "Lagi agak penuh sistemnya, jadi Pak RW jawab pelan-pelan dulu ya. Ceritain intinya dulu.";
  } else if (reason === "credit_locked") {
    reply = owner ? `AI Pak RW kena batas credit/saldo. Recheck sekitar ${reset}. Cek saldo atau model AI-nya dulu.` : "Pak RW lagi jawab singkat dulu ya. Kalau butuh jawaban panjang, tunggu AI-nya normal lagi sebentar.";
  } else if (reason === "auth_locked") {
    reply = owner ? "AI Pak RW belum bisa jalan karena API key/env bermasalah. Cek AI_KEY atau OPENROUTER_API_KEY di Railway." : "Pak RW lagi jawab lokal dulu ya. Sistem AI-nya perlu dicek owner sebentar.";
  } else if (reason === "spam" || reason === "cooldown") {
    reply = "Pelan-pelan dulu ya, biar Pak RW nggak kena limit. Tunggu sebentar, nanti lanjut lagi.";
  } else {
    reply = "Pak RW lagi mode hemat dulu ya. Tulis intinya aja, nanti Pak RW bantu arahkan pelan-pelan.";
  }

  const max = owner ? cfg.fallbackMaxCharsOwner : cfg.fallbackMaxCharsMember;
  return truncateText(removeTemplateNoise(reply, userText, mode), max);
}

function checkAiUserRate(context = {}) {
  const ctx = normalizeAiContext(context);
  const cfg = aiBudgetConfig();
  const now = Date.now();
  const key = scopedUserKey(ctx);
  const day = todayKey();
  const dailyLimit = ctx.isOwner ? cfg.dailyLimitOwner : cfg.dailyLimitPerUser;

  const daily = aiDailyUserState.get(key) || { day, count: 0 };
  if (daily.day !== day) daily.count = 0, daily.day = day;
  if (dailyLimit > 0 && daily.count >= dailyLimit) return { allowed: false, reason: "daily_limit" };

  const lastUser = aiUserCooldown.get(key) || 0;
  if (cfg.cooldownUserSeconds > 0 && now - lastUser < cfg.cooldownUserSeconds * 1000) return { allowed: false, reason: "cooldown", waitMs: cfg.cooldownUserSeconds * 1000 - (now - lastUser) };
  const channelKey = `${ctx.guildId}:${ctx.channelId || "no-channel"}`;
  const lastChannel = aiChannelCooldown.get(channelKey) || 0;
  if (cfg.cooldownChannelSeconds > 0 && now - lastChannel < cfg.cooldownChannelSeconds * 1000) return { allowed: false, reason: "cooldown", waitMs: cfg.cooldownChannelSeconds * 1000 - (now - lastChannel) };

  const spam = aiSpamWindows.get(key) || [];
  const active = spam.filter((ts) => now - ts < cfg.spamWindowSeconds * 1000);
  if (active.length >= cfg.spamMaxMessages) return { allowed: false, reason: "spam" };

  return { allowed: true };
}

function markAiUserRate(context = {}) {
  const ctx = normalizeAiContext(context);
  const cfg = aiBudgetConfig();
  const now = Date.now();
  const key = scopedUserKey(ctx);
  aiUserCooldown.set(key, now);
  aiChannelCooldown.set(`${ctx.guildId}:${ctx.channelId || "no-channel"}`, now);
  const spam = (aiSpamWindows.get(key) || []).filter((ts) => now - ts < cfg.spamWindowSeconds * 1000);
  spam.push(now);
  aiSpamWindows.set(key, spam);
  const day = todayKey();
  const daily = aiDailyUserState.get(key) || { day, count: 0 };
  if (daily.day !== day) daily.count = 0, daily.day = day;
  daily.count += 1;
  aiDailyUserState.set(key, daily);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function resetDailyIfNeeded() {
  const key = todayKey();
  if (aiDailyState.day !== key) aiDailyState = { day: key, count: 0 };
}

function aiLimitConfig() {
  return config.ai || {};
}

function shouldUseLocalByBudget() {
  const cfg = aiLimitConfig();
  resetDailyIfNeeded();
  const dailyLimit = Number(cfg.dailyLimit || process.env.AI_DAILY_LIMIT || 250);
  const globalCooldownMs = Number(cfg.globalCooldownMs || process.env.AI_GLOBAL_COOLDOWN_MS || 2500);
  const now = Date.now();
  if (dailyLimit > 0 && aiDailyState.count >= dailyLimit) return "daily_limit";
  if (globalCooldownMs > 0 && now - lastAiRequestAt < globalCooldownMs) return "global_cooldown";
  return "";
}

function markAiRequestUsed() {
  resetDailyIfNeeded();
  aiDailyState.count += 1;
  lastAiRequestAt = Date.now();
}

function cleanText(text = "") {
  return String(text)
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compactReply(text = "") {
  return String(text)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function channelMention(id, fallback) {
  if (!id || String(id).includes("ISI_") || String(id).includes("ID_")) return fallback;
  return `<#${id}>`;
}

function hasAny(msg, words) {
  return words.some((word) => msg.includes(word));
}

function hasExactWord(msg = "", word = "") {
  const escaped = String(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "iu").test(String(msg || ""));
}

function isGreetingText(msg = "") {
  const text = cleanText(msg).toLowerCase();
  if (!text) return true;
  const words = text.split(/\s+/).filter(Boolean);
  const hasGreetingPhrase = hasAny(text, ["halo", "hai", "hi", "assalamualaikum", "makasih", "terima kasih"]);
  if (hasGreetingPhrase && words.length <= 5) return true;
  if ((hasExactWord(text, "p") || hasExactWord(text, "pa") || hasExactWord(text, "pak") || hasExactWord(text, "rw")) && words.length <= 3) return true;
  if ((text === "pak rw" || text === "rw pak" || text === "pak" || text === "pa") && words.length <= 3) return true;
  return false;
}

function countSignals(msg, words) {
  return words.reduce((total, word) => total + (msg.includes(word) ? 1 : 0), 0);
}

function list(items) {
  return items.map((item, i) => `${i + 1}. ${item}`).join("\n");
}

function bullet(items) {
  return items.map((item) => `• ${item}`).join("\n");
}

function isSundaneseRequested(text = "") {
  const msg = cleanText(text).toLowerCase();
  const explicitSignals = [
    "bahasa sunda", "basa sunda", "pakai sunda", "pake sunda", "make sunda", "nganggo sunda", "sunda formal", "sundaan"
  ];
  if (hasAny(msg, explicitSignals)) return true;

  const strongSignals = ["punten", "mangga", "hatur nuhun", "wilujeung", "kumaha", "mugia", "anjeunna", "abdi", "ulah", "aya", "garelut", "gelut"];
  const score = countSignals(msg, strongSignals);

  // Kata umum seperti “warga”, “lembur”, dan “sauyunan” tidak cukup untuk memaksa Basa Sunda formal.
  // Ini mencegah Pak RW salah membaca laporan pendek seperti “iya ada warga garelut”.
  return score >= 3;
}

function isIndonesianRequested(text = "") {
  const msg = cleanText(text).toLowerCase();
  const signals = ["bahasa indonesia", "bahasa indo", "pakai indo", "pake indo", "indonesia aja", "jangan sunda", "indo aja"];
  return hasAny(msg, signals);
}

function isEnglish(text = "") {
  const msg = cleanText(text).toLowerCase();
  const englishSignals = [
    "what", "why", "how", "when", "where", "which", "who", "can you", "could you",
    "please", "explain", "make", "create", "help me", "homework", "fix this", "error",
    "i need", "tell me", "give me", "show me", "write", "translate"
  ];
  const indoSignals = [
    "apa", "kenapa", "mengapa", "gimana", "bagaimana", "tolong", "coba", "buatkan",
    "jelaskan", "dong", "sih", "aku", "gua", "gue", "lu", "kamu", "ini", "itu",
    "caranya", "benerin", "fiks", "rapihin", "jangan", "server", "bot"
  ];

  const en = countSignals(msg, englishSignals);
  const id = countSignals(msg, indoSignals);
  return en > id;
}

function languageRule(text = "") {
  if (isSundaneseRequested(text)) {
    return "Jawab nganggo Basa Sunda formal anu sopan, écés, rapih, sarta henteu campur jeung Bahasa Indonesia kecuali istilah teknis Discord/bot anu memang teu aya padanan gampang.";
  }
  if (isIndonesianRequested(text)) {
    return "Jawab dalam Bahasa Indonesia yang sopan, formal-natural, jelas, rapi, dan jangan dicampur Bahasa Sunda kecuali frasa khas server seperti Wilujeung sumping bila relevan.";
  }
  return isEnglish(text)
    ? "Reply in natural, clear English unless the user asks for Indonesian or Sundanese. For public embed text, default to clear Indonesian unless explicitly asked otherwise."
    : "Jawab dalam Bahasa Indonesia yang sopan, jelas, rapi, natural, dan tidak dicampur Bahasa Sunda kecuali user meminta nuansa Sunda atau konteks welcome DESA TULUS.";
}

function detectConversationStyle(text = "") {
  const raw = cleanText(text);
  const msg = raw.toLowerCase();

  const guaLuSignals = ["gua", "gue", "gw", "lu", "lo", "elu", "loe"];
  const akuKamuSignals = ["aku", "kamu", "kau", "dirimu"];
  const sayaAndaSignals = ["saya", "anda", "mohon", "terima kasih", "tolong bantu"];
  const casualSignals = ["dong", "sih", "dah", "nih", "yaudah", "anjir", "jir", "wkwk", "wk", "haha", "bro", "bang"];
  const harshSignals = ["anjir", "anjay", "bangsat", "kampret", "goblok", "tolol", "bego", "tai", "sialan", "brengsek", "ngaco", "bacot", "kampang", "asu"];
  const angrySignals = ["kesel", "capek", "cape", "emosi", "marah", "anj", "wtf", "lah", "ahhh", "gimana sih", "masa gini"];

  let pronoun = "aku_kamu";
  const forcedPronoun = config.ai?.pronounMode || "auto";
  if (["gua_lu", "aku_kamu", "saya_anda"].includes(forcedPronoun)) pronoun = forcedPronoun;
  else if (hasAny(msg, guaLuSignals)) pronoun = "gua_lu";
  else if (hasAny(msg, sayaAndaSignals)) pronoun = "saya_anda";
  else if (hasAny(msg, akuKamuSignals)) pronoun = "aku_kamu";

  const casual = hasAny(msg, casualSignals) || pronoun === "gua_lu";
  const harsh = hasAny(msg, harshSignals);
  const angry = hasAny(msg, angrySignals);
  const toxicityMode = config.ai?.toxicityMode || "spicy_safe_mirror";
  const profanityLevel = config.ai?.profanityLevel || "high_spicy_safe";

  return {
    pronoun,
    casual,
    harsh,
    angry,
    english: isEnglish(text),
    toxicityMode,
    profanityLevel,
    allowMildProfanity: config.ai?.allowMildProfanity !== false,
    toxicReplyWhenUserHarsh: config.ai?.toxicReplyWhenUserHarsh !== false,
    safeMirror: config.ai?.safeMirror !== false
  };
}

function styleRule(text = "") {
  const style = detectConversationStyle(text);
  const rules = [];

  if (isSundaneseRequested(text)) {
    rules.push("User meminta/ memakai Basa Sunda. Balas nganggo Basa Sunda formal, sopan, henteu kasar, henteu campur Bahasa Indonesia kecuali istilah teknis Discord/bot.");
  } else if (isIndonesianRequested(text)) {
    rules.push("User meminta Bahasa Indonesia. Balas dalam Bahasa Indonesia sopan dan formal-natural, jangan campur Basa Sunda kecuali frasa khas server jika sangat relevan.");
  } else if (style.pronoun === "saya_anda") {
    rules.push("User memakai gaya saya/anda atau formal. Balas lebih sopan, jelas, dan profesional seperti Pak RW yang sedang melayani warga.");
  } else {
    rules.push("Default gunakan Bahasa Indonesia yang hangat, sopan, rapi, dan terasa seperti Pak RW yang ngayomi warga.");
  }

  if (style.casual && !isSundaneseRequested(text)) {
    rules.push("Boleh akrab secukupnya, tetapi tetap sopan seperti Pak RW. Jangan terlalu gaul, jangan kasar, dan jangan mengurangi wibawa.");
  }

  if (style.harsh || style.angry) {
    rules.push("User terdengar kasar atau kesal. Jangan ikut kasar. Tanggapi dengan tenang, tegas, sopan, dan arahkan ke solusi. Pak RW boleh menegur, tetapi tidak menghina.");
  }

  rules.push("Jaga vibes DESA TULUS: perdesaan, rukun, tata krama, dan rasa balai warga. Default tetap Bahasa Indonesia yang mudah dipahami; Basa Sunda hanya jika diminta. Tetap utamakan solusi yang jelas dan aman.");
  return rules.join(" ");
}

function normalizeCacheText(text = "") {
  return cleanText(text).toLowerCase().slice(0, 600);
}

function normalizeAiContext(context = {}) {
  return {
    guildId: cleanText(context.guildId || "global") || "global",
    guildName: cleanText(context.guildName || config.serverName || "DESA TULUS") || "DESA TULUS",
    userId: cleanText(context.userId || "anonymous") || "anonymous",
    displayName: cleanText(context.displayName || context.username || "Warga Desa") || "Warga Desa",
    username: cleanText(context.username || "warga") || "warga",
    channelId: cleanText(context.channelId || ""),
    channelName: cleanText(context.channelName || ""),
    channelDirectory: String(context.channelDirectory || "").slice(0, 2200),
    roleDirectory: String(context.roleDirectory || "").slice(0, 1200),
    isOwner: Boolean(context.isOwner),
    ownerName: cleanText(context.ownerName || config.ownerName || "BEKIW") || "BEKIW"
  };
}

function scopedUserKey(context = {}) {
  const ctx = normalizeAiContext(context);
  return `${ctx.guildId}:${ctx.userId}`;
}

function scrubMemoryText(text = "") {
  return cleanText(text)
    .replace(/(?:mfa\.|[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{20,})/g, "[TOKEN DISEMBUNYIKAN]")
    .replace(/(?:sk-[A-Za-z0-9_-]{16,}|AIza[A-Za-z0-9_-]{20,})/g, "[KUNCI DISEMBUNYIKAN]")
    .slice(0, MAX_MEMORY_TEXT);
}

function getMemoryRoot() {
  const stored = readStore("memory", null);
  const root = stored && typeof stored === "object" ? stored : volatileMemoryRoot;
  if (!root.users || typeof root.users !== "object") root.users = {};
  return root;
}

function getUserMemory(context = {}) {
  if (config.ai?.memoryEnabled === false) return null;
  const ctx = normalizeAiContext(context);
  if (!ctx.userId || ctx.userId === "anonymous") return null;
  const root = getMemoryRoot();
  const entry = root.users[scopedUserKey(ctx)];
  if (!entry || typeof entry !== "object") return null;
  return {
    ...entry,
    recent: Array.isArray(entry.recent) ? entry.recent.slice(-MAX_MEMORY_TURNS) : [],
    topics: Array.isArray(entry.topics) ? entry.topics.slice(-8) : []
  };
}

function inferMemoryTopic(text = "", mode = "normal") {
  const intent = detectPakRwIntent(text, mode);
  const cleaned = scrubMemoryText(text);
  const short = cleaned.length > 90 ? `${cleaned.slice(0, 87)}...` : cleaned;
  return `${intent}: ${short || "percakapan umum"}`;
}

function persistUserTurn(context = {}, userText = "", assistantText = "", mode = "normal") {
  if (config.ai?.memoryEnabled === false) return false;
  const ctx = normalizeAiContext(context);
  if (!ctx.userId || ctx.userId === "anonymous") return false;

  const root = getMemoryRoot();
  const key = scopedUserKey(ctx);
  const previous = root.users[key] || {};
  const now = Date.now();
  const recent = Array.isArray(previous.recent) ? previous.recent.slice(-MAX_MEMORY_TURNS + 2) : [];
  const safeUser = scrubMemoryText(userText);
  const safeAssistant = scrubMemoryText(assistantText);

  if (safeUser) recent.push({ role: "user", content: safeUser, mode, at: now });
  if (safeAssistant) recent.push({ role: "assistant", content: safeAssistant, mode, at: now });

  const topic = inferMemoryTopic(userText, mode);
  const topics = Array.isArray(previous.topics) ? previous.topics.filter(Boolean) : [];
  if (topic && topics[topics.length - 1] !== topic) topics.push(topic);

  root.users[key] = {
    guildId: ctx.guildId,
    userId: ctx.userId,
    displayName: ctx.displayName,
    username: ctx.username,
    lastMode: mode,
    topics: topics.slice(-8),
    recent: recent.slice(-MAX_MEMORY_TURNS),
    updatedAt: now
  };

  const entries = Object.entries(root.users);
  if (entries.length > MAX_MEMORY_USERS) {
    entries
      .sort((a, b) => Number(a[1]?.updatedAt || 0) - Number(b[1]?.updatedAt || 0))
      .slice(0, entries.length - MAX_MEMORY_USERS)
      .forEach(([oldKey]) => delete root.users[oldKey]);
  }

  volatileMemoryRoot = root;
  return writeStore("memory", root) || true;
}

function buildMemoryPrompt(context = {}) {
  const ctx = normalizeAiContext(context);
  const cfg = aiBudgetConfig();
  const memory = getUserMemory(ctx);
  const maxChars = ctx.channelName?.toLowerCase().includes("curhat") ? cfg.curhatMemoryChars : cfg.maxMemoryChars;
  if (!memory || maxChars <= 0) {
    return `Memory: belum ada ringkasan khusus untuk ${ctx.displayName}.`;
  }

  const recent = (memory.recent || []).slice(-Math.max(1, cfg.maxHistoryTurns * 2));
  const lastUser = [...recent].reverse().find((item) => item.role === "user")?.content || "";
  const lastAssistant = [...recent].reverse().find((item) => item.role === "assistant")?.content || "";
  const topics = Array.isArray(memory.topics) ? memory.topics.slice(-2).join(" | ") : "";
  const mood = memory.lastMode === "curhat" ? "sedang curhat" : memory.lastMode === "juragan" ? "butuh bantuan detail" : "bertanya biasa";
  const lines = [
    `Memory warga ini saja: ${ctx.displayName} (${ctx.userId}).`,
    `User mood: ${mood}.`,
    `Last topic: ${truncateText(topics || lastUser || "percakapan umum", 200)}.`,
    lastAssistant ? `Important note: ${truncateText(lastAssistant, 180)}.` : "Important note: belum ada."
  ];
  return truncateText(lines.join("\n"), maxChars);
}

function getAiCacheTtlMs() {
  return Math.max(0, Number(config.ai?.cacheTtlMs || process.env.AI_CACHE_TTL_MS || 120000));
}

function getCachedAiReply(text = "", mode = "normal", context = {}) {
  if (config.ai?.localCacheEnabled === false) return "";
  const ttl = getAiCacheTtlMs();
  if (!ttl) return "";
  const key = `${scopedUserKey(context)}:${mode}:${normalizeCacheText(text)}`;
  const cached = aiResponseCache.get(key);
  if (!cached) return "";
  if (Date.now() - cached.at > ttl) {
    aiResponseCache.delete(key);
    return "";
  }
  return cached.reply || "";
}

function setCachedAiReply(text = "", mode = "normal", reply = "", context = {}) {
  if (config.ai?.localCacheEnabled === false) return;
  const ttl = getAiCacheTtlMs();
  if (!ttl || !reply) return;
  const key = `${scopedUserKey(context)}:${mode}:${normalizeCacheText(text)}`;
  aiResponseCache.set(key, { at: Date.now(), reply: compactReply(reply) });
  const max = Math.max(20, Math.min(Number(config.ai?.cacheMaxEntries || 120), 400));
  while (aiResponseCache.size > max) {
    const first = aiResponseCache.keys().next().value;
    if (!first) break;
    aiResponseCache.delete(first);
  }
}

function localPrefix(text = "") {
  if (isSundaneseRequested(text)) return { me: "Pak RW", you: "anjeun", ok: "Mangga", lang: "su" };
  const style = detectConversationStyle(text);
  if (style.pronoun === "gua_lu") return { me: "Pak RW", you: "nak", ok: "Siap nak", lang: "id" };
  if (style.pronoun === "saya_anda") return { me: "Pak RW", you: "nak", ok: "Baik nak", lang: "id" };
  return { me: "Pak RW", you: "nak", ok: "Siap nak", lang: "id" };
}


function isConflictReport(text = "") {
  const msg = cleanText(text).toLowerCase();
  const conflictSignals = [
    "garelut", "gelut", "ribut", "berantem", "bertengkar", "cekcok", "bermasalah",
    "adu mulut", "berantakan", "rusuh", "rame", "gaduh", "saling ejek", "saling hina", "tawuran"
  ];
  return hasAny(msg, conflictSignals) || (hasAny(msg, ["warga", "member", "orang"]) && hasAny(msg, ["ribut", "gelut", "garelut", "cekcok", "berantem"]));
}

function makeConflictAnswer(userText) {
  const text = cleanText(userText);
  const su = isSundaneseRequested(text);
  if (su) {
    return [
      "Pak RW tangkep, nak. Mun aya warga garelut/ribut, urang tenangkeun heula ulah nambahan panas.",
      "",
      "Léngkah aman:",
      bullet([
        "ulah dibales ku hinaan atawa provokasi",
        "pisahkeun obrolan lamun bisa jeung ajak ka channel anu leuwih tenang",
        "catet saha anu ribut, di channel mana, jeung bukti pesenna",
        "mun geus ngaganggu warga séjén, laporkeun ka staff/owner B E K I W supaya bisa ditangani adil"
      ]),
      "",
      "Kirim detailna: saha jeung ributna di channel mana, supaya Pak RW bisa bantu runtuykeun."
    ].join("\n");
  }

  return [
    "Pak RW paham, nak. Kalau ada warga yang ribut, jangan ikut panas dulu. Kita tenangkan dan urutkan baik-baik.",
    "",
    "Yang perlu dilakukan sekarang:",
    bullet([
      "jangan balas dengan hinaan atau provokasi",
      "cek ributnya terjadi di channel mana",
      "simpan bukti pesan kalau ada yang melewati batas",
      "kalau sudah mengganggu, panggil staff/owner B E K I W agar ditangani adil"
    ]),
    "",
    "Kirim detailnya, nak: siapa yang ribut, di channel mana, dan masalah awalnya apa. Pak RW bantu rapikan alurnya."
  ].join("\n");
}

function detectPakRwIntent(text = "", mode = "normal") {
  const msg = cleanText(text).toLowerCase();
  if (isConflictReport(text)) return "conflict";
  if (isSundaneseRequested(text)) return "sunda";
  if (mode === "curhat" || hasAny(msg, ["curhat", "sedih", "capek", "cape", "kecewa", "takut", "kesel", "pusing", "overthinking", "sendiri", "bingung", "nangis", "marah"])) return "curhat";
  if (hasAny(msg, ["dashboard", "manage", "arcane", "carl", "dyno", "web", "panel", "preview", "ui", "ux", "layout", "mobile", "device"])) return "dashboard";
  if (hasAny(msg, ["embed", "welcome", "placeholder", "tag user", "tag channel", "tag role", "mention", "thumbnail", "image", "footer", "author"])) return "embed";
  if (hasAny(msg, ["level", "poin", "leaderboard", "papan aktif", "top aktif", "motm", "member of the month", "rank", "reset poin"])) return "discord";
  if (hasAny(msg, ["error", "code", "coding", "javascript", "node", "discord.js", "railway", "github", "mongodb", "npm", "syntax", "bug", "fix", "fiks", "crash", "terminal", "deploy", "api", "json", "env", "token"])) return "coding";
  if (hasAny(msg, ["discord", "server", "role", "channel", "permission", "ticket", "bot", "member", "voice", "boost"])) return "discord";
  if (hasAny(msg, ["buat kata", "kata kata", "caption", "pengumuman", "announcement", "ucapan", "teks", "template", "deskripsi", "bio"])) return "writing";
  if (msg.includes("?") || hasAny(msg, ["apa", "kenapa", "gimana", "bagaimana", "tolong", "cara", "bisa", "jelaskan"])) return "question";
  return "normal";
}

function pickPakRwOpener(text = "", mode = "normal") {
  const cfg = config.ai?.pakRwOpeners || {};
  const key = detectPakRwIntent(text, mode);
  const arr = Array.isArray(cfg[key]) && cfg[key].length ? cfg[key] : (Array.isArray(cfg.normal) ? cfg.normal : []);
  if (!arr.length) return mode === "curhat" ? "Ada apa nak? Pak RW dengarkan dulu." : "Pak RW bantu ya nak, kita ambil intinya dulu.";
  const normalized = cleanText(text).toLowerCase();
  let hash = key.length + normalized.length;
  for (let i = 0; i < normalized.length; i++) hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  return arr[hash % arr.length];
}

function isSimpleLocalQuestion(text = "", mode = "normal") {
  if (mode === "curhat") return false;
  const msg = cleanText(text).toLowerCase();
  if (!msg) return true;
  const words = msg.split(/\s+/).filter(Boolean);
  if (words.length <= 4 && isGreetingText(msg)) return true;
  if (words.length <= 8 && hasAny(msg, ["fitur", "help", "bantuan", "command", "perintah", "siapa kamu", "kamu siapa"])) return true;
  return false;
}

function getOwnerName(context = {}) {
  const configured = cleanText(context.ownerName || config.ownerName || "");
  if (!configured || configured.toLowerCase() === "pak rw") return "BEKIW";
  return configured;
}

function needsServerContext(userText = "", mode = "normal") {
  const msg = cleanText(userText).toLowerCase();
  if (mode === "curhat") return false;
  return hasAny(msg, ["channel", "role", "dashboard", "fitur", "command", "server", "welcome", "curhat", "saran", "voting", "panel", "permission", "ktp", "level"]);
}

function filterDirectory(directory = "", userText = "", maxLines = 10) {
  const lines = String(directory || "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
  if (!lines.length) return "";
  const msg = cleanText(userText).toLowerCase();
  const words = msg.split(/\s+/).filter((w) => w.length >= 3).slice(0, 12);
  const matched = lines.filter((line) => words.some((word) => line.toLowerCase().includes(word)));
  return (matched.length ? matched : lines.slice(0, maxLines)).slice(0, maxLines).join("\n");
}

function serverContext(context = {}, userText = "", mode = "normal") {
  const ctx = normalizeAiContext(context);
  if (!needsServerContext(userText, mode)) return "Server context: tidak dikirim karena chat ini tidak butuh daftar server.";
  const channels = filterDirectory(ctx.channelDirectory, userText, 12);
  const roles = filterDirectory(ctx.roleDirectory, userText, 8);
  return truncateText([
    `Server: ${ctx.guildName || config.serverName || "DESA TULUS"}. Owner: ${getOwnerName(ctx)}. Prefix: ${config.prefix || "rw"}.`,
    `Channel sekarang: ${ctx.channelName ? `#${ctx.channelName}` : "tidak diketahui"}${ctx.channelId ? ` (${ctx.channelId})` : ""}.`,
    channels ? `Channel relevan:\n${channels}` : "Channel relevan: belum tersedia; jangan mengarang channel.",
    roles ? `Role relevan:\n${roles}` : "Role relevan: belum tersedia; jangan mengarang role.",
    "Pakai hanya data di atas. Kalau tidak ada, minta owner cek dashboard."
  ].join("\n"), 1800);
}

function makeDiscordAnswer(userText) {
  const text = cleanText(userText);
  const tone = localPrefix(text);
  return [
    pickPakRwOpener(text, "discord"),
    "",
    `Topik ${tone.you}: **${text || "Discord / server / bot"}**`,
    "",
    "**Urutan cek paling aman:**",
    list([
      "Pastikan bot punya permission View Channel, Send Messages, Embed Links, dan Read Message History.",
      "Kalau fitur role tidak jalan, posisi role bot harus lebih tinggi dari role yang mau diatur.",
      "Kalau AI tidak jawab, cek channel AI, Message Content Intent, dan variable AI_KEY di DisCloud.",
      "Kalau tombol/modal error, cek log DisCloud tepat setelah tombol diklik.",
      "Kalau deploy bermasalah, jalankan npm run check dulu sebelum push ulang."
    ]),
    "",
    `Kirim screenshot atau log error kalau ada, nanti ${tone.me} bedah sampai ketemu penyebabnya.`
  ].join("\n");
}

function makeCodingAnswer(userText) {
  const text = cleanText(userText);
  const tone = localPrefix(text);
  return [
    pickPakRwOpener(text, "coding"),
    "",
    `Yang ${tone.you} bahas: **${text || "code / error"}**`,
    "",
    "**Alur debug rapi:**",
    list([
      "Baca error paling atas dan paling bawah di terminal/log.",
      "Cari nama file dan nomor baris yang disebut error.",
      "Cek kurung, kurawal, koma, titik, import/require, dan nama variable.",
      "Kalau Discord bot, cek token, intents, permission, dan event handler.",
      "Kalau DisCloud, cek Variables, Start Command, Build Log, dan Deploy Log."
    ]),
    "",
    `Kirim error lengkapnya, nanti ${tone.me} bantu perbaiki baris demi baris.`
  ].join("\n");
}

function makeHomeworkAnswer(userText) {
  const text = cleanText(userText);
  const tone = localPrefix(text);
  return [
    pickPakRwOpener(text, "question"),
    "",
    `Soal/topik ${tone.you}: **${text || "tugas sekolah"}**`,
    "",
    "**Cara jawabnya:**",
    list([
      "Jelaskan maksud soal dengan bahasa sederhana.",
      "Tulis rumus atau konsep yang dipakai jika ada.",
      "Kerjakan langkah demi langkah supaya gampang dipahami.",
      "Kasih jawaban akhir yang rapi.",
      "Kalau data soalnya kurang, tetap bantu dari bagian yang bisa dikerjakan."
    ])
  ].join("\n");
}

function makeWritingAnswer(userText) {
  const text = cleanText(userText);
  const tone = localPrefix(text);
  return [
    pickPakRwOpener(text, "writing"),
    "",
    `Tema yang ${tone.you} minta: **${text || "teks / pengumuman / caption"}**`,
    "",
    "Biasanya hasilnya bisa dibuat:",
    bullet([
      "versi singkat yang enak dibaca",
      "versi rapi untuk announcement",
      "versi santai untuk chat warga",
      "versi premium kalau untuk embed server"
    ]),
    "",
    `Tulis mau gaya formal, santai, lucu, atau luxury, nanti ${tone.me} susun langsung.`
  ].join("\n");
}

function makeCurhatAnswer(userText) {
  const text = cleanText(userText);
  const msg = text.toLowerCase();
  if (isSundaneseRequested(text)) {
    if (hasAny(msg, ["kangen", "sono", "rindu"])) return "Aduh… sono kitu nya? Pak RW ngadangu heula. Nu paling karasa ayeuna naon?";
    if (hasAny(msg, ["sedih", "cape", "capek", "takut"])) return "Sini heula, Pak RW ngadangu. Sigana keur beurat pisan nya?";
    return "Mangga, Pak RW ngadangu heula. Caritakeun pelan-pelan bagian anu paling karasa.";
  }
  if (hasAny(msg, ["kangen bapak", "kangen ayah", "kangen ibu", "kangen mama", "kangen papa", "rindu bapak", "rindu ayah"])) {
    return "Ya ampun… kangen orang tua tuh rasanya beda, ya. Lagi kepikiran beliau banget sekarang?";
  }
  if (hasAny(msg, ["sedih", "nangis", "pengen nangis"])) return "Aduh, sini dulu. Kayaknya lagi berat banget ya? Cerita pelan-pelan aja, Pak RW dengerin.";
  if (hasAny(msg, ["capek", "cape", "lelah", "muak"])) return "Capek banget ya, nak? Tarik napas dulu bentar. Bagian yang paling bikin penuh di kepala yang mana?";
  if (hasAny(msg, ["marah", "kesel", "emosi"])) return "Wajar kalau kamu kesel. Tarik napas dulu bentar, terus cerita ke Pak RW bagian yang bikin paling panas.";
  if (hasAny(msg, ["bingung", "pusing", "takut", "cemas"])) return "Hmm, coba kita pelan-pelan ya. Yang paling bikin kepikiran bagian mana?";
  return "Pak RW dengerin, nak. Cerita pelan-pelan aja, mulai dari yang paling kerasa dulu.";
}

function makeFeatureAnswer(userText) {
  const tone = localPrefix(userText);
  return [
    `${tone.ok}, Pak RW DESA TULUS sekarang jadi **Pusat Bantuan Warga** buat **${config.serverName || "DESA TULUS"}**.`,
    "",
    "**Alur layanan Pak RW:**",
    "**pilih modul → edit setting → preview → test aman → backup**",
    "",
    bullet([
      "🤖 Tanya Pak RW: AI GPT-5.4 pintar dengan router hemat, memori terpisah per warga, dan jawaban sesuai konteks.",
      "🧩 Embed Builder: gaya Carl-bot, bisa pilih channel tujuan lalu kirim embed.",
      "🔝 Level & Cek Poin: level-up premium, cek poin 1 channel, Safe Test Mode tidak ubah data.",
      "🏆 Top Aktif/MOTM: Top Voice + Top Chat rapi, auto 00.00 WIB, banner manual.",
      "☁️ Curhat, 💡 Kotak Saran, 🏡 Welcome Warga Anyar, 💎 Juragan Desa, 💸 Donatur Desa: semua bernuansa DESA TULUS dengan Bahasa Indonesia yang jelas.",
      "🛠️ Tools: status bot, MongoDB, backup, command test, dan dashboard quick action."
    ]),
    "",
    `Kalau ${tone.you} mau ngatur, buka dashboard → pilih modul → preview → test → backup. Pak RW bantu supaya alurnya rapi seperti balai desa yang tertib.`
  ].join("\n");
}


function isLowDetailChat(text = "") {
  const msg = cleanText(text).toLowerCase();
  if (!msg) return true;
  const words = msg.split(/\s+/).filter(Boolean);
  if (words.length <= 3) return true;
  const vague = ["pa", "pak", "pak rw", "rw", "iya", "iye", "hmm", "lah", "gimana", "kenapa", "kok", "ko", "ini", "itu", "test", "tes"];
  return words.length <= 5 && vague.some((word) => msg === word || msg.startsWith(`${word} `));
}

function naturalQuestionFromText(text = "", mode = "normal") {
  const msg = cleanText(text).toLowerCase();
  if (mode === "curhat") return "Ceritain bagian yang paling kerasa dulu, nak. Pak RW dengerin.";
  if (isConflictReport(msg)) return "Coba sebutin ributnya di channel mana dan siapa yang terlibat, biar Pak RW bisa bantu tenangin.";
  if (hasAny(msg, ["error", "bug", "crash", "gagal", "npm", "railway", "github", "deploy"])) return "Kirim log error paling bawah sama bagian yang merah, nanti Pak RW cek dari situ.";
  if (hasAny(msg, ["channel", "role", "permission", "discord", "bot", "server"])) return "Sebut channel atau fitur yang mau dicek, nanti Pak RW bantu urutkan.";
  if (hasAny(msg, ["dashboard", "panel", "preview", "layout"])) return "Bagian dashboard mana yang berantakan? Kirim nama menunya atau screenshot-nya.";
  return "Ceritain maksudnya sedikit lagi, nak. Pak RW siap bantu dari bagian yang paling penting.";
}

function makeChattyUnknownAnswer(userText = "", mode = "normal") {
  const text = cleanText(userText);
  if (!text || isGreetingText(text)) {
    return "Iya nak, Pak RW di sini. Ada yang mau ditanyain atau mau dibantu apa?";
  }

  if (isLowDetailChat(text)) {
    return naturalQuestionFromText(text, mode);
  }

  return [
    "Pak RW paham maksudnya, nak.",
    naturalQuestionFromText(text, mode)
  ].join("\n");
}

function removeTemplateNoise(reply = "", userText = "", mode = "normal") {
  const text = compactReply(reply);
  if (!text) return makeChattyUnknownAnswer(userText, mode);

  const badSignals = [
    /Pak RW tangkap inti pesannya/i,
    /Pak RW belum dapat detail yang cukup/i,
    /Biar jelas, jawabannya bakal dibuat begini/i,
    /Supaya jawabannya tepat, kirim salah satu dari ini/i,
    /Nanti Pak RW jawab langsung ke solusi, bukan template kosong/i,
    /Pak RW tangkap ini sebagai/i,
    /Pak RW paham nak, ini sedang membahas:/i,
    /Jawaban Juragan akan dibuat lebih premium/i,
    /Topik nak:/i,
    /Yang nak bahas:/i,
    /Soal\/topik nak:/i,
    /Tema yang nak minta:/i
  ];

  if (badSignals.some((rx) => rx.test(text))) {
    return makeChattyUnknownAnswer(userText, mode);
  }

  return text;
}

function contextSummaryLine(userText = "", mode = "normal") {
  const intent = detectPakRwIntent(userText, mode);
  const map = {
    curhat: "Pak RW dengerin dulu ya, nak.",
    conflict: "Kalau ada warga ribut, kita tenangin dulu, jangan ikut panas.",
    coding: "Ini kelihatan seperti masalah teknis. Kita cek dari error dan alurnya.",
    discord: "Ini soal pengaturan server. Kita cek dari channel, role, permission, dan botnya.",
    dashboard: "Ini soal dashboard. Kita rapikan bagian yang bikin bingung.",
    embed: "Ini soal embed. Kita samakan isi, preview, dan hasil Discord-nya.",
    writing: "Bisa, Pak RW bantu susun kalimatnya biar enak dibaca.",
    question: "Pak RW jawab langsung dari intinya ya, nak.",
    sunda: "Mangga, Pak RW bantos ku basa anu sopan.",
    normal: "Pak RW paham, nak."
  };
  return map[intent] || map.normal;
}

function makeDashboardAnswer(userText) {
  const text = cleanText(userText);
  const tone = localPrefix(text);
  return [
    pickPakRwOpener(text, "dashboard"),
    "",
    `Ini soal **dashboard DESA TULUS**: ${text || "atur fitur bot"}`,
    "",
    "**Alur dashboard yang benar:**",
    list([
      "Buka dashboard lalu pilih fitur dari plugin list.",
      "Klik Manage, jangan edit sembarang JSON dulu kalau belum perlu.",
      "Isi channel/role pakai pilihan dropdown agar yang tersimpan tetap ID Discord asli.",
      "Edit embed di form yang sama, cek preview, lalu Simpan.",
      "Pakai tombol test/kirim untuk memastikan hasil Discord sama seperti preview."
    ]),
    "",
    `Kalau tampilannya berantakan di HP, ${tone.me} sarankan pakai mode Spacious dan cek bagian Media/Theme supaya banner tidak terlalu terang.`
  ].join("\n");
}

function makeEmbedAnswer(userText) {
  const text = cleanText(userText);
  return [
    pickPakRwOpener(text, "embed"),
    "",
    "Untuk embed Pak RW, patokannya begini:",
    list([
      "Content = teks biasa di atas embed, cocok untuk mention user/role.",
      "Author, Title, Description, Footer, Thumbnail, dan Image harus diedit dari dashboard agar sinkron.",
      "Pakai placeholder seperti {user}, {memberTulusRole}, {rulesChannel}, {chatWargaChannel}, {ticketChannel}, {memberCount}.",
      "@everyone dan @here tetap diblokir agar tidak spam.",
      "Kalau channel/role belum jadi mention, isi ID asli di dashboard/config dulu."
    ]),
    "",
    "Welcome yang paling aman: judul boleh `Wilujeung Sumping`, tapi isi tetap Bahasa Indonesia jelas supaya semua warga paham."
  ].join("\n");
}

function makeLeaderboardAnswer(userText) {
  const text = cleanText(userText);
  const top = config.topActive || {};
  return [
    pickPakRwOpener(text, "discord"),
    "",
    "Pak RW bedakan dua papan supaya data tidak campur:",
    bullet([
      `Top Aktif Bulanan: post otomatis jam ${top.dailyPostHourWIB ?? 0}.00 WIB dan judul ikut bulan berjalan.`,
      "Papan Aktif Lifetime: total poin dari awal, tidak ikut reset siklus.",
      `MOTM: saat siklus mencapai ${top.pointsThreshold || 100000} poin, role Member Of The Month bisa diberikan lalu poin siklus mulai lagi.`,
      "Lifetime tetap lanjut. Contoh 100.000 + 1 poin berikutnya menjadi 100.001 di Papan Aktif."
    ]),
    "",
    "Channel Papan Aktif sebaiknya terpisah, contoh `🏆│leaderboard-aktif`, lalu isi ID-nya di dashboard Top Aktif."
  ].join("\n");
}

function makeDeployAnswer(userText) {
  const text = cleanText(userText);
  return [
    pickPakRwOpener(text, "coding"),
    "",
    "Untuk deploy Pak RW, alurnya jangan lompat-lompat:",
    list([
      "Lokal: jalankan `npm.cmd install` lalu `npm.cmd run check`.",
      "GitHub: pastikan remote ke `baehaqieqi07-sketch/Pak-Rw.git` dan jangan commit `.env`.",
      "Railway: isi Variables dari dashboard Railway, root directory kosong, branch `main`.",
      "DisCloud free: `RAM=100`, ZIP tanpa `node_modules`, `.git`, `data`, `logs`, `backups`.",
      "MongoDB wajib tampil `MongoDB connected`, jangan puas kalau masih `Local JSON fallback`."
    ]),
    "",
    "Kalau ada error, kirim log paling atas dan paling bawah, nanti Pak RW cek penyebabnya satu-satu."
  ].join("\n");
}

function makeHelpfulAnswer(userText, mode = "normal") {
  const text = cleanText(userText);
  const msg = text.toLowerCase();
  const tone = localPrefix(text);

  if (isConflictReport(text)) return makeConflictAnswer(text);

  if (mode === "juragan") {
    if (isLowDetailChat(text)) return "Siap Juragan. Mau dibantu bagian apa dulu, nak?";
    return makeChattyUnknownAnswer(text, mode);
  }

  if (!msg || isGreetingText(msg)) {
    return "Iya nak, Pak RW di sini. Mau tanya apa?";
  }

  if (hasAny(msg, ["papan aktif", "leaderboard aktif", "top aktif", "motm", "member of the month", "100.000", "100000", "rank", "reset poin"])) return makeLeaderboardAnswer(userText);
  if (hasAny(msg, ["dashboard", "manage", "arcane", "carl", "dyno", "web", "panel", "preview", "ui", "ux", "layout", "mobile", "device"])) return makeDashboardAnswer(userText);
  if (hasAny(msg, ["embed", "welcome", "placeholder", "tag user", "tag channel", "tag role", "mention", "thumbnail", "image", "footer", "author"])) return makeEmbedAnswer(userText);
  if (hasAny(msg, ["railway", "discloud", "github", "mongodb", "mongo", "deploy", "hosting", "repo", "env", "variables", "npm", "token", "push", "zip"])) return makeDeployAnswer(userText);
  if (hasAny(msg, ["fitur", "bot besar", "alur", "update semua", "semua fitur"])) return makeFeatureAnswer(userText);
  if (hasAny(msg, ["owner", "pemilik", "punya siapa"])) return `👑 Owner **${config.serverName || "DESA TULUS"}** adalah **${getOwnerName({})}** 🤍`;
  if (hasAny(msg, ["rules", "rule", "aturan", "peraturan"])) return `📌 Rules server bisa ${tone.you} cek di ${channelMention(config.rulesChannelId, "channel rules")}.`;
  if (hasAny(msg, ["ticket", "bantuan", "lapor", "report", "masalah"])) return `🎫 Kalau butuh bantuan/report, buka ticket di ${channelMention(config.ticketChannelId, "channel ticket")} dan tulis masalahnya dengan jelas.`;
  if (hasAny(msg, ["boost", "juragan", "booster", "sultan"])) return "💎 **Juragan Desa** adalah benefit spesial untuk warga yang mendukung DESA TULUS: role Juragan Desa, ucapan boost, akses chat/voice khusus, bonus poin, dan bantuan Pak RW yang lebih lengkap.";

  if (hasAny(msg, ["discord", "server", "role", "channel", "permission", "embed", "ticket", "bot", "member", "voice", "boost"])) return makeDiscordAnswer(userText);
  if (hasAny(msg, ["error", "code", "coding", "javascript", "node", "discord.js", "railway", "github", "mongodb", "npm", "syntax", "bug", "fix", "fiks", "crash", "terminal", "deploy", "api", "json", "env", "token"])) return makeCodingAnswer(userText);
  if (hasAny(msg, ["tugas", "soal", "pr", "matematika", "math", "ipa", "ips", "sejarah", "bahasa", "inggris", "rumus", "jawab", "fisika", "kimia", "biologi", "ekonomi", "aljabar", "geometri", "cerpen", "puisi"])) return makeHomeworkAnswer(userText);
  if (hasAny(msg, ["buat kata", "kata kata", "caption", "pengumuman", "announcement", "ucapan", "teks", "template", "deskripsi", "bio"])) return makeWritingAnswer(userText);

  return makeChattyUnknownAnswer(text, mode);
}

function localFallback(text = "", mode = "normal") {
  if (mode === "curhat") return makeCurhatAnswer(text);
  return makeHelpfulAnswer(text, mode);
}

function buildSystemPrompt(userText, mode = "normal", context = {}) {
  const ctx = normalizeAiContext(context);
  const ownerName = getOwnerName(ctx);
  const cfg = aiBudgetConfig();
  const systemCap = mode === "curhat" ? cfg.curhatSystemChars : cfg.maxSystemChars;
  const modeRule = mode === "curhat"
    ? "MODE CURHAT KHUSUS: jangan mengubah curhat menjadi tutorial bot. Jawab 1-4 kalimat dulu kecuali user minta solusi panjang."
    : mode === "juragan"
      ? "MODE JURAGAN/DONATUR: boleh lebih detail, tetap hemat token dan langsung ke inti."
      : "MODE WARGA UMUM: bantu sebaik mungkin, ringkas jika chat pendek, runtut jika masalah teknis.";
  const base = [
    `Kamu adalah Pak RW, bot warga DESA TULUS. Owner server adalah ${ownerName}.`,
    `Warga saat ini: ${ctx.displayName} (@${ctx.username}, ID ${ctx.userId}). Panggil warga ini “nak” secara natural.`,
    modeRule,
    "Jawab seperti chat orang asli: jelas, natural, sopan, hangat, tidak kaku, tidak template kosong. Ikuti gaya bahasa user.",
    "Kalau user curhat, dengarkan dulu. Kalau user minta solusi, jawab langsung ke langkah yang bisa dilakukan. Jangan terlalu panjang kecuali diminta.",
    "Jangan mengarang data server. Jangan membocorkan token, API key, atau memory warga lain.",
    languageRule(userText),
    truncateText(styleRule(userText), 420),
    buildMemoryPrompt(ctx),
    serverContext(ctx, userText, mode)
  ];
  return truncateText(base.join("\n"), systemCap);
}

function getApiKey() {
  return process.env.AI_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY || "";
}

function normalizeModelName(value = "", fallback = "") {
  const model = cleanText(value);
  if (!model || LEGACY_MODELS.has(model)) return fallback;
  return model;
}

function getSmartModel() {
  return normalizeModelName(
    config.ai?.smartModel || process.env.OPENROUTER_SMART_MODEL || config.ai?.openRouterModel || process.env.OPENROUTER_MODEL,
    DEFAULT_SMART_MODEL
  );
}

function getEconomyModel() {
  return normalizeModelName(
    config.ai?.economyModel || process.env.OPENROUTER_ECONOMY_MODEL,
    DEFAULT_ECONOMY_MODEL
  );
}

function isComplexRequest(text = "", mode = "normal") {
  const msg = cleanText(text).toLowerCase();
  if (mode === "juragan") return true;
  if (mode === "curhat") return msg.length > 420;
  if (msg.length > 650) return true;
  const complexSignals = [
    "analisis", "audit", "bandingkan", "jelaskan lengkap", "langkah demi langkah", "buatkan full", "dari nol",
    "arsitektur", "database", "mongodb", "railway", "discord.js", "javascript", "typescript", "bug", "error",
    "matematika", "fisika", "kimia", "rumus", "proposal", "strategi", "perencanaan", "refactor", "security"
  ];
  return countSignals(msg, complexSignals) >= 2 || (msg.includes("```")) || msg.split(/\s+/).length > 110;
}

function getFallbackModels() {
  const raw = config.ai?.fallbackModels || process.env.OPENROUTER_FALLBACK_MODELS || [];
  if (Array.isArray(raw)) return raw.map((x) => normalizeModelName(x, "")).filter(Boolean);
  return String(raw).split(",").map((x) => normalizeModelName(x.trim(), "")).filter(Boolean);
}

function getModelQueue(text = "", mode = "normal") {
  const smart = getSmartModel();
  const economy = getEconomyModel();
  const primary = isComplexRequest(text, mode) ? smart : economy;
  const fallbacks = getFallbackModels().filter((model) => model && model !== primary && model !== smart).slice(0, 1);
  return [...new Set([primary, ...fallbacks])].filter(Boolean).slice(0, 2);
}

function getMaxOutputTokens(text = "", mode = "normal") {
  const cfg = aiBudgetConfig();
  if (mode === "curhat") return Math.min(cfg.curhatMaxReplyTokens, cfg.maxReplyTokens);
  const desired = isComplexRequest(text, mode) ? cfg.maxReplyTokens : cfg.safeReplyTokens;
  return Math.max(80, Math.min(desired, cfg.maxReplyTokens));
}

function makeMessagesForPayload(userText, mode, context, budgetMode = "normal") {
  const cfg = aiBudgetConfig();
  const maxUser = budgetMode === "trimmed" ? Math.floor(cfg.maxUserMessageChars * 0.65) : cfg.maxUserMessageChars;
  const safeUser = truncateText(userText, maxUser);
  const system = buildSystemPrompt(safeUser, mode, context);
  return [
    { role: "system", content: system },
    { role: "user", content: safeUser }
  ];
}

function buildRequestPayload(model, userText, mode, context, budgetMode = "normal") {
  const payload = {
    model,
    messages: makeMessagesForPayload(userText, mode, context, budgetMode),
    max_tokens: getMaxOutputTokens(userText, mode)
  };

  if (!String(model).includes("gpt-5.4")) {
    payload.temperature = mode === "curhat" ? 0.62 : mode === "juragan" ? 0.45 : 0.38;
    payload.top_p = 0.9;
    payload.frequency_penalty = 0.08;
    payload.presence_penalty = 0.04;
  }

  return payload;
}

function promptTokenEstimateFromPayload(payload) {
  return estimateTokens(JSON.stringify(payload.messages || []));
}

function trimAiPayloadToBudget(model, userText, mode, context) {
  const cfg = aiBudgetConfig();
  let payload = buildRequestPayload(model, userText, mode, context, "normal");
  let tokens = promptTokenEstimateFromPayload(payload);
  const before = tokens;
  let trimmed = false;

  if (tokens > cfg.tokenBudget || JSON.stringify(payload.messages || []).length > cfg.maxPromptChars) {
    console.log(`AI BUDGET CUT: prompt≈${tokens} > ${cfg.tokenBudget}, trimming memory/history/serverContext`);
    trimmed = true;
    payload = buildRequestPayload(model, truncateText(userText, Math.floor(cfg.maxUserMessageChars * 0.65)), mode, { ...context, channelDirectory: "", roleDirectory: "" }, "trimmed");
    tokens = promptTokenEstimateFromPayload(payload);
  }

  if (tokens <= cfg.tokenBudget && JSON.stringify(payload.messages || []).length <= cfg.maxPromptChars) {
    if (trimmed) console.log(`AI BUDGET SAFE: prompt≈${tokens}/${cfg.tokenBudget}`);
    return { allowed: true, payload, tokens, before, after: tokens, trimmed };
  }

  console.log(`AI BUDGET BLOCKED: prompt≈${tokens} > ${cfg.tokenBudget}, using local fallback, no AI request spent`);
  return { allowed: false, payload, tokens, before, after: tokens, trimmed };
}

async function finalizeReply(userText, mode, context, reply, source = "unknown", options = {}) {
  const finalReply = removeTemplateNoise(reply || localFallback(userText, mode), userText, mode);
  setCachedAiReply(userText, mode, finalReply, context);
  if (options.storeMemory !== false) {
    const assistantForMemory = options.summaryOnly ? truncateText(finalReply, 150) : finalReply;
    persistUserTurn(context, userText, assistantForMemory, mode);
    console.log(`AI PAK RW: jawaban ${source} tersimpan ke memori user ${normalizeAiContext(context).userId}.`);
  } else {
    console.log("AI FALLBACK MEMORY: saved=false / summary_only=true");
  }
  return finalReply;
}

async function callOpenRouter(model, payload, apiKey, userText, mode) {
  return axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    payload,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/baehaqieqi07-sketch/Pak-Rw",
        "X-Title": "Pak RW Smart AI DESA TULUS"
      },
      timeout: isComplexRequest(userText, mode) ? 45000 : 30000
    }
  );
}

async function askAI(text, mode = "normal", context = {}) {
  const originalText = cleanText(text);
  const ctx = normalizeAiContext(context);
  const cfg = aiBudgetConfig();
  const userText = truncateText(originalText, cfg.maxUserMessageChars);
  const apiKey = getApiKey();

  if (!userText) return finalizeReply("halo", mode, ctx, localFallback("halo", mode), "lokal-kosong", { summaryOnly: true });

  if (config.ai?.fastLocalForGreeting !== false && isSimpleLocalQuestion(userText, mode)) {
    console.log("AI HEMAT LIMIT: pertanyaan sederhana dijawab lokal tanpa OpenRouter.");
    return finalizeReply(userText, mode, ctx, localFallback(userText, mode), "lokal-sederhana", { summaryOnly: true });
  }

  const cachedReply = getCachedAiReply(userText, mode, ctx);
  if (cachedReply) {
    console.log(`AI HEMAT LIMIT: cache khusus user ${ctx.userId} dipakai, tidak panggil OpenRouter.`);
    persistUserTurn(ctx, userText, truncateText(cachedReply, 150), mode);
    return cachedReply;
  }

  if (!apiKey) {
    const state = setAiLimitState({ status: "auth_locked", reason: "missing_api_key", lastError: "API key kosong", retryAfterAt: Date.now() + cfg.authRecheckSeconds * 1000, lastCheckedAt: Date.now() });
    return finalizeReply(userText, mode, ctx, localLimitFallback(userText, mode, ctx, "auth_locked", state), "lokal-tanpa-api-key", { storeMemory: false });
  }

  const rate = checkAiUserRate(ctx);
  if (!rate.allowed && !ctx.isOwner) {
    console.log(`AI LOCAL FALLBACK: ${rate.reason}, requestSpent=false, natural=true`);
    return finalizeReply(userText, mode, ctx, localLimitFallback(userText, mode, ctx, rate.reason), `lokal-${rate.reason}`, { storeMemory: false });
  }

  const stateCheck = canAttemptAiFromState(ctx);
  console.log(`AI STATUS: ${stateCheck.state.status}`);
  if (!stateCheck.allowed) {
    console.log(`AI LOCAL FALLBACK: until reset, requestSpent=false, natural=true`);
    return finalizeReply(userText, mode, ctx, localLimitFallback(userText, mode, ctx, stateCheck.state.status, stateCheck.state), `lokal-${stateCheck.state.status}`, { storeMemory: false });
  }

  const oldBudgetReason = shouldUseLocalByBudget();
  if (oldBudgetReason && !ctx.isOwner) {
    console.log(`AI HEMAT LIMIT: pakai fallback lokal (${oldBudgetReason}).`);
    return finalizeReply(userText, mode, ctx, localLimitFallback(userText, mode, ctx, oldBudgetReason), `lokal-${oldBudgetReason}`, { storeMemory: false });
  }

  const queue = getModelQueue(userText, mode);
  console.log(`AI ROUTER: mode=${mode} • user=${ctx.userId} • model=${queue.join(" -> ")} • memory=${getUserMemory(ctx)?.recent?.length || 0} turn.`);

  for (let i = 0; i < queue.length; i++) {
    const model = queue[i];
    let prepared = trimAiPayloadToBudget(model, userText, mode, ctx);
    if (!prepared.allowed) {
      return finalizeReply(userText, mode, ctx, localLimitFallback(userText, mode, ctx, "token_limit"), "lokal-token-budget", { storeMemory: false });
    }

    console.log(`AI BUDGET: prompt≈${prepared.tokens}/${cfg.tokenBudget} tokens • replyMax=${prepared.payload.max_tokens}`);
    markAiRequestUsed();
    markAiUserRate(ctx);

    let tokenRetry = 0;
    let providerRetry = 0;
    while (true) {
      try {
        const res = await callOpenRouter(model, prepared.payload, apiKey, userText, mode);
        const reply = compactReply(res.data?.choices?.[0]?.message?.content);
        if (reply) {
          resetAiLimitState("ai_ok");
          console.log("AI OK: status tetap normal");
          return finalizeReply(userText, mode, ctx, reply, model);
        }
        throw new Error("AI_EMPTY_REPLY");
      } catch (err) {
        const info = classifyAiError(err);
        console.log(`AI ERROR (${model}):`, err.response?.data || err.message || err);

        if (info.type === "token_limit" && tokenRetry < cfg.tokenLimitRetryMax) {
          tokenRetry += 1;
          const before = prepared.tokens;
          prepared = trimAiPayloadToBudget(model, truncateText(userText, Math.floor(cfg.maxUserMessageChars * 0.45)), mode, { ...ctx, channelDirectory: "", roleDirectory: "" });
          console.log(`AI ERROR CLASSIFIED: token_limit`);
          console.log(`AI TOKEN TRIM: before≈${before} after≈${prepared.tokens}`);
          console.log(`AI RETRY: token_limit_retry=${tokenRetry}`);
          if (!prepared.allowed) return finalizeReply(userText, mode, ctx, localLimitFallback(userText, mode, ctx, "token_limit"), "lokal-token-limit", { storeMemory: false });
          continue;
        }

        if (info.type === "provider_error" && providerRetry < cfg.providerRetryMax && i + 1 < queue.length) {
          providerRetry += 1;
          console.log(`AI PROVIDER RETRY: fallback_model=${queue[i + 1]}`);
          break;
        }

        const stateInfo = applyAiErrorState(err, model);
        const state = getAiLimitState();
        if (stateInfo.type === "provider_error" && i + 1 < queue.length) break;
        return finalizeReply(userText, mode, ctx, localLimitFallback(userText, mode, ctx, state.status || stateInfo.type, state), `lokal-${stateInfo.type}`, { storeMemory: cfg.storeLimitFallbackMemory, summaryOnly: true });
      }
    }
  }

  const state = setAiLimitState({ status: "provider_cooldown", reason: "all_models_failed", lastError: "Semua model gagal", retryAfterAt: Date.now() + cfg.providerErrorCooldownSeconds * 1000, failCount: getAiLimitState().failCount + 1 });
  return finalizeReply(userText, mode, ctx, localLimitFallback(userText, mode, ctx, "provider_cooldown", state), "lokal-semua-model-gagal", { storeMemory: false });
}

module.exports = {
  askAI,
  getAiLimitState: summarizeAiLimitStatus,
  resetAiLimitState,
  classifyAiError,
  estimateTokens,
  __test: {
    normalizeAiContext,
    scopedUserKey,
    getUserMemory,
    persistUserTurn,
    buildMemoryPrompt,
    isComplexRequest,
    getModelQueue,
    buildSystemPrompt,
    isSundaneseRequested,
    isGreetingText,
    isConflictReport,
    isLowDetailChat,
    removeTemplateNoise,
    localFallback,
    estimateTokens,
    aiBudgetConfig,
    classifyAiError,
    getAiLimitState: summarizeAiLimitStatus,
    resetAiLimitState,
    trimAiPayloadToBudget,
    localLimitFallback
  }
};
