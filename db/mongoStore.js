const mongoose = require("mongoose");

let initialized = false;
let connected = false;
let DataModel = null;
let MemberSnapshotModel = null;

const cache = new Map();
const pendingSaves = new Map();

const DEFAULTS = {
  level: { users: {} },
  tempRoles: { roles: [] },
  memory: { users: {} },
  ktpWarga: { records: {} }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getMongoUri() {
  return String(
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.MONGO_URL ||
    process.env.DATABASE_URL ||
    ""
  ).trim();
}

function isMongoActive() {
  return Boolean(initialized && connected && DataModel);
}

async function initMongoStore() {
  const uri = getMongoUri();

  if (!uri) {
    initialized = true;
    connected = false;
    console.log("ℹ️ MongoDB belum aktif: isi MONGODB_URI di ENV hosting supaya data tidak reset.");
    return false;
  }

  try {
    mongoose.set("strictQuery", true);

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 12000,
      maxPoolSize: 5
    });

    const DataSchema = new mongoose.Schema({
      key: { type: String, required: true, unique: true, index: true },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
      updatedAt: { type: Date, default: Date.now }
    }, {
      collection: "bekiw_data",
      minimize: false
    });

    const MemberSnapshotSchema = new mongoose.Schema({
      guildId: { type: String, required: true, index: true },
      userId: { type: String, required: true, index: true },
      username: String,
      tag: String,
      displayName: String,
      bot: Boolean,
      roles: [String],
      joinedTimestamp: Number,
      premiumSinceTimestamp: Number,
      avatarURL: String,
      leftAt: Number,
      updatedAt: { type: Date, default: Date.now }
    }, {
      collection: "bekiw_member_snapshots",
      minimize: false
    });

    MemberSnapshotSchema.index({ guildId: 1, userId: 1 }, { unique: true });

    DataModel = mongoose.models.PakRwData || mongoose.model("PakRwData", DataSchema);
    MemberSnapshotModel = mongoose.models.PakRwMemberSnapshot || mongoose.model("PakRwMemberSnapshot", MemberSnapshotSchema);

    for (const [key, fallback] of Object.entries(DEFAULTS)) {
      const doc = await DataModel.findOne({ key }).lean().catch(() => null);
      cache.set(key, clone(doc?.data || fallback));
    }

    initialized = true;
    connected = true;
    console.log("✅ MongoDB connected: data level, donatur, dan snapshot member aman di database.");
    return true;
  } catch (err) {
    initialized = true;
    connected = false;
    console.log("❌ MongoDB connect error:", err?.message || err);
    console.log("ℹ️ Pak RW tetap jalan pakai local JSON fallback, tapi data bisa reset kalau hosting restart tanpa MongoDB.");
    return false;
  }
}

function readStore(key, fallback = null) {
  if (!isMongoActive()) return fallback;
  if (!cache.has(key)) cache.set(key, clone(fallback ?? {}));
  return clone(cache.get(key));
}

function writeStore(key, data) {
  if (!isMongoActive()) return false;

  const safeData = clone(data ?? {});
  cache.set(key, safeData);

  if (pendingSaves.has(key)) clearTimeout(pendingSaves.get(key));

  pendingSaves.set(key, setTimeout(async () => {
    try {
      await DataModel.updateOne(
        { key },
        { $set: { data: clone(cache.get(key)), updatedAt: new Date() } },
        { upsert: true }
      );
    } catch (err) {
      console.log(`MONGO WRITE ERROR (${key}):`, err?.message || err);
    } finally {
      pendingSaves.delete(key);
    }
  }, 400));

  return true;
}

function memberToSnapshot(member, extra = {}) {
  const user = member?.user;

  return {
    guildId: member?.guild?.id || extra.guildId || "",
    userId: member?.id || user?.id || extra.userId || "",
    username: user?.username || extra.username || "",
    tag: user?.tag || extra.tag || "",
    displayName: member?.displayName || user?.globalName || user?.username || extra.displayName || "",
    bot: Boolean(user?.bot),
    roles: member?.roles?.cache
      ? member.roles.cache.filter((role) => role.name !== "@everyone").map((role) => role.id)
      : [],
    joinedTimestamp: member?.joinedTimestamp || 0,
    premiumSinceTimestamp: member?.premiumSinceTimestamp || 0,
    avatarURL: user?.displayAvatarURL?.({ size: 256 }) || "",
    ...extra,
    updatedAt: new Date()
  };
}

async function saveMemberSnapshot(member, extra = {}) {
  if (!isMongoActive() || !MemberSnapshotModel || !member) return false;

  const payload = memberToSnapshot(member, extra);
  if (!payload.guildId || !payload.userId) return false;

  try {
    await MemberSnapshotModel.updateOne(
      { guildId: payload.guildId, userId: payload.userId },
      { $set: payload },
      { upsert: true }
    );
    return true;
  } catch (err) {
    console.log("MONGO MEMBER SNAPSHOT ERROR:", err?.message || err);
    return false;
  }
}

async function markMemberLeft(member) {
  return saveMemberSnapshot(member, { leftAt: Date.now() });
}

async function snapshotGuildMembers(guild) {
  if (!isMongoActive() || !MemberSnapshotModel || !guild) return 0;

  try {
    const members = await guild.members.fetch().catch((err) => {
      console.log("MONGO MEMBER FETCH ERROR:", err?.message || err);
      return null;
    });

    if (!members?.size) return 0;

    const ops = members.map((member) => {
      const payload = memberToSnapshot(member, { leftAt: null });
      return {
        updateOne: {
          filter: { guildId: payload.guildId, userId: payload.userId },
          update: { $set: payload },
          upsert: true
        }
      };
    });

    for (let i = 0; i < ops.length; i += 100) {
      await MemberSnapshotModel.bulkWrite(ops.slice(i, i + 100), { ordered: false });
    }

    console.log(`✅ MongoDB snapshot member tersimpan: ${members.size} member dari ${guild.name}`);
    return members.size;
  } catch (err) {
    console.log("MONGO SNAPSHOT GUILD ERROR:", err?.message || err);
    return 0;
  }
}

async function getMongoStatus(guildId = null) {
  const status = {
    active: isMongoActive(),
    initialized,
    connected,
    uriSet: Boolean(getMongoUri()),
    levelUsers: 0,
    tempRoles: 0,
    memberSnapshots: 0,
    ktpRecords: 0
  };

  try {
    const level = readStore("level", DEFAULTS.level) || DEFAULTS.level;
    const tempRoles = readStore("tempRoles", DEFAULTS.tempRoles) || DEFAULTS.tempRoles;
    const ktpWarga = readStore("ktpWarga", DEFAULTS.ktpWarga) || DEFAULTS.ktpWarga;

    status.levelUsers = Object.values(level.users || {}).filter((u) => !guildId || u.guildId === guildId).length;
    status.tempRoles = (tempRoles.roles || []).filter((r) => !guildId || r.guildId === guildId).length;
    status.ktpRecords = Object.values(ktpWarga.records || {}).filter((r) => !guildId || r.guildId === guildId).length;

    if (isMongoActive() && MemberSnapshotModel) {
      status.memberSnapshots = await MemberSnapshotModel.countDocuments(guildId ? { guildId } : {});
    }
  } catch (err) {
    status.error = err?.message || String(err);
  }

  return status;
}

module.exports = {
  initMongoStore,
  isMongoActive,
  readStore,
  writeStore,
  saveMemberSnapshot,
  markMemberLeft,
  snapshotGuildMembers,
  getMongoStatus
};
