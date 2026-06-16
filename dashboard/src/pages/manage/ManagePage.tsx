import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Activity, CheckCircle2, CircleAlert, FileText, Info, Layers3, RefreshCcw, Save,
  Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Wand2
} from "lucide-react";
import { useDashboard } from "../../app/DashboardContext";
import type { EmbedDraft } from "../../app/types";
import { DiscordPicker } from "../../components/pickers/DiscordPicker";
import { EmbedBuilder } from "../../components/embed/EmbedBuilder";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Toggle } from "../../components/ui/Toggle";
import { api } from "../../lib/api";
import { getFeature } from "../../lib/features";

const tabs = [
  { id: "general", label: "Umum", icon: Settings2 },
  { id: "targets", label: "Channel & Role", icon: Layers3 },
  { id: "content", label: "Konten", icon: FileText },
  { id: "embed", label: "Embed & Preview", icon: SlidersHorizontal },
  { id: "permissions", label: "Izin", icon: ShieldCheck },
  { id: "activity", label: "Aktivitas", icon: Activity }
] as const;

type TabId = typeof tabs[number]["id"];
type Binding = {
  key: string;
  path?: string;
  kind: "channel" | "role" | "user";
  label: string;
  helper: string;
  required?: boolean;
  persist?: boolean;
};

const TARGETS: Record<string, Binding[]> = {
  welcome: [
    { key: "welcomeChannel", path: "welcome.channelId", kind: "channel", label: "Channel Welcome", helper: "Tempat pesan sambutan warga baru dikirim.", required: true },
    { key: "memberRole", path: "welcome.memberRoleId", kind: "role", label: "Role Member Tulus", helper: "Role yang ditag atau diberikan kepada warga baru.", required: true },
    { key: "rulesChannel", path: "rulesChannelId", kind: "channel", label: "Channel Aturan Desa", helper: "Dipakai oleh placeholder {rulesChannel}.", required: true },
    { key: "chatChannel", path: "chatWargaChannelId", kind: "channel", label: "Channel Chat Warga", helper: "Dipakai oleh placeholder {chatWargaChannel}.", required: true },
    { key: "ticketChannel", path: "ticketChannelId", kind: "channel", label: "Channel Ticket", helper: "Dipakai oleh placeholder {ticketChannel}." }
  ],
  ai: [{ key: "aiChannel", path: "aiChannelId", kind: "channel", label: "Channel AI Pak RW", helper: "Pak RW hanya merespons di channel yang dipilih.", required: true }],
  curhat: [{ key: "curhatChannel", path: "curhatChannelId", kind: "channel", label: "Channel Curhat", helper: "Tempat panel dan balasan curhat warga.", required: true }],
  "curhat-anonim": [{ key: "anonymousCurhat", path: "anonymousCurhatChannelId", kind: "channel", label: "Channel Curhat Anonim", helper: "Identitas warga tidak ditampilkan pada pesan publik.", required: true }],
  saran: [{ key: "suggestionChannel", path: "suggestionChannelId", kind: "channel", label: "Channel Saran & Voting", helper: "Tempat saran warga diposting dan divoting.", required: true }],
  level: [
    { key: "levelChannel", path: "levelChannelId", kind: "channel", label: "Channel Level", helper: "Notifikasi level-up dikirim ke channel ini.", required: true },
    { key: "levelRole", path: "level100RoleId", kind: "role", label: "Role Reward Level", helper: "Role reward yang dikelola oleh sistem level." }
  ],
  "cek-poin": [{ key: "cekPoinChannel", path: "cekPoinChannelId", kind: "channel", label: "Channel Cek Poin", helper: "Command cek poin hanya digunakan di channel ini.", required: true }],
  "top-aktif": [
    { key: "topActiveChannel", path: "topActive.channelId", kind: "channel", label: "Channel Top Aktif Bulanan", helper: "Peringkat bulanan otomatis dikirim ke channel ini.", required: true },
    { key: "motmRole", path: "topActive.memberOfTheMonthRoleId", kind: "role", label: "Role Member Of The Month", helper: "Role otomatis saat warga mencapai target poin." }
  ],
  "papan-aktif": [{ key: "leaderboardChannel", path: "leaderboardAktif.channelId", kind: "channel", label: "Channel Papan Aktif Lifetime", helper: "Channel khusus leaderboard seumur hidup. Jangan digabung dengan Top Aktif bulanan.", required: true }],
  motm: [{ key: "motmRole", path: "topActive.memberOfTheMonthRoleId", kind: "role", label: "Role Member Of The Month", helper: "Role Pak RW harus berada di atas role ini.", required: true }],
  donatur: [{ key: "donaturRole", path: "donaturRoleId", kind: "role", label: "Role Donatur Desa", helper: "Role benefit donatur yang dikelola Pak RW.", required: true }],
  juragan: [
    { key: "juraganRole", path: "juragan.roleId", kind: "role", label: "Role Juragan Desa", helper: "Role utama untuk anggota Juragan.", required: true },
    { key: "juraganChannel", path: "juragan.boostChannelId", kind: "channel", label: "Channel Juragan", helper: "Channel benefit atau boost khusus Juragan." }
  ],
  mabar: [{ key: "mabarChannel", path: "mabar.channelId", kind: "channel", label: "Channel Cari Mabar", helper: "Tempat panel cari teman bermain dikirim.", required: true }],
  "boost-poin": [{ key: "boostChannel", path: "boostPoin.channelId", kind: "channel", label: "Channel Pengumuman Boost", helper: "Pengumuman boost poin dikirim ke channel ini.", required: true }],
  embed: [{ key: "testChannel", kind: "channel", label: "Channel Kirim Tes", helper: "Hanya dipakai untuk uji kirim. Tidak mengubah channel fitur lain.", required: true, persist: false }]
};

function readPath(source: Record<string, any>, path?: string) {
  if (!path) return undefined;
  return path.split(".").reduce((value, key) => value?.[key], source as any);
}

function normalizeEmbed(raw: Record<string, any> = {}): EmbedDraft {
  return {
    content: raw.content || "",
    authorName: raw.authorName || raw.author || "",
    authorIcon: raw.authorIcon || "",
    title: raw.title || "",
    description: raw.description || "",
    color: raw.color || "#88a08c",
    thumbnailUrl: raw.thumbnailUrl || (raw.thumbnail && raw.thumbnail !== "avatar" ? raw.thumbnail : ""),
    imageUrl: raw.imageUrl || raw.image || "",
    footerText: raw.footerText || raw.footer || "",
    footerIcon: raw.footerIcon || "",
    timestamp: Boolean(raw.timestamp),
    fields: Array.isArray(raw.fields) ? raw.fields : [],
    buttons: Array.isArray(raw.buttons) ? raw.buttons : raw.buttonLabel ? [{ label: raw.buttonLabel, url: raw.buttonUrl || "" }] : []
  };
}

export function ManagePage() {
  const { feature: slug = "welcome" } = useParams();
  const feature = getFeature(slug);
  const { data, picker, pickerLoading, refresh, refreshPicker, notify } = useDashboard();
  const [tab, setTab] = useState<TabId>(slug === "embed" ? "embed" : "general");
  const [enabled, setEnabled] = useState(true);
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [embedKey, setEmbedKey] = useState(feature.embedKey || "welcome");
  const [embed, setEmbed] = useState<EmbedDraft>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [topLimit, setTopLimit] = useState(10);
  const [postHour, setPostHour] = useState(0);
  const [aiModel, setAiModel] = useState("openai/gpt-4o-mini");
  const [aiMaxTokens, setAiMaxTokens] = useState(460);
  const [motmThreshold, setMotmThreshold] = useState(100000);

  const bindings = TARGETS[slug] || [];
  const availableEmbedKeys = useMemo(() => Object.keys(data.embeds || {}).filter((key) => key !== "dashboard"), [data.embeds]);
  const primaryChannelId = bindings.find((binding) => binding.kind === "channel") ? targets[bindings.find((binding) => binding.kind === "channel")!.key] || "" : "";
  const requiredBindings = bindings.filter((binding) => binding.required);
  const completedRequired = requiredBindings.filter((binding) => Boolean(targets[binding.key])).length;
  const configComplete = requiredBindings.length === completedRequired;

  useEffect(() => {
    const cfg = data.config || {};
    const nextEmbedKey = slug === "embed" ? (embedKey && data.embeds[embedKey] ? embedKey : availableEmbedKeys[0] || "welcome") : feature.embedKey || "welcome";
    const nextTargets: Record<string, string> = {};
    (TARGETS[slug] || []).forEach((binding) => {
      if (binding.path) nextTargets[binding.key] = String(readPath(cfg, binding.path) || "");
      else nextTargets[binding.key] = "";
    });
    setEnabled(feature.configPath ? readPath(cfg, feature.configPath) !== false : true);
    setTargets(nextTargets);
    setEmbedKey(nextEmbedKey);
    setEmbed(normalizeEmbed(data.embeds?.[nextEmbedKey] || {}));
    setTopLimit(Number(readPath(cfg, slug === "papan-aktif" ? "leaderboardAktif.topLimit" : "topActive.topLimit") || 10));
    setPostHour(Number(readPath(cfg, slug === "papan-aktif" ? "leaderboardAktif.autoPostHourWIB" : "topActive.dailyPostHourWIB") ?? 0));
    setAiModel(String(readPath(cfg, "ai.openRouterModel") || "openai/gpt-4o-mini"));
    setAiMaxTokens(Number(readPath(cfg, "ai.maxTokens") || 460));
    setMotmThreshold(Number(readPath(cfg, "level.cycleResetAtPoints") || readPath(cfg, "topActive.pointsThreshold") || 100000));
    setDirty(false);
  }, [data, slug, feature, availableEmbedKeys]);

  useEffect(() => {
    if (slug !== "embed") return;
    setEmbed(normalizeEmbed(data.embeds?.[embedKey] || {}));
    setDirty(false);
  }, [embedKey, slug, data.embeds]);

  const updateTarget = (key: string, value: string) => {
    setTargets((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const patches: Array<{ path: string; value: unknown }> = [];
      if (feature.configPath) patches.push({ path: feature.configPath, value: enabled });
      bindings.forEach((binding) => {
        if (binding.path && binding.persist !== false) patches.push({ path: binding.path, value: targets[binding.key] || "" });
      });
      if (slug === "top-aktif") {
        patches.push({ path: "topActive.topLimit", value: topLimit });
        patches.push({ path: "topActive.dailyPostHourWIB", value: postHour });
      }
      if (slug === "papan-aktif") {
        patches.push({ path: "leaderboardAktif.topLimit", value: topLimit });
        patches.push({ path: "leaderboardAktif.autoPostHourWIB", value: postHour });
      }
      if (slug === "motm") {
        patches.push({ path: "level.cycleResetAtPoints", value: motmThreshold });
        patches.push({ path: "topActive.pointsThreshold", value: motmThreshold });
      }
      if (slug === "ai") {
        patches.push({ path: "ai.openRouterModel", value: aiModel });
        patches.push({ path: "ai.maxTokens", value: aiMaxTokens });
      }
      if (patches.length) await api.savePatches(patches);
      if (embedKey) await api.saveEmbed(embedKey, embed as Record<string, any>);
      await refresh();
      setDirty(false);
      notify(`${feature.name} berhasil disimpan.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setSaving(false);
    }
  };

  const testEmbed = async () => {
    if (!primaryChannelId) {
      notify("Pilih channel Kirim Tes terlebih dahulu.", "error");
      setTab("targets");
      return;
    }
    setSaving(true);
    try {
      await api.testEmbed(primaryChannelId, embed as Record<string, any>);
      notify("Embed tes berhasil dikirim ke Discord.");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setSaving(false);
    }
  };

  const FeatureIcon = feature.icon;

  return (
    <div className="page-stack page-enter">
      <section className="feature-header feature-header-clean">
        <div className="feature-header-icon"><FeatureIcon size={24} /></div>
        <div className="feature-header-copy">
          <div className="feature-header-kicker">Kelola Fitur</div>
          <h1>{feature.name}</h1>
          <p>{feature.description}</p>
        </div>
        <div className="feature-header-status">
          <StatusBadge label={enabled ? "Aktif" : "Nonaktif"} tone={enabled ? "success" : "warning"} />
          <StatusBadge label={configComplete ? "Siap digunakan" : `${completedRequired}/${requiredBindings.length} target siap`} tone={configComplete ? "success" : "warning"} />
        </div>
      </section>

      <section className="setup-steps" aria-label="Alur pengaturan">
        <button className={tab === "targets" ? "is-active" : configComplete ? "is-complete" : ""} onClick={() => setTab("targets")}><span>1</span><div><strong>Pilih channel & role</strong><small>Ambil langsung dari Discord</small></div>{configComplete ? <CheckCircle2 size={18} /> : null}</button>
        <button className={tab === "content" || tab === "embed" ? "is-active" : ""} onClick={() => setTab("embed")}><span>2</span><div><strong>Edit embed</strong><small>Konten dan preview langsung</small></div></button>
        <button className={tab === "activity" ? "is-active" : ""} onClick={() => setTab("activity")}><span>3</span><div><strong>Simpan & tes</strong><small>Kirim uji ke channel pilihan</small></div></button>
      </section>

      <div className="manage-tabs" role="tablist">
        {tabs.map((item) => {
          const Icon = item.icon;
          return <button key={item.id} className={tab === item.id ? "is-active" : ""} onClick={() => setTab(item.id)}><Icon size={17} />{item.label}</button>;
        })}
      </div>

      {tab === "general" ? (
        <div className="manage-layout">
          <Card>
            <CardHeader title="Status fitur" description="Matikan sementara tanpa menghapus channel, role, atau template lama." />
            <div className="setting-row setting-row-large"><div><strong>Aktifkan {feature.name}</strong><span>Data lama tetap aman saat fitur dinonaktifkan.</span></div><Toggle checked={enabled} onChange={(next) => { setEnabled(next); setDirty(true); }} /></div>
          </Card>
          <Card>
            <CardHeader title="Ringkasan setup" description="Lihat bagian yang sudah siap sebelum menyimpan." />
            <div className="setup-summary-list">
              <div><span className={picker.ok ? "summary-dot is-ok" : "summary-dot"} /><div><strong>Koneksi Discord</strong><small>{picker.ok ? `Terhubung ke ${picker.guild?.name || "DESA TULUS"}` : "Belum membaca server Discord"}</small></div></div>
              <div><span className={configComplete ? "summary-dot is-ok" : "summary-dot"} /><div><strong>Channel & role</strong><small>{requiredBindings.length ? `${completedRequired} dari ${requiredBindings.length} target wajib sudah dipilih` : "Fitur ini tidak memiliki target wajib"}</small></div></div>
              <div><span className="summary-dot is-ok" /><div><strong>Template embed</strong><small>{embedKey || "Tidak menggunakan template"}</small></div></div>
            </div>
          </Card>
          {slug === "ai" ? <Card><CardHeader title="AI hemat OpenRouter" description="Pengaturan aman yang sudah didukung core bot." /><div className="form-grid two-columns"><div className="form-field"><label>Model utama</label><input value={aiModel} onChange={(event) => { setAiModel(event.target.value); setDirty(true); }} /><small className="field-helper">Gunakan openai/gpt-4o-mini untuk mode hemat.</small></div><div className="form-field"><label>Max token</label><input type="number" min={100} max={1000} value={aiMaxTokens} onChange={(event) => { setAiMaxTokens(Number(event.target.value)); setDirty(true); }} /><small className="field-helper">Batas aman rekomendasi: 300–600.</small></div></div></Card> : null}
          {slug === "top-aktif" || slug === "papan-aktif" ? <Card><CardHeader title="Jadwal leaderboard" description="Scheduler core bot tidak diubah; dashboard hanya menyimpan setting yang didukung." /><div className="form-grid two-columns"><div className="form-field"><label>Jumlah peringkat</label><input type="number" min={3} max={25} value={topLimit} onChange={(event) => { setTopLimit(Number(event.target.value)); setDirty(true); }} /></div><div className="form-field"><label>Jam post WIB</label><input type="number" min={0} max={23} value={postHour} onChange={(event) => { setPostHour(Number(event.target.value)); setDirty(true); }} /><small className="field-helper">Gunakan 0 untuk pukul 00.00 WIB.</small></div></div></Card> : null}
          {slug === "motm" ? <Card><CardHeader title="Threshold MOTM" description="Lifetime point tetap lanjut dan tidak ikut reset." /><div className="form-field"><label>Target poin siklus</label><input type="number" min={1000} value={motmThreshold} onChange={(event) => { setMotmThreshold(Number(event.target.value)); setDirty(true); }} /><small className="field-helper">Default DESA TULUS: 100.000 poin.</small></div></Card> : null}
        </div>
      ) : null}

      {tab === "targets" ? (
        <div className="targets-layout">
          <Card className="targets-main-card">
            <CardHeader title="Pilih langsung dari Discord" description="Klik satu kali, cari nama channel atau role, lalu pilih. ID tersimpan otomatis." action={<Button variant="secondary" icon={<RefreshCcw size={16} />} onClick={refreshPicker}>Muat ulang Discord</Button>} />
            <div className={`discord-connection-banner ${picker.ok ? "is-connected" : ""}`}>
              <span className="connection-icon">{picker.ok ? <CheckCircle2 size={20} /> : <CircleAlert size={20} />}</span>
              <div><strong>{picker.ok ? `Terhubung ke ${picker.guild?.name || "DESA TULUS"}` : "Discord belum terbaca"}</strong><small>{picker.counts ? `${picker.counts.channels} channel · ${picker.counts.roles} role · ${picker.counts.users} user tersedia` : picker.error || "Pastikan bot online dan GUILD_ID benar, lalu tekan Muat ulang Discord."}</small></div>
            </div>
            <div className="target-picker-list">
              {bindings.length ? bindings.map((binding, index) => (
                <div className="target-picker-row" key={binding.key}>
                  <span className="target-number">{String(index + 1).padStart(2, "0")}</span>
                  <DiscordPicker kind={binding.kind} label={binding.label} helper={binding.helper} items={picker[binding.kind] || []} value={targets[binding.key] || ""} onChange={(id) => updateTarget(binding.key, id)} loading={pickerLoading} required={binding.required} />
                </div>
              )) : <div className="empty-state compact"><Layers3 size={24} /><strong>Tidak ada target yang perlu dipilih</strong><span>Fitur ini dapat langsung diedit melalui tab Embed & Preview.</span></div>}
            </div>
          </Card>
          <aside className="target-side-stack">
            <Card>
              <CardHeader title="Status pengaturan" description="Target wajib harus lengkap sebelum kirim tes." />
              <div className="validation-list validation-list-large">
                {requiredBindings.length ? requiredBindings.map((binding) => <div key={binding.key} className={targets[binding.key] ? "is-valid" : "is-warning"}><span />{binding.label} {targets[binding.key] ? "siap" : "belum dipilih"}</div>) : <div className="is-valid"><span />Tidak ada target wajib.</div>}
                <div className="is-valid"><span />@everyone dan @here diblokir.</div>
              </div>
            </Card>
            <Card>
              <CardHeader title="Cara paling gampang" description="Tidak perlu membuka Developer Mode atau menyalin ID." />
              <ol className="simple-steps"><li>Klik kolom pilihan.</li><li>Ketik nama channel atau role.</li><li>Klik hasil yang benar.</li><li>Tekan Simpan perubahan.</li></ol>
            </Card>
          </aside>
        </div>
      ) : null}

      {tab === "content" ? (
        <div className="manage-layout">
          <Card><CardHeader title="Template aktif" description="Pilih template yang akan diedit." />
            {slug === "embed" ? <div className="form-field"><label>Template embed</label><select value={embedKey} onChange={(event) => setEmbedKey(event.target.value)}>{availableEmbedKeys.map((key) => <option key={key} value={key}>{key}</option>)}</select></div> : <div className="template-summary"><span>Template</span><strong>{embedKey}</strong><small>Disimpan pada config.embeds.{embedKey}</small></div>}
          </Card>
          <Card><CardHeader title="Placeholder cepat" description="Klik token untuk menyalin, lalu tempel ke editor." /><div className="placeholder-shortcuts">{["{user}", "{displayName}", "{memberTulusRole}", "{rulesChannel}", "{chatWargaChannel}", "{memberCount}", "{level}", "{lifetimeTotal}", "{month}", "{year}"].map((token) => <button key={token} onClick={() => navigator.clipboard.writeText(token)}>{token}</button>)}</div><a className="text-link" href="/dashboard/placeholder-center">Buka Placeholder Center lengkap</a></Card>
          <Card className="full-span-card"><CardHeader title="Langsung edit di pratinjau" description="Semua field konten tersedia pada tab Embed & Preview." action={<Button icon={<Wand2 size={16} />} onClick={() => setTab("embed")}>Buka editor</Button>} /><div className="info-panel"><Sparkles size={19} /><p>Gunakan menu Sisipkan Data pada editor untuk memilih channel, role, user, atau placeholder tanpa mengetik manual.</p></div></Card>
        </div>
      ) : null}

      {tab === "embed" ? <EmbedBuilder value={embed} onChange={(next) => { setEmbed(next); setDirty(true); }} picker={picker} onSave={saveSettings} onTest={testEmbed} saving={saving} channelMissing={!primaryChannelId && bindings.some((binding) => binding.kind === "channel" && binding.required)} /> : null}

      {tab === "permissions" ? <div className="manage-layout"><Card><CardHeader title="Izin yang diperlukan" description="Periksa role Pak RW jika fitur gagal mengirim atau mengatur role." /><div className="permission-grid">{["View Channel", "Send Messages", "Embed Links", "Attach Files", "Read Message History", "Use External Emojis", bindings.some((binding) => binding.kind === "role") ? "Manage Roles" : null].filter(Boolean).map((permission) => <div key={permission as string}><ShieldCheck size={18} /><span>{permission}</span></div>)}</div></Card><Card><CardHeader title="Keamanan mention" description="Mention massal tidak diizinkan." /><div className="info-panel"><Info size={19} /><p>Content dan description mendukung user, role, dan channel mention. Title, author, serta footer otomatis menggunakan nama biasa agar tidak menampilkan kode mentah.</p></div></Card></div> : null}

      {tab === "activity" ? <Card><CardHeader title="Aktivitas terbaru" description={`Perubahan yang berkaitan dengan ${feature.name}.`} /><div className="activity-list">{data.activity?.length ? data.activity.slice(0, 12).map((item, index) => <div className="activity-item" key={`${item.at}-${index}`}><span className="activity-marker" /><div><strong>{item.title}</strong><small>{item.detail || "Perubahan dashboard"}</small></div><time>{new Date(item.at).toLocaleString("id-ID")}</time></div>) : <div className="empty-inline">Belum ada aktivitas.</div>}</div></Card> : null}

      {tab !== "embed" ? <div className="page-save-bar"><div><strong>{dirty ? "Ada perubahan belum disimpan" : "Semua perubahan tersimpan"}</strong><span>Hanya field yang dipilih yang diperbarui. Data warga tidak disentuh.</span></div><div><Button variant="secondary" icon={<RefreshCcw size={16} />} onClick={() => refresh()}>Batalkan</Button><Button icon={<Save size={16} />} disabled={!dirty || saving} onClick={saveSettings}>{saving ? "Menyimpan" : "Simpan perubahan"}</Button></div></div> : null}
    </div>
  );
}
