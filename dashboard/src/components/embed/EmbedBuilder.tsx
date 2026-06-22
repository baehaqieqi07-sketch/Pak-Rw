import { useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent } from "react";
import {
  Braces, Copy, Image, Link2, Monitor, Plus, RotateCcw, Save, Send,
  Smartphone, Tablet, Trash2, Type, UserRoundPlus
} from "lucide-react";
import type { DiscordChannel, DiscordRole, DiscordUser, EmbedDraft, PickerData } from "../../app/types";
import { DiscordPicker, type PickerKind } from "../pickers/DiscordPicker";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { DiscordPreview } from "./DiscordPreview";

const PLACEHOLDERS = [
  "{user}", "{userId}", "{username}", "{displayName}", "{avatar}", "{joinedAt}",
  "{server}", "{serverName}", "{memberCount}", "{ownerName}", "{botName}", "{prefix}",
  "{memberRole}", "{memberTulusRole}", "{staffRole}", "{adminRole}", "{moderatorRole}", "{motmRole}", "{donaturRole}", "{juraganRole}",
  "{rulesChannel}", "{chatWargaChannel}", "{ticketChannel}", "{aiChannel}", "{curhatChannel}", "{anonymousCurhatChannel}", "{suggestionChannel}", "{levelChannel}", "{cekPoinChannel}", "{topActiveChannel}", "{leaderboardChannel}", "{mabarChannel}", "{boostPoinChannel}", "{welcomeChannel}",
  "{level}", "{rank}", "{total}", "{chat}", "{voice}", "{lifetimeTotal}", "{cyclePoints}", "{motmThreshold}", "{nextLevel}", "{remainingPoints}",
  "{eventName}", "{multiplier}", "{duration}", "{channels}", "{endsAt}", "{by}", "{status}",
  "{month}", "{year}", "{date}", "{time}", "{today}", "{now}"
];

type TextTarget = "content" | "authorName" | "title" | "description" | "footerText";
type InsertMode = "placeholder" | PickerKind;
type SuggestionKind = "channel" | "role" | "user";
type SuggestionItem = { id: string; kind: SuggestionKind; label: string; detail: string; insertSafe: string; insertPlain: string };

const TARGET_LABELS: Array<{ value: TextTarget; label: string; mentionSafe: boolean }> = [
  { value: "content", label: "Content", mentionSafe: true },
  { value: "description", label: "Description", mentionSafe: true },
  { value: "title", label: "Title", mentionSafe: false },
  { value: "authorName", label: "Author", mentionSafe: false },
  { value: "footerText", label: "Footer", mentionSafe: false }
];

function cleanName(name = "") {
  return String(name || "").replace(/^[@#]/, "").trim();
}

function channelLabel(channel: DiscordChannel) {
  return cleanName(channel.rawName || channel.name || channel.id);
}

function roleLabel(role: DiscordRole) {
  return cleanName(role.rawName || role.name || role.id);
}

function userLabel(user: DiscordUser) {
  return user.displayName || user.username || user.name || user.id;
}

function buildSuggestions(picker?: PickerData): SuggestionItem[] {
  const channels = (picker?.channel || []).map((channel) => ({
    id: channel.id,
    kind: "channel" as const,
    label: `#${channelLabel(channel)}`,
    detail: [channel.typeLabel || channel.meta || "Channel", channel.category].filter(Boolean).join(" · "),
    insertSafe: `<#${channel.id}>`,
    insertPlain: `#${channelLabel(channel)}`
  }));
  const roles = (picker?.role || []).map((role) => ({
    id: role.id,
    kind: "role" as const,
    label: `@${roleLabel(role)}`,
    detail: role.managed ? "Managed role" : "Role server",
    insertSafe: `<@&${role.id}>`,
    insertPlain: `@${roleLabel(role)}`
  }));
  const users = (picker?.user || []).map((user) => ({
    id: user.id,
    kind: "user" as const,
    label: `@${userLabel(user)}`,
    detail: user.username ? `@${user.username}` : "Member server",
    insertSafe: `<@${user.id}>`,
    insertPlain: userLabel(user)
  }));
  return [...channels, ...roles, ...users];
}

function findTrigger(value: string, caret: number) {
  const before = value.slice(0, caret);
  const match = before.match(/(^|\s)([@#])([^@#\n\r]{0,40})$/);
  if (!match) return null;
  return {
    trigger: match[2] as "@" | "#",
    query: match[3].trim().toLowerCase(),
    start: before.length - match[2].length - match[3].length,
    end: caret
  };
}

function SmartTextInput({
  as = "input",
  value,
  onChange,
  placeholder,
  maxLength,
  rows,
  picker,
  mentionSafe = true
}: {
  as?: "input" | "textarea";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  picker?: PickerData;
  mentionSafe?: boolean;
}) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const [active, setActive] = useState<{ trigger: "@" | "#"; query: string; start: number; end: number } | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const all = useMemo(() => buildSuggestions(picker), [picker]);
  const suggestions = useMemo(() => {
    if (!active) return [];
    const pool = active.trigger === "#" ? all.filter((item) => item.kind === "channel") : all.filter((item) => item.kind === "role" || item.kind === "user");
    const filtered = active.query ? pool.filter((item) => `${item.label} ${item.detail} ${item.id}`.toLowerCase().includes(active.query)) : pool;
    return filtered.slice(0, 12);
  }, [active, all]);

  const updateActive = (nextValue: string, caret: number | null) => {
    const next = caret == null ? null : findTrigger(nextValue, caret);
    setActive(next);
    setFocusIndex(0);
  };

  const insertSuggestion = (item: SuggestionItem) => {
    if (!active || !ref.current) return;
    const insert = mentionSafe ? item.insertSafe : item.insertPlain;
    const next = `${value.slice(0, active.start)}${insert} ${value.slice(active.end)}`;
    onChange(next);
    setActive(null);
    window.setTimeout(() => {
      const pos = active.start + insert.length + 1;
      ref.current?.focus();
      ref.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const shared = {
    ref,
    value,
    maxLength,
    placeholder,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next = event.target.value;
      onChange(next);
      updateActive(next, event.target.selectionStart);
    },
    onClick: (event: MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => updateActive(value, event.currentTarget.selectionStart),
    onKeyUp: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (["ArrowUp", "ArrowDown", "Enter", "Tab"].includes(event.key)) return;
      updateActive(value, event.currentTarget.selectionStart);
    },
    onKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!active || !suggestions.length) return;
      if (event.key === "ArrowDown") { event.preventDefault(); setFocusIndex((current) => (current + 1) % suggestions.length); }
      if (event.key === "ArrowUp") { event.preventDefault(); setFocusIndex((current) => (current - 1 + suggestions.length) % suggestions.length); }
      if (event.key === "Enter" || event.key === "Tab") { event.preventDefault(); insertSuggestion(suggestions[focusIndex]); }
      if (event.key === "Escape") { event.preventDefault(); setActive(null); }
    },
    onBlur: () => window.setTimeout(() => setActive(null), 150)
  };

  return (
    <div className="mention-input-wrap">
      {as === "textarea" ? <textarea {...shared} rows={rows || 4} /> : <input {...shared} />}
      {active && suggestions.length ? (
        <div className="mention-suggest" role="listbox">
          <div className="mention-suggest-head">{active.trigger === "#" ? "Pilih channel / category / voice" : "Pilih role atau member"}</div>
          {suggestions.map((item, index) => (
            <button type="button" key={`${item.kind}-${item.id}`} className={index === focusIndex ? "is-active" : ""} onMouseDown={(event) => { event.preventDefault(); insertSuggestion(item); }}>
              <strong>{item.label}</strong><small>{item.detail || item.id}</small>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
      const displayName = insertMode === "user" ? item.displayName || item.username || item.name : cleanName(item.rawName || item.name);
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
      color: "#7DBD77",
      authorName: "<a:Desa_Tulus2:1518502350363430932> DESA TULUS | Pak RW",
      footerText: "<a:Desa_Tulus2:1518502350363430932> DESA TULUS | Pak RW",
      footerIcon: "https://cdn.discordapp.com/emojis/1516424353934348299.gif?size=44&quality=lossless",
      fields: [],
      buttons: []
    });
  };

  return (
    <div className="embed-builder-grid">
      <div className="embed-editor-stack">
        <Card className="quick-insert-card">
          <CardHeader title="Sisipkan data Discord" description="Ketik @ untuk role/member, ketik # untuk channel. Bisa juga pilih manual dari picker." />
          <div className="insert-toolbar">
            <div className="form-field"><label>Masukkan ke</label><select value={insertTarget} onChange={(event) => setInsertTarget(event.target.value as TextTarget)}>{TARGET_LABELS.map((target) => <option key={target.value} value={target.value}>{target.label}</option>)}</select></div>
            <div className="form-field"><label>Jenis data</label><select value={insertMode} onChange={(event) => { setInsertMode(event.target.value as InsertMode); setDiscordValue(""); }}><option value="placeholder">Placeholder</option><option value="channel">Channel Discord</option><option value="role">Role Discord</option><option value="user">Member Discord</option></select></div>
            {insertMode === "placeholder" ? <div className="form-field"><label>Placeholder</label><select value={placeholder} onChange={(event) => setPlaceholder(event.target.value)}>{PLACEHOLDERS.map((token) => <option key={token} value={token}>{token}</option>)}</select></div> : <DiscordPicker kind={insertMode} label={insertMode === "channel" ? "Pilih channel" : insertMode === "role" ? "Pilih role" : "Pilih member"} helper={selectedTarget.mentionSafe ? "Akan dimasukkan sebagai mention Discord asli." : "Field ini memakai nama biasa agar tidak muncul sebagai kode mentah."} items={picker?.[insertMode] || []} value={discordValue} onChange={setDiscordValue} />}
            <Button icon={insertMode === "placeholder" ? <Braces size={16} /> : <UserRoundPlus size={16} />} onClick={insertData} disabled={insertMode !== "placeholder" && !discordValue}>Masukkan</Button>
          </div>
          <div className="editor-hint-line"><span>@</span> role/member <span>#</span> channel/category/voice. Content, Description, dan Field akan jadi mention asli. Title, Author, Footer otomatis jadi nama biasa.</div>
        </Card>

        <Card className="embed-editor-panel">
          <CardHeader title="Pesan dan isi embed" description="Editor dibuat satu alur: isi teks, pilih data Discord, lihat preview, lalu simpan." />
          <div className="form-grid two-columns">
            <div className="form-field full-span"><div className="field-label-row"><label>Content</label><span>{String(value.content || "").length}/2000</span></div><SmartTextInput as="textarea" maxLength={2000} value={value.content || ""} onChange={(next) => update("content", next)} rows={3} placeholder="Teks di atas embed" picker={picker} mentionSafe /><small className="field-helper">Ketik @ untuk role/member, # untuk channel. Mention akan terkirim asli ke Discord.</small></div>
            <div className="form-field"><label>Nama author</label><SmartTextInput value={value.authorName || ""} onChange={(next) => update("authorName", next)} placeholder="<a:Desa_Tulus2:1518502350363430932> DESA TULUS | Warga Baru" picker={picker} mentionSafe={false} /></div>
            <div className="form-field"><label>Icon author URL</label><input value={value.authorIcon || ""} onChange={(event) => update("authorIcon", event.target.value)} placeholder="https://..." /></div>
            <div className="form-field full-span"><div className="field-label-row"><label>Title</label><span>{String(value.title || "").length}/256</span></div><SmartTextInput maxLength={256} value={value.title || ""} onChange={(next) => update("title", next)} placeholder="Judul embed" picker={picker} mentionSafe={false} /><small className="field-helper">Discord tidak merender mention pada judul. Dashboard otomatis memasukkan nama biasa.</small></div>
            <div className="form-field full-span"><div className="field-label-row"><label>Description</label><span>{String(value.description || "").length}/4096</span></div><SmartTextInput as="textarea" maxLength={4096} value={value.description || ""} onChange={(next) => update("description", next)} rows={10} placeholder="Isi embed" picker={picker} mentionSafe /></div>
          </div>
        </Card>

        <details className="builder-disclosure" open>
          <summary><span><Image size={18} /><strong>Warna, gambar, dan footer</strong></span><small>Media visual dan identitas embed</small></summary>
          <div className="builder-disclosure-body form-grid two-columns">
            <div className="form-field"><label>Warna</label><div className="color-field"><input type="color" value={value.color || "#7DBD77"} onChange={(event) => update("color", event.target.value)} /><input value={value.color || "#7DBD77"} onChange={(event) => update("color", event.target.value)} /></div></div>
            <div className="form-field"><label>URL thumbnail</label><div className="input-with-icon"><Image size={16} /><input value={value.thumbnailUrl || ""} onChange={(event) => update("thumbnailUrl", event.target.value)} placeholder="https://..." /></div></div>
            <div className="form-field full-span"><label>URL gambar</label><div className="input-with-icon"><Image size={16} /><input value={value.imageUrl || ""} onChange={(event) => update("imageUrl", event.target.value)} placeholder="https://..." /></div></div>
            <div className="form-field"><div className="field-label-row"><label>Teks footer</label><span>{String(value.footerText || "").length}/2048</span></div><SmartTextInput maxLength={2048} value={value.footerText || ""} onChange={(next) => update("footerText", next)} picker={picker} mentionSafe={false} /></div>
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
                <div className="repeat-card-grid"><SmartTextInput value={field.name} onChange={(next) => update("fields", fields.map((item, itemIndex) => itemIndex === index ? { ...item, name: next } : item))} placeholder="Nama field" picker={picker} mentionSafe={false} /><SmartTextInput as="textarea" value={field.value} onChange={(next) => update("fields", fields.map((item, itemIndex) => itemIndex === index ? { ...item, value: next } : item))} rows={2} placeholder="Isi field" picker={picker} mentionSafe /></div>
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
        <div className="preview-heading"><div><strong>Pratinjau Discord</strong><small>Sama dengan data channel, role, user, emoji, dan placeholder dashboard.</small></div><div className="device-switcher" aria-label="Ukuran pratinjau"><button className={device === "desktop" ? "is-active" : ""} onClick={() => setDevice("desktop")} aria-label="Desktop preview"><Monitor size={17} /></button><button className={device === "tablet" ? "is-active" : ""} onClick={() => setDevice("tablet")} aria-label="Tablet preview"><Tablet size={17} /></button><button className={device === "mobile" ? "is-active" : ""} onClick={() => setDevice("mobile")} aria-label="Mobile preview"><Smartphone size={17} /></button></div></div>
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
