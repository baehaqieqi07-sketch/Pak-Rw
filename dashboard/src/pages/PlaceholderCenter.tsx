import { useMemo, useState } from "react";
import { Copy, Search, Tags } from "lucide-react";
import { Card, CardHeader } from "../components/ui/Card";
import { useDashboard } from "../app/DashboardContext";

const groups = {
  User: [
    ["{user}", "Mention user", "@Warga Baru"], ["{userId}", "ID user", "1515687506639585434"], ["{username}", "Username", "warga_baru"], ["{displayName}", "Nama tampilan", "Warga Baru"], ["{avatar}", "URL avatar", "https://cdn.discordapp.com/..."], ["{joinedAt}", "Tanggal bergabung", "16 Juni 2026"]
  ],
  Server: [
    ["{server}", "Nama server", "DESA TULUS"], ["{serverName}", "Nama server", "DESA TULUS"], ["{memberCount}", "Jumlah warga", "224"], ["{ownerName}", "Nama owner", "Pak RW"], ["{botName}", "Nama bot", "Pak RW"], ["{prefix}", "Prefix publik", "rw"]
  ],
  Role: [
    ["{memberRole}", "Role warga", "@Warga"], ["{memberTulusRole}", "Role Member Tulus", "@Member Tulus"], ["{staffRole}", "Role staff", "@Staff Desa"], ["{adminRole}", "Role admin", "@Admin Desa"], ["{moderatorRole}", "Role moderator", "@Moderator"], ["{motmRole}", "Role MOTM", "@Member Of The Month"], ["{donaturRole}", "Role donatur", "@Donatur Desa"], ["{juraganRole}", "Role juragan", "@Juragan Desa"]
  ],
  Channel: [
    ["{rulesChannel}", "Channel aturan", "#aturan-desa"], ["{chatWargaChannel}", "Channel chat warga", "#chat-warga"], ["{ticketChannel}", "Channel ticket", "#ticket"], ["{aiChannel}", "Channel AI", "#tanya-pak-rw"], ["{curhatChannel}", "Channel curhat", "#ruang-curhat"], ["{anonymousCurhatChannel}", "Channel curhat anonim", "#curhat-anonim"], ["{suggestionChannel}", "Channel saran", "#kotak-saran"], ["{levelChannel}", "Channel level", "#level-warga"], ["{cekPoinChannel}", "Channel cek poin", "#cek-poin"], ["{topActiveChannel}", "Channel top aktif", "#top-aktif"], ["{leaderboardChannel}", "Channel leaderboard", "#leaderboard-aktif"], ["{mabarChannel}", "Channel mabar", "#cari-mabar"], ["{boostPoinChannel}", "Channel boost poin", "#boost-poin"], ["{welcomeChannel}", "Channel welcome", "#chat-warga"]
  ],
  "Level & Poin": [
    ["{level}", "Level aktif", "12"], ["{rank}", "Peringkat", "8"], ["{total}", "Total poin", "18.540"], ["{chat}", "Poin chat", "12.480"], ["{voice}", "Poin voice", "6.060"], ["{lifetimeTotal}", "Poin lifetime", "118.540"], ["{cyclePoints}", "Poin siklus", "18.540"], ["{motmThreshold}", "Target MOTM", "100.000"], ["{nextLevel}", "Level berikutnya", "13"], ["{remainingPoints}", "Sisa poin", "1.460"]
  ],
  Event: [
    ["{eventName}", "Nama event", "Pekan Guyub Warga"], ["{multiplier}", "Multiplier", "1,5x"], ["{duration}", "Durasi", "3 hari"], ["{channels}", "Daftar channel", "#chat-warga"], ["{endsAt}", "Waktu berakhir", "19 Juni 2026"], ["{by}", "Dibuat oleh", "Pak RW"], ["{status}", "Status", "Aktif"]
  ],
  Waktu: [
    ["{month}", "Nama bulan", "Juni"], ["{year}", "Tahun", "2026"], ["{date}", "Tanggal", "16 Juni 2026"], ["{time}", "Jam", "17.10 WIB"], ["{today}", "Hari ini", "Selasa, 16 Juni 2026"], ["{now}", "Waktu lengkap", "16 Juni 2026 17.10 WIB"]
  ]
} as const;

export function PlaceholderCenter() {
  const { notify } = useDashboard();
  const [query, setQuery] = useState("");
  const rows = useMemo(() => Object.entries(groups).map(([group, items]) => ({ group, items: items.filter((item) => item.join(" ").toLowerCase().includes(query.toLowerCase())) })).filter((group) => group.items.length), [query]);
  const copy = async (token: string) => { await navigator.clipboard.writeText(token); notify(`${token} disalin.`); };

  return <div className="page-stack page-enter">
    <section className="feature-header"><div className="feature-header-icon"><Tags size={24} /></div><div className="feature-header-copy"><div className="feature-header-kicker">Content tools</div><h1>Placeholder Center</h1><p>Temukan token, lihat contoh hasil, lalu salin untuk dipakai pada template Discord.</p></div></section>
    <Card><CardHeader title="Cari placeholder" description="Filter berdasarkan token, nama, atau fungsi." /><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari placeholder" /></div></Card>
    {rows.map(({ group, items }) => <Card key={group}><CardHeader title={group} description={`${items.length} placeholder tersedia`} /><div className="placeholder-table">{items.map(([token, name, example]) => <div className="placeholder-row" key={token}><code>{token}</code><div><strong>{name}</strong><small>Contoh: {example}</small></div><button aria-label={`Salin ${token}`} onClick={() => copy(token)}><Copy size={16} />Salin</button></div>)}</div></Card>)}
  </div>;
}
