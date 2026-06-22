import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, ArrowRight, Bot, BrainCircuit, CheckCircle2, Database,
  FileText, Gauge, Search, Server, Settings2, ShieldCheck, UserPlus, Users
} from "lucide-react";
import type { BootstrapData } from "../app/types";
import { Card, CardHeader } from "../components/ui/Card";
import { features } from "../lib/features";

function formatUptime(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const quickActions = [
  { to: "/manage/welcome", label: "Welcome", helper: "Pesan & role", icon: UserPlus },
  { to: "/manage/ai", label: "AI Pak RW", helper: "Model & channel", icon: BrainCircuit },
  { to: "/manage/embed", label: "Embed Builder", helper: "Buat & preview", icon: FileText },
  { to: "/channel-manager", label: "Discord", helper: "Sinkronkan target", icon: Server }
];

const GROUPS = ["Semua", "Komunitas", "Keterlibatan", "Level & Aktivitas", "Keanggotaan", "Konten", "Administrasi", "Sistem"];

export function DashboardHome({ data }: { data: BootstrapData }) {
  const cfg = data.config || {};
  const [featureQuery, setFeatureQuery] = useState("");
  const [featureGroup, setFeatureGroup] = useState("Semua");

  const stats = [
    { label: "Bot", value: data.status.botOnline ? "Online" : "Offline", helper: data.status.botTag || "Belum terhubung", icon: Bot, tone: data.status.botOnline ? "success" : "danger" },
    { label: "Members", value: data.guild ? data.guild.memberCount.toLocaleString("id-ID") : "—", helper: data.guild?.name || "Server belum terbaca", icon: Users, tone: "neutral" },
    { label: "Fitur aktif", value: `${data.status.activeFeatureCount}/${data.status.totalFeatureCount}`, helper: "Konfigurasi berjalan", icon: Gauge, tone: "success" },
    { label: "Database", value: data.status.databaseMode.includes("Mongo") ? "Connected" : "Local", helper: data.status.databaseMode, icon: Database, tone: data.status.databaseMode.includes("Mongo") ? "success" : "warning" }
  ];

  const visibleFeatures = useMemo(() => features
    .filter((feature) => !["bot", "announcement"].includes(feature.slug))
    .filter((feature) => featureGroup === "Semua" || feature.group === featureGroup)
    .filter((feature) => `${feature.name} ${feature.description}`.toLowerCase().includes(featureQuery.trim().toLowerCase())), [featureGroup, featureQuery]);

  const warnings = [
    !cfg.welcome?.channelId ? { label: "Channel Welcome", to: "/manage/welcome" } : null,
    !cfg.welcome?.memberRoleId ? { label: "Role Member", to: "/manage/welcome" } : null,
    !cfg.leaderboardAktif?.channelId ? { label: "Channel Papan Aktif", to: "/manage/papan-aktif" } : null,
    data.status.databaseMode.includes("Mongo") ? null : { label: "Koneksi MongoDB", to: "/logs" }
  ].filter(Boolean) as Array<{ label: string; to: string }>;

  return (
    <div className="page-stack page-enter dashboard-premium-home">
      <section className="home-hero premium-hero">
        <div className="hero-content">
          <div className="hero-eyebrow"><span /> PAK RW CONTROL CENTER</div>
          <h1>Kelola semuanya.<br /><em>Tetap sederhana.</em></h1>
          <p>Fitur, member, dan operasional DESA TULUS dalam satu dashboard.</p>
          <div className="hero-actions">
            <Link to="/manage/welcome" className="button button-primary"><Settings2 size={17} />Kelola bot</Link>
            <Link to="/activity" className="button button-secondary"><Activity size={17} />Lihat aktivitas</Link>
          </div>
        </div>

        <div className="premium-ops-card">
          <div className="premium-ops-head"><div><span>System status</span><strong>{warnings.length ? `${warnings.length} perlu dicek` : "All systems operational"}</strong></div><span className={`ops-pulse ${warnings.length ? "is-warning" : ""}`} /></div>
          <div className="premium-ops-list">
            <div><span>Runtime</span><strong>{formatUptime(data.status.uptimeSeconds)}</strong></div>
            <div><span>Environment</span><strong>{data.status.environment}</strong></div>
            <div><span>Version</span><strong>v{data.status.version}</strong></div>
            <div><span>Prefix</span><strong>{data.status.prefix}</strong></div>
          </div>
        </div>
      </section>

      <div className="stats-grid premium-stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return <Card key={stat.label} className="stat-card premium-stat-card"><div className="stat-icon"><Icon size={19} /></div><div className="stat-copy"><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.helper}</small></div><span className={`stat-signal stat-${stat.tone}`} /></Card>;
        })}
      </div>

      <section className="premium-command-grid">
        <Card className="premium-quick-card">
          <CardHeader title="Quick actions" description="Akses yang paling sering digunakan." />
          <div className="quick-action-grid premium-quick-grid">
            {quickActions.map((action) => { const Icon = action.icon; return <Link key={action.to} to={action.to} className="quick-action premium-quick-action"><span><Icon size={18} /></span><div><strong>{action.label}</strong><small>{action.helper}</small></div><ArrowRight size={15} /></Link>; })}
          </div>
        </Card>

        <Card className="premium-readiness-card">
          <CardHeader title="Readiness" description={warnings.length ? "Beberapa konfigurasi belum lengkap." : "Konfigurasi utama siap."} />
          {warnings.length ? <div className="attention-list premium-attention-list">{warnings.map((warning) => <Link key={warning.label} to={warning.to}><span /><strong>{warning.label}</strong><ArrowRight size={15} /></Link>)}</div> : <div className="premium-ready"><ShieldCheck size={25} /><div><strong>Ready</strong><span>Konfigurasi utama lengkap.</span></div></div>}
        </Card>
      </section>

      <section className="premium-feature-section">
        <div className="section-heading premium-section-heading"><div><span>Modules</span><h2>Kelola fitur</h2></div><p>{visibleFeatures.length} modul tersedia</p></div>
        <div className="feature-toolbar premium-feature-toolbar">
          <div className="feature-search"><Search size={17} /><input value={featureQuery} onChange={(event) => setFeatureQuery(event.target.value)} placeholder="Cari modul" /></div>
          <div className="feature-filters">{GROUPS.map((group) => <button key={group} className={featureGroup === group ? "is-active" : ""} onClick={() => setFeatureGroup(group)}>{group}</button>)}</div>
        </div>
        <div className="feature-grid premium-feature-grid">
          {visibleFeatures.map((feature) => {
            const Icon = feature.icon;
            const enabled = feature.configPath ? readPath(cfg, feature.configPath) !== false : true;
            const path = feature.slug === "channel-manager" ? "/channel-manager" : feature.slug === "role-manager" ? "/role-manager" : feature.slug === "command-center" ? "/command-center" : feature.slug === "permission-center" ? "/permission-center" : feature.slug === "logs-health" ? "/logs" : feature.slug === "backup-center" ? "/backup" : feature.slug === "banner" ? "/banner-manager" : `/manage/${feature.slug}`;
            return <Link to={path} key={feature.slug} className="premium-feature-card"><div className="feature-card-top"><span className="feature-icon"><Icon size={20} /></span><span className={`module-state ${enabled ? "is-active" : ""}`}>{enabled ? "Active" : "Off"}</span></div><div><h3>{feature.name}</h3><p>{feature.description}</p></div><div className="feature-card-foot"><small>{feature.group}</small><ArrowRight size={15} /></div></Link>;
          })}
          {!visibleFeatures.length ? <div className="empty-state feature-empty"><Search size={24} /><strong>Modul tidak ditemukan</strong><span>Coba kata kunci lain.</span></div> : null}
        </div>
      </section>

      <Card className="premium-activity-card">
        <CardHeader title="Recent activity" description="Perubahan terbaru di dashboard." action={<Link to="/activity" className="text-link">Lihat semua</Link>} />
        <div className="activity-list">{data.activity?.length ? data.activity.slice(0, 5).map((item, index) => <div className="activity-item" key={`${item.at}-${index}`}><span className="activity-marker" /><div><strong>{item.title}</strong><small>{item.detail || "Perubahan dashboard"}</small></div><time>{new Date(item.at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</time></div>) : <div className="empty-state premium-empty"><CheckCircle2 size={22} /><strong>Belum ada aktivitas</strong><span>Perubahan baru akan tampil di sini.</span></div>}</div>
      </Card>
    </div>
  );
}

function readPath(source: Record<string, any>, path?: string) {
  if (!path) return undefined;
  return path.split(".").reduce((value, key) => value?.[key], source as any);
}
