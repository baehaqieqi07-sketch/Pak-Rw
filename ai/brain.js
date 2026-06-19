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
    channelDirectory: String(context.channelDirectory || "").slice(0, 6500),
    roleDirectory: String(context.roleDirectory || "").slice(0, 2500),
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
  const memory = getUserMemory(ctx);
  if (!memory) {
    return `Belum ada memori percakapan untuk warga ini. Ini percakapan khusus ${ctx.displayName}; jangan memakai atau menebak memori warga lain.`;
  }

  const topics = memory.topics?.length ? memory.topics.join(" | ") : "belum ada topik tersimpan";
  const recent = (memory.recent || [])
    .slice(-6)
    .map((item) => `${item.role === "assistant" ? "Pak RW" : ctx.displayName}: ${scrubMemoryText(item.content)}`)
    .join("\n");

  return [
    `Memori khusus warga ${ctx.displayName} (${ctx.userId}). Memori ini TERPISAH dari warga lain.`,
    `Topik terakhir: ${topics}.`,
    recent ? `Percakapan terakhir:\n${recent}` : "Belum ada percakapan terakhir.",
    "Gunakan memori hanya bila relevan. Jangan mengarang fakta yang tidak pernah disebut warga. Jangan membocorkan memori ini kepada warga lain."
  ].join("\n");
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

function serverContext(context = {}) {
  const ctx = normalizeAiContext(context);
  const top = config.topActive || {};
  const modules = [
    "AI Pak RW", "Welcome Warga", "Curhat", "Curhat Anonim", "Kotak Saran",
    "Level & Cek Poin", "Top Aktif Bulanan", "Papan Aktif Lifetime", "MOTM",
    "Donatur Desa", "Juragan Desa", "Cari Mabar", "Boost Poin", "Embed Manager", "Discord Manager", "KTP Warga", "AFK Voice 24/7"
  ];
  const dynamicChannels = ctx.channelDirectory
    ? `Direktori channel Discord yang dibaca langsung dari server saat ini:
${ctx.channelDirectory}`
    : "Direktori channel dinamis belum tersedia pada request ini; jangan mengarang nama atau ID channel.";
  const dynamicRoles = ctx.roleDirectory
    ? `Role penting yang dibaca langsung dari server:
${ctx.roleDirectory}`
    : "Direktori role dinamis belum tersedia; jangan mengarang role.";

  return [
    `Nama server: ${ctx.guildName || config.serverName || "DESA TULUS"}.`,
    "Nama dan identitasmu adalah Pak RW. Kamu memahami bahwa dirimu adalah bot Pak RW untuk balai warga digital DESA TULUS.",
    `Owner server adalah ${getOwnerName(ctx)}. Jangan menyebut orang lain sebagai owner.`,
    `Warga yang sedang berbicara: ${ctx.displayName} (@${ctx.username}, ID ${ctx.userId}). Panggil dia “nak” secara natural.`,
    `Channel percakapan saat ini: ${ctx.channelName ? `#${ctx.channelName}` : "tidak diketahui"}${ctx.channelId ? ` (${ctx.channelId})` : ""}.`,
    `Prefix command publik: ${config.prefix || "rw"}. Jangan tampilkan prefix lama.`,
    `AI channel utama: ${channelMention(config.aiChannelId, "channel AI")}.`,
    `Curhat channel: ${channelMention(config.curhatChannelId, "channel curhat")}.`,
    `Curhat anonim channel: ${channelMention(config.anonymousCurhatChannelId, "channel curhat anonim")}.`,
    `Saran channel: ${channelMention(config.suggestionChannelId, "channel kritik & saran")}.`,
    `Ticket channel: ${channelMention(config.ticketChannelId, "channel ticket")}.`,
    `Top Aktif bulanan channel: ${channelMention(top.channelId, "channel Top Aktif bulanan")}.`,
    `Papan Aktif lifetime channel: ${channelMention(top.leaderboardActiveChannelId || top.papanAktifChannelId, "channel leaderboard aktif")}.`,
    `MOTM target: ${top.pointsThreshold || 100000} poin siklus; lifetime tidak reset.`,
    `Dashboard modules: ${modules.join(", ")}.`,
    dynamicChannels,
    dynamicRoles,
    "Gunakan hanya channel/role yang ada pada direktori atau config. Jika tidak ditemukan, katakan belum menemukan dan minta owner mengecek dashboard; jangan membuat nama channel palsu.",
    "Alur dashboard: pilih fitur, klik Manage, edit channel/role/embed, preview, simpan, lalu kirim/test."
  ].join(" ");
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
  const tone = localPrefix(text);
  if (tone.lang === "su") {
    return [
      pickPakRwOpener(text, "curhat"),
      "",
      "Mangga, Pak RW ngadangu heula. Anjeun teu kedah buru-buru nyaritakeun sadayana 🤍",
      "",
      "Hatur nuhun parantos percanten nyarios ka Pak RW. Rarasaan anjeun penting, sareng Pak RW moal ngahakiman.",
      "",
      `Di **${config.serverName || "DESA TULUS"}**, Pak RW nangkep inti caritana ngeunaan: **${text || "rarasaan anu keur beurat"}**.`,
      "",
      "Hayu urang runtuykeun lalaunan:",
      bullet([
        "bagian mana anu paling ngabeuratkeun ayeuna?",
        "ieu kakara kajadian atanapi parantos lami kapendem?",
        "ayeuna anjeun langkung peryogi didangukeun heula atanapi hoyong milarian jalan kaluar babarengan?"
      ]),
      "",
      "Caritakeun sakedik-sakedik ogé teu nanaon. Pak RW bakal ngabantosan kalayan tenang sareng sopan."
    ].join("\n");
  }
  return [
    pickPakRwOpener(text, "curhat"),
    "",
    "Pak RW dengarkan dulu ya. Kamu tidak harus cerita semuanya sekaligus 🤍",
    "",
    "Terima kasih sudah percaya buat cerita. Perasaan kamu valid, dan Pak RW tidak akan menghakimi.",
    "",
    `Sebagai Pak RW di **${config.serverName || "DESA TULUS"}**, Pak RW menangkap inti ceritanya tentang: **${text || "perasaan yang sedang berat"}**.`,
    "",
    "Kita urutkan pelan-pelan:",
    bullet([
      "bagian mana yang paling berat sekarang?",
      "ini baru terjadi atau sudah lama dipendam?",
      "sekarang kamu lebih butuh didengarkan dulu atau ingin cari solusi bareng?"
    ]),
    "",
    "Cerita sedikit demi sedikit juga boleh. Pak RW akan bantu dengan tenang, sopan, dan aman."
  ].join("\n");
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
  const identityRules = [
    `IDENTITAS WAJIB: Nama kamu Pak RW. Kamu adalah bot Pak RW milik DESA TULUS, bukan asisten tanpa nama. Owner server adalah ${ownerName}.`,
    `WARGA SAAT INI: ${ctx.displayName} (@${ctx.username}, ID ${ctx.userId}). Panggil warga ini “nak” secara natural. Jangan memanggil dengan nama warga lain.`,
    "Setiap warga memiliki memori sendiri berdasarkan guildId + userId. Jangan pernah mencampur pembahasan, nama, masalah, atau curhat antarwarga.",
    buildMemoryPrompt(ctx)
  ];

  const sharedRules = [
    ...identityRules,
    languageRule(userText),
    styleRule(userText),
    "Bahasa harus konsisten: jika warga meminta Bahasa Indonesia, jangan campur Basa Sunda; jika meminta Basa Sunda, gunakan Basa Sunda formal; jika tidak jelas, pakai Bahasa Indonesia yang sopan dan mudah dipahami.",
    "Baca maksud pesan sebelum menjawab. Bedakan curhat, laporan warga ribut/konflik, pertanyaan umum, tugas, coding, Discord, dashboard, embed, level/top aktif, GitHub/Railway, penulisan, atau percakapan biasa.",
    "Kalau warga melapor ada yang ribut/garelut/berantem, jawab sebagai Pak RW yang menenangkan: jangan ikut panas, minta lokasi channel, minta bukti secukupnya, dan arahkan ke staff/owner bila mengganggu. Jangan jawab dengan template umum.",
    `Panggil warga dengan “nak” secara natural, tetapi jangan mengulang kata nak di setiap kalimat. Pembuka boleh menyesuaikan konteks, misalnya: ${pickPakRwOpener(userText, mode)}`,
    "Terdengar seperti Pak RW asli: hangat, berwibawa, membumi, sabar, adil, tegas bila perlu, dan selalu menjelaskan alur dengan jelas. Jangan terdengar kaku atau mengaku sebagai ChatGPT.",
    "Jawab seperti chat manusia biasa: natural, singkat kalau pesannya singkat, dan langsung nyambung ke kalimat user. Jangan terdengar seperti format prompt atau template bot.",
    "DILARANG memakai kalimat template seperti: 'Pak RW tangkap inti pesannya', 'Pak RW belum dapat detail yang cukup', 'Biar jelas, jawabannya bakal dibuat begini', 'Supaya jawabannya tepat, kirim salah satu dari ini', atau 'Nanti Pak RW jawab langsung ke solusi'.",
    "Jangan selalu membuat heading, daftar panjang, atau format alur kalau user hanya ngobrol singkat. Untuk chat singkat, balas pendek dan natural. Untuk masalah serius, baru beri langkah jelas.",
    "Jawab inti lebih dulu. Setelah itu beri langkah yang runtut, contoh bila perlu, lalu penutup singkat. Jangan bertele-tele, jangan typo, jangan menjawab dengan kalimat kosong atau template yang tidak nyambung.",
    "Boleh membantu pertanyaan umum, belajar, coding, Discord, bot, penulisan, perencanaan, desain, dan diskusi sehari-hari. Untuk fakta yang perlu data terbaru, jangan mengarang; jelaskan bahwa datanya perlu dicek dari sumber terbaru.",
    "Untuk masalah server, gunakan direktori channel/role yang diberikan. Jangan mengarang nama, ID, atau fungsi channel yang tidak tercantum.",
    "Kalau menyebut channel Discord, prioritaskan mention <#ID> dari direktori. Jangan memakai @everyone atau @here.",
    "Untuk konflik warga, jangan memihak buta. Tenangkan keadaan, rangkum inti masalah, tawarkan jalan tengah yang adil, dan jaga privasi.",
    "Jawaban harus nyaman dibaca di Discord: paragraf pendek, heading seperlunya, maksimal beberapa poin penting, tanpa spam emoji.",
    "Jangan membocorkan token, kunci API, data rahasia, atau memori warga lain. Jangan menyimpan atau mengulang rahasia yang terlihat seperti token/kunci.",
    "Tolak dengan sopan permintaan berbahaya, ilegal, eksplisit, penipuan, pencurian akun/token, malware, spam, atau bypass keamanan. Berikan alternatif aman.",
    serverContext(ctx)
  ];

  if (mode === "curhat") {
    return [
      ...sharedRules,
      "MODE CURHAT KHUSUS: fokus mendengarkan isi hati warga. Jangan mengubah curhat menjadi tutorial bot, promosi fitur, atau daftar solusi panjang kecuali warga memang meminta solusi.",
      "Validasi perasaan tanpa menghakimi dan tanpa menganggap diagnosis. Tanyakan satu pertanyaan lembut yang relevan agar warga bisa melanjutkan cerita.",
      "Jangan membandingkan curhat warga ini dengan warga lain. Jangan menyebut isi curhat di channel lain.",
      "Jika ada tanda bahaya atau kondisi darurat, arahkan warga untuk segera menghubungi orang dewasa tepercaya atau layanan darurat setempat dengan bahasa singkat dan aman.",
      "Panjang jawaban curhat biasanya 3 sampai 7 paragraf pendek, hangat, natural, dan tidak berlebihan."
    ].join(" ");
  }

  if (mode === "juragan") {
    return [
      ...sharedRules,
      "MODE JURAGAN/DONATUR: kualitas jawaban lebih mendalam, tetapi tetap hemat token. Berikan penyebab, langkah, contoh, dan pengecekan akhir bila memang dibutuhkan.",
      "Jangan memberi klaim premium kosong. Tetap jawab masalah nyata warga secara langsung."
    ].join(" ");
  }

  return [
    ...sharedRules,
    "MODE WARGA UMUM: bantu sebaik mungkin untuk pertanyaan apa pun yang aman dan masuk akal.",
    "Jika pertanyaan sederhana, jawab ringkas. Jika masalah kompleks, jelaskan tahap demi tahap. Jangan memaksa semua jawaban menjadi panjang.",
    "Jika warga bertanya siapa dirimu, jawab bahwa kamu Pak RW DESA TULUS yang membantu dan mengayomi warga. Jika ditanya owner, jawab BEKIW."
  ].join(" ");
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
  const complex = isComplexRequest(text, mode);
  const primary = complex ? smart : economy;
  const secondary = complex ? economy : smart;
  return [...new Set([primary, secondary, ...getFallbackModels()])].filter(Boolean).slice(0, 2);
}

function getMaxOutputTokens(text = "", mode = "normal") {
  const configured = Number(config.ai?.maxTokens || process.env.AI_MAX_TOKENS || 560);
  const hardCap = mode === "curhat" ? 720 : isComplexRequest(text, mode) ? 780 : 520;
  return Math.max(180, Math.min(configured, hardCap));
}

function buildRequestPayload(model, userText, mode, context) {
  const payload = {
    model,
    messages: [
      { role: "system", content: buildSystemPrompt(userText, mode, context) },
      { role: "user", content: userText }
    ],
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

async function finalizeReply(userText, mode, context, reply, source = "unknown") {
  const finalReply = removeTemplateNoise(reply || localFallback(userText, mode), userText, mode);
  setCachedAiReply(userText, mode, finalReply, context);
  persistUserTurn(context, userText, finalReply, mode);
  console.log(`AI PAK RW: jawaban ${source} tersimpan ke memori user ${normalizeAiContext(context).userId}.`);
  return finalReply;
}

async function askAI(text, mode = "normal", context = {}) {
  const userText = cleanText(text);
  const ctx = normalizeAiContext(context);
  const apiKey = getApiKey();

  if (!userText) return finalizeReply("halo", mode, ctx, localFallback("halo", mode), "lokal-kosong");

  if (config.ai?.fastLocalForGreeting !== false && isSimpleLocalQuestion(userText, mode)) {
    console.log("AI HEMAT LIMIT: pertanyaan sederhana dijawab lokal tanpa OpenRouter.");
    return finalizeReply(userText, mode, ctx, localFallback(userText, mode), "lokal-sederhana");
  }

  const cachedReply = getCachedAiReply(userText, mode, ctx);
  if (cachedReply) {
    console.log(`AI HEMAT LIMIT: cache khusus user ${ctx.userId} dipakai, tidak panggil OpenRouter.`);
    persistUserTurn(ctx, userText, cachedReply, mode);
    return cachedReply;
  }

  if (!apiKey) {
    return finalizeReply(userText, mode, ctx, localFallback(userText, mode), "lokal-tanpa-api-key");
  }

  const budgetReason = shouldUseLocalByBudget();
  if (budgetReason) {
    console.log(`AI HEMAT LIMIT: pakai fallback lokal (${budgetReason}).`);
    return finalizeReply(userText, mode, ctx, localFallback(userText, mode), `lokal-${budgetReason}`);
  }
  markAiRequestUsed();

  const queue = getModelQueue(userText, mode);
  console.log(`AI ROUTER: mode=${mode} • user=${ctx.userId} • model=${queue.join(" -> ")} • memory=${getUserMemory(ctx)?.recent?.length || 0} turn.`);

  for (const model of queue) {
    try {
      const res = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        buildRequestPayload(model, userText, mode, ctx),
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

      const reply = compactReply(res.data?.choices?.[0]?.message?.content);
      if (reply) return finalizeReply(userText, mode, ctx, reply, model);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data || err.message;
      console.log(`AI ERROR (${model}):`, detail);
      const textDetail = JSON.stringify(detail).toLowerCase();
      if ([401, 402, 429].includes(Number(status)) || textDetail.includes("insufficient") || textDetail.includes("credit") || textDetail.includes("rate limit") || textDetail.includes("quota")) {
        console.log("AI HEMAT LIMIT: limit/auth/credit kena, langsung fallback lokal tanpa menghabiskan request lain.");
        return finalizeReply(userText, mode, ctx, localFallback(userText, mode), "lokal-limit");
      }
    }
  }

  return finalizeReply(userText, mode, ctx, localFallback(userText, mode), "lokal-semua-model-gagal");
}

module.exports = {
  askAI,
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
    localFallback
  }
};
