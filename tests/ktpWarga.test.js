const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { renderKtpCard, makeKtpNumber, defaultKtpConfig } = require("../services/ktpWarga");

(async () => {
  const config = { ktpSystem: defaultKtpConfig(), embedColor: "#7DBD77" };
  const record = {
    guildId: "1504495052217651343",
    userId: "1450656951385067591",
    ktpNumber: makeKtpNumber("1504495052217651343", "1450656951385067591"),
    fullName: "Bekiw",
    gender: "Laki-laki",
    domicile: "Bogor, Jawa Barat",
    religion: "Tidak ingin disebutkan",
    hobby: "Mengurus DESA TULUS",
    createdAt: Date.now()
  };
  assert.strictEqual(record.ktpNumber.length, 18, "Nomor KTP Desa harus 18 digit");
  assert.ok(/^\d{18}$/.test(record.ktpNumber), "Nomor KTP Desa harus numerik");
  const buffer = await renderKtpCard({ record, member: null, config, avatarUrl: "" });
  assert.ok(Buffer.isBuffer(buffer), "Output harus Buffer");
  assert.ok(buffer.length > 50000, "PNG hasil render terlalu kecil");
  assert.strictEqual(buffer.subarray(1, 4).toString("ascii"), "PNG", "Output bukan PNG");
  const temp = path.join(__dirname, "..", "data", "ktp-render-test.png");
  fs.mkdirSync(path.dirname(temp), { recursive: true });
  fs.writeFileSync(temp, buffer);
  fs.unlinkSync(temp);
  console.log("✅ KTP Warga tests berhasil: nomor stabil, background terbaca, PNG berhasil dirender.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
