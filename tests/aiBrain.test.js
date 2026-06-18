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

console.log("✅ AI Pak RW tests berhasil: identitas Pak RW, owner BEKIW, panggilan nak, memori terpisah per user, direktori channel, mode curhat, dan router GPT-5.4 lulus.");
