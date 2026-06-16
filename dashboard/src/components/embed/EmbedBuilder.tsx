import { useMemo, useState } from "react";
import {
  Braces, Copy, Image, Link2, Monitor, Plus, RotateCcw, Save, Send,
  Smartphone, Tablet, Trash2, Type, UserRoundPlus
} from "lucide-react";
import type { EmbedDraft, PickerData } from "../../app/types";
import { DiscordPicker, type PickerKind } from "../pickers/DiscordPicker";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { DiscordPreview } from "./DiscordPreview";

const PLACEHOLDERS = [
  "{user}", "{displayName}", "{username}", "{memberCount}", "{serverName}",
  "{memberTulusRole}", "{rulesChannel}", "{chatWargaChannel}", "{ticketChannel}",
  "{level}", "{rank}", "{lifetimeTotal}", "{cyclePoints}", "{month}", "{year}", "{date}", "{time}"
];

type TextTarget = "content" | "authorName" | "title" | "description" | "footerText";
type InsertMode = "placeholder" | PickerKind;

const TARGET_LABELS: Array<{ value: TextTarget; label: string; mentionSafe: boolean }> = [
  { value: "content", label: "Content", mentionSafe: true },
  { value: "description", label: "Description", mentionSafe: true },
  { value: "title", label: "Title", mentionSafe: false },
  { value: "authorName", label: "Author", mentionSafe: false },
  { value: "footerText", label: "Footer", mentionSafe: false }
];

export function EmbedBuilder({
  value,
  onChange,
  picker,
  onSave,
  onTest,
  saving = false,
  channelMissing = false
}: {
  value: EmbedDraft;
  onChange: (value: EmbedDraft) => void;
  picker?: PickerData;
  onSave: () => void;
  onTest: () => void;
  saving?: boolean;
  channelMissing?: boolean;
}) {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [insertTarget, setInsertTarget] = useState<TextTarget>("description");
  const [insertMode, setInsertMode] = useState<InsertMode>("placeholder");
  const [placeholder, setPlaceholder] = useState("{user}");
  const [discordValue, setDiscordValue] = useState("");
  const update = (key: keyof EmbedDraft, next: any) => onChange({ ...value, [key]: next });
  const fields = value.fields || [];
  const buttons = value.buttons || [];
  const json = useMemo(() => JSON.stringify(value, null, 2), [value]);
  const selectedTarget = TARGET_LABELS.find((item) => item.value === insertTarget)!;

  const insertData = () => {
    let text = placeholder;
    if (insertMode !== "placeholder") {
      const item = picker?.[insertMode]?.find((entry: any) => entry.id === discordValue) as any;
      if (!item) return;
      const displayName = insertMode === "user" ? item.displayName || item.username : item.name;
      if (selectedTarget.mentionSafe) {
        text = insertMode === "channel" ? `<#${item.id}>` : insertMode === "role" ? `<@&${item.id}>` : `<@${item.id}>`;
      } else {
        text = insertMode === "channel" ? `#${displayName}` : insertMode === "role" ? `@${displayName}` : displayName;
      }
    }
    const current = String(value[insertTarget] || "");
    const separator = current && !current.endsWith(" ") && !current.endsWith("\n") ? " " : "";
    update(insertTarget, `${current}${separator}${text}`);
  };

  const resetEmbed = () => {
    if (!window.confirm("Reset seluruh isi embed ke template kosong DESA TULUS?")) return;
    onChange({
      color: "#88a08c",
      authorName: "DESA TULUS • Pak RW",
      footerText: "DESA TULUS • Pak RW",
      footerIcon: "https://cdn.discordapp.com/emojis/1516424353934348299.gif?size=44&quality=lossless",
      fields: [],
      buttons: []
    });
  };

  return (
    <div className="embed-builder-grid">
      <div className="embed-editor-stack">
        <Card className="quick-insert-card">
          <CardHeader title="Sisipkan data tanpa mengetik" description="Pilih tujuan, lalu pilih placeholder, channel, role, atau member Discord." />
          <div className="insert-toolbar">
            <div className="form-field"><label>Masukkan ke</label><select value={insertTarget} onChange={(event) => setInsertTarget(event.target.value as TextTarget)}>{TARGET_LABELS.map((target) => <option key={target.value} value={target.value}>{target.label}</option>)}</select></div>
            <div className="form-field"><label>Jenis data</label><select value={insertMode} onChange={(event) => { setInsertMode(event.target.value as InsertMode); setDiscordValue(""); }}><option value="placeholder">Placeholder</option><option value="channel">Channel Discord</option><option value="role">Role Discord</option><option value="user">Member Discord</option></select></div>
            {insertMode === "placeholder" ? <div className="form-field"><label>Placeholder</label><select value={placeholder} onChange={(event) => setPlaceholder(event.target.value)}>{PLACEHOLDERS.map((token) => <option key={token} value={token}>{token}</option>)}</select></div> : <DiscordPicker kind={insertMode} label={insertMode === "channel" ? "Pilih channel" : insertMode === "role" ? "Pilih role" : "Pilih member"} helper={selectedTarget.mentionSafe ? "Akan dimasukkan sebagai mention Discord asli." : "Field ini memakai nama biasa agar tidak muncul sebagai kode mentah."} items={picker?.[insertMode] || []} value={discordValue} onChange={setDiscordValue} />}
            <Button icon={insertMode === "placeholder" ? <Braces size={16} /> : <UserRoundPlus size={16} />} onClick={insertData} disabled={insertMode !== "placeholder" && !discordValue}>Masukkan</Button>
          </div>
        </Card>

        <Card className="embed-editor-panel">
          <CardHeader title="Pesan dan isi embed" description="Perubahan langsung terlihat pada pratinjau Discord di sebelah kanan." />
          <div className="form-grid two-columns">
            <div className="form-field full-span"><div className="field-label-row"><label>Content</label><span>{String(value.content || "").length}/2000</span></div><textarea maxLength={2000} value={value.content || ""} onChange={(event) => update("content", event.target.value)} rows={3} placeholder="Teks di atas embed" /><small className="field-helper">Content mendukung mention user, role, dan channel.</small></div>
            <div className="form-field"><label>Nama author</label><input value={value.authorName || ""} onChange={(event) => update("authorName", event.target.value)} placeholder="DESA TULUS • Warga Baru" /></div>
            <div className="form-field"><label>Icon author URL</label><input value={value.authorIcon || ""} onChange={(event) => update("authorIcon", event.target.value)} placeholder="https://..." /></div>
            <div className="form-field full-span"><div className="field-label-row"><label>Title</label><span>{String(value.title || "").length}/256</span></div><input maxLength={256} value={value.title || ""} onChange={(event) => update("title", event.target.value)} placeholder="Judul embed" /><small className="field-helper">Gunakan {"{displayName}"} pada title. Discord tidak merender mention pada judul.</small></div>
            <div className="form-field full-span"><div className="field-label-row"><label>Description</label><span>{String(value.description || "").length}/4096</span></div><textarea maxLength={4096} value={value.description || ""} onChange={(event) => update("description", event.target.value)} rows={10} placeholder="Isi embed" /></div>
          </div>
        </Card>

        <details className="builder-disclosure" open>
          <summary><span><Image size={18} /><strong>Warna, gambar, dan footer</strong></span><small>Media visual dan identitas embed</small></summary>
          <div className="builder-disclosure-body form-grid two-columns">
            <div className="form-field"><label>Warna</label><div className="color-field"><input type="color" value={value.color || "#88a08c"} onChange={(event) => update("color", event.target.value)} /><input value={value.color || "#88a08c"} onChange={(event) => update("color", event.target.value)} /></div></div>
            <div className="form-field"><label>URL thumbnail</label><div className="input-with-icon"><Image size={16} /><input value={value.thumbnailUrl || ""} onChange={(event) => update("thumbnailUrl", event.target.value)} placeholder="https://..." /></div></div>
            <div className="form-field full-span"><label>URL gambar</label><div className="input-with-icon"><Image size={16} /><input value={value.imageUrl || ""} onChange={(event) => update("imageUrl", event.target.value)} placeholder="https://..." /></div></div>
            <div className="form-field"><div className="field-label-row"><label>Teks footer</label><span>{String(value.footerText || "").length}/2048</span></div><input maxLength={2048} value={value.footerText || ""} onChange={(event) => update("footerText", event.target.value)} /></div>
            <div className="form-field"><label>Icon footer URL</label><input value={value.footerIcon || ""} onChange={(event) => update("footerIcon", event.target.value)} placeholder="https://..." /></div>
            <label className="checkbox-row full-span"><input type="checkbox" checked={Boolean(value.timestamp)} onChange={(event) => update("timestamp", event.target.checked)} /><span><strong>Tampilkan timestamp</strong><small>Discord menampilkan waktu saat pesan dikirim.</small></span></label>
          </div>
        </details>

        <details className="builder-disclosure">
          <summary><span><Type size={18} /><strong>Fields</strong></span><small>{fields.length} dari 25 field</small></summary>
          <div className="builder-disclosure-body">
            <div className="builder-section-head"><p>Tambahkan informasi terstruktur di dalam embed.</p><Button variant="secondary" icon={<Plus size={16} />} disabled={fields.length >= 25} onClick={() => update("fields", [...fields, { name: "Field baru", value: "Isi field", inline: false }])}>Tambah field</Button></div>
            <div className="repeat-list">
              {fields.map((field, index) => <div className="repeat-card" key={index}>
                <div className="repeat-card-grid"><input value={field.name} onChange={(event) => update("fields", fields.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="Nama field" /><textarea value={field.value} onChange={(event) => update("fields", fields.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} rows={2} placeholder="Isi field" /></div>
                <div className="repeat-card-actions"><label><input type="checkbox" checked={Boolean(field.inline)} onChange={(event) => update("fields", fields.map((item, itemIndex) => itemIndex === index ? { ...item, inline: event.target.checked } : item))} /> Inline</label><button type="button" aria-label="Hapus field" onClick={() => update("fields", fields.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button></div>
              </div>)}
              {!fields.length ? <div className="empty-inline">Belum ada field tambahan.</div> : null}
            </div>
          </div>
        </details>

        <details className="builder-disclosure">
          <summary><span><Link2 size={18} /><strong>Tombol</strong></span><small>{buttons.length} tombol</small></summary>
          <div className="builder-disclosure-body">
            <div className="builder-section-head"><p>Tombol link untuk panel atau informasi eksternal.</p><Button variant="secondary" icon={<Plus size={16} />} disabled={buttons.length >= 5} onClick={() => update("buttons", [...buttons, { label: "Buka informasi", url: "" }])}>Tambah tombol</Button></div>
            <div className="repeat-list">
              {buttons.map((button, index) => <div className="repeat-card" key={index}>
                <div className="repeat-card-grid two"><input value={button.label} onChange={(event) => update("buttons", buttons.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} placeholder="Label button" /><input value={button.url || ""} onChange={(event) => update("buttons", buttons.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} placeholder="https://... atau channel ID" /></div>
                <div className="repeat-card-actions"><button type="button" aria-label="Hapus button" onClick={() => update("buttons", buttons.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button></div>
              </div>)}
              {!buttons.length ? <div className="empty-inline">Belum ada tombol.</div> : null}
            </div>
          </div>
        </details>

        <details className="json-details"><summary>Raw JSON</summary><pre>{json}</pre></details>
      </div>

      <div className="preview-column">
        <div className="preview-heading"><div><strong>Pratinjau Discord</strong><small>Renderer yang sama dipakai untuk semua template dashboard.</small></div><div className="device-switcher" aria-label="Ukuran pratinjau"><button className={device === "desktop" ? "is-active" : ""} onClick={() => setDevice("desktop")} aria-label="Desktop preview"><Monitor size={17} /></button><button className={device === "tablet" ? "is-active" : ""} onClick={() => setDevice("tablet")} aria-label="Tablet preview"><Tablet size={17} /></button><button className={device === "mobile" ? "is-active" : ""} onClick={() => setDevice("mobile")} aria-label="Mobile preview"><Smartphone size={17} /></button></div></div>
        <div className={`preview-device preview-${device}`}><DiscordPreview embed={value} picker={picker} /></div>
        {channelMissing ? <div className="inline-warning">Pilih channel tujuan pada tab Channel & Role sebelum menggunakan Kirim Tes.</div> : null}
        <div className="sticky-save-card">
          <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={resetEmbed}>Reset</Button>
          <Button variant="secondary" icon={<Copy size={16} />} onClick={() => navigator.clipboard.writeText(json)}>Salin JSON</Button>
          <Button variant="secondary" icon={<Send size={16} />} onClick={onTest} disabled={channelMissing || saving}>Kirim tes</Button>
          <Button icon={<Save size={16} />} onClick={onSave} disabled={saving}>{saving ? "Menyimpan" : "Simpan"}</Button>
        </div>
      </div>
    </div>
  );
}
