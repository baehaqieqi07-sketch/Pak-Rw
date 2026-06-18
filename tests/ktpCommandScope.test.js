const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "services", "ktpWarga.js"), "utf8");

const commandStart = source.indexOf("async function handleKtpMessageCommand");
const interactionStart = source.indexOf("async function handleKtpInteraction", commandStart);
assert.ok(commandStart >= 0 && interactionStart > commandStart, "Handler command KTP tidak ditemukan");
const commandSource = source.slice(commandStart, interactionStart);

assert.match(commandSource, /if \(isPanel\)[\s\S]*message\.channel\.id !== targetChannel\.id/, "Pembatasan channel wajib hanya diterapkan pada panel");
assert.match(commandSource, /rwktp dapat digunakan di semua text channel/, "Command rwktp harus ditandai dapat dipakai di semua channel");
assert.match(commandSource, /missingBotPermissions\(message\.channel, message\.guild\)/, "Permission rwktp harus diperiksa pada channel tempat command dipakai");
assert.doesNotMatch(commandSource.slice(commandSource.indexOf("// rwktp dapat digunakan")), /message\.channel\.id !== targetChannel\.id/, "Command rwktp tidak boleh dibatasi ke channel panel");
assert.match(commandSource, /melihat ulang KTP/, "Pemanggilan ulang rwktp harus mengirim ulang kartu");

const publishStart = source.indexOf("async function publishKtpCard");
const panelStart = source.indexOf("async function sendKtpPanel", publishStart);
const publishSource = source.slice(publishStart, panelStart);
assert.match(publishSource, /return targetChannel\.send\(/, "Pembuatan ulang harus selalu mengirim pesan KTP baru");
assert.doesNotMatch(publishSource, /oldMessage\.edit|messages\.fetch\(record\.messageId\)/, "KTP lama tidak boleh diedit saat user membuat lagi");

const buttonBlock = source.slice(source.indexOf("if (isKtpButton)"), source.indexOf("const remaining", source.indexOf("if (isKtpButton)")));
assert.doesNotMatch(buttonBlock, /allowUpdate === false/, "User yang sudah punya KTP tetap harus boleh membuat ulang");

console.log("✅ KTP command scope tests berhasil: rwktp bebas channel, panel tetap khusus, dan pembuatan ulang selalu mengirim kartu baru.");
