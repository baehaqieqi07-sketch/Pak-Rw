import {
  Bot, UserPlus, MessageCircleHeart, ShieldQuestion, MessagesSquare, Gamepad2,
  BrainCircuit, Gauge, BarChart3, WalletCards, Trophy, Medal, Crown, BadgeDollarSign,
  Gem, Image, FileText, Radio, Users, TerminalSquare, ShieldCheck, Activity,
  DatabaseBackup, Settings, LayoutDashboard, ChartNoAxesCombined, Megaphone, Tags
} from "lucide-react";

export type FeatureDefinition = {
  slug: string;
  name: string;
  description: string;
  group: string;
  icon: any;
  configPath?: string;
  channelPath?: string;
  rolePath?: string;
  embedKey?: string;
};

export const featureGroups = [
  {
    label: "Ringkasan",
    items: [
      { slug: "home", name: "Dashboard", icon: LayoutDashboard, path: "/" },
      { slug: "activity", name: "Aktivitas", icon: ChartNoAxesCombined, path: "/activity" }
    ]
  },
  {
    label: "Komunitas",
    items: [
      { slug: "welcome", name: "Welcome", icon: UserPlus, path: "/manage/welcome" },
      { slug: "curhat", name: "Curhat", icon: MessageCircleHeart, path: "/manage/curhat" },
      { slug: "curhat-anonim", name: "Curhat Anonim", icon: ShieldQuestion, path: "/manage/curhat-anonim" },
      { slug: "saran", name: "Saran & Voting", icon: MessagesSquare, path: "/manage/saran" },
      { slug: "mabar", name: "Cari Mabar", icon: Gamepad2, path: "/manage/mabar" }
    ]
  },
  {
    label: "Keterlibatan",
    items: [
      { slug: "ai", name: "AI Pak RW", icon: BrainCircuit, path: "/manage/ai" },
      { slug: "boost-poin", name: "Boost Poin", icon: Gauge, path: "/manage/boost-poin" }
    ]
  },
  {
    label: "Level & Aktivitas",
    items: [
      { slug: "level", name: "Level & Poin", icon: BarChart3, path: "/manage/level" },
      { slug: "cek-poin", name: "Cek Poin", icon: WalletCards, path: "/manage/cek-poin" },
      { slug: "top-aktif", name: "Top Aktif", icon: Trophy, path: "/manage/top-aktif" },
      { slug: "papan-aktif", name: "Papan Aktif", icon: Medal, path: "/manage/papan-aktif" },
      { slug: "motm", name: "MOTM", icon: Crown, path: "/manage/motm" }
    ]
  },
  {
    label: "Keanggotaan",
    items: [
      { slug: "donatur", name: "Donatur Desa", icon: BadgeDollarSign, path: "/manage/donatur" },
      { slug: "juragan", name: "Juragan Desa", icon: Gem, path: "/manage/juragan" },
      { slug: "role-manager", name: "Kelola Role", icon: Users, path: "/role-manager" }
    ]
  },
  {
    label: "Konten",
    items: [
      { slug: "embed", name: "Embed Builder", icon: FileText, path: "/manage/embed" },
      { slug: "banner", name: "Kelola Banner", icon: Image, path: "/banner-manager" },
      { slug: "template", name: "Pusat Placeholder", icon: Tags, path: "/placeholder-center" }
    ]
  },
  {
    label: "Administrasi",
    items: [
      { slug: "channel-manager", name: "Kelola Channel", icon: Radio, path: "/channel-manager" },
      { slug: "command-center", name: "Pusat Command", icon: TerminalSquare, path: "/command-center" },
      { slug: "permission-center", name: "Pusat Izin", icon: ShieldCheck, path: "/permission-center" }
    ]
  },
  {
    label: "Sistem",
    items: [
      { slug: "logs", name: "Log & Kesehatan", icon: Activity, path: "/logs" },
      { slug: "backup", name: "Pusat Backup", icon: DatabaseBackup, path: "/backup" },
      { slug: "settings", name: "Pengaturan", icon: Settings, path: "/settings" }
    ]
  }
] as const;

export const features: FeatureDefinition[] = [
  { slug: "ai", name: "AI Pak RW", description: "Percakapan warga, konteks server, cooldown, dan fallback.", group: "Keterlibatan", icon: BrainCircuit, configPath: "ai.enabled", channelPath: "aiChannelId", embedKey: "aiFallback" },
  { slug: "welcome", name: "Welcome Warga", description: "Sambutan warga baru dengan channel, role, dan embed yang sinkron.", group: "Komunitas", icon: UserPlus, configPath: "welcome.enabled", channelPath: "welcome.channelId", rolePath: "welcome.memberTulusRoleId", embedKey: "welcome" },
  { slug: "curhat", name: "Curhat", description: "Panel curhat warga dan alur balasan yang tertata.", group: "Komunitas", icon: MessageCircleHeart, configPath: "curhat.enabled", channelPath: "curhatChannelId", embedKey: "curhatReply" },
  { slug: "curhat-anonim", name: "Curhat Anonim", description: "Kirim curhat tanpa menampilkan identitas warga.", group: "Komunitas", icon: ShieldQuestion, configPath: "anonymousCurhat.enabled", channelPath: "anonymousCurhatChannelId", embedKey: "anonimPanel" },
  { slug: "saran", name: "Saran & Voting", description: "Kotak saran warga dengan voting setuju dan tidak setuju.", group: "Komunitas", icon: MessagesSquare, configPath: "suggestion.enabled", channelPath: "suggestionChannelId", embedKey: "suggestionResult" },
  { slug: "level", name: "Level & Poin", description: "Satu sistem EXP, level maksimal 1000, dan satu role tingkatan aktif.", group: "Level & Aktivitas", icon: BarChart3, configPath: "level.enabled", channelPath: "levelChannelId", rolePath: "levelSystem.roles.1", embedKey: "levelUp" },
  { slug: "cek-poin", name: "Cek Poin", description: "Channel khusus untuk melihat poin dan peringkat warga.", group: "Level & Aktivitas", icon: WalletCards, configPath: "features.cekPoin", channelPath: "cekPoinChannelId", embedKey: "levelProfile" },
  { slug: "top-aktif", name: "Top Aktif Bulanan", description: "Peringkat bulanan dengan jadwal otomatis WIB.", group: "Level & Aktivitas", icon: Trophy, configPath: "topActive.enabled", channelPath: "topActive.channelId", embedKey: "topActiveBoard" },
  { slug: "papan-aktif", name: "Papan Aktif Lifetime", description: "Leaderboard seumur hidup yang tidak ikut reset siklus.", group: "Level & Aktivitas", icon: Medal, configPath: "leaderboardAktif.enabled", channelPath: "leaderboardAktif.channelId", embedKey: "papanAktif" },
  { slug: "motm", name: "Member Of The Month", description: "Role, threshold, banner, dan pengumuman MOTM.", group: "Level & Aktivitas", icon: Crown, configPath: "topActive.announceMemberOfTheMonth", rolePath: "topActive.memberOfTheMonthRoleId", embedKey: "memberOfTheMonth" },
  { slug: "donatur", name: "Donatur Desa", description: "Pengaturan role donatur dan masa aktif benefit.", group: "Keanggotaan", icon: BadgeDollarSign, configPath: "donatur.enabled", rolePath: "donaturRoleId", embedKey: "donatur" },
  { slug: "juragan", name: "Juragan Desa", description: "Benefit juragan, role, dan channel terkait.", group: "Keanggotaan", icon: Gem, configPath: "juragan.enabled", channelPath: "juragan.boostChannelId", rolePath: "juragan.roleId", embedKey: "juragan" },
  { slug: "mabar", name: "Cari Mabar", description: "Panel warga untuk mencari teman bermain.", group: "Komunitas", icon: Gamepad2, configPath: "mabar.enabled", channelPath: "mabar.channelId", embedKey: "cariMabar" },
  { slug: "boost-poin", name: "Boost Poin", description: "Event multiplier poin untuk channel yang dipilih.", group: "Keterlibatan", icon: Gauge, configPath: "boostPoin.enabled", channelPath: "boostPoin.channelId", embedKey: "boostPoinActive" },
  { slug: "embed", name: "Embed Builder", description: "Editor universal untuk seluruh template Discord Pak RW.", group: "Konten", icon: FileText, embedKey: "welcome" },
  { slug: "channel-manager", name: "Kelola Channel", description: "Pilih channel Discord asli berdasarkan nama dan kategori.", group: "Administrasi", icon: Radio },
  { slug: "role-manager", name: "Kelola Role", description: "Pilih role Discord asli dengan nama, warna, dan posisi.", group: "Keanggotaan", icon: Users },
  { slug: "command-center", name: "Pusat Command", description: "Peta command publik Pak RW dan status aksesnya.", group: "Administrasi", icon: TerminalSquare },
  { slug: "permission-center", name: "Pusat Izin", description: "Tinjau akses command dan izin Discord bot.", group: "Administrasi", icon: ShieldCheck },
  { slug: "logs-health", name: "Log & Kesehatan", description: "Status bot, database, uptime, dan layanan dashboard.", group: "Sistem", icon: Activity },
  { slug: "backup-center", name: "Pusat Backup", description: "Informasi backup aman tanpa menyentuh data aktif.", group: "Sistem", icon: DatabaseBackup },
  { slug: "banner", name: "Manual Banner MOTM", description: "Kelola gambar banner untuk MOTM dan leaderboard.", group: "Konten", icon: Image },
  { slug: "announcement", name: "Announcement", description: "Kirim pengumuman terarah ke channel desa.", group: "Konten", icon: Megaphone },
  { slug: "bot", name: "Bot Runtime", description: "Status proses Pak RW dan koneksi Discord.", group: "Sistem", icon: Bot }
];

export function getFeature(slug: string) {
  return features.find((feature) => feature.slug === slug) || features[0];
}
