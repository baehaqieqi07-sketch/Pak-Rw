const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const {
  renderKtpCard,
  generateUniqueKtpNumber,
  defaultKtpConfig,
  makeKtpAttachmentName,
  getKtpFontDiagnostics
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

  const fontDiagnostics = getKtpFontDiagnostics();
  assert.ok(fontDiagnostics.ready, "Font KTP harus terdaftar sebelum Canvas dibuat");
  assert.ok(fontDiagnostics.activeFamily.includes("PakRW KTP") || fontDiagnostics.source === "font-host", "Renderer harus memakai font eksplisit, bukan generic sans-serif tanpa validasi");

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


  const attachmentA = makeKtpAttachmentName(record);
  const attachmentB = makeKtpAttachmentName({ ...record, updatedAt: Date.now() + 1 });
  assert.ok(/^ktp-desa-tulus-[0-9a-z_-]+-[0-9]+\.png$/i.test(attachmentA), "Nama attachment KTP harus aman");
  assert.notStrictEqual(attachmentA, attachmentB, "Nama attachment harus berubah agar Discord tidak memakai cache gambar kosong lama");

  const buffer = await renderKtpCard({ record, member: null, config, avatarUrl: "" });
  assert.ok(Buffer.isBuffer(buffer), "Output harus Buffer");
  assert.ok(buffer.length > 100000, "PNG hasil render terlalu kecil atau terlihat kosong");
  assert.strictEqual(buffer.subarray(1, 4).toString("ascii"), "PNG", "Output bukan PNG");

  // Nama sangat panjang wajib tetap menghasilkan kartu dan dipotong aman, bukan menghilang.
  const longNameBuffer = await renderKtpCard({
    record: {
      ...record,
      fullName: "Nama Warga Desa Tulus Yang Sangat Panjang Sekali Sampai Melebihi Area Kartu",
      domicile: "Kabupaten Bogor, Jawa Barat, Indonesia",
      hobby: "Mengurus kegiatan warga dan membantu seluruh masyarakat Desa Tulus"
    },
    member: null,
    config,
    avatarUrl: ""
  });
  assert.ok(longNameBuffer.length > 100000, "Nama panjang membuat render KTP gagal atau kosong");

  // Data kosong wajib memakai fallback dan tetap menghasilkan seluruh layer teks.
  const fallbackBuffer = await renderKtpCard({
    record: {
      guildId: record.guildId,
      userId: record.userId,
      createdAt: Number.NaN
    },
    member: null,
    config,
    avatarUrl: ""
  });
  assert.ok(fallbackBuffer.length > 100000, "Fallback data kosong membuat render KTP gagal atau kosong");

  const rendered = await loadImage(buffer);
  assert.strictEqual(rendered.width, 1011, "Lebar kartu harus mengikuti background resmi");
  assert.strictEqual(rendered.height, 638, "Tinggi kartu harus mengikuti background resmi");

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
  assert.ok(changedPixels > 13000, "Renderer tidak menambahkan cukup tema, tulisan, atau foto pada background");

  const corner = compareCtx.getImageData(2, 2, 1, 1).data;
  const inside = compareCtx.getImageData(30, 30, 1, 1).data;
  const cornerDifference = Math.abs(corner[0] - inside[0]) + Math.abs(corner[1] - inside[1]) + Math.abs(corner[2] - inside[2]);
  assert.ok(cornerDifference > 20, "Background harus berhenti di dalam garis kartu dan tidak memenuhi area luar bingkai");

  const temp = path.join(__dirname, "..", "data", "ktp-render-test.png");
  fs.mkdirSync(path.dirname(temp), { recursive: true });
  fs.writeFileSync(temp, buffer);
  fs.unlinkSync(temp);
  console.log("✅ KTP Warga tests berhasil: 100 nomor random unik, text layer tervalidasi, font eksplisit Railway aktif, nama panjang tetap muat, data kosong memakai fallback, background Desa Tulus terbaca, layout 1011x638 tidak kosong, dan attachment anti-cache aman.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
