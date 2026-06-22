import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, Database, Gauge, RefreshCcw, ShieldCheck } from "lucide-react";
import type { AiDashboardStatus } from "../../app/types";
import { useDashboard } from "../../app/DashboardContext";
import { api } from "../../lib/api";
import { DiscordPicker } from "../pickers/DiscordPicker";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { Toggle } from "../ui/Toggle";

type Draft = Record<string, string | number | boolean>;

export function AiControlCenter() {
  const { data, picker, pickerLoading, refresh, refreshPicker, notify } = useDashboard();
  const [status, setStatus] = useState<AiDashboardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [draft, setDraft] = useState<Draft>({});

  const load = async () => {
    setLoading(true);
    try { const result = await api.aiStatus(); setStatus(result.status); } catch (error) { notify(error instanceof Error ? error.message : String(error), "error"); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const ai = data.config.ai || {};
    setDraft({
      enabled: ai.enabled !== false, providerName: String(ai.providerName || "openrouter"), baseUrl: String(ai.baseUrl || ""),
      smartModel: String(ai.smartModel || ai.openRouterModel || "openai/gpt-4o-mini"), economyModel: String(ai.economyModel || ai.openRouterModel || "openai/gpt-4o-mini"),
      tokenBudget: Number(ai.tokenBudget || 2400), maxReplyTokens: Number(ai.maxReplyTokens || ai.maxTokens || 460), cooldownUserSeconds: Number(ai.cooldownUserSeconds || 10), dailyLimitPerUser: Number(ai.dailyLimitPerUser || 30),
      localCacheEnabled: ai.localCacheEnabled !== false, cacheTtlMs: Number(ai.cacheTtlMs || 180000), memoryEnabled: ai.memoryEnabled !== false, maxMemoryUsers: Number(ai.maxMemoryUsers || 600), maxMemoryTurns: Number(ai.maxMemoryTurns || 10), maxMemoryChars: Number(ai.maxMemoryChars || 900),
      memorySummaryOnly: ai.memorySummaryOnly !== false, memorySensitiveScrub: ai.memorySensitiveScrub !== false, anonymousMemory: ai.anonymousMemory === true, openingVariationEnabled: ai.openingVariationEnabled !== false, safeMirror: ai.safeMirror !== false
    });
  }, [data.config]);

  const update = (key: string, value: Draft[string]) => setDraft((current) => ({ ...current, [key]: value }));
  const dirty = useMemo(() => Object.keys(draft).some((key) => {
    const ai = data.config.ai || {};
    const current = key === "smartModel" || key === "economyModel" ? ai[key] || ai.openRouterModel || "openai/gpt-4o-mini" : ai[key];
    const fallback = ["enabled", "localCacheEnabled", "memoryEnabled", "memorySummaryOnly", "memorySensitiveScrub", "openingVariationEnabled", "safeMirror"].includes(key) ? true : key === "anonymousMemory" ? false : current;
    return String(draft[key]) !== String(current ?? fallback ?? "");
  }), [draft, data.config.ai]);
  const save = async () => {
    setSaving(true);
    try {
      const keys = Object.keys(draft);
      await api.savePatches(keys.map((key) => ({ path: `ai.${key}`, value: draft[key] })));
      await refresh(); await load(); notify("AI Control Center berhasil disimpan.");
    } catch (error) { notify(error instanceof Error ? error.message : String(error), "error"); } finally { setSaving(false); }
  };
  const resetMemory = async () => {
    if (!selectedUser) return notify("Pilih warga terlebih dahulu.", "error");
    if (!window.confirm("Hapus ringkasan memori AI untuk warga ini? Isi memori tidak akan ditampilkan.")) return;
    try { const result = await api.resetAiMemory(selectedUser); setStatus(result.status); notify(result.removed ? "Memori warga dihapus." : "Tidak ada memori tersimpan untuk warga ini.", "info"); } catch (error) { notify(error instanceof Error ? error.message : String(error), "error"); }
  };

  return <div className="ai-control-grid">
    <Card className="full-span-card"><CardHeader title="AI runtime" description="Status provider dibaca dari backend. API key tidak pernah dikirim ke dashboard." action={<Button variant="secondary" icon={<RefreshCcw size={15}/>} onClick={load} disabled={loading}>Refresh</Button>} />
      <div className="ai-status-strip"><div><BrainCircuit size={19}/><span>Provider</span><strong>{status?.providerName || "Checking"}</strong><small>{status?.apiKeyConfigured ? "API key configured" : "API key not configured"}</small></div><div><Gauge size={19}/><span>Limit state</span><strong>{status?.limit.status || "normal"}</strong><small>{status?.limit.modelActive || status?.economyModel || "No model"}</small></div><div><Database size={19}/><span>Memory</span><strong>{status?.memory.users ?? 0} warga</strong><small>{status?.memory.recentTurns ?? 0} ringkasan aktif</small></div><div><ShieldCheck size={19}/><span>Privacy</span><strong>{status?.memory.anonymousMemory ? "Custom" : "Anonymous off"}</strong><small>Raw memory tidak ditampilkan</small></div></div>
    </Card>
    <Card><CardHeader title="Brain & Provider" description="Model dan base URL non-secret. URL invalid akan fallback aman di backend." /><div className="form-grid two-columns"><div className="form-field"><label>Provider</label><input value={String(draft.providerName || "")} onChange={(e) => update("providerName", e.target.value)} /></div><div className="form-field"><label>Base URL</label><input value={String(draft.baseUrl || "")} placeholder="https://openrouter.ai/api/v1" onChange={(e) => update("baseUrl", e.target.value)} /><small>API key hanya dibaca backend.</small></div><div className="form-field"><label>Smart model</label><input value={String(draft.smartModel || "")} onChange={(e) => update("smartModel", e.target.value)} /></div><div className="form-field"><label>Economy model</label><input value={String(draft.economyModel || "")} onChange={(e) => update("economyModel", e.target.value)} /></div></div><div className="settings-list"><div className="setting-row"><div><strong>AI aktif</strong><span>Menonaktifkan AI tidak menghapus cache atau memori.</span></div><Toggle checked={Boolean(draft.enabled)} onChange={(v) => update("enabled", v)} /></div><div className="setting-row"><div><strong>Natural opener</strong><span>Variasi pembuka agar percakapan tidak terasa template.</span></div><Toggle checked={Boolean(draft.openingVariationEnabled)} onChange={(v) => update("openingVariationEnabled", v)} /></div></div></Card>
    <Card><CardHeader title="Budget & Limit" description="Batas dipakai sebelum request provider agar biaya tetap terkendali." /><div className="form-grid two-columns">{[["tokenBudget","Token budget",600,12000],["maxReplyTokens","Max reply tokens",80,2000],["cooldownUserSeconds","Cooldown user (detik)",0,3600],["dailyLimitPerUser","Limit harian per user",0,9999],["cacheTtlMs","Cache TTL (ms)",10000,3600000]].map(([key,label,min,max])=><div className="form-field" key={String(key)}><label>{label}</label><input type="number" min={Number(min)} max={Number(max)} value={Number(draft[String(key)] || min)} onChange={(e)=>update(String(key), Number(e.target.value))}/></div>)}</div><div className="setting-row"><div><strong>Local cache</strong><span>Pertanyaan berulang tidak memanggil provider lagi selama cache valid.</span></div><Toggle checked={Boolean(draft.localCacheEnabled)} onChange={(v)=>update("localCacheEnabled",v)} /></div></Card>
    <Card><CardHeader title="AI Memory" description="Memori dipisah per guild dan user, hanya menyimpan ringkasan aman." /><div className="form-grid three-columns">{[["maxMemoryUsers","Maks. warga",10,5000],["maxMemoryTurns","Maks. turn",2,40],["maxMemoryChars","Maks. karakter",0,6000]].map(([key,label,min,max])=><div className="form-field" key={String(key)}><label>{label}</label><input type="number" min={Number(min)} max={Number(max)} value={Number(draft[String(key)] || min)} onChange={(e)=>update(String(key), Number(e.target.value))}/></div>)}</div><div className="settings-list"><div className="setting-row"><div><strong>Memory aktif</strong><span>Ringkasan per warga; tidak mencampur guild atau user.</span></div><Toggle checked={Boolean(draft.memoryEnabled)} onChange={(v)=>update("memoryEnabled",v)} /></div><div className="setting-row"><div><strong>Scrub data sensitif</strong><span>Token, nomor, email, dan ID legal disamarkan sebelum disimpan.</span></div><Toggle checked={Boolean(draft.memorySensitiveScrub)} onChange={(v)=>update("memorySensitiveScrub",v)} /></div><div className="setting-row"><div><strong>Anonymous memory</strong><span>Default mati untuk menjaga curhat anonim.</span></div><Toggle checked={Boolean(draft.anonymousMemory)} onChange={(v)=>update("anonymousMemory",v)} /></div></div><div className="memory-reset-row"><DiscordPicker kind="user" label="Reset memori warga" helper="Aksi owner-only; isi memori tidak pernah ditampilkan." items={picker.user || []} value={selectedUser} onChange={setSelectedUser} loading={pickerLoading} /><Button variant="danger" onClick={resetMemory}>Hapus memori</Button><Button variant="secondary" onClick={refreshPicker}>Muat warga</Button></div></Card>
    {dirty ? <div className="page-save-bar page-save-bar-dirty"><div><strong>Perubahan AI belum disimpan</strong><span>Patch hanya mengubah field AI yang terlihat di halaman ini.</span></div><Button icon={<ShieldCheck size={16}/>} onClick={save} disabled={saving}>{saving ? "Menyimpan" : "Simpan perubahan"}</Button></div> : null}
  </div>;
}
