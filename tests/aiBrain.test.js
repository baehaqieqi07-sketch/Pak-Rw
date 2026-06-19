const assert = require("node:assert/strict");
const { __test } = require("../ai/brain");

const userA = {
  guildId: "guild-desa-tulus",
  guildName: "DESA TULUS",
  userId: "user-a",
  displayName: "Asep",
  username: "asep",
  channelId: "channel-ai",
  channelName: "nanya-pak-rw",
  channelDirectory: "<#111> • nanya-pak-rw • text • kategori: BALAI WARGA\n<#222> • curhat-warga • text • kategori: RUANG WARGA",
  roleDirectory: "<@&333> • Warga Tetap",
  ownerName: "BEKIW"
};

const userB = {
  ...userA,
  userId: "user-b",
  displayName: "Dede",
  username: "dede"
};

assert.notEqual(__test.scopedUserKey(userA), __test.scopedUserKey(userB));

__test.persistUserTurn(userA, "Pak RW, aku sedang belajar JavaScript", "Baik nak, kita mulai dari dasar JavaScript.", "normal");
__test.persistUserTurn(userB, "Pak RW, aku mau membahas desain banner", "Siap nak, kita rapikan konsep bannernya.", "normal");

const memoryA = __test.buildMemoryPrompt(userA);
const memoryB = __test.buildMemoryPrompt(userB);

assert.match(memoryA, /JavaScript/i);
assert.doesNotMatch(memoryA, /desain banner/i);
assert.match(memoryB, /desain banner/i);
assert.doesNotMatch(memoryB, /belajar JavaScript/i);

const simpleQueue = __test.getModelQueue("halo pak rw", "normal");
assert.equal(simpleQueue[0], "openai/gpt-5.4-mini");

const complexQueue = __test.getModelQueue(
  "Tolong audit arsitektur database MongoDB dan refactor bug Discord.js langkah demi langkah dari nol",
  "normal"
);
assert.equal(complexQueue[0], "openai/gpt-5.4");

const prompt = __test.buildSystemPrompt("channel curhat ada di mana?", "normal", userA);
assert.match(prompt, /Nama kamu Pak RW/i);
assert.match(prompt, /Owner server adalah BEKIW/i);
assert.match(prompt, /Panggil warga ini “nak”/i);
assert.match(prompt, /<#222>/);
assert.match(prompt, /TERPISAH dari warga lain/i);

const curhatPrompt = __test.buildSystemPrompt("aku lagi sedih", "curhat", userA);
assert.match(curhatPrompt, /MODE CURHAT KHUSUS/i);
assert.match(curhatPrompt, /Jangan mengubah curhat menjadi tutorial bot/i);

assert.equal(__test.isSundaneseRequested("iye aya warga garelut"), false);
assert.equal(__test.isConflictReport("iye aya warga garelut"), true);
const conflictReply = __test.localFallback("iye aya warga garelut", "normal");
assert.match(conflictReply, /ribut|garelut|berantem/i);
assert.match(conflictReply, /jangan ikut panas|ulah/i);
assert.match(conflictReply, /channel/i);
assert.doesNotMatch(conflictReply, /Biar jelas, jawabannya bakal dibuat begini/i);
assert.doesNotMatch(conflictReply, /Basa Sunda formal/i);

assert.equal(__test.isGreetingText("pak rw ada warga ribut"), false);
assert.equal(__test.isConflictReport("pak rw ada warga ribut"), true);

const vagueReply = __test.localFallback("pa", "normal");
assert.match(vagueReply, /Pak RW di sini|Mau tanya apa/i);
assert.doesNotMatch(vagueReply, /Pak RW belum dapat detail/i);
assert.doesNotMatch(vagueReply, /Supaya jawabannya tepat/i);

const unknownReply = __test.localFallback("hmm", "normal");
assert.doesNotMatch(unknownReply, /Biar jelas, jawabannya bakal dibuat begini/i);
assert.doesNotMatch(unknownReply, /Pak RW tangkap inti pesannya/i);
assert.ok(unknownReply.length < 180, `jawaban chat singkat terlalu panjang: ${unknownReply}`);

const sanitized = __test.removeTemplateNoise(
  "Siap nak, kita bereskan pelan-pelan biar jelas.\n\nPak RW tangkap inti pesannya dan akan jawab langsung ke kebutuhan utamanya.\n\nPak RW belum dapat detail yang cukup untuk menjawab sampai tuntas, nak.",
  "pa",
  "normal"
);
assert.doesNotMatch(sanitized, /Pak RW tangkap inti pesannya/i);
assert.doesNotMatch(sanitized, /belum dapat detail/i);
assert.match(sanitized, /Pak RW di sini|Mau tanya apa/i);

console.log("✅ AI Pak RW tests berhasil: identitas, memori per user, router, konflik, dan gaya chat natural tanpa template kosong lulus.");
