import { useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell, ChevronRight, Clock3, Command, LogOut, Menu, PanelLeftClose,
  PanelLeftOpen, Plus, RefreshCcw, Search, Server, UserRound, X
} from "lucide-react";
import { featureGroups } from "../lib/features";
import { VillageBackdrop } from "../components/background/VillageBackdrop";
import { StatusBadge } from "../components/ui/StatusBadge";
import type { BootstrapData } from "../app/types";
import { useDashboard } from "../app/DashboardContext";

function compactUptime(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function pageTitle(pathname: string) {
  if (pathname === "/") return ["Control Center", "Overview"];
  const match = featureGroups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label }))).find((item) => pathname === item.path);
  if (match) return [match.group, match.name];
  if (pathname.startsWith("/manage/")) {
    const slug = pathname.split("/").pop() || "Fitur";
    const matchFeature = featureGroups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label }))).find((item) => item.slug === slug);
    return [matchFeature?.group || "Manage", matchFeature?.name || slug.replaceAll("-", " ")];
  }
  return ["Pak RW", "Control Center"];
}

export function AppShell({ data }: { data: BootstrapData }) {
  const { refresh } = useDashboard();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [section, title] = pageTitle(location.pathname);
  const allItems = useMemo(() => featureGroups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label }))), []);
  const searchResults = allItems.filter((item) => `${item.name} ${item.group}`.toLowerCase().includes(query.toLowerCase())).slice(0, 10);

  const closeMobile = () => setMobileOpen(false);
  const refreshDashboard = async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  };

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <VillageBackdrop />
      <aside className={`sidebar ${mobileOpen ? "is-mobile-open" : ""}`} aria-label="Navigasi utama">
        <div className="sidebar-top">
          <Link to="/" className="brand-lockup" onClick={closeMobile}>
            <img src="/dashboard/pak-rw-mark.svg" alt="Logo Pak RW" />
            <span className="brand-copy"><strong>Pak RW</strong><small>CONTROL CENTER</small></span>
          </Link>
          <button className="icon-button desktop-collapse" aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>
          <button className="icon-button mobile-close" aria-label="Tutup menu" onClick={closeMobile}><X size={20} /></button>
        </div>

        <div className="server-card" aria-label="Server aktif">
          <span className="server-mark"><Server size={18} /></span>
          <span className="server-card-copy"><strong>{data.guild?.name || "DESA TULUS"}</strong><small>{data.guild ? `${data.guild.memberCount.toLocaleString("id-ID")} members` : "Server belum terhubung"}</small></span>
          <span className={`server-state ${data.status.botOnline ? "is-online" : ""}`} title={data.status.botOnline ? "Online" : "Offline"} />
        </div>

        <button className="sidebar-search" onClick={() => setSearchOpen(true)}>
          <Search size={17} /><span>Search</span><kbd>Ctrl K</kbd>
        </button>

        <nav className="sidebar-nav">
          {featureGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.path} to={item.path} onClick={closeMobile} className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`} title={collapsed ? item.name : undefined}>
                    <Icon size={18} aria-hidden="true" />
                    <span>{item.name}</span>
                    <ChevronRight size={14} className="nav-chevron" />
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="runtime-card">
            <span className={`runtime-indicator ${data.status.botOnline ? "is-online" : ""}`} />
            <span><strong>{data.status.botOnline ? "Systems operational" : "Bot offline"}</strong><small>{data.status.databaseMode}</small></span>
          </div>
          <a className="nav-item logout-link" href="/logout"><LogOut size={18} /><span>Keluar Dashboard</span></a>
        </div>
      </aside>

      {mobileOpen ? <button className="sidebar-scrim" aria-label="Tutup menu" onClick={closeMobile} /> : null}

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" aria-label="Buka menu" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
            <div className="topbar-product"><img src="/dashboard/pak-rw-mark.svg" alt="" /><span><strong>Pak RW Control Center</strong><small>{data.guild?.name || "DESA TULUS"}</small></span></div>
            <span className="topbar-divider" />
            <div className="breadcrumb"><span>{section}</span><ChevronRight size={15} /><strong>{title}</strong></div>
          </div>
          <div className="topbar-actions">
            <button className="topbar-search-button" onClick={() => setSearchOpen(true)}><Search size={17} /><span>Cari fitur</span><kbd>Ctrl K</kbd></button>
            <StatusBadge label={data.status.botOnline ? "Bot online" : "Bot offline"} tone={data.status.botOnline ? "success" : "danger"} />
            <span className="runtime-summary"><Clock3 size={14} />{data.status.pingMs != null ? `${data.status.pingMs} ms` : compactUptime(data.status.uptimeSeconds)}</span>
            <button className="icon-button" aria-label="Refresh dashboard" title="Refresh dashboard" onClick={refreshDashboard} disabled={refreshing}><RefreshCcw className={refreshing ? "spin" : ""} size={18} /></button>
            <button className="icon-button" aria-label="Buka aktivitas terbaru" title="Aktivitas terbaru" onClick={() => navigate("/activity")}><Bell size={19} /></button>
            <button className="quick-create" onClick={() => navigate("/manage/embed")}><Plus size={17} /><span>Embed baru</span></button>
            <div className="admin-session" title="Sesi dashboard aktif"><UserRound size={15} /><span>{String(data.config.ownerName || "Admin")}</span></div>
          </div>
        </header>

        <main className="main-content"><Outlet /></main>
      </div>

      {searchOpen ? (
        <div className="command-overlay" onMouseDown={() => setSearchOpen(false)}>
          <div className="command-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="command-input"><Search size={19} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari fitur atau pengaturan" /><button aria-label="Tutup" onClick={() => setSearchOpen(false)}><X size={18} /></button></div>
            <div className="command-results">
              {searchResults.map((item) => {
                const Icon = item.icon;
                return <button key={item.path} onClick={() => { navigate(item.path); setSearchOpen(false); setQuery(""); }}><span className="command-result-icon"><Icon size={18} /></span><span><strong>{item.name}</strong><small>{item.group}</small></span><Command size={15} /></button>;
              })}
              {!searchResults.length ? <div className="command-empty">Tidak ada menu yang cocok.</div> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
