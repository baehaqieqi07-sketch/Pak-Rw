import { useEffect, useMemo, useState } from "react";
import { Activity, Archive, CheckCircle2, CircleAlert, DatabaseBackup, FileImage, Hash, RefreshCcw, Save, Search, Server, Settings, Shield, ShieldCheck, TerminalSquare, Users } from "lucide-react";
import { useDashboard } from "../app/DashboardContext";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { DiscordPicker } from "../components/pickers/DiscordPicker";
import { api } from "../lib/api";

function PageHeader({ icon: Icon, kicker, title, description }: { icon: any; kicker: string; title: string; description: string }) {
  return <section className="feature-header"><div className="feature-header-icon"><Icon size={24} /></div><div className="feature-header-copy"><div className="feature-header-kicker">{kicker}</div><h1>{title}</h1><p>{description}</p></div></section>;
}

export function ActivityPage() {
  const { data } = useDashboard();
  return <div className="page-stack page-enter"><PageHeader icon={Activity} kicker="Overview" title="Activity" description="Riwayat perubahan dashboard dan aksi terbaru." /><Card><CardHeader title="Recent activity" description="Sumber data berasal dari activity log dashboard." /><div className="activity-list">{data.activity?.length ? data.activity.map((item, index) => <div className="activity-item" key={`${item.at}-${index}`}><span className="activity-marker" /><div><strong>{item.title}</strong><small>{item.detail || "Aktivitas dashboard"}</small></div><time>{new Date(item.at).toLocaleString("id-ID")}</time></div>) : <div className="empty-inline">Belum ada aktivitas.</div>}</div></Card></div>;
}

const channelBindings = [
  ["welcome.channelId", "Welcome", "Channel sambutan warga baru"], ["rulesChannelId", "Aturan Desa", "Channel aturan"], ["chatWargaChannelId", "Chat Warga", "Channel percakapan utama"], ["ticketChannelId", "Ticket", "Channel bantuan"], ["aiChannelId", "AI Pak RW", "Channel tanya Pak RW"], ["curhatChannelId", "Curhat", "Channel curhat warga"], ["anonymousCurhatChannelId", "Curhat Anonim", "Channel curhat anonim"], ["suggestionChannelId", "Saran", "Channel kotak saran"], ["levelChannelId", "Level", "Channel level warga"], ["cekPoinChannelId", "Cek Poin", "Channel cek poin"], ["topActive.channelId", "Top Aktif", "Channel leaderboard bulanan"], ["leaderboardAktif.channelId", "Papan Aktif", "Channel leaderboard lifetime"], ["mabar.channelId", "Cari Mabar", "Channel panel mabar"], ["boostPoin.channelId", "Boost Poin", "Channel event boost poin"]
] as const;

const roleBindings = [
  ["welcome.memberRoleId", "Member Tulus", "Role warga baru"], ["level100RoleId", "Level 100", "Role reward level"], ["topActive.memberOfTheMonthRoleId", "Member Of The Month", "Role MOTM"], ["donaturRoleId", "Donatur Desa", "Role donatur"], ["juragan.roleId", "Juragan Desa", "Role juragan"]
] as const;

function readPath(source: any, path: string) { return path.split(".").reduce((value, key) => value?.[key], source); }
function sameValues(a: Record<string, string>, b: Record<string, string>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) if ((a[key] || "") !== (b[key] || "")) return false;
  return true;
}

export function ChannelManagerPage() {
  const { data, picker, pickerLoading, refresh, refreshPicker, notify } = useDashboard();
  const [values, setValues] = useState<Record<string, string>>({});
  const [initialValues, setInitialValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { const next: Record<string, string> = {}; channelBindings.forEach(([path]) => next[path] = String(readPath(data.config, path) || "")); setValues(next); setInitialValues(next); }, [data]);
  const dirty = !sameValues(values, initialValues);
  const cancel = () => { setValues(initialValues); notify("Perubahan channel dibatalkan.", "info"); };
  const save = async () => { setSaving(true); try { await api.savePatches(channelBindings.map(([path]) => ({ path, value: values[path] || "" }))); await refresh(); notify("Pilihan channel berhasil disimpan."); } catch (error) { notify(error instanceof Error ? error.message : String(error), "error"); } finally { setSaving(false); } };
  return <div className="page-stack page-enter"><PageHeader icon={Hash} kicker="Administration" title="Channel Manager" description="Pilih channel Discord asli berdasarkan nama. ID disimpan otomatis di config." /><Card><CardHeader title="Koneksi Discord" description={picker.ok ? `Terhubung ke ${picker.guild?.name}` : picker.error || "Belum terhubung"} action={<Button variant="secondary" icon={<RefreshCcw size={16} />} onClick={refreshPicker}>Muat ulang</Button>} /><div className="connection-strip"><span className={picker.ok ? "is-online" : ""} />{picker.counts ? `${picker.counts.channels} channel tersedia` : "Menunggu data channel"}</div></Card><Card><CardHeader title="Pemetaan channel" description="Klik dropdown, cari nama channel, lalu pilih." /><div className="form-grid two-columns">{channelBindings.map(([path, label, helper]) => <DiscordPicker key={path} kind="channel" label={label} helper={helper} items={picker.channel || []} value={values[path]} loading={pickerLoading} onChange={(id) => setValues((current) => ({ ...current, [path]: id }))} />)}</div></Card>{dirty ? <div className="page-save-bar page-save-bar-dirty"><div><strong>Perubahan channel belum disimpan</strong><span>Simpan untuk menerapkan ID channel baru, atau Batal untuk kembali ke pilihan awal.</span></div><div><Button variant="secondary" icon={<RefreshCcw size={16} />} onClick={cancel} disabled={saving}>Batal</Button><Button icon={<Save size={16} />} onClick={save} disabled={saving}>{saving ? "Menyimpan" : "Simpan"}</Button></div></div> : null}</div>;
}

export function RoleManagerPage() {
  const { data, picker, pickerLoading, refresh, refreshPicker, notify } = useDashboard();
  const [values, setValues] = useState<Record<string, string>>({});
  const [initialValues, setInitialValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { const next: Record<string, string> = {}; roleBindings.forEach(([path]) => next[path] = String(readPath(data.config, path) || "")); setValues(next); setInitialValues(next); }, [data]);
  const dirty = !sameValues(values, initialValues);
  const cancel = () => { setValues(initialValues); notify("Perubahan role dibatalkan.", "info"); };
  const save = async () => { setSaving(true); try { await api.savePatches(roleBindings.map(([path]) => ({ path, value: values[path] || "" }))); await refresh(); notify("Pilihan role berhasil disimpan."); } catch (error) { notify(error instanceof Error ? error.message : String(error), "error"); } finally { setSaving(false); } };
  return <div className="page-stack page-enter"><PageHeader icon={Users} kicker="Membership" title="Role Manager" description="Pilih role Discord asli dengan nama, posisi, dan warna." /><Card><CardHeader title="Koneksi Discord" description={picker.ok ? `Terhubung ke ${picker.guild?.name}` : picker.error || "Belum terhubung"} action={<Button variant="secondary" icon={<RefreshCcw size={16} />} onClick={refreshPicker}>Muat ulang</Button>} /><div className="connection-strip"><span className={picker.ok ? "is-online" : ""} />{picker.counts ? `${picker.counts.roles} role tersedia` : "Menunggu data role"}</div></Card><Card><CardHeader title="Pemetaan role" description="Role Pak RW harus berada di atas role yang akan dikelola." /><div className="form-grid two-columns">{roleBindings.map(([path, label, helper]) => <DiscordPicker key={path} kind="role" label={label} helper={helper} items={picker.role || []} value={values[path]} loading={pickerLoading} onChange={(id) => setValues((current) => ({ ...current, [path]: id }))} />)}</div></Card>{dirty ? <div className="page-save-bar page-save-bar-dirty"><div><strong>Perubahan role belum disimpan</strong><span>Simpan untuk menerapkan ID role baru, atau Batal untuk kembali ke pilihan awal.</span></div><div><Button variant="secondary" icon={<RefreshCcw size={16} />} onClick={cancel} disabled={saving}>Batal</Button><Button icon={<Save size={16} />} onClick={save} disabled={saving}>{saving ? "Menyimpan" : "Simpan"}</Button></div></div> : null}</div>;
}

export function CommandCenterPage() {
  const { data } = useDashboard();
  const commands = ["rwhelp", "rwtanya", "rwcurhat", "rwcekpoin", "rwlevel", "rwrank", "rwtopaktif", "rwpapanaktif", "rwleaderboardaktif", "rwpostpapanaktif", "rwai", "rwfitur"];
  return <div className="page-stack page-enter"><PageHeader icon={TerminalSquare} kicker="Administration" title="Command Center" description="Daftar command publik Pak RW dengan prefix aktif." /><Card><CardHeader title="Command publik" description={`Prefix aktif: ${data.status.prefix}`} /><div className="command-table">{commands.map((command) => <div key={command}><code>{command}</code><span>Aktif</span></div>)}</div></Card></div>;
}

export function PermissionCenterPage() {
  const permissions = ["View Channel", "Send Messages", "Embed Links", "Attach Files", "Read Message History", "Use External Emojis", "Manage Roles"];
  return <div className="page-stack page-enter"><PageHeader icon={ShieldCheck} kicker="Administration" title="Permission Center" description="Checklist izin yang dibutuhkan Pak RW di Discord." /><Card><CardHeader title="Permission checklist" description="Periksa server settings jika fitur gagal bekerja." /><div className="permission-grid">{permissions.map((permission) => <div key={permission}><ShieldCheck size={18} /><span>{permission}</span></div>)}</div></Card><Card><CardHeader title="Role hierarchy" description="Manage Roles hanya bekerja jika role Pak RW lebih tinggi." /><div className="info-panel"><Shield size={19} /><p>Letakkan role Pak RW di atas Member Of The Month, Donatur Desa, Juragan Desa, dan role lain yang ingin dikelola.</p></div></Card></div>;
}

export function LogsPage() {
  const { data } = useDashboard();
  return <div className="page-stack page-enter"><PageHeader icon={Activity} kicker="System" title="Logs & Health" description="Status runtime tanpa menampilkan rahasia environment." /><div className="stats-grid"><Card className="stat-card"><div className="stat-icon"><Server size={20} /></div><div className="stat-copy"><span>Discord</span><strong>{data.status.botOnline ? "Online" : "Offline"}</strong><small>{data.status.botTag || "Belum terhubung"}</small></div></Card><Card className="stat-card"><div className="stat-icon"><Archive size={20} /></div><div className="stat-copy"><span>Database</span><strong>{data.status.databaseMode}</strong><small>Penyimpanan aktif</small></div></Card><Card className="stat-card"><div className="stat-icon"><Activity size={20} /></div><div className="stat-copy"><span>Dashboard</span><strong>Enabled</strong><small>Static production build</small></div></Card></div><Card><CardHeader title="Health checks" description="Pemeriksaan aman untuk proses dashboard." /><div className="health-list"><div><CheckCircle2 size={18} /><span>Config aktif dapat dibaca</span></div><div><CheckCircle2 size={18} /><span>Static dashboard build tersedia</span></div><div className={data.status.botOnline ? "" : "warning"}>{data.status.botOnline ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}<span>Koneksi Discord {data.status.botOnline ? "aktif" : "belum aktif"}</span></div></div></Card></div>;
}

export function BackupPage() {
  return <div className="page-stack page-enter"><PageHeader icon={DatabaseBackup} kicker="System" title="Backup Center" description="Panduan backup aman tanpa mereset data aktif." /><Card><CardHeader title="Data yang harus dipertahankan" description="Jangan hapus atau timpa data ini ketika memasang dashboard." /><div className="backup-grid">{["MongoDB data", "Level dan poin", "Papan Aktif lifetime", "MOTM", "Donatur dan Juragan", "Config channel dan role", "Embed template", "AI memory"].map((item) => <div key={item}><CheckCircle2 size={17} /><span>{item}</span></div>)}</div></Card><Card><CardHeader title="Rollback dashboard" description="Core bot tetap dapat dipakai tanpa dashboard." /><pre className="code-block">DASHBOARD_ENABLED=false</pre><p className="muted-copy">Restart service setelah mengubah variable. Bot tetap online normal tanpa memuat dashboard web.</p></Card></div>;
}

export function SettingsPage() {
  const { data, refresh, notify } = useDashboard();
  const initial = useMemo(() => ({ serverName: data.config.serverName || "DESA TULUS", ownerName: data.config.ownerName || "Pak RW", embedColor: data.config.embedColor || "#7DBD77" }), [data]);
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => setValues(initial), [initial]);
  const dirty = values.serverName !== initial.serverName || values.ownerName !== initial.ownerName || values.embedColor !== initial.embedColor;
  const cancel = () => { setValues(initial); notify("Perubahan settings dibatalkan.", "info"); };
  const save = async () => { setSaving(true); try { await api.savePatches([{ path: "serverName", value: values.serverName }, { path: "ownerName", value: values.ownerName }, { path: "embedColor", value: values.embedColor }]); await refresh(); notify("Settings berhasil disimpan."); } catch (error) { notify(error instanceof Error ? error.message : String(error), "error"); } finally { setSaving(false); } };
  return <div className="page-stack page-enter"><PageHeader icon={Settings} kicker="System" title="Settings" description="Identitas dashboard dan nilai tampilan yang aman diubah." /><Card><CardHeader title="Identitas" description="Prefix publik tetap rw dan tidak diubah dari halaman ini." /><div className="form-grid two-columns"><div className="form-field"><label>Nama server</label><input value={values.serverName} onChange={(event) => setValues((current) => ({ ...current, serverName: event.target.value }))} /></div><div className="form-field"><label>Nama owner</label><input value={values.ownerName} onChange={(event) => setValues((current) => ({ ...current, ownerName: event.target.value }))} /></div><div className="form-field"><label>Warna embed default</label><div className="color-field"><input type="color" value={values.embedColor} onChange={(event) => setValues((current) => ({ ...current, embedColor: event.target.value }))} /><input value={values.embedColor} onChange={(event) => setValues((current) => ({ ...current, embedColor: event.target.value }))} /></div></div><div className="form-field"><label>Prefix publik</label><input value={data.status.prefix} disabled /></div></div></Card>{dirty ? <div className="page-save-bar page-save-bar-dirty"><div><strong>Perubahan settings belum disimpan</strong><span>Simpan untuk menerapkan identitas baru, atau Batal untuk mengembalikan nilai awal.</span></div><div><Button variant="secondary" icon={<RefreshCcw size={16} />} onClick={cancel} disabled={saving}>Batal</Button><Button icon={<Save size={16} />} onClick={save} disabled={saving}>{saving ? "Menyimpan" : "Simpan"}</Button></div></div> : null}</div>;
}

export function BannerManagerPage() {
  const { data, refresh, notify } = useDashboard();
  const initial = useMemo(() => ({ motm: data.config.topActive?.manualBannerUrl || "", leaderboard: data.config.leaderboardAktif?.imageUrl || "", dashboard: data.config.embeds?.dashboard?.media?.backgroundUrl || "" }), [data]);
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => setValues(initial), [initial]);
  const dirty = values.motm !== initial.motm || values.leaderboard !== initial.leaderboard || values.dashboard !== initial.dashboard;
  const cancel = () => { setValues(initial); notify("Perubahan gambar dibatalkan.", "info"); };
  const save = async () => { setSaving(true); try { await api.savePatches([{ path: "topActive.manualBannerUrl", value: values.motm }, { path: "leaderboardAktif.imageUrl", value: values.leaderboard }, { path: "embeds.dashboard.media.backgroundUrl", value: values.dashboard }]); await refresh(); notify("Banner berhasil disimpan."); } catch (error) { notify(error instanceof Error ? error.message : String(error), "error"); } finally { setSaving(false); } };
  return <div className="page-stack page-enter"><PageHeader icon={FileImage} kicker="Content" title="Banner Manager" description="Kelola gambar dashboard, MOTM, dan leaderboard dengan URL aman." /><Card><CardHeader title="Image sources" description="Gunakan URL HTTPS dari Discord CDN, GitHub raw, atau hosting gambar." /><div className="form-grid"><div className="form-field"><label>Banner MOTM</label><input value={values.motm} onChange={(event) => setValues({ ...values, motm: event.target.value })} placeholder="https://..." /></div><div className="form-field"><label>Image leaderboard lifetime</label><input value={values.leaderboard} onChange={(event) => setValues({ ...values, leaderboard: event.target.value })} placeholder="https://..." /></div><div className="form-field"><label>Background dashboard custom</label><input value={values.dashboard} onChange={(event) => setValues({ ...values, dashboard: event.target.value })} placeholder="https://..." /></div></div></Card>{dirty ? <div className="page-save-bar page-save-bar-dirty"><div><strong>Perubahan gambar belum disimpan</strong><span>Simpan untuk memakai URL baru, atau Batal untuk kembali ke gambar sebelumnya.</span></div><div><Button variant="secondary" icon={<RefreshCcw size={16} />} onClick={cancel} disabled={saving}>Batal</Button><Button icon={<Save size={16} />} onClick={save} disabled={saving}>{saving ? "Menyimpan" : "Simpan"}</Button></div></div> : null}</div>;
}
