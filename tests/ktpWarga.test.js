const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const {
  renderKtpCard,
  generateUniqueKtpNumber,
  defaultKtpConfig
} = require("../services/ktpWarga");

(async () => {
  const store = { records: {} };
  const generated = new Set();

  for (let index = 0; index < 100; index += 1) {
    const number = generateUniqueKtpNumber(store, "1504495052217651343");
    assert.strictEqual(number.length, 18, "Nomor KTP Desa harus 18 digit");
    assert.ok(/^32\d{16}$/.test(number), "Nomor KTP Desa harus numerik dan memakai prefix 32");
    assert.ok(!generated.has(number), "Nomor KTP Desa tidak boleh duplikat");
    generated.add(number);
    store.records[`user-${index}`] = {
      guildId: "1504495052217651343",
      userId: `user-${index}`,
      ktpNumber: number
    };
  }

  const config = { ktpSystem: defaultKtpConfig(), embedColor: "#7DBD77" };
  const record = {
    guildId: "1504495052217651343",
    userId: "1450656951385067591",
    ktpNumber: generateUniqueKtpNumber(store, "1504495052217651343"),
    ktpNumberVersion: 2,
    fullName: "Bekiw!",
    gender: "Laki-laki",
    domicile: "Bogor, Jawa Barat",
    religion: "Islam",
    hobby: "Mengurus DESA TULUS",
    createdAt: Date.now()
  };

  const buffer = await renderKtpCard({ record, member: null, config, avatarUrl: "" });
  assert.ok(Buffer.isBuffer(buffer), "Output harus Buffer");
  assert.ok(buffer.length > 100000, "PNG hasil render terlalu kecil atau terlihat kosong");
  assert.strictEqual(buffer.subarray(1, 4).toString("ascii"), "PNG", "Output bukan PNG");

  const rendered = await loadImage(buffer);
  assert.strictEqual(rendered.width, 1011, "Lebar kartu harus sama dengan background baru");
  assert.strictEqual(rendered.height, 638, "Tinggi kartu harus sama dengan background baru");

  const backgroundPath = path.join(__dirname, "..", "assets", "ktp-desa-tulus-background.png");
  const background = await loadImage(backgroundPath);
  const compareCanvas = createCanvas(1011, 638);
  const compareCtx = compareCanvas.getContext("2d");
  compareCtx.drawImage(background, 0, 0, 1011, 638);
  const basePixels = compareCtx.getImageData(0, 0, 1011, 638).data;
  compareCtx.clearRect(0, 0, 1011, 638);
  compareCtx.drawImage(rendered, 0, 0, 1011, 638);
  const renderedPixels = compareCtx.getImageData(0, 0, 1011, 638).data;

  let changedPixels = 0;
  for (let index = 0; index < basePixels.length; index += 16) {
    const difference = Math.abs(basePixels[index] - renderedPixels[index]) +
      Math.abs(basePixels[index + 1] - renderedPixels[index + 1]) +
      Math.abs(basePixels[index + 2] - renderedPixels[index + 2]);
    if (difference > 45) changedPixels += 1;
  }
  assert.ok(changedPixels > 15000, "Renderer tidak menambahkan cukup panel, tulisan, atau foto pada background");

  const temp = path.join(__dirname, "..", "data", "ktp-render-test.png");
  fs.mkdirSync(path.dirname(temp), { recursive: true });
  fs.writeFileSync(temp, buffer);
  fs.unlinkSync(temp);
  console.log("✅ KTP Warga tests berhasil: 100 nomor random unik, background baru terbaca, kartu tidak kosong, PNG rapi berhasil dirender.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
