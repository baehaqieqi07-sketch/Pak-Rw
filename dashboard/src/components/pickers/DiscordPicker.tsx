import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Hash, LoaderCircle, Search, Shield, UserRound, Volume2, X } from "lucide-react";
import type { DiscordChannel, DiscordRole, DiscordUser } from "../../app/types";

export type PickerKind = "channel" | "role" | "user";
type Item = DiscordChannel | DiscordRole | DiscordUser;

function cleanName(name = "") {
  return String(name || "").replace(/^[@#]/, "").trim();
}

function labelOf(kind: PickerKind, item: Item) {
  if (kind === "user") {
    const user = item as DiscordUser;
    return user.displayName || user.username || user.name || user.id;
  }
  return cleanName((item as any).rawName || item.name || item.id);
}

function metaOf(kind: PickerKind, item: Item) {
  if (kind === "channel") {
    const channel = item as DiscordChannel;
    return [channel.typeLabel || channel.meta, channel.category].filter(Boolean).join(" · ") || "Channel Discord";
  }
  if (kind === "role") {
    const role = item as DiscordRole;
    return `${role.managed ? "Managed role" : "Role server"}${typeof role.position === "number" ? ` · Posisi ${role.position}` : ""}`;
  }
  const user = item as DiscordUser;
  return [user.bot ? "Bot" : "Member", user.username ? `@${user.username}` : ""].filter(Boolean).join(" · ");
}

function groupOf(kind: PickerKind, item: Item) {
  if (kind !== "channel") return kind === "role" ? "Role Server" : "Member Server";
  const channel = item as DiscordChannel;
  return channel.category || channel.typeLabel || channel.meta || "Channel Lainnya";
}

function PickerIcon({ kind, item }: { kind: PickerKind; item?: Item }) {
  if (kind === "channel") {
    const channel = item as DiscordChannel | undefined;
    const meta = String(channel?.typeLabel || channel?.meta || "").toLowerCase();
    return meta.includes("voice") || meta.includes("stage") ? <Volume2 size={18} /> : <Hash size={18} />;
  }
  if (kind === "role") {
    const role = item as DiscordRole | undefined;
    return <span className="role-color-dot" style={{ backgroundColor: role?.color && role.color !== "#000000" ? role.color : undefined }}><Shield size={16} /></span>;
  }
  return <UserRound size={18} />;
}

export function DiscordPicker({
  kind,
  items,
  value,
  onChange,
  label,
  helper,
  loading = false,
  disabled = false,
  required = false
}: {
  kind: PickerKind;
  items: Item[];
  value?: string;
  onChange: (id: string, item?: Item) => void;
  label: string;
  helper?: string;
  loading?: boolean;
  disabled?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = items.find((item) => item.id === value);
  const hasStoredValue = Boolean(value && !selected);
  const selectedChannel = kind === "channel" ? selected as DiscordChannel | undefined : undefined;
  const selectedRole = kind === "role" ? selected as DiscordRole | undefined : undefined;
  const selectedChannelMeta = String(selectedChannel?.typeLabel || selectedChannel?.meta || "").toLowerCase();
  const permissionRelevant = selectedChannel && !/voice|stage|category/i.test(selectedChannelMeta);
  const missingPermissions = permissionRelevant && selectedChannel?.permissionStatus ? [
    !selectedChannel.permissionStatus.view ? "View Channel" : null,
    !selectedChannel.permissionStatus.send ? "Send Messages" : null,
    !selectedChannel.permissionStatus.embed ? "Embed Links" : null,
    !selectedChannel.permissionStatus.attach ? "Attach Files" : null,
    !selectedChannel.permissionStatus.history ? "Read Message History" : null
  ].filter(Boolean) as string[] : [];

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? items.filter((item) => `${labelOf(kind, item)} ${metaOf(kind, item)} ${(item as any).rawName || ""} ${item.id}`.toLowerCase().includes(needle))
      : items;
    const output = new Map<string, Item[]>();
    filtered.forEach((item) => {
      const group = groupOf(kind, item);
      const existing = output.get(group) || [];
      existing.push(item);
      output.set(group, existing);
    });
    return Array.from(output.entries())
      .sort(([left], [right]) => left.localeCompare(right, "id"))
      .map(([group, groupItems]) => [group, groupItems.sort((left, right) => labelOf(kind, left).localeCompare(labelOf(kind, right), "id"))] as [string, Item[]]);
  }, [items, kind, query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("picker-modal-active");
    const id = window.setTimeout(() => searchRef.current?.focus(), 50);
    return () => {
      window.clearTimeout(id);
      document.body.classList.remove("picker-modal-active");
    };
  }, [open]);

  const placeholder = kind === "channel" ? "Pilih channel Discord" : kind === "role" ? "Pilih role Discord" : "Pilih member Discord";

  return (
    <div className={`form-field discord-picker-field ${open ? "picker-layer-open" : ""}`} ref={rootRef}>
      <label>{label}{required ? <span className="required-mark">*</span> : null}</label>
      <button
        type="button"
        className={`picker-trigger ${open ? "is-open" : ""} ${!value && required ? "needs-value" : ""}`}
        onClick={() => !disabled && !loading && setOpen((current) => !current)}
        disabled={disabled || loading}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="picker-leading">
          {loading ? <LoaderCircle className="spin" size={18} /> : <PickerIcon kind={kind} item={selected} />}
        </span>
        <span className="picker-value">
          <strong>{selected ? labelOf(kind, selected) : hasStoredValue ? "ID tersimpan belum cocok" : loading ? "Membaca data Discord" : placeholder}</strong>
          <small>{selected ? metaOf(kind, selected) : hasStoredValue ? `ID ${value} tetap aman. Tekan Muat Ulang Discord agar namanya muncul.` : items.length ? `${items.length} pilihan tersedia dari Discord` : "Belum ada data dari Discord"}</small>
        </span>
        {value ? (
          <span
            className="picker-clear"
            role="button"
            tabIndex={0}
            aria-label={`Kosongkan ${label}`}
            onClick={(event) => { event.stopPropagation(); onChange(""); }}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onChange(""); } }}
          ><X size={15} /></span>
        ) : <ChevronDown size={18} className="picker-chevron" />}
      </button>

      {open ? (
        <>
          <button type="button" className="picker-backdrop" aria-label="Tutup pilihan" onClick={() => setOpen(false)} />
          <div className="picker-popover" role="dialog" aria-label={`Pilih ${label}`}>
            <div className="picker-popover-head">
              <div><strong>{label}</strong><small>Cari lalu klik nama yang benar. ID akan tersimpan otomatis.</small></div>
              <button type="button" aria-label="Tutup pilihan" onClick={() => setOpen(false)}><X size={17} /></button>
            </div>
            <div className="picker-search">
              <Search size={17} />
              <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Cari nama ${kind === "channel" ? "channel / category / voice" : kind === "role" ? "role" : "member"}`} />
              {query ? <button type="button" aria-label="Hapus pencarian" onClick={() => setQuery("")}><X size={15} /></button> : null}
            </div>
            <div className="picker-list" role="listbox">
              {grouped.length ? grouped.map(([group, groupItems]) => (
                <section className="picker-group" key={group}>
                  <div className="picker-group-label">{group}<span>{groupItems.length}</span></div>
                  {groupItems.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={`picker-option ${item.id === value ? "is-selected" : ""}`}
                      onClick={() => { onChange(item.id, item); setOpen(false); setQuery(""); }}
                      role="option"
                      aria-selected={item.id === value}
                    >
                      <span className="picker-option-icon"><PickerIcon kind={kind} item={item} /></span>
                      <span className="picker-option-copy"><strong>{labelOf(kind, item)}</strong><small>{metaOf(kind, item)}</small><span className="picker-option-id">ID {item.id}</span>{kind === "role" && (item as DiscordRole).managed ? <span className="picker-option-warning">Managed / bot role</span> : null}{kind === "role" && (item as DiscordRole).aboveBot ? <span className="picker-option-warning">Di atas role bot</span> : null}{kind === "role" && (item as DiscordRole).sensitivePermissions?.length ? <span className="picker-option-warning">{(item as DiscordRole).sensitivePermissions!.join(", ")}</span> : null}</span>
                      {item.id === value ? <Check size={18} /> : null}
                    </button>
                  ))}
                </section>
              )) : <div className="picker-empty"><Search size={22} /><strong>Tidak ada hasil</strong><span>Coba kata lain atau tekan Muat Ulang Discord.</span></div>}
            </div>
            <div className="picker-popover-foot"><span>{selected ? `Terpilih: ${labelOf(kind, selected)}` : hasStoredValue ? `ID tersimpan: ${value}` : `${items.length} pilihan tersedia`}</span><button type="button" onClick={() => { onChange(""); setOpen(false); setQuery(""); }}>Kosongkan pilihan</button></div>
          </div>
        </>
      ) : null}
      {selectedRole?.aboveBot ? <small className="field-warning">Role bot berada di bawah role ini. Pak RW tidak dapat mengelolanya sampai hierarchy diperbaiki.</small> : null}
      {selectedRole?.sensitivePermissions?.length ? <small className="field-warning">Role memiliki izin sensitif: {selectedRole.sensitivePermissions.join(", ")}.</small> : null}
      {missingPermissions.length ? <small className="field-warning">Bot kehilangan izin: {missingPermissions.join(", ")}.</small> : null}
      {helper ? <small className="field-helper">{helper}</small> : null}
    </div>
  );
}
