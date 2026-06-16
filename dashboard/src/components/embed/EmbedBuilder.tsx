import { useMemo, useState } from "react";
import { Copy, Image, Monitor, Plus, RotateCcw, Save, Send, Smartphone, Tablet, Trash2 } from "lucide-react";
import type { EmbedDraft, PickerData } from "../../app/types";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { DiscordPreview } from "./DiscordPreview";

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
  const update = (key: keyof EmbedDraft, next: any) => onChange({ ...value, [key]: next });
  const fields = value.fields || [];
  const buttons = value.buttons || [];
  const json = useMemo(() => JSON.stringify(value, null, 2), [value]);

  return (
    <div className="embed-builder-grid">
      <Card className="embed-editor-panel">
        <CardHeader title="Embed editor" description="Semua perubahan langsung terlihat pada pratinjau." />
        <div className="form-grid two-columns">
          <div className="form-field full-span"><label>Content</label><textarea value={value.content || ""} onChange={(event) => update("content", event.target.value)} rows={3} placeholder="Teks di atas embed" /></div>
          <div className="form-field"><label>Author name</label><input value={value.authorName || ""} onChange={(event) => update("authorName", event.target.value)} placeholder="DESA TULUS • Warga Baru" /></div>
          <div className="form-field"><label>Author icon URL</label><input value={value.authorIcon || ""} onChange={(event) => update("authorIcon", event.target.value)} placeholder="https://..." /></div>
          <div className="form-field full-span"><label>Title</label><input value={value.title || ""} onChange={(event) => update("title", event.target.value)} placeholder="Judul embed" /><small className="field-helper">Gunakan nama biasa pada title. Mention Discord aktif di content dan description.</small></div>
          <div className="form-field full-span"><label>Description</label><textarea value={value.description || ""} onChange={(event) => update("description", event.target.value)} rows={9} placeholder="Isi embed" /></div>
          <div className="form-field"><label>Color</label><div className="color-field"><input type="color" value={value.color || "#88a08c"} onChange={(event) => update("color", event.target.value)} /><input value={value.color || "#88a08c"} onChange={(event) => update("color", event.target.value)} /></div></div>
          <div className="form-field"><label>Thumbnail URL</label><div className="input-with-icon"><Image size={16} /><input value={value.thumbnailUrl || ""} onChange={(event) => update("thumbnailUrl", event.target.value)} placeholder="https://..." /></div></div>
          <div className="form-field full-span"><label>Image URL</label><div className="input-with-icon"><Image size={16} /><input value={value.imageUrl || ""} onChange={(event) => update("imageUrl", event.target.value)} placeholder="https://..." /></div></div>
          <div className="form-field"><label>Footer text</label><input value={value.footerText || ""} onChange={(event) => update("footerText", event.target.value)} /></div>
          <div className="form-field"><label>Footer icon URL</label><input value={value.footerIcon || ""} onChange={(event) => update("footerIcon", event.target.value)} placeholder="https://..." /></div>
          <label className="checkbox-row full-span"><input type="checkbox" checked={Boolean(value.timestamp)} onChange={(event) => update("timestamp", event.target.checked)} /><span><strong>Tampilkan timestamp</strong><small>Discord menampilkan waktu saat pesan dikirim.</small></span></label>
        </div>

        <div className="builder-section">
          <div className="builder-section-head"><div><h4>Fields</h4><p>Maksimal 25 field per embed Discord.</p></div><Button variant="secondary" icon={<Plus size={16} />} onClick={() => update("fields", [...fields, { name: "Field baru", value: "Isi field", inline: false }])}>Tambah field</Button></div>
          <div className="repeat-list">
            {fields.map((field, index) => <div className="repeat-card" key={index}>
              <div className="repeat-card-grid"><input value={field.name} onChange={(event) => update("fields", fields.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="Nama field" /><textarea value={field.value} onChange={(event) => update("fields", fields.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} rows={2} placeholder="Isi field" /></div>
              <div className="repeat-card-actions"><label><input type="checkbox" checked={Boolean(field.inline)} onChange={(event) => update("fields", fields.map((item, itemIndex) => itemIndex === index ? { ...item, inline: event.target.checked } : item))} /> Inline</label><button aria-label="Hapus field" onClick={() => update("fields", fields.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button></div>
            </div>)}
            {!fields.length ? <div className="empty-inline">Belum ada field tambahan.</div> : null}
          </div>
        </div>

        <div className="builder-section">
          <div className="builder-section-head"><div><h4>Buttons</h4><p>Tombol link untuk panel atau informasi eksternal.</p></div><Button variant="secondary" icon={<Plus size={16} />} onClick={() => update("buttons", [...buttons, { label: "Buka informasi", url: "" }])}>Tambah button</Button></div>
          <div className="repeat-list">
            {buttons.map((button, index) => <div className="repeat-card" key={index}>
              <div className="repeat-card-grid two"><input value={button.label} onChange={(event) => update("buttons", buttons.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} placeholder="Label button" /><input value={button.url || ""} onChange={(event) => update("buttons", buttons.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} placeholder="https://... atau channel ID" /></div>
              <div className="repeat-card-actions"><button aria-label="Hapus button" onClick={() => update("buttons", buttons.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button></div>
            </div>)}
            {!buttons.length ? <div className="empty-inline">Belum ada button.</div> : null}
          </div>
        </div>

        <details className="json-details"><summary>Raw JSON</summary><pre>{json}</pre></details>
      </Card>

      <div className="preview-column">
        <div className="device-switcher" aria-label="Ukuran pratinjau">
          <button className={device === "desktop" ? "is-active" : ""} onClick={() => setDevice("desktop")} aria-label="Desktop preview"><Monitor size={17} /></button>
          <button className={device === "tablet" ? "is-active" : ""} onClick={() => setDevice("tablet")} aria-label="Tablet preview"><Tablet size={17} /></button>
          <button className={device === "mobile" ? "is-active" : ""} onClick={() => setDevice("mobile")} aria-label="Mobile preview"><Smartphone size={17} /></button>
        </div>
        <div className={`preview-device preview-${device}`}><DiscordPreview embed={value} picker={picker} /></div>
        {channelMissing ? <div className="inline-warning">Pilih channel tujuan sebelum menggunakan Kirim Tes.</div> : null}
        <div className="sticky-save-card">
          <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={() => onChange({})}>Reset</Button>
          <Button variant="secondary" icon={<Copy size={16} />} onClick={() => navigator.clipboard.writeText(json)}>Salin JSON</Button>
          <Button variant="secondary" icon={<Send size={16} />} onClick={onTest} disabled={channelMissing || saving}>Kirim tes</Button>
          <Button icon={<Save size={16} />} onClick={onSave} disabled={saving}>{saving ? "Menyimpan" : "Simpan"}</Button>
        </div>
      </div>
    </div>
  );
}
