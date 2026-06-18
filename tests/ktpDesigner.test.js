"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("@napi-rs/canvas");
const { defaultKtpConfig, defaultKtpDesign, mergeKtpDesign, renderKtpCard } = require("../services/ktpWarga");

(async () => {
  const base = defaultKtpDesign();
  assert.strictEqual(base.title.x, 506);
  assert.ok(Array.isArray(base.decorations));
  const merged = mergeKtpDesign({ title: { x: 430, color: "#112233" }, photo: { width: 180 }, decorations: [{ id: "test", path: "assets/ktp-uploads/test-decoration.png", x: 20, y: 20, width: 40, height: 40, opacity: .4, rotation: 15, visible: true }] });
  assert.strictEqual(merged.title.x, 430);
  assert.strictEqual(merged.title.y, base.title.y, "Merge desain tidak boleh menghapus nilai default lain");
  assert.strictEqual(merged.photo.width, 180);
  assert.strictEqual(merged.decorations.length, 1);

  const uploadDir = path.join(__dirname, "..", "assets", "ktp-uploads");
  fs.mkdirSync(uploadDir, { recursive: true });
  const decoPath = path.join(uploadDir, "test-decoration.png");
  const deco = createCanvas(40, 40);
  const dctx = deco.getContext("2d");
  dctx.fillStyle = "#ffffff";
  dctx.fillRect(0, 0, 40, 40);
  fs.writeFileSync(decoPath, deco.toBuffer("image/png"));

  const cfg = defaultKtpConfig();
  cfg.design = merged;
  const buffer = await renderKtpCard({
    record: { guildId: "1", userId: "2", ktpNumber: "321234567890123456", fullName: "Bekiw", gender: "Laki-laki", domicile: "Bogor", religion: "Islam", hobby: "Mengurus warga", createdAt: Date.now() },
    member: null,
    config: { ktpSystem: cfg },
    avatarUrl: ""
  });
  assert.ok(buffer.length > 100000, "Desain custom dashboard harus tetap menghasilkan PNG KTP valid");
  fs.unlinkSync(decoPath);
  console.log("✅ KTP Design Studio tests berhasil: merge config aman, dekorasi image, koordinat manual, dan renderer custom lulus.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
