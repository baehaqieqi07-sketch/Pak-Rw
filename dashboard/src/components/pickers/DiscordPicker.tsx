import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Hash, LoaderCircle, Search, Shield, UserRound, Volume2, X } from "lucide-react";
import type { DiscordChannel, DiscordRole, DiscordUser } from "../../app/types";

export type PickerKind = "channel" | "role" | "user";
type Item = DiscordChannel | DiscordRole | DiscordUser;

function labelOf(kind: PickerKind, item: Item) {
  if (kind === "user") {
    const user = item as DiscordUser;
    return user.displayName || user.username;
  }
  return item.name;
}

function metaOf(kind: PickerKind, item: Item) {
  if (kind === "channel") {
    const channel = item as DiscordChannel;
    return [channel.typeLabel, channel.category].filter(Boolean).join(" · ") || "Channel Discord";
  }
  if (kind === "role") {
    const role = item as DiscordRole;
    return `Posisi ${role.position ?? 0}${role.color ? ` · ${role.color}` : ""}`;
  }
  const user = item as DiscordUser;
  return `@${user.username}`;
}

function groupOf(kind: PickerKind, item: Item) {
  if (kind !== "channel") return kind === "role" ? "Role Server" : "Member Server";
  const channel = item as DiscordChannel;
  return channel.category || channel.typeLabel || "Channel Lainnya";
}

function PickerIcon({ kind, item }: { kind: PickerKind; item?: Item }) {
  if (kind === "channel") {
    const channel = item as DiscordChannel | undefined;
    return String(channel?.typeLabel || "").toLowerCase().includes("voice") ? <Volume2 size={18} /> : <Hash size={18} />;
  }
  if (kind === "role") return <Shield size={18} />;
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

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? items.filter((item) => `${labelOf(kind, item)} ${metaOf(kind, item)} ${item.id}`.toLowerCase().includes(needle))
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
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => searchRef.current?.focus(), 40);
    return () => window.clearTimeout(id);
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
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="picker-leading">
          {loading ? <LoaderCircle className="spin" size={18} /> : <PickerIcon kind={kind} item={selected} />}
        </span>
        <span className="picker-value">
          <strong>{selected ? labelOf(kind, selected) : hasStoredValue ? "Pilihan tersimpan belum ditemukan" : loading ? "Membaca data Discord" : placeholder}</strong>
          <small>{selected ? metaOf(kind, selected) : hasStoredValue ? `ID ${value} masih tersimpan. Muat ulang Discord untuk mencocokkan nama.` : items.length ? `${items.length} pilihan siap dipilih` : "Belum ada data dari Discord"}</small>
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
        <div className="picker-popover" role="dialog" aria-label={`Pilih ${label}`}>
          <div className="picker-popover-head">
            <div><strong>{label}</strong><small>Pilih berdasarkan nama, bukan ID.</small></div>
            <button type="button" aria-label="Tutup pilihan" onClick={() => setOpen(false)}><X size={17} /></button>
          </div>
          <div className="picker-search">
            <Search size={17} />
            <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Cari nama ${kind === "channel" ? "channel" : kind === "role" ? "role" : "member"}`} />
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
                    <span className="picker-option-copy"><strong>{labelOf(kind, item)}</strong><small>{metaOf(kind, item)}</small></span>
                    {item.id === value ? <Check size={18} /> : null}
                  </button>
                ))}
              </section>
            )) : <div className="picker-empty"><Search size={22} /><strong>Tidak ada hasil</strong><span>Coba nama lain atau tekan Muat ulang Discord.</span></div>}
          </div>
          <div className="picker-popover-foot"><span>{selected ? `Terpilih: ${labelOf(kind, selected)}` : hasStoredValue ? `ID tersimpan: ${value}` : `${items.length} pilihan tersedia`}</span><button type="button" onClick={() => { onChange(""); setOpen(false); setQuery(""); }}>Kosongkan</button></div>
        </div>
      ) : null}
      {helper ? <small className="field-helper">{helper}</small> : null}
    </div>
  );
}
