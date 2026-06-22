import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, ArrowRight, Bot, BrainCircuit, CheckCircle2, Clock3, Database, DatabaseBackup,
  FileText, Gauge, HeartPulse, RefreshCcw, Save, Search, Settings2, UserPlus, Users
} from "lucide-react";
import type { BootstrapData, DashboardHealth } from "../app/types";
import { Card, CardHeader } from "../components/ui/Card";
import { features } from "../lib/features";
import { api } from "../lib/api";
import { useDashboard } from "../app/DashboardContext";

function formatUptime(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const GROUPS = ["Semua", "Komunitas", "Keterlibatan", "Level & Aktivitas", "Keanggotaan", "Konten", "Administrasi", "Sistem"];

function formatTimestamp(value: string | null) {
  if (!value) return "No record";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No record" : date.toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function DashboardHome({ data }: { data: BootstrapData }) {
  const { refresh, notify } = useDashboard();
  const cfg = data.config || {};
  const [featureQuery, setFeatureQuery] = useState("");
  const [featureGroup, setFeatureGroup] = useState("Semua");
  const [health, setHealth] = useState<DashboardHealth | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshStatus = async () => {
    setRefreshing(true);
    try {
      const [, nextHealth] = await Promise.all([refresh(), api.health()]);
      setHealth(nextHealth);
      notify("Status dashboard diperbarui.", "info");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { api.health().then(setHealth).catch(() => setHealth(null)); }, []);

  const stats = [
    { label: "Bot", value: data.status.botOnline ? "Online" : "Offline", helper: data.status.botTag || "Belum terhubung", icon: Bot, tone: data.status.botOnline ? "success" : "danger" },
    { label: "Ping / uptime", value: data.status.pingMs != null ? `${data.status.pingMs} ms` : formatUptime(data.status.uptimeSeconds), helper: `Uptime ${formatUptime(data.status.uptimeSeconds)}`, icon: Clock3, tone: data.status.botOnline ? "success" : "neutral" },
    { label: "Members", value: data.guild ? data.guild.memberCount.toLocaleString("id-ID") : "—", helper: data.guild?.name || "Server belum terbaca", icon: Users, tone: "neutral" },
    { label: "Active modules", value: `${data.status.activeFeatureCount}/${data.status.totalFeatureCount}`, helper: "Konfigurasi berjalan", icon: Gauge, tone: "success" },
    { label: "Pak RW AI", value: health?.ai?.enabled ? "Ready" : health?.ai ? "Off" : "Checking", helper: health?.ai ? `${health.ai.providerName} • ${health.ai.limit.status || "normal"}` : "Provider status", icon: BrainCircuit, tone: health?.ai?.enabled ? "success" : "warning" },
    { label: "Database / config", value: data.status.databaseMode.includes("Mongo") ? "Connected" : "Local", helper: data.status.databaseMode, icon: Database, tone: data.status.databaseMode.includes("Mongo") ? "success" : "warning" },
    { label: "Dashboard health", value: health?.ok && health.dashboardBuild ? "Healthy" : health ? "Needs check" : "Checking", helper: health?.checkedAt ? `Checked ${formatTimestamp(health.checkedAt)}` : "Health endpoint", icon: HeartPulse, tone: health?.ok && health.dashboardBuild ? "success" : "warning" },
    { label: "Last config save", value: formatTimestamp(data.status.lastConfigSaveAt), helper: "Config file update", icon: Save, tone: data.status.lastConfigSaveAt ? "neutral" : "warning" },
    { label: "Last backup", value: formatTimestamp(data.status.lastBackupAt), helper: data.status.lastBackupAt ? "Backup file detected" : "Backend belum aktif", icon: DatabaseBackup, tone: data.status.lastBackupAt ? "success" : "warning" }
  ];

  const visibleFeatures = useMemo(() => features
    .filter((feature) => !["bot", "announcement"].includes(feature.slug))
    .filter((feature) => featureGroup === "Semua" || feature.group === featureGroup)
    .filter((feature) => `${feature.name} ${feature.description}`.toLowerCase().includes(featureQuery.trim().toLowerCase())), [featureGroup, featureQuery]);

  const readiness = [
    { label: "Welcome channel", ready: Boolean(cfg.welcome?.channelId), to: "/manage/welcome" },
    { label: "Warga role", ready: Boolean(cfg.welcome?.memberRoleId), to: "/manage/welcome" },
    { label: "Leaderboard channel", ready: Boolean(cfg.leaderboardAktif?.channelId), to: "/manage/papan-aktif" },
    { label: "Database / config", ready: Boolean(data.status.databaseMode), to: "/logs" },
    { label: "Dashboard health", ready: Boolean(health?.ok && health.dashboardBuild), to: "/logs" },
    { label: "Asset folders", ready: Boolean(data.status.assetFoldersReady), to: "/banner-manager" },
    { label: "AI memory privacy", ready: Boolean(health?.ai?.memory.enabled && !health?.ai?.memory.anonymousMemory), to: "/manage/ai" },
    { label: "Embed test", ready: data.status.botOnline && Boolean(data.embeds && Object.keys(data.embeds).length), to: "/manage/embed" }
  ];
  const warnings = readiness.filter((item) => !item.ready);

  const quickActions = [
    { label: refreshing ? "Refreshing" : "Refresh status", helper: "Runtime & health", icon: RefreshCcw, action: refreshStatus },
    { to: "/logs", label: "Open logs", helper: "Health checks", icon: Activity },
    { to: "/backup", label: "Backup Center", helper: "Read-only status", icon: DatabaseBackup },
    { to: "/manage/embed", label: "Test embed", helper: "Builder & send test", icon: FileText },
    { to: "/manage/papan-aktif", label: "Leaderboard", helper: "Format & preview", icon: Gauge },
    { to: "/manage/ai", label: "AI Control", helper: "Brain & memory", icon: BrainCircuit },
    { to: "/manage/welcome", label: "Welcome", helper: "Message & role", icon: UserPlus }
  ];

  return (
    <div className="page-stack page-enter dashboard-premium-home">
      <section className="home-hero premium-hero">
        <div className="hero-content">
          <div className="hero-eyebrow"><span /> DESA TULUS BOT MANAGEMENT</div>
          <h1>Pak RW<br /><em>Control Center</em></h1>
          <p>Fitur, member, dan operasional server dalam satu dashboard.</p>
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
            {quickActions.map((action) => { const Icon = action.icon; return action.to ? <Link key={action.label} to={action.to} className="quick-action premium-quick-action"><span><Icon size={18} /></span><div><strong>{action.label}</strong><small>{action.helper}</small></div><ArrowRight size={15} /></Link> : <button key={action.label} type="button" className="quick-action premium-quick-action" onClick={action.action} disabled={refreshing}><span><Icon className={refreshing ? "spin" : ""} size={18} /></span><div><strong>{action.label}</strong><small>{action.helper}</small></div><ArrowRight size={15} /></button>; })}
          </div>
        </Card>

        <Card className="premium-readiness-card">
          <CardHeader title="Readiness" description={warnings.length ? `${warnings.length} item perlu diperiksa.` : "Konfigurasi utama siap."} />
          <div className="readiness-checklist">{readiness.map((item) => <Link key={item.label} to={item.to} className={item.ready ? "is-ready" : "is-warning"}><span>{item.ready ? <CheckCircle2 size={15} /> : "!"}</span><strong>{item.label}</strong><small>{item.ready ? "Ready" : "Check"}</small></Link>)}</div>
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
