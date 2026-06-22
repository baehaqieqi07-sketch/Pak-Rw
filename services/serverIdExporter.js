const { AttachmentBuilder, ChannelType, EmbedBuilder, PermissionsBitField } = require('discord.js');

const rwIdCooldowns = new Map();
const SECTION = '='.repeat(50);
const TYPE_META = new Map([
  [ChannelType.GuildCategory, ['categories', 'CATEGORY', 'Category']],
  [ChannelType.GuildText, ['text', 'TEXT CHANNEL', 'GuildText']],
  [ChannelType.GuildVoice, ['voice', 'VOICE CHANNEL', 'GuildVoice']],
  [ChannelType.GuildAnnouncement, ['announcement', 'ANNOUNCEMENT CHANNEL', 'GuildAnnouncement']],
  [ChannelType.GuildForum, ['forum', 'FORUM CHANNEL', 'GuildForum']],
  [ChannelType.GuildMedia, ['media', 'MEDIA CHANNEL', 'GuildMedia']],
  [ChannelType.GuildStageVoice, ['stage', 'STAGE CHANNEL', 'GuildStageVoice']]
]);

function safeKey(input, fallback, id, used) {
  let key = String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}_\s-]/gu, '')
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!key) key = `${fallback || 'item'}-${String(id).slice(-6)}`;
  if (used.has(key)) key = `${key}-${String(id).slice(-6)}`;
  used.add(key);
  return key;
}

function yesNo(value) { return value ? 'Ya' : 'Tidak'; }
function trimTopic(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}
function roleTags(role) {
  if (!role?.tags) return '-';
  const values = [];
  if (role.tags.botId) values.push(`botId=${role.tags.botId}`);
  if (role.tags.integrationId) values.push(`integrationId=${role.tags.integrationId}`);
  if (role.tags.subscriptionListingId) values.push(`subscriptionListingId=${role.tags.subscriptionListingId}`);
  if (role.tags.premiumSubscriberRole) values.push('premiumSubscriberRole=true');
  if (role.tags.availableForPurchase) values.push('availableForPurchase=true');
  if (role.tags.guildConnections) values.push('guildConnections=true');
  return values.join(', ') || '-';
}
function channelMeta(channel) {
  return TYPE_META.get(channel.type) || ['other', 'OTHER CHANNEL', `Unknown(${channel.type})`];
}
function sortChannels(channels) {
  const categoryPositions = new Map(channels.filter(c => c.type === ChannelType.GuildCategory).map(c => [c.id, Number(c.rawPosition ?? c.position ?? 0)]));
  return [...channels].sort((a, b) => {
    const ap = a.type === ChannelType.GuildCategory ? Number(a.rawPosition ?? a.position ?? 0) : (a.parentId ? categoryPositions.get(a.parentId) ?? 999999 : 999998);
    const bp = b.type === ChannelType.GuildCategory ? Number(b.rawPosition ?? b.position ?? 0) : (b.parentId ? categoryPositions.get(b.parentId) ?? 999999 : 999998);
    if (ap !== bp) return ap - bp;
    if ((a.parentId || '') !== (b.parentId || '')) return String(a.parentId || '').localeCompare(String(b.parentId || ''));
    return Number(a.rawPosition ?? a.position ?? 0) - Number(b.rawPosition ?? b.position ?? 0);
  });
}
function formatChannel(channel, typeLabel) {
  const parent = channel.parent;
  const rows = [
    `Nama        : ${channel.name || '-'}`,
    `ID          : ${channel.id}`,
    `Kategori    : ${parent?.name || '-'}`,
    `Category ID : ${channel.parentId || '-'}`,
    `Parent ID   : ${channel.parentId || '-'}`,
    `Posisi      : ${Number(channel.rawPosition ?? channel.position ?? 0)}`,
    `Tipe        : ${typeLabel}`
  ];
  if ('nsfw' in channel) rows.push(`NSFW        : ${yesNo(Boolean(channel.nsfw))}`);
  const topic = trimTopic(channel.topic);
  if (topic) rows.push(`Topic       : ${topic}`);
  return rows.join('\n');
}
function formatRole(role, guild) {
  const botId = role.tags?.botId;
  const botName = botId ? guild.members.cache.get(botId)?.user?.tag || botId : '-';
  return [
    `Nama        : ${role.name}`,
    `ID          : ${role.id}`,
    `Posisi      : ${role.position}`,
    `Warna       : ${role.hexColor || '#000000'}`,
    `Managed     : ${yesNo(role.managed)}`,
    `Mentionable : ${yesNo(role.mentionable)}`,
    `Hoist       : ${yesNo(role.hoist)}`,
    `Nama Bot    : ${botName}`,
    `Tags        : ${roleTags(role)}`,
    `Permission  : ${role.permissions?.toArray?.().length || 0}`
  ].join('\n');
}
function indonesiaDate(date) {
  return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}
function indonesiaTime(date) {
  return `${new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(date).replace('.', ':')} WIB`;
}
function fileSlug(name) {
  return String(name || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\s-]/g, '').trim().toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-') || 'server';
}
function getConfig(config) {
  return {
    enabled: true,
    channelId: '',
    channelName: 'rw-id-server',
    cooldownSeconds: 15,
    includeServerId: true,
    includeCategories: true,
    includeTextChannels: true,
    includeVoiceChannels: true,
    includeAnnouncementChannels: true,
    includeForumChannels: true,
    includeMediaChannels: true,
    includeStageChannels: true,
    includeOtherChannels: true,
    includeRoles: true,
    includeManagedRoles: true,
    includeEveryoneRole: true,
    includeJsonFormat: true,
    includeKeyValueFormat: true,
    fileName: '',
    loadingMessage: 'Pak RW sedang mendata seluruh channel, kategori, voice, dan role server...',
    successMessage: 'Data ID server berhasil dibuat.',
    errorMessage: 'Pak RW gagal membuat Data ID Server. Periksa izin bot, channel khusus, dan konfigurasi fitur.',
    allowOwner: true,
    allowAdministrator: true,
    allowManageGuild: true,
    ...(config.serverIdExporter || {})
  };
}
function resolveCommandChannel(guild, cfg) {
  if (cfg.channelId) return guild.channels.cache.get(String(cfg.channelId)) || null;
  const wanted = String(cfg.channelName || 'rw-id-server').toLowerCase().replace(/^[^a-z0-9]+/i, '');
  return guild.channels.cache.find(channel => channel.isTextBased?.() && !channel.isThread?.() && String(channel.name || '').toLowerCase().replace(/^[^a-z0-9]+/i, '') === wanted) || null;
}
function checkUserPermission(message, cfg) {
  const member = message.member;
  if (!member) return false;
  return (cfg.allowOwner !== false && message.author.id === message.guild.ownerId) ||
    (cfg.allowAdministrator !== false && member.permissions.has(PermissionsBitField.Flags.Administrator)) ||
    (cfg.allowManageGuild !== false && member.permissions.has(PermissionsBitField.Flags.ManageGuild));
}
function missingBotPermissions(channel, me) {
  const perms = channel.permissionsFor(me);
  const checks = [
    [PermissionsBitField.Flags.ViewChannel, 'Lihat Channel'],
    [PermissionsBitField.Flags.SendMessages, 'Kirim Pesan'],
    [PermissionsBitField.Flags.AttachFiles, 'Lampirkan File'],
    [PermissionsBitField.Flags.EmbedLinks, 'Sematkan Tautan'],
    [PermissionsBitField.Flags.ReadMessageHistory, 'Baca Riwayat Pesan']
  ];
  return checks.filter(([flag]) => !perms?.has(flag)).map(([, label]) => label);
}
async function temporaryReply(message, content, delay = 8000) {
  const sent = await message.reply({ content, allowedMentions: { repliedUser: false } }).catch(() => null);
  if (sent) setTimeout(() => sent.delete().catch(() => {}), delay).unref?.();
  return sent;
}
function buildPayload(message, config, channels, roles) {
  const cfg = getConfig(config);
  const now = new Date();
  const buckets = { categories: [], text: [], voice: [], announcement: [], forum: [], media: [], stage: [], other: [] };
  sortChannels(channels).forEach(channel => buckets[channelMeta(channel)[0]].push(channel));
  const includedRoles = roles.filter(role => (cfg.includeEveryoneRole || role.id !== message.guild.id) && (cfg.includeManagedRoles || !role.managed)).sort((a,b) => b.position - a.position);
  const counts = Object.fromEntries(Object.entries(buckets).map(([key, value]) => [key, value.length]));
  counts.roles = includedRoles.length;
  counts.totalChannels = channels.length;
  const lines = [SECTION, 'DATA ID SERVER', SECTION, '', `Server Name : ${message.guild.name}`, `Server ID   : ${message.guild.id}`, `Dibuat Oleh : ${message.member?.displayName || message.author.username}`, `User ID     : ${message.author.id}`, `Tanggal     : ${indonesiaDate(now)}`, `Waktu       : ${indonesiaTime(now)}`, '', SECTION, 'RINGKASAN', SECTION, '', `Category             : ${counts.categories}`, `Text Channel         : ${counts.text}`, `Voice Channel        : ${counts.voice}`, `Announcement Channel : ${counts.announcement}`, `Forum Channel        : ${counts.forum}`, `Media Channel        : ${counts.media}`, `Stage Channel        : ${counts.stage}`, `Other Channel        : ${counts.other}`, `Role                  : ${counts.roles}`, `Total Channel         : ${counts.totalChannels}`, '', SECTION, 'SERVER', SECTION, '', `Nama Server : ${message.guild.name}`, `Server ID   : ${message.guild.id}`, `Owner ID    : ${message.guild.ownerId}`, `Member      : ${message.guild.memberCount}`];
  const sectionFlags = { categories: cfg.includeCategories, text: cfg.includeTextChannels, voice: cfg.includeVoiceChannels, announcement: cfg.includeAnnouncementChannels, forum: cfg.includeForumChannels, media: cfg.includeMediaChannels, stage: cfg.includeStageChannels, other: cfg.includeOtherChannels };
  const keyCategories = {}, keyChannels = {}, keyRoles = {}, usedCategory = new Set(), usedChannel = new Set(), usedRole = new Set();
  for (const [key, items] of Object.entries(buckets)) {
    if (!sectionFlags[key]) continue;
    const heading = key === 'categories' ? 'CATEGORY' : channelMeta(items[0] || { type: -1 })[1] || 'OTHER CHANNEL';
    lines.push('', SECTION, heading, SECTION, '');
    if (!items.length) lines.push('Tidak ada data.', '');
    for (const channel of items) {
      const meta = channelMeta(channel);
      lines.push(formatChannel(channel, meta[2]), '');
      const safe = safeKey(channel.name, key === 'categories' ? 'category' : 'channel', channel.id, key === 'categories' ? usedCategory : usedChannel);
      if (key === 'categories') keyCategories[safe] = channel.id; else keyChannels[safe] = channel.id;
    }
  }
  if (cfg.includeRoles) {
    lines.push('', SECTION, 'ROLE', SECTION, '');
    for (const role of includedRoles) {
      lines.push(formatRole(role, message.guild), '');
      const safe = safeKey(role.id === message.guild.id ? 'everyone' : role.name, 'role', role.id, usedRole);
      keyRoles[safe] = role.id;
    }
  }
  if (cfg.includeKeyValueFormat) {
    lines.push('', SECTION, 'FORMAT COPY SERVER', SECTION, '', `serverId=${message.guild.id}`, '', SECTION, 'FORMAT COPY CATEGORY', SECTION, '', ...Object.entries(keyCategories).map(([k,v]) => `${k}=${v}`), '', SECTION, 'FORMAT COPY CHANNEL', SECTION, '', ...Object.entries(keyChannels).map(([k,v]) => `${k}=${v}`), '', SECTION, 'FORMAT COPY ROLE', SECTION, '', ...Object.entries(keyRoles).map(([k,v]) => `${k}=${v}`));
  }
  const json = { serverId: message.guild.id, categories: keyCategories, channels: keyChannels, roles: keyRoles };
  if (cfg.includeJsonFormat) lines.push('', SECTION, 'FORMAT JSON', SECTION, '', JSON.stringify(json, null, 2));
  lines.push('', SECTION, 'CATATAN', SECTION, '', 'Channel privat yang tidak dapat dilihat Pak RW mungkin tidak ikut terdata. Berikan permission View Channel kepada role Pak RW pada category atau channel terkait, lalu jalankan rwid kembali.');
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const fileName = cfg.fileName || `server-ids-${fileSlug(message.guild.name)}-${ymd}.txt`;
  return { content: lines.join('\n'), counts, fileName };
}
async function sendLog(message, config, counts) {
  const logId = String(config.logChannelId || '');
  if (!logId) {
    console.log(`[RW ID] Berhasil guild=${message.guild.id} user=${message.author.id} channel=${message.channel.id} channels=${counts.totalChannels} roles=${counts.roles}`);
    return;
  }
  const channel = message.guild.channels.cache.get(logId) || await message.guild.channels.fetch(logId).catch(() => null);
  if (!channel?.isTextBased?.()) return;
  const embed = new EmbedBuilder().setColor(config.embedColor || '#7DBD77').setTitle('DATA ID SERVER DIBUAT').setDescription([`Pengguna: ${message.author}`, `User ID: ${message.author.id}`, `Server: ${message.guild.name}`, `Channel: ${message.channel}`, `Jumlah Channel: ${counts.totalChannels}`, `Jumlah Role: ${counts.roles}`].join('\n')).setTimestamp();
  await channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
}
async function handleRwIdCommand(message, config) {
  const prefix = String(config.prefix || 'rw').toLowerCase();
  if (String(message.content || '').trim().toLowerCase() !== `${prefix}id`) return false;
  const cfg = getConfig(config);
  if (!message.guild || message.author?.bot) return true;
  if (!cfg.enabled) { await temporaryReply(message, 'Fitur Data ID Server sedang dinonaktifkan.'); return true; }
  if (!checkUserPermission(message, cfg)) { await temporaryReply(message, 'Perintah ini hanya dapat digunakan oleh pemilik server atau pengurus yang memiliki izin Kelola Server.'); return true; }
  await message.guild.channels.fetch().catch(() => null);
  const commandChannel = resolveCommandChannel(message.guild, cfg);
  if (!commandChannel) { await temporaryReply(message, 'Channel khusus Data ID Server belum diatur. Buat channel bernama rw-id-server, lalu pilih channel tersebut melalui dashboard atau masukkan ID-nya ke konfigurasi Pak RW.'); return true; }
  if (message.channel.id !== commandChannel.id) { await temporaryReply(message, `Perintah ini hanya dapat digunakan di channel <#${commandChannel.id}>.`); return true; }
  const cooldownMs = Math.max(1, Number(cfg.cooldownSeconds || 15)) * 1000;
  const key = `${message.guild.id}:${message.author.id}`;
  const remaining = (rwIdCooldowns.get(key) || 0) - Date.now();
  if (remaining > 0) { await temporaryReply(message, `Tunggu ${Math.ceil(remaining / 1000)} detik sebelum menggunakan rwid kembali.`); return true; }
  const me = message.guild.members.me || await message.guild.members.fetchMe().catch(() => null);
  const missing = me ? missingBotPermissions(message.channel, me) : ['Data member bot belum terbaca'];
  if (missing.length) { await temporaryReply(message, `Pak RW belum memiliki izin berikut di channel ini: **${missing.join(', ')}**.`); return true; }
  rwIdCooldowns.set(key, Date.now() + cooldownMs);
  const loading = await message.reply({ content: cfg.loadingMessage, allowedMentions: { repliedUser: false } }).catch(() => null);
  try {
    const fetchedChannels = await message.guild.channels.fetch();
    const fetchedRoles = await message.guild.roles.fetch();
    const channels = [...fetchedChannels.values()].filter(Boolean);
    const roles = [...fetchedRoles.values()].filter(Boolean);
    if (!channels.length || !roles.length) throw new Error('Data channel atau role kosong.');
    const payload = buildPayload(message, config, channels, roles);
    const attachment = new AttachmentBuilder(Buffer.from(payload.content, 'utf8'), { name: payload.fileName });
    await message.channel.send({ files: [attachment] });
    const embed = new EmbedBuilder().setColor(config.embedColor || '#7DBD77').setTitle('DATA ID SERVER BERHASIL DIBUAT').setDescription('Seluruh ID kategori, channel, voice, forum, media, stage, dan role yang dapat diakses Pak RW berhasil dikumpulkan.').addFields(
      { name: 'Server', value: message.guild.name, inline: true },
      { name: 'Category', value: String(payload.counts.categories), inline: true },
      { name: 'Text Channel', value: String(payload.counts.text), inline: true },
      { name: 'Voice Channel', value: String(payload.counts.voice), inline: true },
      { name: 'Announcement', value: String(payload.counts.announcement), inline: true },
      { name: 'Forum', value: String(payload.counts.forum), inline: true },
      { name: 'Media', value: String(payload.counts.media), inline: true },
      { name: 'Stage', value: String(payload.counts.stage), inline: true },
      { name: 'Role', value: String(payload.counts.roles), inline: true }
    ).setFooter({ text: '<a:Desa_Tulus2:1518502350363430932> DESA TULUS | Pak RW' }).setTimestamp();
    if (loading) await loading.edit({ content: cfg.successMessage || '', embeds: [embed] }).catch(() => {}); else await message.channel.send({ embeds: [embed] });
    await sendLog(message, config, payload.counts);
  } catch (error) {
    console.error('[RW ID] Gagal mengambil data server:', { guildId: message.guild.id, userId: message.author.id, channelId: message.channel.id, function: 'handleRwIdCommand', error: error?.message || String(error) });
    if (loading) await loading.edit({ content: cfg.errorMessage }).catch(() => {}); else await temporaryReply(message, cfg.errorMessage);
  }
  return true;
}

module.exports = { handleRwIdCommand, safeKey, sortChannels, buildPayload, getConfig };
