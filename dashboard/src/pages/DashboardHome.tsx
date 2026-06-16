import { Link } from "react-router-dom";
import {
  Activity, ArrowRight, BarChart3, Bot, BrainCircuit, Clock3, Database,
  FileText, Gauge, Medal, Server, Settings2, Trophy, UserPlus, Users
} from "lucide-react";
import type { BootstrapData } from "../app/types";
import { Card, CardHeader } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/StatusBadge";
import { features } from "../lib/features";

function formatUptime(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days) return `${days} hari ${hours} jam`;
  if (hours) return `${hours} jam ${minutes} menit`;
  return `${minutes} menit`;
}

const quickActions = [
  { to: "/manage/welcome", label: "Kelola Welcome", icon: UserPlus },
  { to: "/manage/ai", label: "Kelola AI Pak RW", icon: BrainCircuit },
  { to: "/manage/embed", label: "Buka Embed Builder", icon: FileText },
  { to: "/manage/level", label: "Kelola Level", icon: BarChart3 },
  { to: "/manage/top-aktif", label: "Lihat Top Aktif", icon: Trophy },
  { to: "/logs", label: "Buka Logs", icon: Activity }
];

export function DashboardHome({ data }: { data: BootstrapData }) {
  const cfg = data.config || {};
  const stats = [
    { label: "Bot Status", value: data.status.botOnline ? "Online" : "Offline", helper: data.status.botTag || "Discord belum terhubung", icon: Bot, tone: data.status.botOnline ? "success" : "danger" },
    { label: "Total Warga", value: data.guild ? data.guild.memberCount.toLocaleString("id-ID") : "Belum tersedia", helper: data.guild?.name || "Menunggu server", icon: Users, tone: "neutral" },
    { label: "Fitur Aktif", value: `${data.status.activeFeatureCount}/${data.status.totalFeatureCount}`, helper: "Berdasarkan config saat ini", icon: Gauge, tone: "success" },
    { label: "Database", value: data.status.databaseMode, helper: data.status.databaseMode.includes("Mongo") ? "Penyimpanan utama aktif" : "Periksa koneksi MongoDB", icon: Database, tone: data.status.databaseMode.includes("Mongo") ? "success" : "warning" },
    { label: "Uptime", value: formatUptime(data.status.uptimeSeconds), helper: "Sejak proses terakhir dimulai", icon: Clock3, tone: "neutral" },
    { label: "Top Aktif", value: cfg.topActive?.enabled === false ? "Nonaktif" : "Aktif", helper: `${cfg.topActive?.autoPostHourWIB ?? 0}:00 WIB`, icon: Trophy, tone: cfg.topActive?.enabled === false ? "warning" : "success" },
    { label: "Papan Aktif", value: cfg.leaderboardAktif?.enabled === false ? "Nonaktif" : "Lifetime", helper: "Tidak ikut reset siklus", icon: Medal, tone: cfg.leaderboardAktif?.enabled === false ? "warning" : "success" },
    { label: "MOTM Threshold", value: Number(cfg.level?.motmThreshold || cfg.topActive?.motmThreshold || 100000).toLocaleString("id-ID"), helper: "Poin siklus untuk role MOTM", icon: Server, tone: "neutral" }
  ];

  return (
    <div className="page-stack page-enter">
      <section className="home-hero">
        <div className="hero-content">
          <div className="hero-eyebrow">Village Control Center</div>
          <h1>Pak RW Control Center</h1>
          <p>Balai Warga Digital DESA TULUS untuk mengatur fitur, channel, role, embed, dan kesehatan bot dari satu tempat yang jelas.</p>
          <div className="hero-badges">
            <StatusBadge label={data.status.botOnline ? "Bot online" : "Bot offline"} tone={data.status.botOnline ? "success" : "danger"} />
            <StatusBadge label={data.guild?.name || "DESA TULUS"} />
            <StatusBadge label={`Prefix ${data.status.prefix}`} />
            <StatusBadge label={data.status.databaseMode} tone={data.status.databaseMode.includes("Mongo") ? "success" : "warning"} />
          </div>
          <div className="hero-actions">
            <Link to="/manage/welcome" className="button button-primary"><Settings2 size={18} />Mulai kelola</Link>
            <Link to="/channel-manager" className="button button-secondary"><Server size={18} />Sinkronkan Discord</Link>
          </div>
        </div>
        <div className="hero-runtime-panel">
          <div className="runtime-panel-head"><span>Ringkasan server</span><StatusBadge label={data.status.environment} /></div>
          <dl>
            <div><dt>Server</dt><dd>{data.guild?.name || "Belum terbaca"}</dd></div>
            <div><dt>Bot</dt><dd>{data.status.botTag || "Belum login"}</dd></div>
            <div><dt>Versi</dt><dd>v{data.status.version}</dd></div>
            <div><dt>Prefix</dt><dd>{data.status.prefix}</dd></div>
          </dl>
        </div>
      </section>

      <section>
        <div className="section-heading"><div><span>Overview</span><h2>Status Balai Warga Digital</h2></div><p>Semua nilai diambil dari proses Pak RW dan config aktif.</p></div>
        <div className="stats-grid">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="stat-card">
                <div className="stat-icon"><Icon size={20} /></div>
                <div className="stat-copy"><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.helper}</small></div>
                <span className={`stat-signal stat-${stat.tone}`} />
              </Card>
            );
          })}
        </div>
      </section>

      <section className="home-grid-two">
        <Card>
          <CardHeader title="Quick actions" description="Buka pekerjaan paling sering tanpa mencari menu." />
          <div className="quick-action-grid">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return <Link key={action.to} to={action.to} className="quick-action"><span><Icon size={19} /></span><strong>{action.label}</strong><ArrowRight size={16} /></Link>;
            })}
          </div>
        </Card>
        <Card>
          <CardHeader title="Recent activity" description="Perubahan dashboard dan aktivitas terakhir." action={<Link to="/activity" className="text-link">Lihat semua</Link>} />
          <div className="activity-list">
            {data.activity?.length ? data.activity.slice(0, 6).map((item, index) => (
              <div className="activity-item" key={`${item.at}-${index}`}>
                <span className="activity-marker" />
                <div><strong>{item.title}</strong><small>{item.detail || "Perubahan dashboard"}</small></div>
                <time>{new Date(item.at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
              </div>
            )) : <div className="empty-state"><Activity size={24} /><strong>Belum ada aktivitas</strong><span>Aktivitas simpan dan kirim tes akan tampil di sini.</span></div>}
          </div>
        </Card>
      </section>

      <section>
        <div className="section-heading"><div><span>Feature center</span><h2>Kelola semua fitur Pak RW</h2></div><p>Pilih fitur, periksa status, lalu buka halaman Manage khusus.</p></div>
        <div className="feature-grid">
          {features.filter((feature) => !["bot", "announcement"].includes(feature.slug)).map((feature) => {
            const Icon = feature.icon;
            const enabled = feature.configPath ? readPath(cfg, feature.configPath) !== false : true;
            const path = feature.slug === "channel-manager" ? "/channel-manager" : feature.slug === "role-manager" ? "/role-manager" : feature.slug === "command-center" ? "/command-center" : feature.slug === "permission-center" ? "/permission-center" : feature.slug === "logs-health" ? "/logs" : feature.slug === "backup-center" ? "/backup" : feature.slug === "banner" ? "/banner-manager" : `/manage/${feature.slug}`;
            return (
              <Card key={feature.slug} className="feature-card">
                <div className="feature-card-top"><span className="feature-icon"><Icon size={21} /></span><StatusBadge label={enabled ? "Aktif" : "Nonaktif"} tone={enabled ? "success" : "warning"} /></div>
                <h3>{feature.name}</h3>
                <p>{feature.description}</p>
                <div className="feature-card-foot"><small>{feature.group}</small><Link to={path} className="manage-link">Manage<ArrowRight size={15} /></Link></div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function readPath(source: Record<string, any>, path?: string) {
  if (!path) return undefined;
  return path.split(".").reduce((value, key) => value?.[key], source as any);
}
