import { useEffect, useMemo, useState } from "react";
import { Activity, Archive, CheckCircle2, CircleAlert, DatabaseBackup, FileImage, Hash, Headphones, IdCard, RefreshCcw, Save, Search, Server, Settings, Shield, ShieldCheck, TerminalSquare, Users } from "lucide-react";
import { useDashboard } from "../app/DashboardContext";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Toggle } from "../components/ui/Toggle";
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
  ["welcome.channelId", "Welcome", "Channel sambutan warga baru"], ["rulesChannelId", "Aturan Desa", "Channel aturan"], ["chatWargaChannelId", "Chat Warga", "Channel percakapan utama"], ["ticketChannelId", "Ticket", "Channel bantuan"], ["loket.panelChannelId", "Loket Panel", "Channel panel loket bantuan"], ["loket.categoryId", "Kategori Loket", "Kategori ruang loket"], ["loket.logChannelId", "Log Loket", "Channel log loket"], ["aiChannelId", "AI Pak RW", "Channel tanya Pak RW"], ["curhatChannelId", "Curhat", "Channel curhat warga"], ["anonymousCurhatChannelId", "Curhat Anonim", "Channel curhat anonim"], ["suggestionChannelId", "Saran", "Channel kotak saran"], ["levelChannelId", "Level", "Channel level warga"], ["cekPoinChannelId", "Cek Poin", "Channel cek poin"], ["topActive.channelId", "Top Aktif", "Channel leaderboard bulanan"], ["leaderboardAktif.channelId", "Papan Aktif", "Channel leaderboard lifetime"], ["mabar.channelId", "Cari Mabar", "Channel panel mabar"], ["ktpSystem.channelId", "KTP Warga", "Channel privat pembuatan KTP"], ["afkVoice.channelId", "AFK Voice 24/7", "Voice channel tempat Pak RW berjaga"], ["boostPoin.channelId", "Boost Poin", "Channel event boost poin"]
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
  const commands = ["rwhelp", "rwtanya", "rwcurhat", "rwcekpoin", "rwlevel", "rwrank", "rwtopaktif", "rwpapanaktif", "rwleaderboardaktif", "rwpostpapanaktif", "rwai", "rwfitur", "rwktp", "rwktppanel", "rwid"];
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
  const embedEntries = useMemo(() => Object.entries(data.embeds || {}).filter(([key]) => key !== "dashboard"), [data.embeds]);
  const buildColorMap = () => Object.fromEntries(embedEntries.map(([key, value]: any) => [key, String((value as any)?.color || data.config.embedColor || "#7DBD77")]));
  const initial = useMemo(() => ({
    serverName: data.config.serverName || "DESA TULUS",
    ownerName: data.config.ownerName || "Pak RW",
    embedColor: data.config.embedColor || "#7DBD77",
    suggestionDescription: data.config.embeds?.suggestionResult?.description || "👤 Pengirim:\n{user} atau anonim\n\n💬 Isi Saran:\n{content}",
    suggestionTitle: data.config.embeds?.suggestionResult?.title || "📬 Kritik & Saran Baru"
  }), [data]);
  const [values, setValues] = useState(initial);
  const [embedColors, setEmbedColors] = useState<Record<string, string>>({});
  const [initialEmbedColors, setInitialEmbedColors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => setValues(initial), [initial]);
  useEffect(() => { const next = buildColorMap(); setEmbedColors(next); setInitialEmbedColors(next); }, [data, embedEntries.length]);
  const dirty = values.serverName !== initial.serverName || values.ownerName !== initial.ownerName || values.embedColor !== initial.embedColor || values.suggestionDescription !== initial.suggestionDescription || values.suggestionTitle !== initial.suggestionTitle || JSON.stringify(embedColors) !== JSON.stringify(initialEmbedColors);
  const cancel = () => { setValues(initial); setEmbedColors(initialEmbedColors); notify("Perubahan settings dibatalkan.", "info"); };
  const save = async () => {
    setSaving(true);
    try {
      const patches: Array<{ path: string; value: unknown }> = [
        { path: "serverName", value: values.serverName },
        { path: "ownerName", value: values.ownerName },
        { path: "embedColor", value: values.embedColor },
        { path: "embeds.suggestionResult.title", value: values.suggestionTitle },
        { path: "embeds.suggestionResult.description", value: values.suggestionDescription },
        { path: "embeds.suggestionResult.footer", value: "DESA TULUS • Kritik & Saran Warga" }
      ];
      Object.entries(embedColors).forEach(([key, value]) => patches.push({ path: `embeds.${key}.color`, value }));
      await api.savePatches(patches);
      await refresh();
      notify("Settings berhasil disimpan.");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setSaving(false);
    }
  };
  return <div className="page-stack page-enter"><PageHeader icon={Settings} kicker="System" title="Settings" description="Identitas dashboard, format kritik & saran, dan warna semua embed yang aman diubah." /><Card><CardHeader title="Identitas" description="Prefix publik tetap rw dan tidak diubah dari halaman ini." /><div className="form-grid two-columns"><div className="form-field"><label>Nama server</label><input value={values.serverName} onChange={(event) => setValues((current) => ({ ...current, serverName: event.target.value }))} /></div><div className="form-field"><label>Nama owner</label><input value={values.ownerName} onChange={(event) => setValues((current) => ({ ...current, ownerName: event.target.value }))} /></div><div className="form-field"><label>Warna embed default</label><div className="color-field"><input type="color" value={values.embedColor} onChange={(event) => setValues((current) => ({ ...current, embedColor: event.target.value }))} /><input value={values.embedColor} onChange={(event) => setValues((current) => ({ ...current, embedColor: event.target.value }))} /></div></div><div className="form-field"><label>Prefix publik</label><input value={data.status.prefix} disabled /></div></div></Card><Card><CardHeader title="Format Kritik & Saran" description="Tampilan embed saran warga bisa dirapikan langsung dari dashboard." /><div className="form-grid"><div className="form-field"><label>Judul embed saran</label><input value={values.suggestionTitle} onChange={(event) => setValues((current) => ({ ...current, suggestionTitle: event.target.value }))} /></div><div className="form-field"><label>Isi embed saran</label><textarea rows={7} value={values.suggestionDescription} onChange={(event) => setValues((current) => ({ ...current, suggestionDescription: event.target.value }))} /><small className="muted-copy">Placeholder aman: {'{user}'}, {'{content}'}, {'{title}'}. Format default: Pengirim lalu Isi Saran.</small></div></div></Card><Card><CardHeader title="Warna Semua Embed" description="Semua warna embed yang ada di config bisa diedit langsung dari dashboard tanpa buka code." /><div className="form-grid two-columns">{embedEntries.map(([key]) => <div className="form-field" key={key}><label>{key}</label><div className="color-field"><input type="color" value={embedColors[key] || "#7DBD77"} onChange={(event) => setEmbedColors((current) => ({ ...current, [key]: event.target.value }))} /><input value={embedColors[key] || "#7DBD77"} onChange={(event) => setEmbedColors((current) => ({ ...current, [key]: event.target.value }))} /></div></div>)}</div></Card>{dirty ? <div className="page-save-bar page-save-bar-dirty"><div><strong>Perubahan settings belum disimpan</strong><span>Simpan untuk menerapkan format saran dan warna embed baru, atau Batal untuk mengembalikan nilai awal.</span></div><div><Button variant="secondary" icon={<RefreshCcw size={16} />} onClick={cancel} disabled={saving}>Batal</Button><Button icon={<Save size={16} />} onClick={save} disabled={saving}>{saving ? "Menyimpan" : "Simpan"}</Button></div></div> : null}</div>;
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

export function KtpWargaPage() {
  const { data, picker, pickerLoading, refresh, refreshPicker, notify } = useDashboard();
  const defaultDesign: any = {
    title: { x: 506, y: 66, fontSize: 30, color: "#1f3016", align: "center", visible: true },
    subtitle: { x: 506, y: 94, fontSize: 20, color: "#1f3016", align: "center", visible: true },
    fields: { labelX: 58, colonX: 232, valueX: 264, startY: 190, gap: 57, labelSize: 21, valueSize: 21, labelColor: "#31441f", valueColor: "#1d2915", maxWidth: 430, visible: true },
    photo: { x: 748, y: 154, width: 220, height: 270, radius: 7, borderWidth: 2, borderColor: "#2b401c", frameColor: "#ebe9c7", visible: true },
    date: { x: 858, y: 458, fontSize: 15, valueY: 483, valueSize: 18, color: "#31441f", visible: true },
    status: { x: 858, y: 516, fontSize: 14, color: "#233316", visible: true },
    footerLeft: { x: 24, y: 621, fontSize: 12, color: "#233316", align: "left", visible: true },
    footerRight: { x: 987, y: 621, fontSize: 12, color: "#233316", align: "right", visible: true },
    decorations: []
  };
  const defaults: any = {
    enabled: true, channelId: "", channelName: "ktp-warga", cooldownSeconds: 15, allowUpdate: true,
    panelTitle: "KARTU TANDA PENDUDUK DESA TULUS",
    panelDescription: "Klik tombol **Buat KTP** untuk mengisi data warga. Gunakan nama panggilan dan domisili umum saja—jangan tulis alamat rumah, nomor telepon, kata sandi, atau data pribadi sensitif.",
    buttonLabel: "Buat KTP", resultContent: "🪪 Kartu Tanda Penduduk milik {user}",
    footerText: "DESA TULUS • Ketik rwktp untuk melihat KTP", backgroundPath: "assets/ktp-desa-tulus-background.png",
    backgroundFit: "exact", cardTitle: "KARTU TANDA PENDUDUK", cardSubtitle: "DESA TULUS",
    privacyNote: "KARTU KOMUNITAS DIGITAL • BUKAN DOKUMEN RESMI", logToConsole: true, design: defaultDesign
  };
  const mergeDesign = (raw: any = {}) => ({ ...defaultDesign, ...raw, fields: { ...defaultDesign.fields, ...(raw.fields || {}) }, photo: { ...defaultDesign.photo, ...(raw.photo || {}) }, title: { ...defaultDesign.title, ...(raw.title || {}) }, subtitle: { ...defaultDesign.subtitle, ...(raw.subtitle || {}) }, date: { ...defaultDesign.date, ...(raw.date || {}) }, status: { ...defaultDesign.status, ...(raw.status || {}) }, footerLeft: { ...defaultDesign.footerLeft, ...(raw.footerLeft || {}) }, footerRight: { ...defaultDesign.footerRight, ...(raw.footerRight || {}) }, decorations: Array.isArray(raw.decorations) ? raw.decorations : [] });
  const [values, setValues] = useState<any>(defaults);
  const [initial, setInitial] = useState<any>(defaults);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [selected, setSelected] = useState("title");
  useEffect(() => {
    const source = data.config.ktpSystem || {};
    const next = { ...defaults, ...source, design: mergeDesign(source.design) };
    setValues(next); setInitial(next);
  }, [data]);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const textChannels = (picker.channel || []).filter((item: any) => /text|announcement/i.test(String(item.typeLabel || item.meta || "")) && !/voice|stage|category|forum|media/i.test(String(item.typeLabel || item.meta || "")));
  const set = (key: string, value: any) => setValues((current: any) => ({ ...current, [key]: value }));
  const setDesign = (section: string, key: string, value: any) => setValues((current: any) => ({ ...current, design: { ...current.design, [section]: { ...current.design[section], [key]: value } } }));
  const setDecoration = (id: string, patch: any) => setValues((current: any) => ({ ...current, design: { ...current.design, decorations: current.design.decorations.map((item: any) => item.id === id ? { ...item, ...patch } : item) } }));
  const removeDecoration = (id: string) => setValues((current: any) => ({ ...current, design: { ...current.design, decorations: current.design.decorations.filter((item: any) => item.id !== id) } }));
  const upload = async (file: File, kind: "background" | "decoration") => {
    if (!file.type.startsWith("image/")) { notify("File harus berupa PNG, JPG, atau WebP.", "error"); return; }
    if (file.size > 6 * 1024 * 1024) { notify("Ukuran gambar maksimal 6 MB.", "error"); return; }
    setUploading(kind);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      const result = await api.uploadKtpAsset(kind, file.name, dataUrl);
      if (kind === "background") set("backgroundPath", result.path);
      else {
        const item = { id: `img-${Date.now()}`, name: file.name, path: result.path, x: 390, y: 220, width: 220, height: 140, opacity: 0.45, rotation: 0, visible: true };
        setValues((current: any) => ({ ...current, design: { ...current.design, decorations: [...current.design.decorations, item] } }));
        setSelected(item.id);
      }
      notify(kind === "background" ? "Background KTP berhasil diunggah." : "Image dekorasi berhasil ditambahkan.");
    } catch (error) { notify(error instanceof Error ? error.message : String(error), "error"); }
    finally { setUploading(""); }
  };
  const save = async () => {
    const selectedChannel = (picker.channel || []).find((item: any) => item.id === values.channelId) as any;
    if (!values.channelId) { notify("Pilih channel khusus panel KTP terlebih dahulu.", "error"); return; }
    if (selectedChannel && !/text|announcement/i.test(String(selectedChannel.typeLabel || selectedChannel.meta || ""))) { notify("Channel KTP harus berupa text channel.", "error"); return; }
    setSaving(true);
    try {
      await api.savePatches(Object.entries(values).map(([key, value]) => ({ path: `ktpSystem.${key}`, value })));
      await refresh(); setInitial(values); notify("Desain dan pengaturan KTP berhasil disimpan.");
    } catch (error) { notify(error instanceof Error ? error.message : String(error), "error"); }
    finally { setSaving(false); }
  };
  const cancel = () => { setValues(initial); notify("Perubahan KTP dibatalkan.", "info"); };
  const resetDesign = () => { if (!window.confirm("Kembalikan posisi desain KTP ke tata letak aman bawaan?")) return; setValues((current: any) => ({ ...current, design: defaultDesign })); };
  const previewStyle = (item: any) => ({ left: `${(Number(item.x || 0) / 1011) * 100}%`, top: `${(Number(item.y || 0) / 639) * 100}%`, fontSize: `${Math.max(8, Number(item.fontSize || item.valueSize || 18)) * .42}px`, color: item.color || "#1d2915", transform: `translate(${item.align === "center" ? "-50%" : item.align === "right" ? "-100%" : "0"}, -100%)`, textAlign: item.align || "left" } as any);
  const control = selected.startsWith("img-") ? values.design.decorations.find((d: any) => d.id === selected) : values.design[selected];
  return <div className="page-stack page-enter">
    <PageHeader icon={IdCard} kicker="KTP Design Studio" title="Editor KTP Warga" description="Atur panel, background, posisi teks, foto, footer, dan image dekorasi dari satu halaman dengan preview langsung." />
    <Card><CardHeader title="Alur yang jelas" description="1. Pilih channel panel • 2. Upload background/image • 3. Rapikan posisi • 4. Preview • 5. Simpan • 6. Test dengan rwktp." /><div className="ktp-workflow"><span>01 Channel Panel</span><span>02 Media</span><span>03 Tata Letak</span><span>04 Preview</span><span>05 Simpan</span><span>06 Test Discord</span></div></Card>
    <div className="ktp-studio-grid">
      <div className="ktp-editor-column">
        <Card><CardHeader title="Status & channel panel" description="Command rwktp tetap dapat dipakai di semua channel. Hanya panel rwktppanel yang dibatasi ke channel ini." action={<Button variant="secondary" icon={<RefreshCcw size={16}/>} onClick={refreshPicker}>Muat Discord</Button>} />
          <div className="setting-row setting-row-large"><div><strong>Aktifkan KTP Warga</strong><span>Renderer dan editor desain aktif.</span></div><Toggle checked={Boolean(values.enabled)} onChange={(next)=>set("enabled", next)} /></div>
          <div className="form-grid two-columns"><DiscordPicker kind="channel" label="Channel khusus panel KTP" helper="rwktppanel hanya boleh dikirim di channel ini" items={textChannels} value={values.channelId} loading={pickerLoading} required onChange={(id)=>set("channelId",id)} /><div className="form-field"><label>Cooldown (detik)</label><input type="number" min={1} max={3600} value={values.cooldownSeconds} onChange={(e)=>set("cooldownSeconds",Math.max(1,Number(e.target.value||15)))} /></div></div>
        </Card>
        <Card><CardHeader title="Media KTP" description="Ganti background atau tambahkan image dekorasi. File disimpan aman di project runtime dashboard." />
          <div className="ktp-upload-grid"><label className="ktp-upload-box"><FileImage size={20}/><strong>Upload Background</strong><span>PNG/JPG/WebP maksimal 6 MB</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e)=>e.target.files?.[0]&&upload(e.target.files[0],"background")} />{uploading==="background"?<em>Mengunggah...</em>:null}</label><label className="ktp-upload-box"><FileImage size={20}/><strong>Tambah Image</strong><span>Logo, stempel, ikon, ornamen</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e)=>e.target.files?.[0]&&upload(e.target.files[0],"decoration")} />{uploading==="decoration"?<em>Mengunggah...</em>:null}</label></div>
          <div className="form-grid two-columns"><div className="form-field"><label>Path background aktif</label><input value={values.backgroundPath} onChange={(e)=>set("backgroundPath",e.target.value)} /></div><div className="form-field"><label>Mode background</label><select value={values.backgroundFit} onChange={(e)=>set("backgroundFit",e.target.value)}><option value="exact">Exact 1:1</option><option value="cover">Cover</option><option value="contain">Contain</option></select></div></div>
        </Card>
        <Card><CardHeader title="Pilih elemen desain" description="Pilih elemen lalu ubah koordinat, ukuran, warna, dan visibilitas secara manual." />
          <div className="ktp-element-tabs">{[["title","Judul"],["subtitle","Subjudul"],["fields","Data Warga"],["photo","Foto"],["date","Tanggal"],["status","Status"],["footerLeft","Footer Kiri"],["footerRight","Footer Kanan"]].map(([id,label])=><button key={id} className={selected===id?"active":""} onClick={()=>setSelected(id)}>{label}</button>)}{values.design.decorations.map((item:any)=><button key={item.id} className={selected===item.id?"active":""} onClick={()=>setSelected(item.id)}>🖼 {item.name.slice(0,14)}</button>)}</div>
          {control ? <div className="ktp-control-panel">
            {!selected.startsWith("img-") && selected!=="fields" ? <><div className="form-grid three-columns"><div className="form-field"><label>X</label><input type="number" value={control.x} onChange={(e)=>setDesign(selected,"x",Number(e.target.value))}/></div><div className="form-field"><label>Y</label><input type="number" value={control.y} onChange={(e)=>setDesign(selected,"y",Number(e.target.value))}/></div>{control.fontSize!==undefined?<div className="form-field"><label>Ukuran font</label><input type="number" min={8} max={80} value={control.fontSize} onChange={(e)=>setDesign(selected,"fontSize",Number(e.target.value))}/></div>:null}</div><div className="form-grid two-columns">{control.color!==undefined?<div className="form-field"><label>Warna</label><input type="color" value={control.color} onChange={(e)=>setDesign(selected,"color",e.target.value)}/></div>:null}<div className="setting-row compact-setting"><div><strong>Tampilkan elemen</strong></div><Toggle checked={control.visible!==false} onChange={(next)=>setDesign(selected,"visible",next)}/></div></div></> : null}
            {selected==="fields"?<div className="form-grid three-columns">{[["labelX","X Label"],["colonX","X Titik Dua"],["valueX","X Isi"],["startY","Y Awal"],["gap","Jarak Baris"],["labelSize","Ukuran Label"],["valueSize","Ukuran Isi"],["maxWidth","Lebar Maks"]].map(([key,label])=><div className="form-field" key={key}><label>{label}</label><input type="number" value={control[key]} onChange={(e)=>setDesign("fields",key,Number(e.target.value))}/></div>)}</div>:null}
            {selected==="photo"?<div className="form-grid three-columns">{[["width","Lebar"],["height","Tinggi"],["radius","Radius"],["borderWidth","Tebal Garis"]].map(([key,label])=><div className="form-field" key={key}><label>{label}</label><input type="number" value={control[key]} onChange={(e)=>setDesign("photo",key,Number(e.target.value))}/></div>)}</div>:null}
            {selected.startsWith("img-")?<><div className="form-grid three-columns">{[["x","X"],["y","Y"],["width","Lebar"],["height","Tinggi"],["opacity","Opacity"],["rotation","Rotasi"]].map(([key,label])=><div className="form-field" key={key}><label>{label}</label><input type="number" step={key==="opacity"?0.05:1} value={control[key]} onChange={(e)=>setDecoration(control.id,{[key]:Number(e.target.value)})}/></div>)}</div><div className="settings-list"><div className="setting-row"><div><strong>Tampilkan image</strong></div><Toggle checked={control.visible!==false} onChange={(next)=>setDecoration(control.id,{visible:next})}/></div></div><Button variant="danger" onClick={()=>removeDecoration(control.id)}>Hapus Image</Button></>:null}
          </div>:null}
          <div className="actions-row"><Button variant="secondary" onClick={resetDesign}>Reset Tata Letak</Button></div>
        </Card>
        <Card><CardHeader title="Teks panel & kartu" description="Semua teks penting KTP dapat diedit tanpa mengubah command atau data warga." /><div className="form-grid two-columns"><div className="form-field"><label>Judul panel</label><input value={values.panelTitle} onChange={(e)=>set("panelTitle",e.target.value)}/></div><div className="form-field"><label>Teks tombol</label><input value={values.buttonLabel} onChange={(e)=>set("buttonLabel",e.target.value)}/></div><div className="form-field form-field-full"><label>Deskripsi panel</label><textarea rows={4} value={values.panelDescription} onChange={(e)=>set("panelDescription",e.target.value)}/></div><div className="form-field"><label>Judul kartu</label><input value={values.cardTitle} onChange={(e)=>set("cardTitle",e.target.value)}/></div><div className="form-field"><label>Subjudul kartu</label><input value={values.cardSubtitle} onChange={(e)=>set("cardSubtitle",e.target.value)}/></div><div className="form-field"><label>Footer Discord</label><input value={values.footerText} onChange={(e)=>set("footerText",e.target.value)}/></div><div className="form-field"><label>Catatan kartu</label><input value={values.privacyNote} onChange={(e)=>set("privacyNote",e.target.value)}/></div></div></Card>
      </div>
      <div className="ktp-preview-column"><Card><CardHeader title="Preview langsung" description="Preview berskala dari layout renderer 1011 × 639. Simpan untuk menerapkan ke hasil Discord." />
        <div className="ktp-live-preview" style={{backgroundImage:`url('/api/dashboard/ktp/asset?path=${encodeURIComponent(values.backgroundPath)}')`}}>
          {values.design.decorations.filter((d:any)=>d.visible!==false).map((d:any)=><img key={d.id} src={`/api/dashboard/ktp/asset?path=${encodeURIComponent(d.path)}`} style={{left:`${d.x/10.11}%`,top:`${d.y/6.39}%`,width:`${d.width/10.11}%`,height:`${d.height/6.39}%`,opacity:d.opacity,transform:`rotate(${d.rotation||0}deg)`}}/>)}
          {values.design.title.visible!==false?<strong className="ktp-preview-text" style={previewStyle(values.design.title)}>{values.cardTitle}</strong>:null}
          {values.design.subtitle.visible!==false?<strong className="ktp-preview-text" style={previewStyle(values.design.subtitle)}>{values.cardSubtitle}</strong>:null}
          {values.design.fields.visible!==false?<div className="ktp-preview-fields" style={{left:`${values.design.fields.labelX/10.11}%`,top:`${(values.design.fields.startY-24)/6.39}%`,color:values.design.fields.valueColor,fontSize:`${values.design.fields.valueSize*.42}px`,lineHeight:`${values.design.fields.gap*.42}px`}}>{[["No KTP","321234567890123456"],["Nama","Bekiw"],["Jenis Kelamin","Laki-laki"],["Domisili","Bogor, Jawa Barat"],["Agama","Islam"],["Hobi","Mengurus DESA TULUS"]].map(([l,v])=><div key={l}><b>{l}</b><span>:</span><strong>{v}</strong></div>)}</div>:null}
          {values.design.photo.visible!==false?<div className="ktp-preview-photo" style={{left:`${values.design.photo.x/10.11}%`,top:`${values.design.photo.y/6.39}%`,width:`${values.design.photo.width/10.11}%`,height:`${values.design.photo.height/6.39}%`,borderRadius:values.design.photo.radius*.42,borderWidth:Math.max(1,values.design.photo.borderWidth*.42),borderColor:values.design.photo.borderColor,background:values.design.photo.frameColor}}>BEKIW</div>:null}
          {values.design.date.visible!==false?<div className="ktp-preview-date" style={previewStyle(values.design.date)}>Tanggal Pembuatan:<b>18-06-2026</b></div>:null}
          {values.design.status.visible!==false?<strong className="ktp-preview-text" style={previewStyle(values.design.status)}>WARGA DESA TULUS</strong>:null}
          {values.design.footerLeft.visible!==false?<strong className="ktp-preview-text" style={previewStyle(values.design.footerLeft)}>{values.privacyNote}</strong>:null}
          {values.design.footerRight.visible!==false?<strong className="ktp-preview-text" style={previewStyle(values.design.footerRight)}>PAK RW • DESA TULUS</strong>:null}
        </div>
        <div className="ktp-preview-note"><ShieldCheck size={18}/><span>Preview tidak mengubah data warga. Nomor KTP, MongoDB, level, AI, AFK Voice, dan command lain tetap aman.</span></div>
      </Card></div>
    </div>
    {dirty?<div className="page-save-bar page-save-bar-dirty"><div><strong>Desain KTP belum disimpan</strong><span>Cek preview, lalu simpan agar renderer Discord memakai layout ini.</span></div><div><Button variant="secondary" icon={<RefreshCcw size={16}/>} onClick={cancel} disabled={saving}>Batal</Button><Button icon={<Save size={16}/>} onClick={save} disabled={saving}>{saving?"Menyimpan...":"Simpan Desain KTP"}</Button></div></div>:null}
  </div>;
}

export function DataIdServerPage() {
  const { data, picker, pickerLoading, refresh, refreshPicker, notify } = useDashboard();
  const defaults: any = {
    enabled: true, channelId: "", channelName: "rw-id-server", cooldownSeconds: 15,
    allowOwner: true, allowAdministrator: true, allowManageGuild: true,
    includeServerId: true, includeCategories: true, includeTextChannels: true, includeVoiceChannels: true,
    includeAnnouncementChannels: true, includeForumChannels: true, includeMediaChannels: true, includeStageChannels: true,
    includeOtherChannels: true, includeRoles: true, includeManagedRoles: true, includeEveryoneRole: true,
    includeJsonFormat: true, includeKeyValueFormat: true, fileName: "",
    loadingMessage: "Pak RW sedang mendata seluruh channel, kategori, voice, dan role server...",
    successMessage: "Data ID server berhasil dibuat.",
    errorMessage: "Pak RW gagal membuat Data ID Server. Periksa izin bot, channel khusus, dan konfigurasi fitur."
  };
  const [values, setValues] = useState<any>(defaults);
  const [initial, setInitial] = useState<any>(defaults);
  const [saving, setSaving] = useState(false);
  useEffect(() => { const next = { ...defaults, ...(data.config.serverIdExporter || {}) }; setValues(next); setInitial(next); }, [data]);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const textChannels = (picker.channel || []).filter((item: any) => /text|announcement/i.test(String(item.typeLabel || item.meta || "")) && !/voice|stage|category|forum|media/i.test(String(item.typeLabel || item.meta || "")));
  const set = (key: string, value: any) => setValues((current: any) => ({ ...current, [key]: value }));
  const save = async () => {
    const selected = (picker.channel || []).find((item: any) => item.id === values.channelId) as any;
    if (values.channelId && selected && !/text|announcement/i.test(String(selected.typeLabel || selected.meta || ""))) { notify("Channel Data ID Server harus berupa text channel.", "error"); return; }
    setSaving(true);
    try { await api.savePatches(Object.entries(values).map(([key, value]) => ({ path: `serverIdExporter.${key}`, value }))); await refresh(); setInitial(values); notify("Pengaturan Data ID Server berhasil disimpan."); }
    catch (error) { notify(error instanceof Error ? error.message : String(error), "error"); }
    finally { setSaving(false); }
  };
  const cancel = () => { setValues(initial); notify("Perubahan Data ID Server dibatalkan.", "info"); };
  const flags = [
    ["includeServerId", "Server ID"], ["includeCategories", "Category"], ["includeTextChannels", "Text Channel"],
    ["includeVoiceChannels", "Voice Channel"], ["includeAnnouncementChannels", "Announcement"], ["includeForumChannels", "Forum"],
    ["includeMediaChannels", "Media"], ["includeStageChannels", "Stage"], ["includeOtherChannels", "Other Channel"],
    ["includeRoles", "Semua Role"], ["includeManagedRoles", "Role Bot / Managed"], ["includeEveryoneRole", "Role @everyone"],
    ["includeJsonFormat", "Format JSON"], ["includeKeyValueFormat", "Format key=value"]
  ];
  return <div className="page-stack page-enter">
    <PageHeader icon={Server} kicker="Sistem Server" title="Data ID Server" description="Ambil seluruh ID server, category, channel, voice, forum, media, stage, dan role melalui satu command rwid." />
    <Card><CardHeader title="Status fitur" description="Command hanya bekerja di channel privat yang dipilih dan hanya untuk owner, Administrator, atau Kelola Server." />
      <div className="setting-row setting-row-large"><div><strong>Aktifkan Data ID Server</strong><span>Fitur read-only. Tidak mengubah channel, role, permission, atau data warga.</span></div><Toggle checked={Boolean(values.enabled)} onChange={(next) => set("enabled", next)} /></div>
      <div className="connection-strip"><span className={values.enabled && values.channelId ? "is-online" : ""} />{!values.enabled ? "Fitur Nonaktif" : values.channelId ? "Siap Digunakan" : "Channel Belum Dipilih"}</div>
    </Card>
    <Card><CardHeader title="Channel khusus" description="Pilih text channel privat rw-id-server langsung dari Discord. ID disimpan otomatis." action={<Button variant="secondary" icon={<RefreshCcw size={16} />} onClick={refreshPicker}>Muat ulang Discord</Button>} />
      <div className="form-grid two-columns"><DiscordPicker kind="channel" label="Channel Data ID Server" helper="Disarankan: 📋・rw-id-server" items={textChannels} value={values.channelId} loading={pickerLoading} required onChange={(id) => set("channelId", id)} />
      <div className="form-field"><label>Cooldown command (detik)</label><input type="number" min={1} max={3600} value={values.cooldownSeconds} onChange={(e) => set("cooldownSeconds", Math.max(1, Number(e.target.value || 15)))} /><small className="field-helper">Berlaku per pengguna. Default 15 detik.</small></div></div>
    </Card>
    <Card><CardHeader title="Izin pengguna" description="Pengecekan memakai permission Discord, bukan nama role." />
      <div className="settings-list">{[["allowOwner","Pemilik Server"],["allowAdministrator","Administrator"],["allowManageGuild","Kelola Server / Manage Guild"]].map(([key,label]) => <div className="setting-row" key={key}><div><strong>{label}</strong><span>Diizinkan menjalankan rwid di channel khusus.</span></div><Toggle checked={Boolean(values[key])} onChange={(next) => set(key,next)} /></div>)}</div>
    </Card>
    <Card><CardHeader title="Data yang disertakan" description="Pilih isi file TXT. Semua data tetap bersifat read-only." />
      <div className="form-grid two-columns">{flags.map(([key,label]) => <div className="setting-row compact-setting" key={key}><div><strong>{label}</strong></div><Toggle checked={Boolean(values[key])} onChange={(next) => set(key,next)} /></div>)}</div>
    </Card>
    <Card><CardHeader title="Teks dan nama file" description="Nama file kosong akan dibuat otomatis dari nama server dan tanggal WIB." />
      <div className="form-grid two-columns"><div className="form-field"><label>Nama file opsional</label><input value={values.fileName} onChange={(e) => set("fileName",e.target.value)} placeholder="server-ids-desa-tulus-YYYY-MM-DD.txt" /></div><div className="form-field"><label>Pesan loading</label><input value={values.loadingMessage} onChange={(e) => set("loadingMessage",e.target.value)} /></div><div className="form-field"><label>Pesan berhasil</label><input value={values.successMessage} onChange={(e) => set("successMessage",e.target.value)} /></div><div className="form-field"><label>Pesan gagal</label><input value={values.errorMessage} onChange={(e) => set("errorMessage",e.target.value)} /></div></div>
    </Card>
    <Card><CardHeader title="Cara menggunakan" description="Alur singkat setelah channel dan permission siap." /><div className="info-panel"><TerminalSquare size={19} /><p>Buka channel Data ID Server lalu ketik <code>rwid</code>. Pak RW mengirim satu file TXT berisi format detail, key=value, dan JSON valid.</p></div></Card>
    {dirty ? <div className="page-save-bar page-save-bar-dirty"><div><strong>Perubahan Data ID Server belum disimpan</strong><span>Simpan untuk menerapkan pengaturan, atau Batal untuk kembali.</span></div><div><Button variant="secondary" icon={<RefreshCcw size={16} />} onClick={cancel} disabled={saving}>Batal</Button><Button icon={<Save size={16} />} onClick={save} disabled={saving}>{saving ? "Menyimpan" : "Simpan Pengaturan"}</Button></div></div> : null}
  </div>;
}

export function AfkVoicePage() {
  const { data, picker, pickerLoading, refresh, refreshPicker, notify } = useDashboard();
  const defaults: any = { enabled: false, guildId: "1504495052217651343", channelId: "", selfMute: true, selfDeaf: true, autoReconnect: true, reconnectDelayMs: 5000, maxReconnectDelayMs: 60000 };
  const [values, setValues] = useState<any>({ ...defaults, ...(data.config.afkVoice || {}) });
  const [initial, setInitial] = useState<any>({ ...defaults, ...(data.config.afkVoice || {}) });
  const [status, setStatus] = useState<any>(null);
  const [busy, setBusy] = useState("");
  useEffect(() => { const next = { ...defaults, ...(data.config.afkVoice || {}) }; setValues(next); setInitial(next); }, [data]);
  const voiceChannels = (picker.channel || []).filter((item: any) => {
    const text = `${item.typeLabel || ""} ${item.meta || ""}`.toLowerCase();
    return (text.includes("guildvoice") || text.includes("voice")) && !text.includes("stage");
  });
  const selected: any = voiceChannels.find((item: any) => item.id === values.channelId);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const set = (key: string, value: any) => setValues((current: any) => ({ ...current, [key]: value }));
  const loadStatus = async (quiet = false) => {
    try { const result = await api.afkVoiceStatus(); setStatus(result.data); if (!quiet) notify("Status AFK Voice diperbarui.", "info"); }
    catch (error) { if (!quiet) notify(error instanceof Error ? error.message : String(error), "error"); }
  };
  useEffect(() => { loadStatus(true); const timer = window.setInterval(() => loadStatus(true), 10000); return () => window.clearInterval(timer); }, []);
  const run = async (name: string, action: () => Promise<any>) => {
    setBusy(name);
    try { const result = await action(); setStatus(result.data); notify(result.message || "Aksi AFK Voice berhasil."); await refresh(); }
    catch (error) { notify(error instanceof Error ? error.message : String(error), "error"); await loadStatus(true); }
    finally { setBusy(""); }
  };
  const save = () => run("save", async () => {
    if (values.enabled && !values.channelId) throw new Error("Pilih Channel Voice AFK terlebih dahulu.");
    const result = await api.saveAfkVoice(values); setInitial(values); return result;
  });
  const tone = status?.state === "Terhubung" ? "is-online" : "";
  return <div className="page-stack page-enter">
    <PageHeader icon={Headphones} kicker="Pengaturan Bot" title="AFK Voice 24/7" description="Pak RW menjaga satu koneksi voice selama proses bot dan hosting aktif, tanpa memutar musik atau audio." />
    <Card><CardHeader title="AFK Voice 24/7 Pak RW" description="Aktifkan koneksi permanen dan pilih satu voice channel DESA TULUS." />
      <div className="setting-row setting-row-large"><div><strong>Aktifkan AFK Voice 24/7</strong><span>Jika dinonaktifkan, Pak RW keluar dan tidak mencoba bergabung kembali.</span></div><Toggle checked={Boolean(values.enabled)} onChange={(next) => set("enabled", next)} /></div>
      <div className="connection-strip"><span className={tone} />{status?.state || (values.enabled ? "Terputus" : "Dinonaktifkan")}</div>
    </Card>
    <Card><CardHeader title="Channel Voice AFK" description="Hanya voice channel biasa yang ditampilkan. ID channel disimpan agar tetap bekerja saat nama berubah." action={<Button variant="secondary" icon={<RefreshCcw size={16} />} onClick={refreshPicker}>Muat ulang Discord</Button>} />
      <DiscordPicker kind="channel" label="Pilih voice channel" helper="Nama kategori dan voice dibaca langsung dari server." items={voiceChannels} value={values.channelId} loading={pickerLoading} required={Boolean(values.enabled)} onChange={(id) => set("channelId", id)} />
      <div className="info-panel"><Server size={19} /><p><strong>{selected?.rawName || selected?.name || "Belum dipilih"}</strong><br />ID: <code>{values.channelId || "-"}</code><br />Kategori: {selected?.category || selected?.meta || "-"}<br />Status: {values.channelId ? selected ? "Channel tersedia" : "Channel tidak ditemukan pada data Discord terbaru" : "Belum dipilih"}</p></div>
    </Card>
    <Card><CardHeader title="Koneksi otomatis" description="Reconnect bertahap untuk mencegah spam koneksi dan log." />
      <div className="settings-list"><div className="setting-row"><div><strong>Auto reconnect</strong><span>Coba bergabung kembali setelah disconnect atau restart.</span></div><Toggle checked={Boolean(values.autoReconnect)} onChange={(next) => set("autoReconnect", next)} /></div><div className="setting-row"><div><strong>Self mute</strong><span>Pak RW masuk dalam keadaan mute.</span></div><Toggle checked={Boolean(values.selfMute)} onChange={(next) => set("selfMute", next)} /></div><div className="setting-row"><div><strong>Self deaf</strong><span>Pak RW tidak menerima audio voice.</span></div><Toggle checked={Boolean(values.selfDeaf)} onChange={(next) => set("selfDeaf", next)} /></div></div>
      <div className="form-grid two-columns"><div className="form-field"><label>Jeda reconnect awal</label><input type="number" min={1000} max={60000} value={values.reconnectDelayMs} onChange={(e) => set("reconnectDelayMs", Number(e.target.value || 5000))} /><small className="field-helper">Milidetik. Default 5000.</small></div><div className="form-field"><label>Jeda reconnect maksimum</label><input type="number" min={5000} max={300000} value={values.maxReconnectDelayMs} onChange={(e) => set("maxReconnectDelayMs", Number(e.target.value || 60000))} /><small className="field-helper">Milidetik. Default 60000.</small></div></div>
    </Card>
    <Card><CardHeader title="Status koneksi langsung" description="Data dibaca dari proses bot, bukan hanya cache tampilan dashboard." />
      <div className="form-grid two-columns"><div className="info-panel"><Activity size={19} /><p>Status: <strong>{status?.state || "Memuat"}</strong><br />Server: {data.guild?.name || "DESA TULUS"}<br />Voice aktif: {status?.channelName || "-"}<br />Terhubung sejak: {status?.connectedAt ? new Date(status.connectedAt).toLocaleString("id-ID") : "-"}</p></div><div className="info-panel"><RefreshCcw size={19} /><p>Percobaan reconnect: <strong>{status?.reconnectAttempts || 0}</strong><br />Percobaan terakhir: {status?.lastAttemptAt ? new Date(status.lastAttemptAt).toLocaleString("id-ID") : "-"}<br />Error terakhir: {status?.lastError || "Tidak ada"}</p></div></div>
    </Card>
    <Card><CardHeader title="Kontrol koneksi" description="Tombol dinonaktifkan sementara saat request berlangsung agar tidak membuat koneksi ganda." />
      <div className="actions"><Button onClick={save} disabled={Boolean(busy) || !dirty}>{busy === "save" ? "Menerapkan" : "Simpan dan Terapkan"}</Button><Button variant="secondary" onClick={() => run("connect", api.connectAfkVoice)} disabled={Boolean(busy) || !values.enabled || !values.channelId}>Hubungkan Sekarang</Button><Button variant="secondary" onClick={() => run("reconnect", api.reconnectAfkVoice)} disabled={Boolean(busy) || !values.enabled || !values.channelId}>Hubungkan Ulang</Button><Button variant="danger" onClick={() => run("disconnect", api.disconnectAfkVoice)} disabled={Boolean(busy)}>Putuskan dan Nonaktifkan</Button><Button variant="secondary" icon={<RefreshCcw size={16} />} onClick={() => loadStatus()} disabled={Boolean(busy)}>Segarkan Status</Button></div>
      <div className="info-panel"><CircleAlert size={19} /><p>Pak RW akan tetap berada di voice channel selama proses bot dan hosting aktif. Jika hosting berhenti, bot akan bergabung kembali setelah proses aktif kembali.</p></div>
    </Card>
    {dirty ? <div className="page-save-bar page-save-bar-dirty"><div><strong>Perubahan AFK Voice belum diterapkan</strong><span>Klik Simpan dan Terapkan agar konfigurasi tersimpan dan koneksi langsung diperbarui.</span></div><div><Button variant="secondary" onClick={() => setValues(initial)} disabled={Boolean(busy)}>Batal</Button><Button icon={<Save size={16} />} onClick={save} disabled={Boolean(busy)}>{busy === "save" ? "Menerapkan" : "Simpan dan Terapkan"}</Button></div></div> : null}
  </div>;
}
