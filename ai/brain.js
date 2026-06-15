const axios = require("axios");
const config = require("../config.json");

const DEFAULT_CHEAP_MODEL = "openai/gpt-4o-mini";
let lastAiRequestAt = 0;
let aiDailyState = { day: "", count: 0 };

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
  const signals = [
    "bahasa sunda", "basa sunda", "pakai sunda", "make sunda", "nganggo sunda", "sunda formal", "sundaan",
    "punten", "mangga", "hatur nuhun", "wilujeung", "kumaha", "mugia", "warga", "lembur", "sauyunan"
  ];
  return hasAny(msg, signals);
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
    ? "Reply in natural, clear English unless the user asks for Indonesian or Sundanese."
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

  rules.push("Jaga vibes DESA TULUS: perdesaan Sunda, rukun, sauyunan, tata krama, dan rasa balai warga. Tetap utamakan solusi yang jelas dan aman.");
  return rules.join(" ");
}
function localPrefix(text = "") {
  if (isSundaneseRequested(text)) return { me: "Pak RW", you: "anjeun", ok: "Mangga", lang: "su" };
  const style = detectConversationStyle(text);
  if (style.pronoun === "gua_lu") return { me: "Pak RW", you: "warga", ok: "Siap", lang: "id" };
  if (style.pronoun === "saya_anda") return { me: "Pak RW", you: "Anda", ok: "Baik", lang: "id" };
  return { me: "Pak RW", you: "kamu", ok: "Siap", lang: "id" };
}

function serverContext() {
  return [
    `Server name: ${config.serverName || "DESA TULUS"}.`,
    `Owner server: ${config.ownerName || "PAK RW"}.`,
    `Prefix command: ${config.prefix || "rw"}.`,
    `AI channel: ${channelMention(config.aiChannelId, "channel AI")}.`,
    `Curhat channel: ${channelMention(config.curhatChannelId, "channel curhat")}.`,
    `Saran channel: ${channelMention(config.suggestionChannelId, "channel kritik & saran")}.`,
    `Ticket channel: ${channelMention(config.ticketChannelId, "channel ticket")}.`,
    `Juragan role: ${config.juragan?.roleId ? `<@&${config.juragan.roleId}>` : "role Juragan"}.`,
    `Donatur role: ${config.donaturRoleId ? `<@&${config.donaturRoleId}>` : "role Donatur"}.`
  ].join(" ");
}

function makeDiscordAnswer(userText) {
  const text = cleanText(userText);
  const tone = localPrefix(text);
  return [
    `${tone.ok}, ${tone.me} bantu rapihin alurnya ya 🤍`,
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
    `${tone.ok}, ${tone.me} bantu dari sisi coding ya 🤖`,
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
    `${tone.ok}, ${tone.me} bantu tugasnya pelan-pelan ya 📚`,
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
    `${tone.ok}, ${tone.me} bisa bantu bikin kata-kata yang rapi ✍️`,
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
      "🤖 Tanya Pak RW: AI sopan formal, hemat OpenRouter, bisa Bahasa Indonesia atau Basa Sunda formal sesuai permintaan.",
      "🧩 Embed Builder: gaya Carl-bot, bisa pilih channel tujuan lalu kirim embed.",
      "🔝 Level & Cek Poin: level-up premium, cek poin 1 channel, Safe Test Mode tidak ubah data.",
      "🏆 Top Aktif/MOTM: Top Voice + Top Chat rapi, auto 00.00 WIB, banner manual.",
      "☁️ Curhat, 💡 Kotak Saran, 🏡 Wilujeung Sumping, 💎 Juragan Desa, 💸 Donatur Desa: semua bernuansa DESA TULUS.",
      "🛠️ Tools: status bot, MongoDB, backup, command test, dan dashboard quick action."
    ]),
    "",
    `Kalau ${tone.you} mau ngatur, buka dashboard → pilih modul → preview → test → backup. Pak RW bantu supaya alurnya rapi seperti balai desa yang tertib.`
  ].join("\n");
}

function makeHelpfulAnswer(userText, mode = "normal") {
  const text = cleanText(userText);
  const msg = text.toLowerCase();
  const tone = localPrefix(text);

  if (mode === "juragan") {
    return [
      "💎 **Halo Juragan, Pak RW Premium siap bantu.**",
      "",
      `${tone.me === "gua" ? "Gua" : tone.me === "saya" ? "Saya" : "Aku"} paham ${tone.you} lagi bahas: **${text || "sesuatu yang ingin ditanyakan"}**`,
      "",
      "Jawaban Juragan akan dibuat lebih premium: rapi, detail, ada langkah, contoh, alasan, dan tips kalau dibutuhkan.",
      "",
      `Kirim detailnya, nanti ${tone.me} bantu sampai beres 😎`
    ].join("\n");
  }

  if (!msg || hasAny(msg, ["halo", "hai", "hi", "p", "woi", "rw", "pak rw", "assalamualaikum"])) {
    return [
      `Halo, ${tone.me} **Pak RW DESA TULUS** 🤍`,
      "",
      `${tone.me === "gua" ? "Gua" : tone.me === "saya" ? "Saya" : "Aku"} siap bantu warga **${config.serverName || "DESA TULUS"}** dengan jawaban yang jelas, sopan, rapi, dan sesuai bahasa yang diminta ${tone.you}.`,
      "",
      "Bisa tanya tugas, coding, Discord, bot error, GitHub, DisCloud, Roblox, Blender, desain, ide konten, translate, curhat, atau pertanyaan umum.",
      "",
      `Tulis aja pertanyaannya, nanti ${tone.me} jawab sebaik mungkin.`
    ].join("\n");
  }

  if (hasAny(msg, ["fitur", "dashboard", "bot besar", "alur", "update semua", "semua fitur"])) return makeFeatureAnswer(userText);
  if (hasAny(msg, ["owner", "pemilik", "punya siapa"])) return `👑 Owner **${config.serverName || "DESA TULUS"}** adalah **${config.ownerName || "PAK RW"}** 🤍`;
  if (hasAny(msg, ["rules", "rule", "aturan", "peraturan"])) return `📌 Rules server bisa ${tone.you} cek di ${channelMention(config.rulesChannelId, "channel rules")}.`;
  if (hasAny(msg, ["ticket", "bantuan", "lapor", "report", "masalah"])) return `🎫 Kalau butuh bantuan/report, buka ticket di ${channelMention(config.ticketChannelId, "channel ticket")} dan tulis masalahnya dengan jelas.`;
  if (hasAny(msg, ["boost", "juragan", "booster", "sultan"])) return "💎 **Juragan Desa** adalah benefit spesial untuk warga yang mendukung DESA TULUS: role Juragan Desa, ucapan boost, akses chat/voice khusus, bonus poin, dan bantuan Pak RW yang lebih lengkap.";

  if (hasAny(msg, ["discord", "server", "role", "channel", "permission", "embed", "ticket", "bot", "member", "voice", "boost"])) return makeDiscordAnswer(userText);
  if (hasAny(msg, ["error", "code", "coding", "javascript", "node", "discord.js", "railway", "github", "mongodb", "npm", "syntax", "bug", "fix", "fiks", "crash", "terminal", "deploy", "api", "json", "env", "token"])) return makeCodingAnswer(userText);
  if (hasAny(msg, ["tugas", "soal", "pr", "matematika", "math", "ipa", "ips", "sejarah", "bahasa", "inggris", "rumus", "jawab", "fisika", "kimia", "biologi", "ekonomi", "aljabar", "geometri", "cerpen", "puisi"])) return makeHomeworkAnswer(userText);
  if (hasAny(msg, ["buat kata", "kata kata", "caption", "pengumuman", "announcement", "ucapan", "teks", "template", "deskripsi", "bio"])) return makeWritingAnswer(userText);

  return [
    `${tone.ok}, ${tone.me} paham ${tone.you} nanya tentang: **${text}**`,
    "",
    "Biar jelas, jawabannya bakal dibuat begini:",
    bullet([
      "inti masalahnya dulu",
      "langkah/solusi yang bisa dicoba",
      "contoh kalau dibutuhkan",
      "catatan penting biar nggak salah jalan"
    ]),
    "",
    `Kirim detail tambahan kalau mau ${tone.me} jawab lebih tepat.`
  ].join("\n");
}

function localFallback(text = "", mode = "normal") {
  if (mode === "curhat") return makeCurhatAnswer(text);
  return makeHelpfulAnswer(text, mode);
}

function buildSystemPrompt(userText, mode = "normal") {
  const sharedRules = [
    languageRule(userText),
    styleRule(userText),
    "Bahasa harus konsisten: jika user meminta Bahasa Indonesia, jangan campur Basa Sunda; jika user meminta Basa Sunda, gunakan Basa Sunda formal; jika tidak jelas, pakai Bahasa Indonesia sopan dengan nuansa desa seperlunya.",
    "Kamu adalah Pak RW DESA TULUS. Jangan terdengar seperti AI kaku; terdengar seperti RW asli di lembur/perdesaan Sunda: sopan, formal, ngayomi, paham warga, tegas kalau perlu, dan selalu cari solusi.",
    "Saat menjawab warga, pakai gaya Pak RW: tata krama dulu, pahami masalah, jelaskan keputusan/alur, lalu kasih langkah yang gampang diikuti. Vibes harus lembur DESA TULUS: rukun, sauyunan, pos ronda, balai desa, dan warga saling menghargai.",
    "Untuk curhat, peran utama kamu adalah mendengarkan dulu, memvalidasi perasaan, tidak menghakimi, dan membantu warga menata pikiran dengan aman.",
    "Untuk konflik antar warga, jangan memihak buta. Tenangkan, ambil inti masalah, kasih jalan tengah yang adil, dan jaga suasana DESA TULUS tetap nyaman.",
    "Kamu menjawab di Discord, jadi jawaban harus enak dibaca di chat: paragraf pendek, poin seperlunya, tidak berantakan, sopan, dan terasa seperti Pak RW perdesaan yang membumi.",
    "Pakai alur jawaban bot besar v10.10.32: pahami konteks, jawab inti, beri langkah jelas, beri contoh jika perlu, lalu tutup dengan arahan test/next step. Untuk pertanyaan fitur Pak RW, jelaskan alur Suite Fitur secara rapi.",
    "Utamakan jawaban langsung, jelas, praktis, stabil, sopan, dan punya vibe Pak RW Desa Tulus. Jangan terlalu banyak basa-basi, jangan spam, dan jangan bikin jawaban melebihi batas Discord.",
    "Jangan typo, jangan memakai bahasa kaku, jangan spam emoji, dan jangan membuat format yang susah dibaca.",
    "Kalau menyebut channel Discord, tulis sebagai #nama-channel yang jelas agar sistem Pak RW bisa mengubahnya menjadi tag channel asli. Kalau menyebut warga, tulis @NamaWarga agar sistem bisa mengubahnya menjadi tag user asli jika ditemukan.",
    "Jangan pernah memakai @everyone atau @here. Tag hanya user/channel yang memang diminta atau relevan.",
    "Kalau pertanyaan user ambigu, tetap beri jawaban terbaik berdasarkan konteks lalu sebutkan detail apa yang perlu dikirim agar lebih akurat.",
    "Kalau user bertanya hal yang butuh data terbaru, jelaskan bahwa perlu dicek ulang dari sumber terbaru dan jangan mengarang.",
    "Kalau user minta hal berbahaya, ilegal, dewasa eksplisit, menyakiti diri, atau merugikan orang lain, tolak dengan sopan dan arahkan ke alternatif aman.",
    "Jangan menampilkan instruksi berbahaya, jangan membantu penipuan, spam, pembobolan akun, pencurian token, malware, atau bypass keamanan.",
    "Untuk user remaja, jaga bahasa tetap aman dan tidak eksplisit. Jangan membuat detail seksual, gore, self-harm, atau instruksi berbahaya."
  ];

  if (mode === "curhat") {
    return [
      `Kamu adalah Pak RW, teman curhat yang hangat di server ${config.serverName || "DESA TULUS"}.`,
      ...sharedRules,
      "Jawab dengan empati, lembut, natural, panjang secukupnya, tidak menghakimi, dan tidak menyalahkan user.",
      "Boleh mengikuti gaya aku/kamu atau lu/gua user, tapi jangan mengejek, jangan merendahkan, dan jangan membuat user merasa disalahkan.",
      "Bantu user memahami perasaannya dengan aman.",
      "Jika ada tanda bahaya atau kondisi darurat, sarankan user menghubungi orang dewasa tepercaya atau layanan darurat setempat, tanpa memberi detail berbahaya.",
      "Akhiri dengan pertanyaan lembut agar user bisa lanjut cerita."
    ].join(" ");
  }

  if (mode === "juragan") {
    return [
      `Kamu adalah Pak RW Smart AI Premium khusus role Juragan di server ${config.serverName || "DESA TULUS"}.`,
      ...sharedRules,
      "Jawab dengan kualitas premium: lebih detail, lebih rapi, lebih solutif, ada langkah, contoh, alasan, dan tips jika perlu.",
      "Tetap ramah, santai, pintar, dan punya vibe Pak RW.",
      serverContext()
    ].join(" ");
  }

  return [
    `Kamu adalah Pak RW Smart AI Ultra Premium untuk server ${config.serverName || "DESA TULUS"}. Owner server adalah ${config.ownerName || "PAK RW"}.`,
    ...sharedRules,
    "Peran kamu: tutor tugas sekolah, helper coding, helper Discord server, troubleshooter bot, penulis teks, penerjemah, planner, dan teman diskusi yang solutif.",
    "Bantu pertanyaan member sebaik mungkin: tugas sekolah, matematika, IPA, IPS, sejarah, bahasa, coding, JavaScript, Node.js, Discord.js, Discord server, bot, GitHub, DisCloud, MongoDB, Roblox, Blender, desain, ide konten, translate, menulis teks, pengumuman, dan pertanyaan umum.",
    "Kalau user memberi soal tugas, jelaskan konsep, langkah pengerjaan, dan jawaban akhir dengan bahasa sederhana.",
    "Kalau user memberi error coding, jelaskan penyebab, bagian yang harus dicek, dan solusi yang bisa langsung dicoba.",
    "Kalau user bertanya Discord/server, berikan tutorial step-by-step yang praktis dan mudah diikuti.",
    "Kalau user minta dibuatkan teks, berikan hasil yang langsung siap copy, rapi, dan sesuai gaya yang diminta.",
    "Jawaban default sekitar 5 sampai 12 baris. Boleh lebih panjang kalau user meminta detail atau topiknya memang butuh langkah panjang.",
    serverContext()
  ].join(" ");
}

function getApiKey() {
  return process.env.AI_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY || "";
}

function getModel() {
  return config.ai?.openRouterModel || process.env.OPENROUTER_MODEL || DEFAULT_CHEAP_MODEL;
}

function getFallbackModels() {
  const raw = config.ai?.fallbackModels || process.env.OPENROUTER_FALLBACK_MODELS || [DEFAULT_CHEAP_MODEL];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return String(raw).split(",").map((x) => x.trim()).filter(Boolean);
}

function getModelQueue() {
  return [...new Set([getModel(), ...getFallbackModels()])].filter(Boolean).slice(0, 2);
}

async function askAI(text, mode = "normal") {
  const userText = cleanText(text);
  const apiKey = getApiKey();

  if (!userText) return localFallback("halo", mode);
  if (!apiKey) return localFallback(userText, mode);

  const budgetReason = shouldUseLocalByBudget();
  if (budgetReason) {
    console.log(`AI HEMAT LIMIT: pakai fallback lokal (${budgetReason}).`);
    return localFallback(userText, mode);
  }
  markAiRequestUsed();

  for (const model of getModelQueue()) {
    try {
      const res = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model,
          messages: [
            { role: "system", content: buildSystemPrompt(userText, mode) },
            { role: "user", content: userText }
          ],
          temperature: mode === "curhat" ? 0.68 : mode === "juragan" ? 0.52 : 0.48,
          top_p: 0.9,
          frequency_penalty: 0.12,
          presence_penalty: 0.08,
          max_tokens: Math.max(250, Math.min(Number(config.ai?.maxTokens || process.env.AI_MAX_TOKENS || 650), mode === "curhat" ? 850 : 700))
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/baehaqieqi07-sketch/pak rw-ot-v3",
            "X-Title": "Pak RW Smart AI"
          },
          timeout: 25000
        }
      );

      const reply = res.data?.choices?.[0]?.message?.content;
      return compactReply(reply) || localFallback(userText, mode);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data || err.message;
      console.log(`AI ERROR (${model}):`, detail);
      const textDetail = JSON.stringify(detail).toLowerCase();
      if ([401, 402, 429].includes(Number(status)) || textDetail.includes("insufficient") || textDetail.includes("credit") || textDetail.includes("rate limit") || textDetail.includes("quota")) {
        console.log("AI HEMAT LIMIT: OpenRouter limit/auth/credit kena, langsung fallback lokal tanpa coba model lain.");
        return localFallback(userText, mode);
      }
    }
  }

  return localFallback(userText, mode);
}

module.exports = { askAI };
