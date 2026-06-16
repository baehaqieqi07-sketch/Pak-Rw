import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Hash, LoaderCircle, Search, Shield, UserRound, Volume2 } from "lucide-react";
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
    return `Posisi ${role.position ?? 0}`;
  }
  const user = item as DiscordUser;
  return `@${user.username}`;
}

function PickerIcon({ kind, item }: { kind: PickerKind; item: Item }) {
  if (kind === "channel") {
    const channel = item as DiscordChannel;
    return String(channel.typeLabel || "").toLowerCase().includes("voice") ? <Volume2 size={17} /> : <Hash size={17} />;
  }
  if (kind === "role") return <Shield size={17} />;
  return <UserRound size={17} />;
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
  const selected = items.find((item) => item.id === value);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => `${labelOf(kind, item)} ${metaOf(kind, item)} ${item.id}`.toLowerCase().includes(needle));
  }, [items, kind, query]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="form-field" ref={rootRef}>
      <label>{label}{required ? <span className="required-mark">*</span> : null}</label>
      <button
        type="button"
        className={`picker-trigger ${open ? "is-open" : ""} ${!value && required ? "needs-value" : ""}`}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
      >
        <span className="picker-leading">
          {loading ? <LoaderCircle className="spin" size={18} /> : selected ? <PickerIcon kind={kind} item={selected} /> : kind === "channel" ? <Hash size={18} /> : kind === "role" ? <Shield size={18} /> : <UserRound size={18} />}
        </span>
        <span className="picker-value">
          <strong>{selected ? labelOf(kind, selected) : loading ? "Membaca data Discord" : `Pilih ${kind === "channel" ? "channel" : kind === "role" ? "role" : "user"}`}</strong>
          <small>{selected ? metaOf(kind, selected) : items.length ? `${items.length} pilihan tersedia` : "Belum ada data dari Discord"}</small>
        </span>
        <ChevronDown size={18} className="picker-chevron" />
      </button>

      {open ? (
        <div className="picker-popover">
          <div className="picker-search">
            <Search size={16} />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Cari nama ${kind === "channel" ? "channel" : kind === "role" ? "role" : "user"}`} />
          </div>
          <div className="picker-list" role="listbox">
            <button type="button" className="picker-option clear-option" onClick={() => { onChange(""); setOpen(false); setQuery(""); }}>
              <span className="picker-option-icon"><Check size={16} /></span>
              <span><strong>Tidak dipilih</strong><small>Kosongkan setting ini</small></span>
            </button>
            {filtered.length ? filtered.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`picker-option ${item.id === value ? "is-selected" : ""}`}
                onClick={() => { onChange(item.id, item); setOpen(false); setQuery(""); }}
              >
                <span className="picker-option-icon"><PickerIcon kind={kind} item={item} /></span>
                <span className="picker-option-copy"><strong>{labelOf(kind, item)}</strong><small>{metaOf(kind, item)}</small></span>
                {item.id === value ? <Check size={17} /> : null}
              </button>
            )) : <div className="picker-empty">Tidak ada hasil yang cocok.</div>}
          </div>
        </div>
      ) : null}
      {helper ? <small className="field-helper">{helper}</small> : null}
    </div>
  );
}
