import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Activity, CheckCircle2, CircleAlert, Clock3, FileText, Gauge, Info, Layers3, Play,
  RefreshCcw, Save, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Square, Wand2
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
  accept?: "text" | "voice" | "any";
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
  saran: [{ key: "suggestionChannel", path: "suggestionChannelId", kind: "channel", label: "Channel Saran & Voting", helper: "Tempat saran warga diposting dan diberi reaction.", required: true }],
  loket: [
    { key: "loketPanelChannel", path: "loket.panelChannelId", kind: "channel", label: "Channel Panel Loket", helper: "Tempat panel Buka Loket dikirim.", required: true, accept: "text" },
    { key: "loketCategory", path: "loket.categoryId", kind: "channel", label: "Kategori Loket", helper: "Kategori untuk channel loket privat. Kosongkan agar Pak RW membuat kategori otomatis.", accept: "any" },
    { key: "loketStaffRole", path: "loket.staffRoleId", kind: "role", label: "Role Pengurus Loket", helper: "Role staff yang bisa melihat, claim, dan menutup loket.", required: true },
    { key: "loketLogChannel", path: "loket.logChannelId", kind: "channel", label: "Channel Log Loket", helper: "Tempat catatan buka/tutup loket dikirim.", accept: "text" }
  ],
  level: [
    { key: "levelChannel", path: "levelSystem.levelChannelId", kind: "channel", label: "Channel Level", helper: "Semua notifikasi kenaikan level dikirim ke channel ini.", required: true }
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
    { key: "juraganRole", path: "juragan.roleId", kind: "role", label: "Role Juragan Desa", helper: "Role yang disebut dan diberikan kepada Juragan.", required: true },
    { key: "juraganChannel", path: "juragan.boostChannelId", kind: "channel", label: "Channel Pengumuman Juragan", helper: "Embed selamat datang Juragan dikirim ke channel ini.", required: true, accept: "text" },
    { key: "juraganVipVoice", path: "juragan.vipVoiceChannelId", kind: "channel", label: "Voice VIP Juragan", helper: "Channel voice VIP yang akan ditag sebagai benefit Juragan.", accept: "voice" },
    { key: "juraganChat", path: "juragan.chatChannelId", kind: "channel", label: "Chat Khusus Juragan", helper: "Channel text khusus Juragan yang akan ditag pada embed.", accept: "text" }
  ],
  mabar: [{ key: "mabarChannel", path: "mabar.channelId", kind: "channel", label: "Channel Cari Mabar", helper: "Tempat panel cari teman bermain dikirim.", required: true }],
  "boost-poin": [
    { key: "boostChannel", path: "boostPoin.channelId", kind: "channel", label: "Channel Pengumuman Boost", helper: "Embed mulai dan selesai dikirim ke channel ini.", required: true, accept: "text" },
    { key: "boostChatChannel", path: "boostPoin.chatChannelId", kind: "channel", label: "Channel Chat yang Diboost", helper: "Poin chat akan dikalikan hanya di channel ini.", accept: "text" },
    { key: "boostVoiceChannel", path: "boostPoin.voiceChannelId", kind: "channel", label: "Voice Channel yang Diboost", helper: "Poin voice akan dikalikan hanya di voice ini.", accept: "voice" },
    { key: "boostOwner", path: "boostPoin.eventByUserId", kind: "user", label: "Pengaktif Event", helper: "User ini tampil sebagai mention asli pada bagian Oleh." }
  ],
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
    color: raw.color || "#7DBD77",
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
  const [loketPanelTitle, setLoketPanelTitle] = useState("🏛️ Loket Bantuan DESA TULUS");
  const [loketButtonLabel, setLoketButtonLabel] = useState("Buka Loket");
  const [loketCategoryName, setLoketCategoryName] = useState("🏛️｜LOKET DESA TULUS");
  const [loketChannelPrefix, setLoketChannelPrefix] = useState("loket");
  const [loketCloseLabel, setLoketCloseLabel] = useState("Tutup Loket");
  const [loketClaimLabel, setLoketClaimLabel] = useState("Ambil Loket");
  const [loketAutoThread, setLoketAutoThread] = useState(false);
  const [loketTranscript, setLoketTranscript] = useState(true);
  const [autoLevelRole, setAutoLevelRole] = useState(true);
  const [motmThreshold, setMotmThreshold] = useState(100000);
  const [boostMultiplier, setBoostMultiplier] = useState(10);
  const [boostDuration, setBoostDuration] = useState(60);
  const [boostEventName, setBoostEventName] = useState("Boost Poin DESA TULUS");
  const [boostMode, setBoostMode] = useState("chat_voice");
  const [boostEventActive, setBoostEventActive] = useState(false);
  const [boostEndsAt, setBoostEndsAt] = useState(0);
  const [boostAutoEnd, setBoostAutoEnd] = useState(true);
  const [boostAnnounceStart, setBoostAnnounceStart] = useState(true);
  const [boostAnnounceEnd, setBoostAnnounceEnd] = useState(true);
  const [boostActionLoading, setBoostActionLoading] = useState<"start" | "stop" | "">("");

  const bindings = useMemo(() => TARGETS[slug] || [], [slug]);
  const availableEmbedKeys = useMemo(() => Object.keys(data.embeds || {}).filter((key) => key !== "dashboard"), [data.embeds]);
  const primaryChannelId = bindings.find((binding) => binding.kind === "channel") ? targets[bindings.find((binding) => binding.kind === "channel")!.key] || "" : "";
  const requiredBindings = bindings.filter((binding) => binding.required);
  const completedRequired = requiredBindings.filter((binding) => Boolean(targets[binding.key])).length;
  const configComplete = requiredBindings.length === completedRequired;

  useEffect(() => {
    setTab(slug === "embed" ? "embed" : "general");
  }, [slug]);

  useEffect(() => {
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [dirty]);

  useEffect(() => {
    const cfg = data.config || {};
    const nextEmbedKey = slug === "embed" ? (embedKey && data.embeds[embedKey] ? embedKey : availableEmbedKeys[0] || "welcome") : feature.embedKey || "welcome";
    const nextTargets: Record<string, string> = {};
    bindings.forEach((binding) => {
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
    setLoketPanelTitle(String(readPath(cfg, "loket.panelTitle") || "🏛️ Loket Bantuan DESA TULUS"));
    setLoketButtonLabel(String(readPath(cfg, "loket.buttonLabel") || "Buka Loket"));
    setLoketCategoryName(String(readPath(cfg, "loket.categoryName") || "🏛️｜LOKET DESA TULUS"));
    setLoketChannelPrefix(String(readPath(cfg, "loket.channelPrefix") || "loket"));
    setLoketCloseLabel(String(readPath(cfg, "loket.closeLabel") || "Tutup Loket"));
    setLoketClaimLabel(String(readPath(cfg, "loket.claimLabel") || "Ambil Loket"));
    setLoketAutoThread(readPath(cfg, "loket.autoThreadEnabled") === true);
    setLoketTranscript(readPath(cfg, "loket.transcriptEnabled") !== false);
    setAutoLevelRole(readPath(cfg, "levelSystem.autoLevelRole") !== false);
    setMotmThreshold(Number(readPath(cfg, "level.cycleResetAtPoints") || readPath(cfg, "topActive.pointsThreshold") || 100000));
    setBoostMultiplier(Number(readPath(cfg, "boostPoin.multiplier") || 10));
    setBoostDuration(Number(readPath(cfg, "boostPoin.durationMinutes") || 60));
    setBoostEventName(String(readPath(cfg, "boostPoin.eventName") || "Boost Poin DESA TULUS"));
    setBoostMode(String(readPath(cfg, "boostPoin.eventMode") || "chat_voice"));
    setBoostEventActive(readPath(cfg, "boostPoin.eventActive") === true);
    setBoostEndsAt(Number(readPath(cfg, "boostPoin.endsAt") || 0));
    setBoostAutoEnd(readPath(cfg, "boostPoin.autoEndEnabled") !== false);
    setBoostAnnounceStart(readPath(cfg, "boostPoin.announceOnStart") !== false);
    setBoostAnnounceEnd(readPath(cfg, "boostPoin.announceOnEnd") !== false);
    setDirty(false);
  }, [data, slug, feature, availableEmbedKeys, bindings]);

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
      if (slug === "level") {
        patches.push({ path: "levelSystem.enabled", value: enabled });
        patches.push({ path: "levelSystem.maxLevel", value: 1000 });
        patches.push({ path: "levelSystem.autoLevelRole", value: autoLevelRole });
        patches.push({ path: "levelSystem.levelChannelId", value: targets.levelChannel || "" });
      }
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
      if (slug === "loket") {
        patches.push({ path: "loket.panelTitle", value: loketPanelTitle });
        patches.push({ path: "loket.buttonLabel", value: loketButtonLabel });
        patches.push({ path: "loket.categoryName", value: loketCategoryName });
        patches.push({ path: "loket.channelPrefix", value: loketChannelPrefix });
        patches.push({ path: "loket.closeLabel", value: loketCloseLabel });
        patches.push({ path: "loket.claimLabel", value: loketClaimLabel });
        patches.push({ path: "loket.autoThreadEnabled", value: loketAutoThread });
        patches.push({ path: "loket.transcriptEnabled", value: loketTranscript });
      }
      if (slug === "boost-poin") {
        const safeMultiplier = Math.max(1, Math.min(100, Number(boostMultiplier || 1)));
        patches.push({ path: "boostPoin.multiplier", value: safeMultiplier });
        patches.push({ path: "boostPoin.boostPercent", value: Number(((safeMultiplier - 1) * 100).toFixed(4)) });
        patches.push({ path: "boostPoin.durationMinutes", value: Math.max(1, Number(boostDuration || 60)) });
        patches.push({ path: "boostPoin.eventName", value: boostEventName.trim() || "Boost Poin DESA TULUS" });
        patches.push({ path: "boostPoin.eventMode", value: boostMode });
        patches.push({ path: "boostPoin.autoEndEnabled", value: boostAutoEnd });
        patches.push({ path: "boostPoin.announceOnStart", value: boostAnnounceStart });
        patches.push({ path: "boostPoin.announceOnEnd", value: boostAnnounceEnd });
        patches.push({ path: "boostPoin.chatChannelIds", value: targets.boostChatChannel ? [targets.boostChatChannel] : [] });
        patches.push({ path: "boostPoin.voiceChannelIds", value: targets.boostVoiceChannel ? [targets.boostVoiceChannel] : [] });
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

  const runBoostAction = async (action: "start" | "stop") => {
    if (action === "stop" && !window.confirm("Hentikan event Boost Poin sekarang? Multiplier akan kembali ke x1.")) return;
    if (action === "start" && Number(boostMultiplier) <= 1) {
      notify("Multiplier event harus lebih besar dari x1.", "error");
      return;
    }
    if (action === "start" && Number(boostDuration) < 1) {
      notify("Durasi event minimal 1 menit.", "error");
      return;
    }
    if (action === "start" && !targets.boostChannel) {
      notify("Pilih Channel Pengumuman Boost terlebih dahulu.", "error");
      setTab("targets");
      return;
    }
    if (action === "start" && boostMode !== "voice" && !targets.boostChatChannel) {
      notify("Pilih Channel Chat yang Diboost atau ubah mode menjadi Voice saja.", "error");
      setTab("targets");
      return;
    }
    if (action === "start" && boostMode !== "chat" && !targets.boostVoiceChannel) {
      notify("Pilih Voice Channel yang Diboost atau ubah mode menjadi Chat saja.", "error");
      setTab("targets");
      return;
    }
    setBoostActionLoading(action);
    try {
      const safeMultiplier = Math.max(1, Math.min(100, Number(boostMultiplier || 1)));
      await api.savePatches([
        { path: "boostPoin.enabled", value: true },
        { path: "boostPoin.channelId", value: targets.boostChannel || "" },
        { path: "boostPoin.chatChannelId", value: targets.boostChatChannel || "" },
        { path: "boostPoin.voiceChannelId", value: targets.boostVoiceChannel || "" },
        { path: "boostPoin.eventByUserId", value: targets.boostOwner || "" },
        { path: "boostPoin.chatChannelIds", value: targets.boostChatChannel ? [targets.boostChatChannel] : [] },
        { path: "boostPoin.voiceChannelIds", value: targets.boostVoiceChannel ? [targets.boostVoiceChannel] : [] },
        { path: "boostPoin.multiplier", value: safeMultiplier },
        { path: "boostPoin.boostPercent", value: Number(((safeMultiplier - 1) * 100).toFixed(4)) },
        { path: "boostPoin.durationMinutes", value: Math.max(1, Number(boostDuration || 60)) },
        { path: "boostPoin.eventName", value: boostEventName.trim() || "Boost Poin DESA TULUS" },
        { path: "boostPoin.eventMode", value: boostMode },
        { path: "boostPoin.autoEndEnabled", value: boostAutoEnd },
        { path: "boostPoin.announceOnStart", value: boostAnnounceStart },
        { path: "boostPoin.announceOnEnd", value: boostAnnounceEnd }
      ]);
      await api.saveEmbed("boostPoinActive", embed as Record<string, any>);
      const result = action === "start" ? await api.startBoost() : await api.stopBoost();
      await refresh();
      setDirty(false);
      notify(result.message || (action === "start" ? "Boost Poin berhasil dimulai." : "Boost Poin berhasil dihentikan."));
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), "error");
    } finally {
      setBoostActionLoading("");
    }
  };

  const cancelChanges = async () => {
    await refresh();
    setDirty(false);
    notify("Perubahan yang belum disimpan dibatalkan.", "info");
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
          {dirty ? <StatusBadge label="Belum disimpan" tone="warning" /> : null}
        </div>
      </section>

      <section className="manage-workflow" aria-label="Alur pengaturan">
        <div><span>1</span><strong>Atur fitur</strong><small>Status dan pengaturan utama</small></div>
        <div><span>2</span><strong>Pilih Discord</strong><small>Channel, role, dan user asli</small></div>
        <div><span>3</span><strong>Edit & preview</strong><small>Pastikan hasil sama dengan Discord</small></div>
        <div><span>4</span><strong>Simpan & tes</strong><small>Kirim uji sebelum dipakai warga</small></div>
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
          {slug === "level" ? <Card className="full-span-card"><CardHeader title="Auto Level Role" description="Role dibuat otomatis saat ada warga yang mendapat tier. Tidak perlu pilih role manual." action={<StatusBadge label={autoLevelRole ? "Aktif" : "Nonaktif"} tone={autoLevelRole ? "success" : "neutral"} />} /><div className="boost-option-list"><div className="boost-option-row"><div><strong>Role level otomatis</strong><small>Ketika level berubah, Pak RW membuat role yang dibutuhkan saja, memberi warna default/no color, mencabut role lama, dan menghapus role kosong.</small></div><Toggle checked={autoLevelRole} onChange={(value) => { setAutoLevelRole(value); setDirty(true); }} label="Auto Level Role" /></div></div><div className="info-panel"><ShieldCheck size={19} /><p>Level maksimal dikunci di <strong>1000</strong>. Role <strong>Karuhun Desa (Lvl. Max)</strong> hanya dibuat saat ada warga mencapai Level 1000. Role otomatis diletakkan di atas Warga agar warna nama tetap mengikuti role Warga.</p></div></Card> : null}
          {slug === "ai" ? <Card><CardHeader title="AI hemat OpenRouter" description="Pengaturan aman yang sudah didukung core bot." /><div className="form-grid two-columns"><div className="form-field"><label>Model utama</label><input value={aiModel} onChange={(event) => { setAiModel(event.target.value); setDirty(true); }} /><small className="field-helper">Gunakan openai/gpt-4o-mini untuk mode hemat.</small></div><div className="form-field"><label>Max token</label><input type="number" min={100} max={1000} value={aiMaxTokens} onChange={(event) => { setAiMaxTokens(Number(event.target.value)); setDirty(true); }} /><small className="field-helper">Batas aman rekomendasi: 300–600.</small></div></div></Card> : null}

          {slug === "loket" ? <Card className="full-span-card"><CardHeader title="Loket Pak RW" description="Semua alur loket bisa diatur dari dashboard tanpa mengubah fitur lain." /><div className="form-grid two-columns"><div className="form-field"><label>Judul panel</label><input value={loketPanelTitle} onChange={(event) => { setLoketPanelTitle(event.target.value); setDirty(true); }} /></div><div className="form-field"><label>Label tombol buka</label><input value={loketButtonLabel} onChange={(event) => { setLoketButtonLabel(event.target.value); setDirty(true); }} /></div><div className="form-field"><label>Nama kategori otomatis</label><input value={loketCategoryName} onChange={(event) => { setLoketCategoryName(event.target.value); setDirty(true); }} /></div><div className="form-field"><label>Prefix nama channel</label><input value={loketChannelPrefix} onChange={(event) => { setLoketChannelPrefix(event.target.value); setDirty(true); }} /><small className="field-helper">Contoh hasil: loket-bekiw.</small></div><div className="form-field"><label>Label claim</label><input value={loketClaimLabel} onChange={(event) => { setLoketClaimLabel(event.target.value); setDirty(true); }} /></div><div className="form-field"><label>Label close</label><input value={loketCloseLabel} onChange={(event) => { setLoketCloseLabel(event.target.value); setDirty(true); }} /></div></div><div className="boost-option-list"><div className="boost-option-row"><div><strong>Buat thread catatan</strong><small>Opsional. Channel loket sudah privat; thread hanya untuk catatan tambahan.</small></div><Toggle checked={loketAutoThread} onChange={(value) => { setLoketAutoThread(value); setDirty(true); }} label="Thread otomatis" /></div><div className="boost-option-row"><div><strong>Log transcript ringkas</strong><small>Saat ditutup, Pak RW kirim catatan ringkas ke channel log.</small></div><Toggle checked={loketTranscript} onChange={(value) => { setLoketTranscript(value); setDirty(true); }} label="Log aktif" /></div></div><div className="info-panel"><Info size={19} /><p>Edit tampilan panel dari tab <strong>Embed & Preview</strong>. Pilih channel panel, kategori, role pengurus, dan log dari tab <strong>Channel & Role</strong>.</p></div></Card> : null}
          {slug === "top-aktif" || slug === "papan-aktif" ? <Card><CardHeader title="Jadwal leaderboard" description="Scheduler core bot tidak diubah; dashboard hanya menyimpan setting yang didukung." /><div className="form-grid two-columns"><div className="form-field"><label>Jumlah peringkat</label><input type="number" min={3} max={25} value={topLimit} onChange={(event) => { setTopLimit(Number(event.target.value)); setDirty(true); }} /></div><div className="form-field"><label>Jam post WIB</label><input type="number" min={0} max={23} value={postHour} onChange={(event) => { setPostHour(Number(event.target.value)); setDirty(true); }} /><small className="field-helper">Gunakan 0 untuk pukul 00.00 WIB.</small></div></div></Card> : null}
          {slug === "motm" ? <Card><CardHeader title="Threshold MOTM" description="Lifetime point tetap lanjut dan tidak ikut reset." /><div className="form-field"><label>Target poin siklus</label><input type="number" min={1000} value={motmThreshold} onChange={(event) => { setMotmThreshold(Number(event.target.value)); setDirty(true); }} /><small className="field-helper">Default DESA TULUS: 100.000 poin.</small></div></Card> : null}
          {slug === "boost-poin" ? <>
            <Card className="full-span-card boost-overview-card">
              <CardHeader title="Status Event Boost Poin" description="Lihat kondisi event sebelum mengubah multiplier atau menjalankan event baru." action={<StatusBadge label={boostEventActive ? "Sedang berjalan" : "Tidak aktif"} tone={boostEventActive ? "success" : "neutral"} />} />
              <div className="boost-status-strip">
                <div><Gauge size={20} /><span>Multiplier</span><strong>{boostEventActive ? `x${boostMultiplier.toLocaleString("id-ID")}` : "x1 normal"}</strong></div>
                <div><Clock3 size={20} /><span>Durasi</span><strong>{boostDuration} menit</strong></div>
                <div><Activity size={20} /><span>Mode</span><strong>{boostMode === "chat" ? "Chat" : boostMode === "voice" ? "Voice" : "Chat + Voice"}</strong></div>
                <div><Clock3 size={20} /><span>Berakhir</span><strong>{boostEventActive && boostEndsAt ? new Date(boostEndsAt).toLocaleString("id-ID") : "Belum dimulai"}</strong></div>
              </div>
              {boostEventActive ? <div className="inline-warning boost-live-warning">Event sedang berjalan. Hentikan event terlebih dahulu untuk mengubah multiplier, durasi, atau mode.</div> : null}
            </Card>

            <Card className="boost-settings-card">
              <CardHeader title="Pengaturan event" description="Tentukan nama, pengali, durasi, dan jenis aktivitas yang mendapat boost." />
              <div className="form-grid two-columns">
                <div className="form-field"><label>Nama event</label><input disabled={boostEventActive} value={boostEventName} onChange={(event) => { setBoostEventName(event.target.value); setDirty(true); }} /><small className="field-helper">Dipakai oleh placeholder {`{eventName}`}.</small></div>
                <div className="form-field"><label>Multiplier poin</label><div className="input-prefix"><span>x</span><input disabled={boostEventActive} type="number" min={1.1} max={100} step={0.1} value={boostMultiplier} onChange={(event) => { setBoostMultiplier(Number(event.target.value)); setDirty(true); }} /></div><small className="field-helper">Contoh x10: poin dasar 5 menjadi total 50 poin.</small></div>
                <div className="form-field"><label>Durasi event</label><input disabled={boostEventActive} type="number" min={1} max={10080} value={boostDuration} onChange={(event) => { setBoostDuration(Number(event.target.value)); setDirty(true); }} /><small className="field-helper">Dalam menit. Durasi maksimal 7 hari.</small></div>
                <div className="form-field"><label>Aktivitas yang diboost</label><select disabled={boostEventActive} value={boostMode} onChange={(event) => { setBoostMode(event.target.value); setDirty(true); }}><option value="chat_voice">Chat dan Voice</option><option value="chat">Chat saja</option><option value="voice">Voice saja</option></select><small className="field-helper">Channel target dipilih pada tab Channel & Role.</small></div>
              </div>
            </Card>

            <Card className="boost-options-card">
              <CardHeader title="Otomatisasi pengumuman" description="Atur apa yang dilakukan Pak RW saat event mulai dan selesai." />
              <div className="boost-option-list">
                <div className="boost-option-row"><div><strong>Selesai otomatis</strong><small>Event berhenti saat durasi habis dan multiplier kembali ke x1.</small></div><Toggle checked={boostAutoEnd} onChange={(value) => { setBoostAutoEnd(value); setDirty(true); }} label="Selesai otomatis" /></div>
                <div className="boost-option-row"><div><strong>Kirim embed saat mulai</strong><small>Pengumuman aktif dikirim ke Channel Pengumuman Boost.</small></div><Toggle checked={boostAnnounceStart} onChange={(value) => { setBoostAnnounceStart(value); setDirty(true); }} label="Pengumuman mulai" /></div>
                <div className="boost-option-row"><div><strong>Kirim embed saat selesai</strong><small>Dikirim saat event berakhir otomatis atau dihentikan owner.</small></div><Toggle checked={boostAnnounceEnd} onChange={(value) => { setBoostAnnounceEnd(value); setDirty(true); }} label="Pengumuman selesai" /></div>
              </div>
            </Card>

            <Card className="full-span-card boost-run-card">
              <CardHeader title="Jalankan event" description="Ikuti alur ini supaya boost tidak salah channel atau salah multiplier." />
              <div className="boost-flow-guide">
                <div><span>1</span><strong>Isi pengaturan</strong><small>Tentukan multiplier, durasi, dan mode.</small></div>
                <div><span>2</span><strong>Pilih target Discord</strong><small>Pilih channel pengumuman, chat, voice, dan pengaktif.</small></div>
                <div><span>3</span><strong>Periksa embed</strong><small>Buka tab Embed & Preview, lalu kirim tes.</small></div>
                <div><span>4</span><strong>Mulai atau hentikan</strong><small>Pak RW mengatur multiplier dan mengirim pengumuman.</small></div>
              </div>
              <div className="boost-readiness">
                <div className={targets.boostChannel ? "is-ready" : "is-missing"}><span />Channel pengumuman {targets.boostChannel ? "siap" : "belum dipilih"}</div>
                <div className={(boostMode === "voice" || targets.boostChatChannel) ? "is-ready" : "is-missing"}><span />Target chat {(boostMode === "voice" || targets.boostChatChannel) ? "siap" : "belum dipilih"}</div>
                <div className={(boostMode === "chat" || targets.boostVoiceChannel) ? "is-ready" : "is-missing"}><span />Target voice {(boostMode === "chat" || targets.boostVoiceChannel) ? "siap" : "belum dipilih"}</div>
                <div className={boostMultiplier > 1 && boostDuration > 0 ? "is-ready" : "is-missing"}><span />Multiplier dan durasi {boostMultiplier > 1 && boostDuration > 0 ? "valid" : "belum valid"}</div>
              </div>
              <div className="boost-action-row">
                <Button icon={<Play size={17} />} disabled={boostActionLoading !== "" || boostEventActive || boostMultiplier <= 1} onClick={() => runBoostAction("start")}>{boostActionLoading === "start" ? "Memulai event" : "Mulai event"}</Button>
                <Button variant="danger" icon={<Square size={17} />} disabled={boostActionLoading !== "" || !boostEventActive} onClick={() => runBoostAction("stop")}>{boostActionLoading === "stop" ? "Menghentikan event" : "Hentikan event"}</Button>
                <Button variant="secondary" icon={<Save size={17} />} disabled={saving || !dirty || boostEventActive} onClick={saveSettings}>Simpan sebagai pengaturan berikutnya</Button>
                <Button variant="secondary" icon={<Layers3 size={17} />} onClick={() => setTab("targets")}>Pilih channel target</Button>
              </div>
            </Card>

            <Card><CardHeader title="Embed saat dimulai" description="Gunakan tab Embed & Preview untuk mengedit template boostPoinActive." /><div className="template-summary"><span>Template</span><strong>boostPoinActive</strong><small>Menampilkan pengaktif, multiplier, durasi, target, dan waktu selesai.</small></div></Card>
            <Card><CardHeader title="Embed saat selesai" description="Edit template boostPoinEnd melalui Embed Builder global." /><div className="template-summary"><span>Template</span><strong>boostPoinEnd</strong><small>Dikirim saat durasi habis atau owner menghentikan event.</small></div></Card>
          </> : null}
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
                  <DiscordPicker kind={binding.kind} label={binding.label} helper={binding.helper} items={binding.kind === "channel" && binding.accept && binding.accept !== "any" ? (picker.channel || []).filter((channel) => binding.accept === "voice" ? String(channel.typeLabel || "").toLowerCase().includes("voice") || String(channel.typeLabel || "").toLowerCase().includes("stage") : !String(channel.typeLabel || "").toLowerCase().includes("voice") && !String(channel.typeLabel || "").toLowerCase().includes("stage") && !String(channel.typeLabel || "").toLowerCase().includes("category")) : picker[binding.kind] || []} value={targets[binding.key] || ""} onChange={(id) => updateTarget(binding.key, id)} loading={pickerLoading} required={binding.required} />
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

      {tab !== "embed" && dirty ? <div className="page-save-bar page-save-bar-dirty"><div><strong>Perubahan belum disimpan</strong><span>Klik Simpan untuk menerapkan setting, atau Batal untuk mengembalikan seperti semula.</span></div><div><Button variant="secondary" icon={<RefreshCcw size={16} />} onClick={cancelChanges} disabled={saving}>Batal</Button><Button icon={<Save size={16} />} disabled={saving} onClick={saveSettings}>{saving ? "Menyimpan" : "Simpan"}</Button></div></div> : null}
    </div>
  );
}
