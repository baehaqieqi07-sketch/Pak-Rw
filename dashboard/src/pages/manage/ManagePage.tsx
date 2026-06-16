import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Activity, CircleAlert, FileText, Info, Layers3, RefreshCcw, Save,
  Settings2, ShieldCheck, SlidersHorizontal
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
  { id: "embed", label: "Embed", icon: SlidersHorizontal },
  { id: "permissions", label: "Izin", icon: ShieldCheck },
  { id: "activity", label: "Aktivitas", icon: Activity }
] as const;

type TabId = typeof tabs[number]["id"];

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

function preferredChannelPath(slug: string, fallback?: string) {
  const map: Record<string, string> = {
    welcome: "welcome.channelId",
    "curhat-anonim": "anonymousCurhatChannelId",
    saran: "suggestionChannelId",
    "cek-poin": "cekPoinChannelId",
    "top-aktif": "topActive.channelId",
    "papan-aktif": "leaderboardAktif.channelId",
    mabar: "mabar.channelId",
    "boost-poin": "boostPoin.channelId"
  };
  return map[slug] || fallback || "";
}

function preferredRolePath(slug: string, fallback?: string) {
  const map: Record<string, string> = {
    welcome: "welcome.memberRoleId",
    motm: "topActive.memberOfTheMonthRoleId"
  };
  return map[slug] || fallback || "";
}

export function ManagePage() {
  const { feature: slug = "welcome" } = useParams();
  const feature = getFeature(slug);
  const { data, picker, pickerLoading, refresh, refreshPicker, notify } = useDashboard();
  const [tab, setTab] = useState<TabId>(slug === "embed" ? "embed" : "general");
  const [enabled, setEnabled] = useState(true);
  const [channelId, setChannelId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [embedKey, setEmbedKey] = useState(feature.embedKey || "welcome");
  const [embed, setEmbed] = useState<EmbedDraft>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [topLimit, setTopLimit] = useState(10);
  const [postHour, setPostHour] = useState(0);
  const [aiModel, setAiModel] = useState("openai/gpt-4o-mini");
  const [aiMaxTokens, setAiMaxTokens] = useState(460);
  const [motmThreshold, setMotmThreshold] = useState(100000);

  const channelPath = preferredChannelPath(slug, feature.channelPath);
  const rolePath = preferredRolePath(slug, feature.rolePath);
  const availableEmbedKeys = useMemo(() => Object.keys(data.embeds || {}).filter((key) => key !== "dashboard"), [data.embeds]);

  useEffect(() => {
    const cfg = data.config || {};
    const nextEmbedKey = slug === "embed" ? (embedKey && data.embeds[embedKey] ? embedKey : availableEmbedKeys[0] || "welcome") : feature.embedKey || "welcome";
    setEnabled(feature.configPath ? readPath(cfg, feature.configPath) !== false : true);
    setChannelId(String(readPath(cfg, channelPath) || ""));
    setRoleId(String(readPath(cfg, rolePath) || ""));
    setEmbedKey(nextEmbedKey);
    setEmbed(normalizeEmbed(data.embeds?.[nextEmbedKey] || {}));
    setTopLimit(Number(readPath(cfg, slug === "papan-aktif" ? "leaderboardAktif.topLimit" : "topActive.topLimit") || 10));
    setPostHour(Number(readPath(cfg, slug === "papan-aktif" ? "leaderboardAktif.autoPostHourWIB" : "topActive.dailyPostHourWIB") ?? 0));
    setAiModel(String(readPath(cfg, "ai.openRouterModel") || "openai/gpt-4o-mini"));
    setAiMaxTokens(Number(readPath(cfg, "ai.maxTokens") || 460));
    setMotmThreshold(Number(readPath(cfg, "level.cycleResetAtPoints") || readPath(cfg, "topActive.pointsThreshold") || 100000));
    setDirty(false);
  }, [data, slug, feature, channelPath, rolePath, availableEmbedKeys]);

  useEffect(() => {
    if (slug !== "embed") return;
    setEmbed(normalizeEmbed(data.embeds?.[embedKey] || {}));
    setDirty(false);
  }, [embedKey, slug, data.embeds]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const patches: Array<{ path: string; value: unknown }> = [];
      if (feature.configPath) patches.push({ path: feature.configPath, value: enabled });
      if (channelPath) patches.push({ path: channelPath, value: channelId });
      if (rolePath) patches.push({ path: rolePath, value: roleId });
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
    if (!channelId) {
      notify("Pilih channel tujuan terlebih dahulu.", "error");
      setTab("targets");
      return;
    }
    setSaving(true);
    try {
      await api.testEmbed(channelId, embed as Record<string, any>);
      notify("Embed tes berhasil dikirim ke Discord.");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setSaving(false);
    }
  };

  const FeatureIcon = feature.icon;
  const configComplete = !channelPath || Boolean(channelId);

  return (
    <div className="page-stack page-enter">
      <section className="feature-header">
        <div className="feature-header-icon"><FeatureIcon size={24} /></div>
        <div className="feature-header-copy">
          <div className="feature-header-kicker">Manage feature</div>
          <h1>{feature.name}</h1>
          <p>{feature.description}</p>
        </div>
        <div className="feature-header-status">
          <StatusBadge label={enabled ? "Aktif" : "Nonaktif"} tone={enabled ? "success" : "warning"} />
          <StatusBadge label={configComplete ? "Config valid" : "Perlu dilengkapi"} tone={configComplete ? "success" : "warning"} />
        </div>
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
            <CardHeader title="Status fitur" description="Aktifkan atau matikan modul tanpa menghapus setting lama." />
            <div className="setting-row"><div><strong>Aktifkan {feature.name}</strong><span>Config lama tetap tersimpan ketika fitur dimatikan.</span></div><Toggle checked={enabled} onChange={(next) => { setEnabled(next); setDirty(true); }} /></div>
          </Card>
          <Card>
            <CardHeader title="Alur fitur" description="Ringkasan sederhana sebelum melakukan perubahan." />
            <div className="flow-list"><div><span>1</span><p><strong>Pilih target</strong>Atur channel dan role dari data Discord asli.</p></div><div><span>2</span><p><strong>Edit konten</strong>Gunakan template dan placeholder yang tersedia.</p></div><div><span>3</span><p><strong>Pratinjau dan tes</strong>Pastikan hasil sesuai sebelum disimpan.</p></div></div>
          </Card>
          {slug === "ai" ? <Card><CardHeader title="AI hemat OpenRouter" description="Setting dashboard hanya mengubah pilihan aman yang sudah dipakai core bot." /><div className="form-grid two-columns"><div className="form-field"><label>Model utama</label><input value={aiModel} onChange={(event) => { setAiModel(event.target.value); setDirty(true); }} /><small className="field-helper">Rekomendasi: openai/gpt-4o-mini</small></div><div className="form-field"><label>Max token</label><input type="number" min={100} max={1000} value={aiMaxTokens} onChange={(event) => { setAiMaxTokens(Number(event.target.value)); setDirty(true); }} /></div></div></Card> : null}
          {slug === "top-aktif" || slug === "papan-aktif" ? <Card><CardHeader title="Jadwal leaderboard" description="Scheduler core bot tidak diubah; dashboard hanya menyimpan setting yang sudah didukung." /><div className="form-grid two-columns"><div className="form-field"><label>Jumlah peringkat</label><input type="number" min={3} max={25} value={topLimit} onChange={(event) => { setTopLimit(Number(event.target.value)); setDirty(true); }} /></div><div className="form-field"><label>Jam post WIB</label><input type="number" min={0} max={23} value={postHour} onChange={(event) => { setPostHour(Number(event.target.value)); setDirty(true); }} /></div></div></Card> : null}
          {slug === "motm" ? <Card><CardHeader title="Threshold MOTM" description="Lifetime point tetap aman dan tidak ikut reset siklus." /><div className="form-field"><label>Target poin siklus</label><input type="number" min={1000} value={motmThreshold} onChange={(event) => { setMotmThreshold(Number(event.target.value)); setDirty(true); }} /><small className="field-helper">Default DESA TULUS: 100.000 poin.</small></div></Card> : null}
        </div>
      ) : null}

      {tab === "targets" ? (
        <div className="manage-layout">
          <Card>
            <CardHeader title="Target Discord" description="Pilih nama channel atau role. Dashboard menyimpan ID Discord secara otomatis." action={<Button variant="secondary" icon={<RefreshCcw size={16} />} onClick={refreshPicker}>Muat ulang Discord</Button>} />
            {picker.error ? <div className="inline-warning"><CircleAlert size={18} />{picker.error}</div> : null}
            <div className="form-grid two-columns">
              {channelPath ? <DiscordPicker kind="channel" label="Channel tujuan" helper="Klik dropdown, cari nama channel, lalu pilih. Tidak perlu menyalin ID." items={picker.channel || []} value={channelId} onChange={(id) => { setChannelId(id); setDirty(true); }} loading={pickerLoading} required /> : <div className="empty-inline full-span">Fitur ini tidak membutuhkan channel utama.</div>}
              {rolePath ? <DiscordPicker kind="role" label="Role terkait" helper="Nama role ditampilkan, ID disimpan di config." items={picker.role || []} value={roleId} onChange={(id) => { setRoleId(id); setDirty(true); }} loading={pickerLoading} /> : null}
            </div>
            <div className="picker-connection-summary"><StatusBadge label={picker.ok ? `Terhubung ke ${picker.guild?.name || "Discord"}` : "Belum terhubung"} tone={picker.ok ? "success" : "warning"} /><span>{picker.counts ? `${picker.counts.channels} channel · ${picker.counts.roles} role · ${picker.counts.users} user` : "Tekan Muat ulang Discord setelah bot online."}</span></div>
          </Card>
          <Card><CardHeader title="Validasi" description="Dashboard memeriksa setting sebelum Kirim Tes." /><div className="validation-list"><div className={channelPath && !channelId ? "is-warning" : "is-valid"}><span />Channel tujuan {channelPath && !channelId ? "belum dipilih" : "siap digunakan"}</div><div className={rolePath && !roleId ? "is-warning" : "is-valid"}><span />Role terkait {rolePath && !roleId ? "belum dipilih" : "siap digunakan"}</div><div className="is-valid"><span />Mention everyone dan here diblokir oleh adapter.</div></div></Card>
        </div>
      ) : null}

      {tab === "content" ? (
        <div className="manage-layout">
          <Card><CardHeader title="Template aktif" description="Pilih template embed yang akan diedit untuk fitur ini." />
            {slug === "embed" ? <div className="form-field"><label>Template embed</label><select value={embedKey} onChange={(event) => setEmbedKey(event.target.value)}>{availableEmbedKeys.map((key) => <option key={key} value={key}>{key}</option>)}</select></div> : <div className="template-summary"><span>Template</span><strong>{embedKey}</strong><small>Template ini tersimpan di config.embeds.{embedKey}</small></div>}
          </Card>
          <Card><CardHeader title="Placeholder" description="Gunakan token untuk user, channel, role, level, poin, event, dan waktu." /><div className="placeholder-shortcuts">{["{user}", "{displayName}", "{memberTulusRole}", "{rulesChannel}", "{chatWargaChannel}", "{memberCount}", "{level}", "{lifetimeTotal}", "{month}", "{year}"].map((token) => <button key={token} onClick={() => navigator.clipboard.writeText(token)}>{token}</button>)}</div><a className="text-link" href="/dashboard/placeholder-center">Buka Placeholder Center lengkap</a></Card>
        </div>
      ) : null}

      {tab === "embed" ? <EmbedBuilder value={embed} onChange={(next) => { setEmbed(next); setDirty(true); }} picker={picker} onSave={saveSettings} onTest={testEmbed} saving={saving} channelMissing={Boolean(channelPath && !channelId)} /> : null}

      {tab === "permissions" ? <div className="manage-layout"><Card><CardHeader title="Izin yang diperlukan" description="Periksa role Pak RW di Discord jika fitur tidak dapat mengirim atau mengatur role." /><div className="permission-grid">{["View Channel", "Send Messages", "Embed Links", "Attach Files", "Read Message History", "Use External Emojis", rolePath ? "Manage Roles" : null].filter(Boolean).map((permission) => <div key={permission as string}><ShieldCheck size={18} /><span>{permission}</span></div>)}</div></Card><Card><CardHeader title="Keamanan mention" description="Adapter dashboard tidak mengizinkan mention massal." /><div className="info-panel"><Info size={19} /><p>Content dan description dapat memakai user, role, serta channel mention yang dipilih. Title, author, dan footer sebaiknya memakai nama biasa agar Discord tidak menampilkan kode mention mentah.</p></div></Card></div> : null}

      {tab === "activity" ? <Card><CardHeader title="Aktivitas terbaru" description={`Perubahan yang berkaitan dengan ${feature.name}.`} /><div className="activity-list">{data.activity?.length ? data.activity.slice(0, 12).map((item, index) => <div className="activity-item" key={`${item.at}-${index}`}><span className="activity-marker" /><div><strong>{item.title}</strong><small>{item.detail || "Perubahan dashboard"}</small></div><time>{new Date(item.at).toLocaleString("id-ID")}</time></div>) : <div className="empty-inline">Belum ada aktivitas.</div>}</div></Card> : null}

      {tab !== "embed" ? <div className="page-save-bar"><div><strong>{dirty ? "Ada perubahan belum disimpan" : "Semua perubahan tersimpan"}</strong><span>Config lama tidak dihapus; adapter hanya memperbarui field yang dipilih.</span></div><div><Button variant="secondary" icon={<RefreshCcw size={16} />} onClick={() => refresh()}>Reset tampilan</Button><Button icon={<Save size={16} />} disabled={!dirty || saving} onClick={saveSettings}>{saving ? "Menyimpan" : "Simpan perubahan"}</Button></div></div> : null}
    </div>
  );
}
